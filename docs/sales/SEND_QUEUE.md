# Send queue — first campaign

Generated from `outreach_contacts.csv` joined against the `leads` seed
(`20260530000004_seed_leads.sql`). Regenerate with `scripts/gen_send_queue.py`.

**One message per company, not per address.** The 36 PUBLISHED addresses collapse
to **24 companies** — Akuntha alone publishes three. Mailing every address at one
company reads as spray and burns the best contact along with the worst. The extra
addresses are listed as bounce fallbacks, not as additional sends.

Rules that still apply, from `OUTREACH_SENDING_PLAN.md`:

- PUBLISHED addresses only. The UNVERIFIED rows are directory-sourced or
  inferred and are not in this queue.
- ~20/day maximum, spaced through the day, never a burst.
- Log every send as a `lead_activities` row, channel `EMAIL`. That log is what
  Phase 2 automation reads; without it this campaign leaves no trace.
- Hand-write each one. `Angle` below is the per-company research already done —
  it exists so no message has to be generic.


## Day 1 — 12 companies

### 1. Akuntha Projects Pvt Ltd  · priority 5

**To:** `ravi@akuntha.com` — Ravi Kamdar, Managing Director

**If it bounces:** `info@akuntha.com`, `sales@akuntha.com`

**Who they are:** EPC + T&C + O&M substations · Gujarat (Kutch + pan-Gujarat)

**Hook:** Substation erection, T&C, O&M, solar EPC; manages dozens of substations concurrently = high test-record volume pain

**Angle:** LinkedIn + website contact; Gujarat base aligns with GETCO expansion

**Note:** Strongest contact in the list: mailbox published on akuntha.com AND independently attributed to MD Ravi Kamdar (also director of record per MCA). Lead with this one.

**Source:** https://akuntha.com


### 2. Transerect Testing & Commissioning Engineers Pvt Ltd  · priority 5

**To:** `mahendra@transerect.com` — S. V. Mahendra, Managing Director

**If it bounces:** `info@transerect.com`

**Who they are:** Pure T&C · Malleswaram, Bengaluru

**Hook:** Company built purely around T&C; generators, transformers, HV/LV motors, GIS breakers; test report generation is core deliverable

**Angle:** LinkedIn Sales Navigator Karnataka filter; in-person Bengaluru demo

**Note:** Own-domain personal mailbox for the MD, plus a mobile (so WhatsApp works). Company has run since 1992. The seeded lead only had an IndiaMART link - transerect.com is their real site.

**Source:** https://m.indiamart.com/transerect-testing-commissioning-eng


### 3. ARRAA Energy  · priority 5

**To:** `enquiry@arraaenergy.com` — (role inbox), Enquiries

**Who they are:** Relay testing specialist · Chennai area

**Hook:** All protection relay types; IEC/IEEE-compliant; explicit relay testing service with formal test reports; quick-win target

**Angle:** Direct call (+91 90433 23091) listed on website

**Note:** Caution: this phone number is also published on gkexpertise.com. Either shared/outsourced reception or one of the two listings is stale - confirm which entity answers before calling.

**Source:** https://www.arraaenergy.com/relay-testing.php


### 4. Elite Powertech Pvt Ltd (EPPL)  · priority 5

**To:** `info@elitepowertech.in` — (role inbox), General enquiry

**Who they are:** Pure T&C + EPC · Pan-India (field teams)

**Hook:** Dedicated T&C team for EHV substations up to 765kV; protection, SCADA, PMC, O&M - runs many projects simultaneously

**Angle:** LinkedIn; show how report templates cut site-to-handover cycle

**Source:** https://elitepowertech.in


### 5. Eternergy Engineering Pvt Ltd  · priority 5

**To:** `info@eternergy.com.in` — (role inbox), General enquiry

**Who they are:** T&C specialist - HV/LV systems · India (projects in India & Australia)

**Hook:** Explicit T&C specialisation for EHV/HV substations, transformer yards, RMUs, pad-mount switchgear; IS standards-aligned

**Angle:** Website form + LinkedIn; international experience signals structured reporting pain

**Note:** India entity. Australian arm uses careers@eternergy.com.au.

**Source:** https://eternergy.com.in/testing-and-commissioning


### 6. GK Expertise / GK Power Expertise Pvt Ltd  · priority 5

**To:** `enquiry@gkexpertise.com` — (role inbox), Enquiries

**Who they are:** Pure T&C / relay & substation specialist · Chennai (HQ), Oman branch

**Hook:** Dedicated T&C company using OMICRON, Megger, Doble; programs all major relay makes; AIS & GIS; writes site test reports

**Angle:** LinkedIn Sales Navigator; demonstrate auto-drafted commissioning report

**Note:** Published on own contact page alongside +91 99940 54198 and +91 99409 99257.

**Source:** https://www.gkexpertise.com


### 7. INEL Power Group  · priority 5

**To:** `chennai@inelpse.com` — (role inbox), Chennai office (HQ)

**If it bounces:** `anandvarma@inelpse.com`, `bangalore@inelpse.com`, `hyderabad@inelpse.com`, `vizag@inelpse.com`

