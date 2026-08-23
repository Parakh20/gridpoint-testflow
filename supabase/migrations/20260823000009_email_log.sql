-- Append-only record of operator-sent mail from the platform admin panel.
--
-- There is no log of outbound mail anywhere today: start-trial, notify-rework
-- and notify-demo-request all fire-and-forget at Resend. Once an operator can
-- send mail by hand from admin.optimustesting.com, "did we email them, when,
-- and what did it say?" becomes a support question that needs an answer —
-- and Resend's own dashboard is a separate system the message id is the only
-- join key into.
--
-- Same posture as billing_events / orders / rework_notifications: RLS enabled
-- with NO policies, so only the service role (platform-admin-data) can touch
-- it. This holds customer email addresses and message bodies; it must never be
-- reachable from a tenant session.
CREATE TABLE IF NOT EXISTS public.email_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  to_user_id        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  to_email          text NOT NULL,
  subject           text NOT NULL,
  -- Which template produced the body ('custom' for freeform). Not an enum:
  -- templates live in supabase/functions/_shared/email_templates.ts and adding
  -- one there should not require a migration.
  template          text NOT NULL DEFAULT 'custom',
  body_html         text,
  status            text NOT NULL CHECK (status IN ('sent', 'failed')),
  -- Resend's message id, returned only on a successful send. This is the only
  -- handle that ties a row here to the delivery/bounce record in Resend.
  resend_message_id text,
  error             text,
  actor             text NOT NULL DEFAULT 'platform-admin',
  sent_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_log_company ON public.email_log(company_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_status  ON public.email_log(status);

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
-- No policies — service role only. Do not add one.
