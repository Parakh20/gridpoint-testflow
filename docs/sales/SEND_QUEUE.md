# Send queue — first campaign

Generated from `outreach_contacts.csv` joined against the `leads` seed
(`20260530000004_seed_leads.sql`). Regenerate with `scripts/gen_send_queue.py`.

## Phase 1 targets small companies only

10 of the 24 companies with a published address, and it is the
size filter doing the cutting rather than the fit score. A 50-person T&C outfit
has one decision maker who can say yes on a call. A listed EPC has a procurement
process that outlasts a pre-revenue runway however well the product fits, and a
pilot there is measured in quarters.

The 14 larger firms are listed at the end. They are not disqualified — they
are the wrong *first* customer. Come back to them with a reference.

Ranking is by size first, not by the `priority` score: Voltage Infra sits at
priority 4 with 50-200 staff, above several priority-5 firms with 400+ engineers.

**One message per company, not per address.** The 36 PUBLISHED addresses
collapse to 24 companies — Akuntha alone publishes three. Mailing every
address at one company reads as spray and burns the best contact along with the
worst. The extras are bounce fallbacks, not additional sends.

Rules from `OUTREACH_SENDING_PLAN.md` that still apply:

- PUBLISHED addresses only. The UNVERIFIED rows are directory-sourced or inferred
  and are not in this queue.
- ~20/day maximum, spaced through the day, never a burst. Phase 1 fits in one day.
- Log every send as a `lead_activities` row, channel `EMAIL`. Without it the
  campaign leaves no record and Phase 2 automation has nothing to read.
- Hand-write the hook. `Angle` below is the per-company research already done.


## Phase 1 — 10 small and mid-size companies

### 1. Akuntha Projects Pvt Ltd  · SMALL · priority 5

**To:** `ravi@akuntha.com` — Ravi Kamdar, Managing Director

**If it bounces:** `info@akuntha.com`, `sales@akuntha.com`

**Size:** 50-200 staff; GETCO-registered contractor; manages several dozens of substations

**Hook:** Substation erection, T&C, O&M, solar EPC; manages dozens of substations concurrently = high test-record volume pain

**Angle:** LinkedIn + website contact; Gujarat base aligns with GETCO expansion

**Who they are:** EPC + T&C + O&M substations · Gujarat (Kutch + pan-Gujarat)

**Note:** Strongest contact in the list: mailbox published on akuntha.com AND independently attributed to MD Ravi Kamdar (also director of record per MCA). Lead with this one.

**Source:** https://akuntha.com


### 2. Transerect Testing & Commissioning Engineers Pvt Ltd  · SMALL · priority 5

**To:** `mahendra@transerect.com` — S. V. Mahendra, Managing Director

**If it bounces:** `info@transerect.com`

**Size:** 14 years on IndiaMART; calibration for relays, CTs, transformers, GIS, switchgear

**Hook:** Company built purely around T&C; generators, transformers, HV/LV motors, GIS breakers; test report generation is core deliverable

**Angle:** LinkedIn Sales Navigator Karnataka filter; in-person Bengaluru demo

**Who they are:** Pure T&C · Malleswaram, Bengaluru

**Note:** Own-domain personal mailbox for the MD, plus a mobile (so WhatsApp works). Company has run since 1992. The seeded lead only had an IndiaMART link - transerect.com is their real site.

**Source:** https://m.indiamart.com/transerect-testing-commissioning-eng


### 3. ARRAA Energy  · SMALL · priority 5

**To:** `enquiry@arraaenergy.com` — (role inbox), Enquiries

**Size:** Small specialist team; OMICRON, Megger, Doble

**Hook:** All protection relay types; IEC/IEEE-compliant; explicit relay testing service with formal test reports; quick-win target

**Angle:** Direct call (+91 90433 23091) listed on website

**Who they are:** Relay testing specialist · Chennai area

**Note:** Caution: this phone number is also published on gkexpertise.com. Either shared/outsourced reception or one of the two listings is stale - confirm which entity answers before calling.

**Source:** https://www.arraaenergy.com/relay-testing.php


### 4. GK Expertise / GK Power Expertise Pvt Ltd  · SMALL · priority 5

**To:** `enquiry@gkexpertise.com` — (role inbox), Enquiries

**Size:** 50-200 engineers, multi-country; explicit relay testing, circuit breaker, transformer, SCADA commissioning

**Hook:** Dedicated T&C company using OMICRON, Megger, Doble; programs all major relay makes; AIS & GIS; writes site test reports

**Angle:** LinkedIn Sales Navigator; demonstrate auto-drafted commissioning report

**Who they are:** Pure T&C / relay & substation specialist · Chennai (HQ), Oman branch

**Note:** Published on own contact page alongside +91 99940 54198 and +91 99409 99257.

**Source:** https://www.gkexpertise.com


### 5. Powertest Asia Pvt Ltd (PtA)  · SMALL · priority 5

**To:** `info@powertestasia.com` — (role inbox), General enquiry

**Size:** ISO 9001; since 1995; serves OEMs, utilities, service providers

**Hook:** Independent T&C + TPQI; tan delta, SFRA, ELCID, PDA, OMICRON suites; not tied to any OEM = unbiased report quality

**Angle:** LinkedIn + direct call; pitch as the digital layer under their test-cert workflow

**Who they are:** TPIA / independent testing & inspection · Hyderabad (pan-India)

**Source:** https://powertestasia.com


### 6. Sun and Jay Engineering Consultants Pvt Ltd  · SMALL · priority 5