**Who they are:** Pure T&C contractor · Chennai (branches: Bengaluru, Hyderabad)

**Hook:** Since 1997; testing, commissioning, PM, O&M from 400V to 400kV across power, oil & gas, steel, cement; 100+ sites concurrent

**Angle:** Direct LinkedIn + phone; reference from TANGEDCO/TSGENCO project connections

**Note:** Published on inelpse.com. Group also runs bangalore@/hyderabad@/vizag@ regional inboxes.

**Source:** https://www.inelpse.com


### 8. Powertest Asia Pvt Ltd (PtA)  · priority 5

**To:** `info@powertestasia.com` — (role inbox), General enquiry

**Who they are:** TPIA / independent testing & inspection · Hyderabad (pan-India)

**Hook:** Independent T&C + TPQI; tan delta, SFRA, ELCID, PDA, OMICRON suites; not tied to any OEM = unbiased report quality

**Angle:** LinkedIn + direct call; pitch as the digital layer under their test-cert workflow

**Source:** https://powertestasia.com


### 9. Sun and Jay Engineering Consultants Pvt Ltd  · priority 5

**To:** `cv@sunjay.in` — (role inbox), General enquiry

**Who they are:** T&C + SCADA · Mogappair, Chennai

**Hook:** Pre-commissioning tests, switchyard T&C, SCADA, relay testing, protection - Tamil Nadu / South India; multi-make relay expertise

**Angle:** Phone + email via IndiaMART; Chennai office visit

**Note:** sunjay.in is their real site; the seeded lead only had an IndiaMART link. Landline 044 4362 6250, second mobile +91 93805 08962.

**Source:** https://m.indiamart.com/sun-jay-engineering/profile.html


### 10. HEC Infra Projects Ltd  · priority 4

**To:** `elect@hecproject.com` — (role inbox), Electrical division

**If it bounces:** `cs@hecproject.com`

**Who they are:** EPC - substations + transmission · Ahmedabad, Gujarat

**Hook:** SITC substations up to 220kV; GETCO license; PowerGrid contracts (400/220kV substation augmentation); field teams

**Angle:** LinkedIn; target Gujarat + Rajasthan field ops

**Note:** Best-targeted generic inbox found: it is the ELECTRICAL division, not a catch-all. Note the live domain is hecprojects.in / hecproject.com - the source_url on this lead (tradebrains news article) is not their site.

**Source:** https://tradebrains.in/hec-infra-projects-bags-11-89-cr-powergrid-order-for-substation-augmentation


### 11. Hartek Power Pvt Ltd / Hartek Group  · priority 4

**To:** `info@hartek.com` — (role inbox), General enquiry

**Who they are:** T&D EPC - top 3 India · Mohali, Punjab (pan-India)

**Hook:** India Top-3 substation EPC; 765kV, 400kV, solar + substation; multiple concurrent sites nationally

**Angle:** LinkedIn Sales Navigator; attend ELECRAMA / Hartek events; pilot at Punjab/Himachal project

**Source:** https://hartek.com/business/power-system


### 12. Jyoti Structures Ltd  · priority 4

**To:** `contact@jsl.co.in` — (role inbox), General enquiry

**Who they are:** T&D EPC (mid-large) · Mumbai

**Hook:** Substation EPC 11kV-765kV; recently won ₹639 Cr order for 765kV/400kV TL; substation T&C embedded in EPC delivery

**Angle:** LinkedIn; target their commissioning/project management team

**Source:** https://jyotistructures.in/sub-station



## Day 2 — 12 companies

### 1. NCC Limited (Electrical T&D Division)  · priority 4

**To:** `info@nccltd.in` — (role inbox), Corporate office

**If it bounces:** `ro.mumbai@nccltd.in`

**Who they are:** T&D EPC · Hyderabad

**Hook:** Expertise in EHV/HV substation ETC + transmission lines; RDSS/33-11kV substations in Maharashtra currently

**Angle:** LinkedIn; cite Maharashtra RDSS substation recruitment

**Note:** No electrical-division-specific inbox published. Regional offices are ro.<city>@nccltd.in - ro.mumbai@nccltd.in is the right one for their Maharashtra RDSS substation work.

**Source:** https://ncclimited.com/electrical.html


### 2. Techno Electric & Engineering Co Ltd (TEECL)  · priority 4

**To:** `techno.email@techno.co.in` — (role inbox), General enquiry

**If it bounces:** `desk.investors@techno.co.in`

**Who they are:** T&D EPC (large) · Kolkata

**Hook:** Substation EPC 765kV; 17 concurrent project sites; internal T&C teams; field engineers need digital test tracking

**Angle:** LinkedIn + annual report contacts; position as project tracking tool

**Source:** https://www.techno.co.in


### 3. Voltage Infra Pvt Ltd  · priority 4

**To:** `marketing@volt-age.in` — (role inbox), Marketing

**Who they are:** Solar EPC + electrical contracting · Pune, Maharashtra

