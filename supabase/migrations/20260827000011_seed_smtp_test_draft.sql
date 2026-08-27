-- A self-addressed draft, so the first SMTP send is a test rather than a real
-- cold email to the best contact in the list.
--
-- Without this the only way to prove the pipe works is to send draft 1 to a
-- named managing director, and if the From header, the line breaks or the spam
-- placement turn out wrong, that is the one address most likely to have replied
-- spent on finding out.
--
-- Routed through a lead and a lead_contacts row rather than a free-text address,
-- because send_outreach_draft re-resolves the recipient through contact_id and
-- refuses a draft without one. That guard is what stops a leaked platform token
-- mailing the world from a personal Gmail account, so the test goes through it
-- rather than around it.
--
-- Parked at stage PARKED and priority 1 on purpose: PARKED is excluded from
-- every bucket in the outreach queue, so this never appears as work to do.

-- WHERE NOT EXISTS rather than ON CONFLICT: leads has no unique constraint on
-- company_name, so ON CONFLICT DO NOTHING would only ever catch a primary-key
-- collision on a freshly generated uuid -- i.e. never -- and a re-run would
-- quietly insert a second test lead, making the join below ambiguous.
INSERT INTO public.leads (company_name, segment, region, stage, priority, notes)
SELECT 'SMTP test (internal)', 'Internal', 'n/a', 'PARKED', 1,
       'Not a prospect. Exists so outbound SMTP can be verified end to end without spending a real contact on it.'
 WHERE NOT EXISTS (
   SELECT 1 FROM public.leads WHERE company_name = 'SMTP test (internal)'
 );

INSERT INTO public.lead_contacts (lead_id, full_name, title, seniority, email, email_status, is_primary, notes)
SELECT l.id, 'Parakh Sharma', 'Self (test recipient)', 'C_SUITE',
       'sharmaparakh05@gmail.com', 'PUBLISHED', true,
       'Own address. Used to verify SMTP delivery, From header and plain-text formatting.'
  FROM public.leads l
 WHERE l.company_name = 'SMTP test (internal)'
ON CONFLICT (lead_id, lower(email)) WHERE email IS NOT NULL DO NOTHING;

-- The body deliberately exercises the things that break in transit: a long
-- paragraph that must not be re-wrapped oddly, blank lines between paragraphs,
-- the em dash and other non-ASCII, and the one link the real drafts carry.
INSERT INTO public.outreach_drafts (lead_id, contact_id, to_email, to_name, subject, body)
SELECT l.id, c.id, c.email, c.full_name,
       'SMTP test — TestFlow admin panel',
       'This is a test send from the TestFlow admin panel.

Check four things in this message:

1. The From header reads Parakh Sharma <sharmaparakh05@gmail.com>, not a bare
   address and not a Gmail "on behalf of" note.
2. These line breaks and blank lines survived — the real drafts are plain text
   and depend on them.
3. Non-ASCII came through intact: em dash —, rupee ₹, and the accented e in
   resume vs résumé.
4. The link is clickable and correct: https://optimustesting.com

If all four are right, and this landed in the inbox rather than spam, the
outreach drafts are safe to send.

Parakh Sharma
Optimus Testing
+91 94135 52887'
  FROM public.leads l
  JOIN public.lead_contacts c ON c.lead_id = l.id
 WHERE l.company_name = 'SMTP test (internal)'
   AND lower(c.email) = 'sharmaparakh05@gmail.com'
ON CONFLICT (contact_id) WHERE contact_id IS NOT NULL DO NOTHING;
