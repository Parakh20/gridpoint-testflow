-- Structured headcount on leads.
--
-- size_signal already carries this, but as free text: "50-200 staff",
-- "11-25 employees", "400+ engineers", "Small specialist team", "Listed; large".
-- It reads well and sorts not at all, so "show me everyone under 30 people"
-- meant eyeballing 88 rows -- which is exactly the filter that decides who is
-- worth a first sales call, since a 20-person firm has one decision maker and a
-- 1,000-person one has a procurement process.
--
-- Stored as a range rather than a single number because that is how the source
-- data actually exists. A band is honest; picking a midpoint would invent
-- precision nobody measured. An open-ended "400+" is min=400 with max NULL.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS employee_count_min int,
  ADD COLUMN IF NOT EXISTS employee_count_max int;

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_employee_count_sane;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_employee_count_sane CHECK (
    (employee_count_min IS NULL OR employee_count_min >= 0)
    AND (employee_count_max IS NULL OR employee_count_min IS NULL
         OR employee_count_max >= employee_count_min)
  );

COMMENT ON COLUMN public.leads.employee_count_min IS
  'Lower bound of headcount. "400+" is min 400 with max NULL. Parsed from size_signal where possible, otherwise entered by hand.';
COMMENT ON COLUMN public.leads.employee_count_max IS
  'Upper bound, NULL when the source says "N+" or gives no ceiling.';

-- Backfill: banded forms first ("50-200 staff", "11-25 employees").
UPDATE public.leads
   SET employee_count_min = NULLIF(regexp_replace((regexp_match(size_signal, '(\d[\d,]*)\s*-\s*(\d[\d,]*)\s*(staff|employee|engineer|people)'))[1], ',', '', 'g'), '')::int,
       employee_count_max = NULLIF(regexp_replace((regexp_match(size_signal, '(\d[\d,]*)\s*-\s*(\d[\d,]*)\s*(staff|employee|engineer|people)'))[2], ',', '', 'g'), '')::int
 WHERE size_signal ~ '(\d[\d,]*)\s*-\s*(\d[\d,]*)\s*(staff|employee|engineer|people)'
   AND employee_count_min IS NULL;

-- Then open-ended forms ("400+ engineers", "1,000+ employees", "750+ employees").
UPDATE public.leads
   SET employee_count_min = NULLIF(regexp_replace((regexp_match(size_signal, '(\d[\d,]*)\s*\+\s*(staff|employee|engineer|people)'))[1], ',', '', 'g'), '')::int
 WHERE size_signal ~ '(\d[\d,]*)\s*\+\s*(staff|employee|engineer|people)'
   AND employee_count_min IS NULL;

-- Deliberately no guess for "Small team", "Mid-size" or "Listed; large". A
-- number invented from an adjective would be indistinguishable from one that
-- was researched, and this column exists to be filtered on.
CREATE INDEX IF NOT EXISTS idx_leads_employee_count ON public.leads(employee_count_min);