**Hook:** Solar EPC + conventional electrical contracting for government and private; substation O&M testing services

**Angle:** Website contact + LinkedIn Maharashtra

**Note:** Note the mail domain is volt-age.in, not voltageinfra.com.

**Source:** https://voltageinfra.com/service/om-and-testing-services-in-india


### 4. Bharat Test House Pvt Ltd (BTHPL)  · priority 3

**To:** `bthrai@bharattesthouse.com` — (role inbox), General enquiry

**Who they are:** NABL testing lab (electrical + solar) · Delhi NCR

**Hook:** Multi-disciplinary testing including electrical; solar PV; BIS/NABL approved; some substation equipment testing

**Angle:** Email + lab directory

**Source:** https://www.bharattesthouse.com


### 5. Ghaziabad Testing Laboratories Pvt Ltd  · priority 3

**To:** `info@gtllab.org` — (role inbox), General enquiry

**Who they are:** NABL testing lab · Ghaziabad, UP

**Hook:** HV/MV testing (MV circuit disconnectors, earthing switches, contactors); independent NABL lab

**Angle:** Direct via website + NABL directory

**Source:** https://gtllab.org/electrical-testing-lab-in-delhi-india


### 6. InGrid (IndiGrid Investment Managers)  · priority 3

**To:** `info@indigrid.com` — (role inbox), General enquiry

**Who they are:** Private transmission infra · Mumbai

**Hook:** 16 substations, 25,050 MVA transformation; TEECL executes projects; T&C embedded

**Angle:** LinkedIn; TEECL connection

**Note:** InvIT that OWNS transmission assets - O&M contractor angle, different pitch from an EPC.

**Source:** https://www.indigrid.co.in


### 7. Navayuga Engineering Co Ltd  · priority 3

**To:** `nec@navayuga.com` — (role inbox), Corporate

**Who they are:** EPC · Hyderabad

**Hook:** Power sector EPC; hydro + thermal + T&D

**Angle:** LinkedIn + industry events

**Note:** Regional inboxes: necvizag@ / neckolkata@ / delhi@ navayuga.com.

**Source:** https://navayuga.com


### 8. Power Mech Projects Ltd  · priority 3

**To:** `info@powermech.net` — (role inbox), General enquiry

**If it bounces:** `mumbai@powermech.net`

**Who they are:** EPC + O&M (power) · Secunderabad

**Hook:** BOP, electrical works, substations; T&C embedded in project delivery

**Angle:** LinkedIn

**Note:** City inboxes published too: mumbai@ / delhi@ / nagpur@ / kolkatta@ powermech.net.

**Source:** https://powermechprojects.com


### 9. SPML Infra Ltd  · priority 3

**To:** `info@spml.co.in` — (role inbox), General enquiry

**Who they are:** Infrastructure EPC (incl. power) · New Delhi

**Hook:** BESS + power EPC; substation integration; DISCOM projects

**Angle:** LinkedIn

**Source:** https://www.spml.co.in


### 10. Tata Power (T&C / O&M arm)  · priority 3

**To:** `transmission_tp@tatapower.com` — (role inbox), Transmission business

**Who they are:** Integrated power utility · Mumbai

**Hook:** Tata Power Renewable Energy Ltd's EPC arm; solar + wind substations; DISCOM O&M in Delhi/Mumbai

**Angle:** LinkedIn; corporate procurement

**Note:** Transmission-specific inbox - the most on-target of the many tatapower.com addresses published.

**Source:** https://www.tatapower.com


### 11. KEC International Ltd  · priority 2

**To:** `kecindia@kecrpg.com` — (role inbox), General enquiry

**Who they are:** T&D EPC · Mumbai

**Hook:** Transmission lines + substations; T&C embedded

**Angle:** LinkedIn; KEC annual conference

**Note:** Only address published; no divisional inbox.

**Source:** https://kecrpg.com


### 12. Sterling & Wilson (Pvt) Ltd  · priority 2

**To:** `info@sterlingwilson.com` — (role inbox), General enquiry

**If it bounces:** `mumbai@sterlingwilson.com`

**Who they are:** Solar EPC + services · Mumbai

**Hook:** Solar project EPC + O&M; commissioning substations

**Angle:** LinkedIn

**Note:** City inboxes also published: mumbai@ / bangalore@ / chennai@ / kolkata@ / cochin@ sterlingwilson.com.

**Source:** https://sterlingandwilson.com



## Sending checklist

Per message, before hitting send:

- [ ] Names the company's actual work — the Hook line, not "your organisation"
- [ ] Says where the address came from (their website). Honesty is cheap and it
      is what DPDP-era compliance looks like in practice
- [ ] Carries a real signature: name, Optimus Testing, optimustesting.com, phone
- [ ] Has a plain opt-out line — "reply STOP and I won't write again" — and it
      gets honoured permanently
- [ ] Logged as a `lead_activities` row afterwards

Expected, per `OUTREACH_SENDING_PLAN.md`: a handful of replies, 1-3 demos. The
named contacts are worth more effort than the role inboxes.
