-- Inbound mail received at the support address, delivered by Resend's
-- receiving webhook (`email.received`) into the `resend-inbound` Edge
-- Function.
--
-- support@optimustesting.com is published on /terms, /privacy,
-- /refund-policy and /contact, and the refund policy promises a
-- 3-business-day response — so this is the mailbox customers and Razorpay's
-- reviewers actually write to. Storing it here is what makes it visible from
-- the admin panel next to what we sent (email_log), instead of only in a
-- separate inbox nobody has open.
--
-- Same posture as billing_events / email_log: RLS enabled, NO policies,
-- service-role only. Message bodies from customers must never be reachable
-- from a tenant session.
CREATE TABLE IF NOT EXISTS public.inbound_emails (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Webhook delivery id (Svix `svix-id` header). UNIQUE is the idempotency
  -- key: Resend retries deliveries, and a retry must not create a duplicate
  -- message. Mirrors billing_events.provider_event_id.
  provider_event_id text NOT NULL UNIQUE,
  -- Resolved by matching from_email against profiles.email. NULL is normal
  -- and expected — a prospect, a vendor, or a reviewer is not a tenant user.
  company_id        uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  from_email        text NOT NULL,
  from_name         text,
  to_email          text,
  subject           text,
  text_body         text,
  html_body         text,
  -- Resend delivers attachments as metadata (id, filename, content_type,
  -- size) — NOT bytes. Fetch the content separately if it is ever needed.
  attachments       jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_payload       jsonb,
  handled           boolean NOT NULL DEFAULT FALSE,
  received_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbound_emails_company   ON public.inbound_emails(company_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_unhandled ON public.inbound_emails(handled, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_from      ON public.inbound_emails(lower(from_email));

ALTER TABLE public.inbound_emails ENABLE ROW LEVEL SECURITY;
-- No policies — service role only. Do not add one.

-- Idempotent insert, mirroring record_billing_event's shape: returns TRUE when
-- this delivery was new, FALSE when it was a retry of one already stored.
-- Sender-to-company resolution happens here rather than in the Edge Function
-- so a retry can never resolve differently from the original.
CREATE OR REPLACE FUNCTION record_inbound_email(
  _provider_event_id TEXT,
  _from_email        TEXT,
  _from_name         TEXT,
  _to_email          TEXT,
  _subject           TEXT,
  _text_body         TEXT,
  _html_body         TEXT,
  _attachments       JSONB,
  _raw               JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted INT;
  matched_company UUID;
BEGIN
  -- Case-insensitive: mail clients preserve whatever case the user typed,
  -- profiles.email does not.
  SELECT p.company_id INTO matched_company
  FROM profiles p
  WHERE lower(p.email) = lower(_from_email)
  LIMIT 1;

  INSERT INTO inbound_emails (
    provider_event_id, company_id, from_email, from_name, to_email,
    subject, text_body, html_body, attachments, raw_payload
  )
  VALUES (
    _provider_event_id, matched_company, _from_email, _from_name, _to_email,
    _subject, _text_body, _html_body, COALESCE(_attachments, '[]'::jsonb), _raw
  )
  ON CONFLICT (provider_event_id) DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted > 0;
END;
$$;

-- SECURITY DEFINER functions are EXECUTE-able by PUBLIC by default; this one
-- writes an unauthenticated-sourced table, so lock it to the webhook's
-- service-role client (CLAUDE.md gotcha 20).
REVOKE ALL ON FUNCTION record_inbound_email(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_inbound_email(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) TO service_role;
