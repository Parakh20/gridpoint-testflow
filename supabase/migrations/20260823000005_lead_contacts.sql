-- Outreach contact book for the sales tracker.
--
-- `leads` carries exactly one contact_name/contact_email/contact_phone, which is
-- enough for a single-proprietor firm but not for the mid/large EPCs where the
-- buying committee is several people (MD, Head of T&C, Projects Director, IT).
-- lead_contacts is the many-per-lead layer. `leads.contact_*` stays as the
-- primary/first contact so nothing that reads it today breaks.
--
-- Same security posture as leads/lead_activities: RLS enabled with NO policies,
-- so only the service role (platform-admin-data Edge Function) can reach it.

CREATE TABLE IF NOT EXISTS public.lead_contacts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id        uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  full_name      text,
  title          text,
  seniority      text NOT NULL DEFAULT 'UNKNOWN'
                   CHECK (seniority IN ('C_SUITE','DIRECTOR','MANAGER','ENGINEER','GENERIC','UNKNOWN')),
  email          text,
  email_status   text NOT NULL DEFAULT 'UNVERIFIED'
                   CHECK (email_status IN ('PUBLISHED','UNVERIFIED','BOUNCED','OPTED_OUT')),
  phone          text,
  linkedin_url   text,
  source_url     text,
  is_primary     boolean NOT NULL DEFAULT false,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- An email is unique per lead so re-running an enrichment pass is idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_contacts_lead_email
  ON public.lead_contacts(lead_id, lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_contacts_lead ON public.lead_contacts(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_contacts_seniority ON public.lead_contacts(seniority);

ALTER TABLE public.lead_contacts ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_lead_contacts_updated_at ON public.lead_contacts;
CREATE TRIGGER trg_lead_contacts_updated_at
  BEFORE UPDATE ON public.lead_contacts
  FOR EACH ROW EXECUTE FUNCTION public.touch_leads_updated_at();

-- Only one primary contact per lead.
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_contacts_one_primary
  ON public.lead_contacts(lead_id) WHERE is_primary;
