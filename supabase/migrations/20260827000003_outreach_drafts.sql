-- Reviewable outreach drafts, sent from the admin panel over SMTP.
--
-- Until now the campaign lived in a markdown file and was sent by hand from a
-- mail client, with a separate manual step to log the touch. Two things went
-- wrong with that in practice: the log step gets skipped when moving fast, and
-- there is no record of what was actually sent -- only of what was drafted.
--
-- This table is both the outbox and the record. A row starts as DRAFT, is edited
-- and read in the panel, then SENT (or FAILED, with the error kept). The body
-- stored here is the body that went out, not the template it came from.
--
-- Deliberately NOT the full Phase 2 pipeline from OUTREACH_SENDING_PLAN.md
-- (campaigns, steps, scheduling, reply detection). At ten messages that
-- machinery costs more than it saves. This is the outbox half only, shaped so
-- the rest can be added around it later.

CREATE TABLE IF NOT EXISTS public.outreach_drafts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  -- The contact is the authority on where this may be sent. send_outreach_draft
  -- re-resolves the address through it at send time rather than trusting
  -- to_email, so a tampered row cannot turn the panel into an open relay on a
  -- personal Gmail account.
  contact_id   uuid REFERENCES public.lead_contacts(id) ON DELETE SET NULL,
  to_email     text NOT NULL,
  to_name      text,
  subject      text NOT NULL,
  body         text NOT NULL,
  status       text NOT NULL DEFAULT 'DRAFT'
                 CHECK (status IN ('DRAFT', 'SENT', 'FAILED')),
  sent_at      timestamptz,
  error        text,
  message_id   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- One draft per contact. A second draft to the same person is the "mailed them
-- twice" failure this whole tracking effort exists to prevent.
CREATE UNIQUE INDEX IF NOT EXISTS idx_outreach_drafts_contact
  ON public.outreach_drafts(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_outreach_drafts_status ON public.outreach_drafts(status, created_at);
CREATE INDEX IF NOT EXISTS idx_outreach_drafts_lead   ON public.outreach_drafts(lead_id);

ALTER TABLE public.outreach_drafts ENABLE ROW LEVEL SECURITY;
-- No policies -- service role only, same posture as leads/lead_contacts/email_log.
-- Do not add one.

COMMENT ON TABLE public.outreach_drafts IS
  'Outbox and record for hand-reviewed outreach mail sent from the platform admin panel.';
COMMENT ON COLUMN public.outreach_drafts.body IS
  'Plain text. What was actually sent, not the template it came from.';
COMMENT ON COLUMN public.outreach_drafts.message_id IS
  'SMTP Message-ID of the sent mail. The only handle tying this row to the copy in the Gmail Sent folder.';

CREATE OR REPLACE FUNCTION public.touch_outreach_draft()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_outreach_draft ON public.outreach_drafts;
CREATE TRIGGER trg_touch_outreach_draft
  BEFORE UPDATE ON public.outreach_drafts
  FOR EACH ROW EXECUTE FUNCTION public.touch_outreach_draft();
