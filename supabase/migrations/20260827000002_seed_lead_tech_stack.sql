-- What these companies use today -- the little of it that is actually knowable
-- from public sources.
--
-- A crawl of all ten phase-1 company sites (landing page plus every internal
-- equipment/capability/service page) found NO disclosed reporting software. Not
-- one mentions Excel, a LIMS, a vendor report tool, or anything else in the
-- category we compete with. An earlier pass appeared to find Excel at three
-- companies; every hit was the substring inside "excellence" or a FontAwesome
-- `fa-file-excel` CSS class. Those are not recorded here, because a wrong
-- tech_stack is worse than an empty one: it gets quoted back at the prospect on
-- a call and destroys the credibility the research was meant to build.
--
-- What IS published is test-kit brand, and that is a usable proxy. A team
-- running OMICRON usually owns Test Universe; a Doble house usually has PowerDB.
-- Both produce per-test output that still has to be assembled into a handover
-- document by hand, which is the gap being sold into -- so kit brand tells us
-- which conversation to open with, even though it is not the answer itself.
--
-- Everything else stays NULL on purpose. tech_stack is a question for a phone
-- call ("what do you write your test reports in today?"), not something to
-- infer. The column and the outreach queue exist so that answer has somewhere
-- to land the moment it is given.

UPDATE public.leads SET
  tech_stack = 'Test kit: OMICRON, Doble, Megger (published). Reporting software undisclosed.',
  tech_stack_source = 'https://www.arraaenergy.com/relay-testing.php (read 2026-08-27)'
WHERE company_name = 'ARRAA Energy';

UPDATE public.leads SET
  tech_stack = 'Test kit: 5 kV Megger for IR, plus capacitance and tan delta measurement (published). Reporting software undisclosed.',
  tech_stack_source = 'https://akuntha.com/substation-testing/ (read 2026-08-27)'
WHERE company_name = 'Akuntha Projects Pvt Ltd';

UPDATE public.leads SET
  tech_stack = 'Test kit: OMICRON, Megger, Doble; programs all major relay makes (per company profile). Reporting software undisclosed.',
  tech_stack_source = 'https://www.gkexpertise.com — company profile, recorded during lead research'
WHERE company_name = 'GK Expertise / GK Power Expertise Pvt Ltd';

UPDATE public.leads SET
  tech_stack = 'Test kit: OMICRON (own plus rentals); SFRA and tan delta capability. Reporting software undisclosed.',
  tech_stack_source = 'Lead research notes — OMICRON kit rentals listed as a service line'
WHERE company_name = 'Omnific Solutions';

-- Crawled 2026-08-27, nothing found. Recorded so the next person does not repeat
-- the crawl and reach the same dead end.
UPDATE public.leads SET
  tech_stack_source = 'Website crawled 2026-08-27 — no reporting software disclosed. Ask on the call.'
WHERE company_name IN (
  'Transerect Testing & Commissioning Engineers Pvt Ltd',
  'Powertest Asia Pvt Ltd (PtA)',
  'Sun and Jay Engineering Consultants Pvt Ltd',
  'Voltage Infra Pvt Ltd',
  'Ghaziabad Testing Laboratories Pvt Ltd',
  'Elite Powertech Pvt Ltd (EPPL)',
  'Eternergy Engineering Pvt Ltd'
) AND tech_stack IS NULL;
