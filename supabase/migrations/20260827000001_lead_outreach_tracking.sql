-- Outreach tracking on top of the existing sales CRM.
--
-- The pipeline already models WHO to contact (leads, lead_contacts) and WHAT
-- happened (lead_activities). What it cannot answer is the question actually
-- asked every morning: "who is due today, and who has gone quiet?" Answering it
-- today means opening every lead drawer in turn, which is why touches stop
-- getting logged after the first week -- and an outreach log with holes in it is
-- worse than none, because it reads as "not contacted" for someone who was.
--
-- Two additions:
--
--   last_contacted_at   maintained by trigger from lead_activities, so it cannot
--                       drift from the activity log the way a hand-updated
--                       column would.
--   tech_stack          what the company runs today (Excel, OMICRON Test
--                       Universe, paper, a competitor). Free text plus a source,
--                       because this is research with varying provenance and a
--                       structured enum would force bad guesses into clean-looking
--                       columns.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS last_contacted_at  timestamptz,
  ADD COLUMN IF NOT EXISTS tech_stack         text,
  ADD COLUMN IF NOT EXISTS tech_stack_source  text;

COMMENT ON COLUMN public.leads.last_contacted_at IS
  'Most recent outbound-or-inbound touch. Maintained by trg_leads_touch_stamp from lead_activities; never write it directly.';
COMMENT ON COLUMN public.leads.tech_stack IS
  'What this company uses to record and report test results today. Free text.';
COMMENT ON COLUMN public.leads.tech_stack_source IS
  'Where the tech_stack claim came from -- a URL, "careers page", "phone call", "inferred". Unsourced research is a guess.';

-- NOTE activities are internal jottings ("saw them at a conference"), not a
-- touch. Counting them would make a lead look worked when nobody contacted it.
CREATE OR REPLACE FUNCTION public.leads_touch_stamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.channel <> 'NOTE' THEN
    UPDATE public.leads
       SET last_contacted_at = GREATEST(COALESCE(last_contacted_at, NEW.occurred_at), NEW.occurred_at),
           updated_at        = now()
     WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.leads_touch_stamp() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_leads_touch_stamp ON public.lead_activities;
CREATE TRIGGER trg_leads_touch_stamp
  AFTER INSERT ON public.lead_activities
  FOR EACH ROW EXECUTE FUNCTION public.leads_touch_stamp();

-- Backfill from activities already logged.
UPDATE public.leads l
   SET last_contacted_at = a.max_at
  FROM (
    SELECT lead_id, MAX(occurred_at) AS max_at
      FROM public.lead_activities
     WHERE channel <> 'NOTE'
     GROUP BY lead_id
  ) a
 WHERE a.lead_id = l.id
   AND l.last_contacted_at IS DISTINCT FROM a.max_at;

-- The work queue reads these two on every load.
CREATE INDEX IF NOT EXISTS idx_leads_next_action   ON public.leads(next_action_date)   WHERE next_action_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_last_contacted ON public.leads(last_contacted_at);
