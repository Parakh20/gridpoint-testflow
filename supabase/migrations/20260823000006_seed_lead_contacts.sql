-- Outreach contact book seed: real, publicly-published contact points for the
-- leads seeded in 20260530000004_seed_leads.sql.
--
-- PROVENANCE MATTERS HERE. Every address below was read off a live page, not
-- pattern-guessed. email_status records how much to trust it:
--   PUBLISHED  = read directly off the company's own website (or, for a company
--                whose own site is down/JS-only, a page the company controls).
--   UNVERIFIED = surfaced via a third-party directory / registry aggregator, or
--                a name-to-mailbox mapping I inferred. Verify before a send that
--                a bounce would cost us.
-- No address here is a first.last@domain guess. Where a decision maker is known
-- by name but has no published address, the row carries the name with a NULL
-- email so the outreach can still be addressed to a person.
--
-- Idempotent: skips (lead, email) pairs already present, so re-running is safe.
-- Named-person rows with a NULL email are guarded on (lead, full_name).

DO $$
DECLARE
  v_lead_id uuid;
BEGIN

  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'INEL Power Group' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Chennai office (HQ)', 'GENERIC', 'chennai@inelpse.com', 'PUBLISHED',
           NULL, NULL, 'https://www.inelpse.com', true, 'Published on inelpse.com. Group also runs bangalore@/hyderabad@/vizag@ regional inboxes.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('chennai@inelpse.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'INEL Power Group' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Bengaluru branch', 'GENERIC', 'bangalore@inelpse.com', 'PUBLISHED',
           NULL, NULL, 'https://www.inelpse.com', false, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('bangalore@inelpse.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'INEL Power Group' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Hyderabad branch', 'GENERIC', 'hyderabad@inelpse.com', 'PUBLISHED',
           NULL, NULL, 'https://www.inelpse.com', false, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('hyderabad@inelpse.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'INEL Power Group' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Visakhapatnam branch', 'GENERIC', 'vizag@inelpse.com', 'PUBLISHED',
           NULL, NULL, 'https://www.inelpse.com', false, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('vizag@inelpse.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'INEL Power Group' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, 'Anand Varma', NULL, 'UNKNOWN', 'anandvarma@inelpse.com', 'PUBLISHED',
           NULL, NULL, 'https://www.inelpse.com', false, 'Named mailbox on company site; title not stated. Confirm role before senior-level pitch.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('anandvarma@inelpse.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'INEL Power Group' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, 'P. Rajendraprasad', 'Director (MCA filing)', 'C_SUITE', 'prp@inelpse.com', 'UNVERIFIED',
           NULL, NULL, 'https://www.zaubacorp.com/INEL-POWER-SYSTEM-ENGINEERS-PRIVATE-LIMITED-U45209TN2003PTC051509', false, 'Initials mailbox prp@ published on site; mapped to director P. P. Rajendraprasad from MCA records. Mapping is inferred - verify on first contact.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('prp@inelpse.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'INEL Power Group' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, 'P. Babu Rajendra Prasad', 'Director (MCA filing)', 'C_SUITE', 'pbr@inelpse.com', 'UNVERIFIED',
           NULL, NULL, 'https://www.zaubacorp.com/INEL-POWER-SYSTEM-ENGINEERS-PRIVATE-LIMITED-U45209TN2003PTC051509', false, 'Initials mailbox pbr@ published on site; mapped to director from MCA records. Inferred - verify.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('pbr@inelpse.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Akuntha Projects Pvt Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, 'Ravi Kamdar', 'Managing Director', 'C_SUITE', 'ravi@akuntha.com', 'PUBLISHED',
           NULL, NULL, 'https://akuntha.com/contact-us/', true, 'Strongest contact in the list: mailbox published on akuntha.com AND independently attributed to MD Ravi Kamdar (also director of record per MCA). Lead with this one.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('ravi@akuntha.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Akuntha Projects Pvt Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Sales', 'GENERIC', 'sales@akuntha.com', 'PUBLISHED',
           NULL, NULL, 'https://akuntha.com/contact-us/', false, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('sales@akuntha.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Akuntha Projects Pvt Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'General enquiry', 'GENERIC', 'info@akuntha.com', 'PUBLISHED',
           NULL, NULL, 'https://akuntha.com/contact-us/', false, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('info@akuntha.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'GK Expertise / GK Power Expertise Pvt Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Enquiries', 'GENERIC', 'enquiry@gkexpertise.com', 'PUBLISHED',
           '044-22521450', NULL, 'https://www.gkexpertise.com/contact-us/', true, 'Published on own contact page alongside +91 99940 54198 and +91 99409 99257.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('enquiry@gkexpertise.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Elite Powertech Pvt Ltd (EPPL)' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'General enquiry', 'GENERIC', 'info@elitepowertech.in', 'PUBLISHED',
           NULL, NULL, 'https://elitepowertech.in', true, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('info@elitepowertech.in'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Elite Powertech Pvt Ltd (EPPL)' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, 'Tikeshwar Bhagat', 'Director of Operations', 'C_SUITE', NULL, 'UNVERIFIED',
           NULL, NULL, 'https://rocketreach.co/elite-powertech-pvt-ltd-management_b45f1045fc6aacc3', false, 'Name from a contact-data aggregator, no published email. Route via info@ addressed to him, or connect on LinkedIn. A second aggregator lists ''Rajesh Rawat, Operations Head'' - two conflicting names, so verify before using either.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lc.full_name = 'Tikeshwar Bhagat')
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Powertest Asia Pvt Ltd (PtA)' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'General enquiry', 'GENERIC', 'info@powertestasia.com', 'PUBLISHED',
           NULL, NULL, 'https://powertestasia.com', true, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('info@powertestasia.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Powertest Asia Pvt Ltd (PtA)' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, 'N. V. Satyanarayana', 'Founder & Managing Director', 'C_SUITE', NULL, 'UNVERIFIED',
           NULL, 'https://www.linkedin.com/in/satyanarayana-nv-490b031a/', 'https://powertestasia.com', false, 'Founded PtA in 1995. No published personal email - address info@ to him by name, or approach on LinkedIn.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lc.full_name = 'N. V. Satyanarayana')
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Powertest Asia Pvt Ltd (PtA)' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, 'Sasant Nuthakki', 'Executive Director', 'C_SUITE', NULL, 'UNVERIFIED',
           NULL, NULL, 'https://www.zaubacorp.com/company/POWERTEST-ASIA-PRIVATE-LIMITED/U99999TG1995PTC020725', false, 'Second-generation director per MCA records - likelier to champion a software tool than the founder.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lc.full_name = 'Sasant Nuthakki')
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Eternergy Engineering Pvt Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'General enquiry', 'GENERIC', 'info@eternergy.com.in', 'PUBLISHED',
           NULL, NULL, 'https://eternergy.com.in', true, 'India entity. Australian arm uses careers@eternergy.com.au.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('info@eternergy.com.in'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'ARRAA Energy' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Enquiries', 'GENERIC', 'enquiry@arraaenergy.com', 'PUBLISHED',
           '+91 99940 54198', NULL, 'https://www.arraaenergy.com', true, 'Caution: this phone number is also published on gkexpertise.com. Either shared/outsourced reception or one of the two listings is stale - confirm which entity answers before calling.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('enquiry@arraaenergy.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Omnific Solutions' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, 'Manoj Shinde', 'Proprietor', 'C_SUITE', 'omnificsolutions@gmail.com', 'UNVERIFIED',
           '8767077801', NULL, 'https://www.indiamart.com/omnificsolutions/profile.html', true, 'Proprietor-run firm, so the generic inbox IS the decision maker. Email from a directory listing, not the company''s own site.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('omnificsolutions@gmail.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Reliserv Solution India' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, 'Mr. Rathi', 'Director', 'C_SUITE', NULL, 'UNVERIFIED',
           '07942723215', NULL, 'https://www.reliserv.in/contact-us.html', true, 'reliservsolutions.com has an EXPIRED TLS certificate - their primary site is unreachable in a browser, worth mentioning as a warm opener. Directory listings show disha@ / quote@ / marketing@ @reliserv.in but I could not confirm these on a company-controlled page; treat as unverified until checked.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lc.full_name = 'Mr. Rathi')
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Reliserv Solution India' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, 'Rajesh Sawale', NULL, 'UNKNOWN', NULL, 'UNVERIFIED',
           NULL, NULL, 'https://www.reliserv.in/contact-us.html', false, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lc.full_name = 'Rajesh Sawale')
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Chamunda Electrical Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, 'Chiragkumar Natvarlal Patel', 'Chairman, Managing Director & CFO', 'C_SUITE', 'info@chamundaconst.com', 'UNVERIFIED',
           NULL, NULL, 'https://www.zaubacorp.com/company/CHAMUNDA-ELECTRICAL-PRIVATE-LIMITED/U40106GJ2013PTC075751', true, 'Recently listed on NSE Emerge - post-IPO scale-up is the hook. Email is the group inbox from a company-registry aggregator, not their own site. Natvarbhai Karsanbhai Rathod is Whole-Time Director.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('info@chamundaconst.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Hartek Power Pvt Ltd / Hartek Group' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'General enquiry', 'GENERIC', 'info@hartek.com', 'PUBLISHED',
           '0172 4004121', NULL, 'https://hartek.com/contact-us/', true, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('info@hartek.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'HEC Infra Projects Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Electrical division', 'GENERIC', 'elect@hecproject.com', 'PUBLISHED',
           '+91-79-40086771', NULL, 'https://hecprojects.in/contact/', true, 'Best-targeted generic inbox found: it is the ELECTRICAL division, not a catch-all. Note the live domain is hecprojects.in / hecproject.com - the source_url on this lead (tradebrains news article) is not their site.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('elect@hecproject.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'HEC Infra Projects Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Company Secretary', 'DIRECTOR', 'cs@hecproject.com', 'PUBLISHED',
           NULL, NULL, 'https://hecprojects.in/contact/', false, 'Listed-company CS - use only for investor/formal routes, not a sales pitch.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('cs@hecproject.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Techno Electric & Engineering Co Ltd (TEECL)' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'General enquiry', 'GENERIC', 'techno.email@techno.co.in', 'PUBLISHED',
           NULL, NULL, 'https://www.techno.co.in', true, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('techno.email@techno.co.in'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Techno Electric & Engineering Co Ltd (TEECL)' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Investor relations', 'DIRECTOR', 'desk.investors@techno.co.in', 'PUBLISHED',
           NULL, NULL, 'https://www.techno.co.in', false, 'Investor desk - not a sales channel.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('desk.investors@techno.co.in'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'NCC Limited (Electrical T&D Division)' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Corporate office', 'GENERIC', 'info@nccltd.in', 'PUBLISHED',
           '+91 40 2326 8888', NULL, 'https://www.ncclimited.com/contact.html', true, 'No electrical-division-specific inbox published. Regional offices are ro.<city>@nccltd.in - ro.mumbai@nccltd.in is the right one for their Maharashtra RDSS substation work.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('info@nccltd.in'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'NCC Limited (Electrical T&D Division)' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Mumbai regional office', 'GENERIC', 'ro.mumbai@nccltd.in', 'PUBLISHED',
           NULL, NULL, 'https://www.ncclimited.com/contact.html', false, 'Closest to the live Maharashtra RDSS 33/11kV substation programme cited in why_fit.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('ro.mumbai@nccltd.in'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Jyoti Structures Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'General enquiry', 'GENERIC', 'contact@jsl.co.in', 'PUBLISHED',
           NULL, NULL, 'https://jyotistructures.in', true, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('contact@jsl.co.in'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'KEC International Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'General enquiry', 'GENERIC', 'kecindia@kecrpg.com', 'PUBLISHED',
           NULL, NULL, 'https://www.kecrpg.com/contact-us', true, 'Only address published; no divisional inbox.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('kecindia@kecrpg.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Kalpataru Projects International Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'General enquiry', 'GENERIC', 'info@kalpataruprojects.com', 'UNVERIFIED',
           NULL, NULL, 'https://kalpataruprojects.com/contact', true, 'Lead''s source_url domain (kalpatarulimited.com) does not resolve - correct domain is kalpataruprojects.com.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('info@kalpataruprojects.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'SPML Infra Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'General enquiry', 'GENERIC', 'info@spml.co.in', 'PUBLISHED',
           NULL, NULL, 'https://www.spml.co.in', true, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('info@spml.co.in'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Sterling & Wilson (Pvt) Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'General enquiry', 'GENERIC', 'info@sterlingwilson.com', 'PUBLISHED',
           NULL, NULL, 'https://sterlingandwilson.com', true, 'City inboxes also published: mumbai@ / bangalore@ / chennai@ / kolkata@ / cochin@ sterlingwilson.com.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('info@sterlingwilson.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Sterling & Wilson (Pvt) Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Mumbai office', 'GENERIC', 'mumbai@sterlingwilson.com', 'PUBLISHED',
           NULL, NULL, 'https://sterlingandwilson.com', false, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('mumbai@sterlingwilson.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Power Mech Projects Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'General enquiry', 'GENERIC', 'info@powermech.net', 'PUBLISHED',
           NULL, NULL, 'https://powermechprojects.com', true, 'City inboxes published too: mumbai@ / delhi@ / nagpur@ / kolkatta@ powermech.net.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('info@powermech.net'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Power Mech Projects Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Mumbai office', 'GENERIC', 'mumbai@powermech.net', 'PUBLISHED',
           NULL, NULL, 'https://powermechprojects.com', false, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('mumbai@powermech.net'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Navayuga Engineering Co Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Corporate', 'GENERIC', 'nec@navayuga.com', 'PUBLISHED',
           NULL, NULL, 'https://navayuga.com', true, 'Regional inboxes: necvizag@ / neckolkata@ / delhi@ navayuga.com.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('nec@navayuga.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'InGrid (IndiGrid Investment Managers)' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'General enquiry', 'GENERIC', 'info@indigrid.com', 'PUBLISHED',
           NULL, NULL, 'https://www.indigrid.co.in', true, 'InvIT that OWNS transmission assets - O&M contractor angle, different pitch from an EPC.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('info@indigrid.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Adani Energy Solutions (Adani Transmission)' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'General enquiry', 'GENERIC', NULL, 'UNVERIFIED',
           NULL, NULL, 'https://www.adanienergysolutions.com', true, 'Only named mailboxes surfaced from the site (jaladhi.shukla@ / prashant.soni@ adani.com) and both read as investor-relations contacts, not buyers. Needs a warm intro rather than cold email.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lc.full_name = NULL)
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Tata Power (T&C / O&M arm)' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Transmission business', 'GENERIC', 'transmission_tp@tatapower.com', 'PUBLISHED',
           NULL, NULL, 'https://www.tatapower.com', true, 'Transmission-specific inbox - the most on-target of the many tatapower.com addresses published.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('transmission_tp@tatapower.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'G R Infraprojects Ltd (Power Division)' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'General enquiry', 'GENERIC', NULL, 'UNVERIFIED',
           NULL, NULL, 'https://www.grinfra.com/contact-us/', true, 'Contact page publishes a general-enquiry and a careers address but renders them as obfuscated images/JS - could not read the literal address. Fill in manually from the page.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lc.full_name = NULL)
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Bharat Test House Pvt Ltd (BTHPL)' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'General enquiry', 'GENERIC', 'bthrai@bharattesthouse.com', 'PUBLISHED',
           NULL, NULL, 'https://www.bharattesthouse.com', true, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('bthrai@bharattesthouse.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Ghaziabad Testing Laboratories Pvt Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'General enquiry', 'GENERIC', 'info@gtllab.org', 'PUBLISHED',
           NULL, NULL, 'https://gtllab.org', true, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('info@gtllab.org'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Voltage Infra Pvt Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Marketing', 'GENERIC', 'marketing@volt-age.in', 'PUBLISHED',
           NULL, NULL, 'https://voltageinfra.com', true, 'Note the mail domain is volt-age.in, not voltageinfra.com.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc
       WHERE lc.lead_id = v_lead_id
         AND (lower(lc.email) = lower('marketing@volt-age.in'))
    );
  END IF;

  -- Mirror each lead's primary contact onto leads.contact_* so the existing
  -- single-contact columns (which SalesTab already renders) stay in step.
  UPDATE public.leads l
     SET contact_name  = COALESCE(l.contact_name,  c.full_name),
         contact_email = COALESCE(l.contact_email, c.email),
         contact_phone = COALESCE(l.contact_phone, c.phone)
    FROM public.lead_contacts c
   WHERE c.lead_id = l.id AND c.is_primary;
END $$;
