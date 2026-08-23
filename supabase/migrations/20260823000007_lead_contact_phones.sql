-- Phone-number enrichment for the outreach contact book, plus two contacts
-- found only once the phone pass turned up company websites the original seed
-- did not have (transerect.com, sunjay.in - both were IndiaMART links before).
--
-- In Indian B2B field-services sales the mobile number matters as much as the
-- email: a published mobile means WhatsApp is open, which is the channel most of
-- these leads' own outreach_approach notes already call for. Rows are marked so
-- you can tell a mobile (WhatsApp works) from a landline (it does not).
--
-- Numbers were taken from tel: links on the company's own site, or from a
-- directory listing where the note says so. Numbers scraped out of raw page text
-- were discarded - that pass surfaced obvious placeholders like 9885123456.
--
-- Watch for directory call-tracking numbers: an 079-4xxxxxxx or 080-46xxxxxx
-- line on an IndiaMART/JustDial listing routes through the directory rather than
-- ringing the company directly. Those are called out in the notes and are not
-- used as a primary number.
--
-- Idempotent, same guards as 20260823000006.

DO $$
DECLARE
  v_lead_id uuid;
BEGIN

  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Transerect Testing & Commissioning Engineers Pvt Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, 'S. V. Mahendra', 'Managing Director', 'C_SUITE', 'mahendra@transerect.com', 'PUBLISHED',
           '+91 98450 21735', NULL, 'http://www.transerect.com/contacts.html', true, 'Own-domain personal mailbox for the MD, plus a mobile (so WhatsApp works). Company has run since 1992. The seeded lead only had an IndiaMART link - transerect.com is their real site.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc WHERE lc.lead_id = v_lead_id AND (lower(lc.email) = lower('mahendra@transerect.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Transerect Testing & Commissioning Engineers Pvt Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'General enquiry', 'GENERIC', 'info@transerect.com', 'PUBLISHED',
           NULL, NULL, 'http://www.transerect.com/contacts.html', false, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc WHERE lc.lead_id = v_lead_id AND (lower(lc.email) = lower('info@transerect.com'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Sun and Jay Engineering Consultants Pvt Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'General enquiry', 'GENERIC', 'cv@sunjay.in', 'PUBLISHED',
           '+91 93814 08962', NULL, 'https://sunjay.in/contact-us/', true, 'sunjay.in is their real site; the seeded lead only had an IndiaMART link. Landline 044 4362 6250, second mobile +91 93805 08962.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc WHERE lc.lead_id = v_lead_id AND (lower(lc.email) = lower('cv@sunjay.in'))
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Akuntha Projects Pvt Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Switchboard / WhatsApp', 'GENERIC', NULL, 'UNVERIFIED',
           '+91 94264 02423', NULL, 'https://akuntha.com/contact-us/', false, 'Mobile published on their contact page, so WhatsApp is open. Also +91 75748 65980 and +91 89055 97080. Pair with ravi@akuntha.com.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc WHERE lc.lead_id = v_lead_id AND (lc.phone = '+91 94264 02423')
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'INEL Power Group' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Chennai switchboard', 'GENERIC', NULL, 'UNVERIFIED',
           '+91 44 2371 2710', NULL, 'https://www.inelpse.com', false, 'Landlines only, no mobile published: +91 44 2471 8925, +91 44 4854 9329.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc WHERE lc.lead_id = v_lead_id AND (lc.phone = '+91 44 2371 2710')
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Powertest Asia Pvt Ltd (PtA)' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Hyderabad switchboard', 'GENERIC', NULL, 'UNVERIFIED',
           '+91 40 2371 3343', NULL, 'https://powertestasia.com', false, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc WHERE lc.lead_id = v_lead_id AND (lc.phone = '+91 40 2371 3343')
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Ghaziabad Testing Laboratories Pvt Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Switchboard / WhatsApp', 'GENERIC', NULL, 'UNVERIFIED',
           '+91 76681 06301', NULL, 'https://gtllab.org', false, 'Both published numbers are mobiles (also +91 98110 54649), so WhatsApp works.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc WHERE lc.lead_id = v_lead_id AND (lc.phone = '+91 76681 06301')
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Voltage Infra Pvt Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Switchboard / WhatsApp', 'GENERIC', NULL, 'UNVERIFIED',
           '+91 98909 00311', NULL, 'https://voltageinfra.com', false, 'Mobile - WhatsApp open.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc WHERE lc.lead_id = v_lead_id AND (lc.phone = '+91 98909 00311')
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'SPML Infra Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Kolkata head office', 'GENERIC', NULL, 'UNVERIFIED',
           '+91 33 4009 1200', NULL, 'https://www.spml.co.in', false, 'Mobile +91 90997 57043 also published.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc WHERE lc.lead_id = v_lead_id AND (lc.phone = '+91 33 4009 1200')
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'G R Infraprojects Ltd (Power Division)' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Gurugram corporate office', 'GENERIC', NULL, 'UNVERIFIED',
           '+91 124 6435000', NULL, 'https://www.grinfra.com/contact-us/', false, 'Delhi +91 11 40111200. Use this - their contact page renders the email addresses as images/JS and they could not be read.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc WHERE lc.lead_id = v_lead_id AND (lc.phone = '+91 124 6435000')
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Techno Electric & Engineering Co Ltd (TEECL)' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Kolkata head office', 'GENERIC', NULL, 'UNVERIFIED',
           '+91 33 4051 3000', NULL, 'https://www.techno.co.in', false, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc WHERE lc.lead_id = v_lead_id AND (lc.phone = '+91 33 4051 3000')
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'InGrid (IndiGrid Investment Managers)' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Mumbai office', 'GENERIC', NULL, 'UNVERIFIED',
           '022 6924 1310', NULL, 'https://www.indigrid.co.in', false, 'Mobile +91 72084 93885 also published.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc WHERE lc.lead_id = v_lead_id AND (lc.phone = '022 6924 1310')
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'JSW Energy Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Mumbai switchboard', 'GENERIC', NULL, 'UNVERIFIED',
           '+91 22 4286 1000', NULL, 'https://www.jsw.in/energy', false, NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc WHERE lc.lead_id = v_lead_id AND (lc.phone = '+91 22 4286 1000')
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Reliserv Solution India' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Mobile', 'GENERIC', NULL, 'UNVERIFIED',
           '+91 85050 34712', NULL, 'https://www.reliserv.in', false, 'Mobile, so WhatsApp works - the better route given their website''s TLS certificate has expired. The 079-42723215 number on their listing is an IndiaMART call-tracking line, not a direct number.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc WHERE lc.lead_id = v_lead_id AND (lc.phone = '+91 85050 34712')
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Vedant Electricals & Filter Service' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Proprietor mobile', 'GENERIC', NULL, 'UNVERIFIED',
           '+91 90350 92572', NULL, 'https://www.justdial.com/Pune/Vedant-Electricals-and-Filter-Service', true, 'From a directory listing, not their own site. Their 079-49372834 listing number is an IndiaMART call-tracking line.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc WHERE lc.lead_id = v_lead_id AND (lc.phone = '+91 90350 92572')
    );
  END IF;
  SELECT id INTO v_lead_id FROM public.leads WHERE company_name = 'Sterling & Wilson (Pvt) Ltd' LIMIT 1;
  IF v_lead_id IS NOT NULL THEN
    INSERT INTO public.lead_contacts
      (lead_id, full_name, title, seniority, email, email_status, phone, linkedin_url, source_url, is_primary, notes)
    SELECT v_lead_id, NULL, 'Mumbai head office', 'GENERIC', NULL, 'UNVERIFIED',
           '+91 22 2548 5300', NULL, 'https://sterlingandwilson.com', false, 'City landlines published for Delhi 011-66134600, Bengaluru 080-67178600, Chennai 044-45025855, Kolkata 033-30118100.'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.lead_contacts lc WHERE lc.lead_id = v_lead_id AND (lc.phone = '+91 22 2548 5300')
    );
  END IF;

  -- Backfill leads.contact_phone from the primary contact where the lead has
  -- no number at all (only 2 of the 88 seeded leads carried one).
  UPDATE public.leads l
     SET contact_phone = c.phone
    FROM public.lead_contacts c
   WHERE c.lead_id = l.id AND c.is_primary
     AND l.contact_phone IS NULL AND c.phone IS NOT NULL;
END $$;
