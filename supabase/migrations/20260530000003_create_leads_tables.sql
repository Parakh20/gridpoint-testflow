-- Sales / Outreach Tracker — internal platform-admin CRM-lite.
-- Two tables: leads (target companies) + lead_activities (append-only outreach log).
-- These are NOT tenant data. They are reached only by the platform-admin-data
-- Edge Function (service role, RLS-bypass). RLS is enabled with NO policies so
-- anon/authenticated can never read them (contrast: companies SELECT is USING(TRUE)).

-- ── leads ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name      text NOT NULL,
  segment           text,
  region            text,
  size_signal       text,
  why_fit           text,
  buyer_title       text,
  contact_name      text,
  contact_phone     text,
  contact_email     text,
  outreach_approach text,
  priority          int CHECK (priority BETWEEN 1 AND 5),
  confidence        text,
  source_url        text,
  stage             text NOT NULL DEFAULT 'NEW'
                      CHECK (stage IN ('NEW','CONTACTED','DEMO_BOOKED','PILOT','WON','LOST','PARKED')),
  next_action_date  date,
  notes             text,
  company_id        uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_stage            ON public.leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_priority         ON public.leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_next_action_date ON public.leads(next_action_date);

-- ── lead_activities ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  channel     text NOT NULL
                CHECK (channel IN ('WHATSAPP','PHONE','LINKEDIN','EMAIL','IN_PERSON','EVENT','NOTE')),
  body        text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON public.lead_activities(lead_id, occurred_at DESC);

-- ── RLS: enabled, NO policies → only service role (Edge Function) can touch ────
ALTER TABLE public.leads           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- ── keep leads.updated_at fresh on any update ────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_leads_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.touch_leads_updated_at();