**To:** `cv@sunjay.in` — (role inbox), General enquiry

**Size:** 14 yrs; 2005-founded; serves ABB, Siemens, GE, SEL, Alstom relay makes

**Hook:** Pre-commissioning tests, switchyard T&C, SCADA, relay testing, protection - Tamil Nadu / South India; multi-make relay expertise

**Angle:** Phone + email via IndiaMART; Chennai office visit

**Who they are:** T&C + SCADA · Mogappair, Chennai

**Note:** sunjay.in is their real site; the seeded lead only had an IndiaMART link. Landline 044 4362 6250, second mobile +91 93805 08962.

**Source:** https://m.indiamart.com/sun-jay-engineering/profile.html


### 7. Voltage Infra Pvt Ltd  · SMALL · priority 4

**To:** `marketing@volt-age.in` — (role inbox), Marketing

**Size:** 50-200 staff; fast-growing

**Hook:** Solar EPC + conventional electrical contracting for government and private; substation O&M testing services

**Angle:** Website contact + LinkedIn Maharashtra

**Who they are:** Solar EPC + electrical contracting · Pune, Maharashtra

**Note:** Note the mail domain is volt-age.in, not voltageinfra.com.

**Source:** https://voltageinfra.com/service/om-and-testing-services-in-india


### 8. Ghaziabad Testing Laboratories Pvt Ltd  · SMALL · priority 3

**To:** `info@gtllab.org` — (role inbox), General enquiry

**Size:** NABL TC:11707; ISO-certified; top-3 electrical testing lab India

**Hook:** HV/MV testing (MV circuit disconnectors, earthing switches, contactors); independent NABL lab

**Angle:** Direct via website + NABL directory

**Who they are:** NABL testing lab · Ghaziabad, UP

**Source:** https://gtllab.org/electrical-testing-lab-in-delhi-india


### 9. Elite Powertech Pvt Ltd (EPPL)  · MID · priority 5

**To:** `info@elitepowertech.in` — (role inbox), General enquiry

**Size:** 200-500 engineers; T&C up to 765kV; solar O&M, EPC substations

**Hook:** Dedicated T&C team for EHV substations up to 765kV; protection, SCADA, PMC, O&M - runs many projects simultaneously

**Angle:** LinkedIn; show how report templates cut site-to-handover cycle

**Who they are:** Pure T&C + EPC · Pan-India (field teams)

**Source:** https://elitepowertech.in


### 10. Eternergy Engineering Pvt Ltd  · MID · priority 5

**To:** `info@eternergy.com.in` — (role inbox), General enquiry

**Size:** Mid-size; multi-industry (utilities, renewables, rail, commercial)

**Hook:** Explicit T&C specialisation for EHV/HV substations, transformer yards, RMUs, pad-mount switchgear; IS standards-aligned

**Angle:** Website form + LinkedIn; international experience signals structured reporting pain

**Who they are:** T&C specialist - HV/LV systems · India (projects in India & Australia)

**Note:** India entity. Australian arm uses careers@eternergy.com.au.

**Source:** https://eternergy.com.in/testing-and-commissioning



## Deferred — 14 large or listed firms

Not in the first campaign. Each has a published address ready for the day
there is a reference customer to name.

- **INEL Power Group** — `chennai@inelpse.com` · 400+ engineers, 100+ support staff, ₹27 Cr turnover, licenses in TN/AP/MH/KA
- **HEC Infra Projects Ltd** — `elect@hecproject.com` · Listed (~₹135 Cr market cap); 300+ landmarks; GETCO + PowerGrid contractor
- **Hartek Power Pvt Ltd / Hartek Group** — `info@hartek.com` · 1,000+ employees; 400+ EHV/HV substation projects; 21 states
- **Jyoti Structures Ltd** — `contact@jsl.co.in` · Listed; ₹165 Cr revenue FY25; 750+ employees
- **NCC Limited (Electrical T&D Division)** — `info@nccltd.in` · Listed; large pan-India
- **Techno Electric & Engineering Co Ltd (TEECL)** — `techno.email@techno.co.in` · Listed; ~₹2,400 Cr revenue FY25; 17 active sites
- **Bharat Test House Pvt Ltd (BTHPL)** — `bthrai@bharattesthouse.com` · Large multi-lab; NABL accredited
- **InGrid (IndiGrid Investment Managers)** — `info@indigrid.com` · SEBI-listed InvIT; AUM ₹324B
- **Navayuga Engineering Co Ltd** — `nec@navayuga.com` · Large private
- **Power Mech Projects Ltd** — `info@powermech.net` · Listed; ₹5,000+ Cr revenue
- **SPML Infra Ltd** — `info@spml.co.in` · Listed; ₹13 Cr market cap
- **Tata Power (T&C / O&M arm)** — `transmission_tp@tatapower.com` · Listed; large
- **KEC International Ltd** — `kecindia@kecrpg.com` · Listed; global
- **Sterling & Wilson (Pvt) Ltd** — `info@sterlingwilson.com` · Listed; large


## Sending checklist

Per message, before hitting send:

- [ ] Names the company's actual work — the Hook line, not "your organisation"
- [ ] Says where the address came from (their website)
- [ ] Carries a real signature: name, Optimus Testing, phone
- [ ] No "reply STOP" boilerplate — it reads as bulk mail. Anyone who asks to
      stop is marked OPTED_OUT on their contact instead, which send_outreach_draft
      refuses permanently
- [ ] Logged as a `lead_activities` row afterwards

Expected: a handful of replies, 1-3 demos. The named contacts are worth more
effort than the role inboxes.
