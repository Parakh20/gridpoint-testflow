# Email drafts — first campaign

One message per company, 24 in total, generated from
`outreach_contacts.csv` and the `leads` seed. Regenerate with
`python3 scripts/gen_email_drafts.py`. Templates and the reasoning behind the
copy: [EMAIL_TEMPLATES.md](EMAIL_TEMPLATES.md). Addresses and bounce fallbacks:
[SEND_QUEUE.md](SEND_QUEUE.md).

**Every draft has one deliberate blank.** `{HOOK ...}` is the only sentence in
the message that proves a person read their website, and it is left empty on
purpose: the research below each draft is notes, not prose, and no template
turns notes into a sentence that reads like a human wrote it. Write that line
yourself. It takes about twenty seconds and it is the entire difference between
this campaign and a blast.

Two other rules, repeated here because they are easy to lose while pasting:
send plain text with no attachment, and never imply a customer that doesn't
exist yet.


---

## 1. Akuntha Projects Pvt Ltd

**To:** `ravi@akuntha.com` — Ravi Kamdar, Managing Director  ·  priority 5

**If it bounces:** `info@akuntha.com`, `sales@akuntha.com`

**Subject:** `Akuntha Projects's commissioning test records — from IIT Bombay`

**Research — turn one of these into the hook sentence:**

- EPC + T&C + O&M substations · Gujarat
- Why they fit: Substation erection, T&C, O&M, solar EPC; manages dozens of substations concurrently = high test-record volume pain
- Angle: LinkedIn + website contact; Gujarat base aligns with GETCO expansion

```
Mr Kamdar,

I'm Parakh Sharma, at IIT Bombay. I've built TestFlow — commissioning software
for substation testing teams. I got your address from akuntha.com.

What it does: your engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later from whatever is on which laptop.

{HOOK — one sentence naming their actual work. See research above.}

It's live at https://optimustesting.com — worth a two-minute look before you
decide whether to reply.

I'd like to run one of your projects on it end to end, free. If it doesn't save
your team time at handover, you've lost nothing but the call.

15 minutes this week?

Parakh Sharma
Optimus Testing
+91 94135 52887

If you'd rather not hear from me, reply STOP and I won't write again.
```


---

## 2. Transerect Testing & Commissioning Engineers Pvt Ltd

**To:** `mahendra@transerect.com` — S. V. Mahendra, Managing Director  ·  priority 5

**If it bounces:** `info@transerect.com`

**Subject:** `Transerect Testing & Commissioning Engineers's commissioning test records — from IIT Bombay`

**Research — turn one of these into the hook sentence:**

- Pure T&C · Malleswaram, Bengaluru
- Why they fit: Company built purely around T&C; generators, transformers, HV/LV motors, GIS breakers; test report generation is core deliverable
- Angle: LinkedIn Sales Navigator Karnataka filter; in-person Bengaluru demo

```
Mr Mahendra,

I'm Parakh Sharma, at IIT Bombay. I've built TestFlow — commissioning software
for substation testing teams. I got your address from transerect.com.

What it does: your engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later from whatever is on which laptop.

{HOOK — one sentence naming their actual work. See research above.}

It's live at https://optimustesting.com — worth a two-minute look before you
decide whether to reply.

I'd like to run one of your projects on it end to end, free. If it doesn't save
your team time at handover, you've lost nothing but the call.

15 minutes this week?

Parakh Sharma
Optimus Testing
+91 94135 52887

If you'd rather not hear from me, reply STOP and I won't write again.
```


---

## 3. ARRAA Energy

**To:** `enquiry@arraaenergy.com` — Enquiries  ·  priority 5

**Subject:** `For your T&C head — commissioning software from IIT Bombay`

**Research — turn one of these into the hook sentence:**

- Relay testing specialist · Chennai area
- Why they fit: All protection relay types; IEC/IEEE-compliant; explicit relay testing service with formal test reports; quick-win target
- Angle: Direct call (+91 90433 23091) listed on website

```
Hello,

I'm Parakh Sharma, at IIT Bombay. I've built commissioning software for
substation testing teams, and I got this address from your website. **If this
isn't your area, please forward it to whoever runs testing & commissioning.**

What it does: engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later.

{HOOK — one sentence naming their actual work. See research above.}

It's live at https://optimustesting.com — worth a two-minute look before you
decide whether to reply.

I'd like to run one of your projects on it end to end, free. If it doesn't save
your team time at handover, you've lost nothing but the call.

15 minutes this week?

Parakh Sharma
Optimus Testing
+91 94135 52887

Reply STOP and I won't write again.
```


---

## 4. Elite Powertech Pvt Ltd (EPPL)

**To:** `info@elitepowertech.in` — General enquiry  ·  priority 5

**Subject:** `For your T&C head — commissioning software from IIT Bombay`

**Research — turn one of these into the hook sentence:**

- Pure T&C + EPC · Pan-India
- Why they fit: Dedicated T&C team for EHV substations up to 765kV; protection, SCADA, PMC, O&M - runs many projects simultaneously
- Angle: LinkedIn; show how report templates cut site-to-handover cycle

```
Hello,

I'm Parakh Sharma, at IIT Bombay. I've built commissioning software for
substation testing teams, and I got this address from your website. **If this
isn't your area, please forward it to whoever runs testing & commissioning.**

What it does: engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later.

{HOOK — one sentence naming their actual work. See research above.}

It's live at https://optimustesting.com — worth a two-minute look before you
decide whether to reply.

I'd like to run one of your projects on it end to end, free. If it doesn't save
your team time at handover, you've lost nothing but the call.

15 minutes this week?

Parakh Sharma
Optimus Testing
+91 94135 52887

Reply STOP and I won't write again.
```


---

## 5. Eternergy Engineering Pvt Ltd

**To:** `info@eternergy.com.in` — General enquiry  ·  priority 5

**Subject:** `For your T&C head — commissioning software from IIT Bombay`

**Research — turn one of these into the hook sentence:**

- T&C specialist - HV/LV systems · India
- Why they fit: Explicit T&C specialisation for EHV/HV substations, transformer yards, RMUs, pad-mount switchgear; IS standards-aligned
- Angle: Website form + LinkedIn; international experience signals structured reporting pain

```
Hello,

I'm Parakh Sharma, at IIT Bombay. I've built commissioning software for
substation testing teams, and I got this address from your website. **If this
isn't your area, please forward it to whoever runs testing & commissioning.**

What it does: engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later.

{HOOK — one sentence naming their actual work. See research above.}

It's live at https://optimustesting.com — worth a two-minute look before you
decide whether to reply.

I'd like to run one of your projects on it end to end, free. If it doesn't save
your team time at handover, you've lost nothing but the call.

15 minutes this week?

Parakh Sharma
Optimus Testing
+91 94135 52887

Reply STOP and I won't write again.
```


---

## 6. GK Expertise / GK Power Expertise Pvt Ltd

**To:** `enquiry@gkexpertise.com` — Enquiries  ·  priority 5

**Subject:** `For your T&C head — commissioning software from IIT Bombay`

**Research — turn one of these into the hook sentence:**

- Pure T&C / relay & substation specialist · Chennai
- Why they fit: Dedicated T&C company using OMICRON, Megger, Doble; programs all major relay makes; AIS & GIS; writes site test reports
- Angle: LinkedIn Sales Navigator; demonstrate auto-drafted commissioning report

```
Hello,

I'm Parakh Sharma, at IIT Bombay. I've built commissioning software for
substation testing teams, and I got this address from your website. **If this
isn't your area, please forward it to whoever runs testing & commissioning.**

What it does: engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later.

{HOOK — one sentence naming their actual work. See research above.}

It's live at https://optimustesting.com — worth a two-minute look before you
decide whether to reply.

I'd like to run one of your projects on it end to end, free. If it doesn't save
your team time at handover, you've lost nothing but the call.

15 minutes this week?

Parakh Sharma
Optimus Testing
+91 94135 52887

Reply STOP and I won't write again.
```


---

## 7. INEL Power Group

**To:** `chennai@inelpse.com` — Chennai office (HQ)  ·  priority 5

**If it bounces:** `anandvarma@inelpse.com`, `bangalore@inelpse.com`, `hyderabad@inelpse.com`, `vizag@inelpse.com`

**Subject:** `For your T&C head — commissioning software from IIT Bombay`

**Research — turn one of these into the hook sentence:**

- Pure T&C contractor · Chennai
- Why they fit: Since 1997; testing, commissioning, PM, O&M from 400V to 400kV across power, oil & gas, steel, cement; 100+ sites concurrent
- Angle: Direct LinkedIn + phone; reference from TANGEDCO/TSGENCO project connections

```
Hello,

I'm Parakh Sharma, at IIT Bombay. I've built commissioning software for
substation testing teams, and I got this address from your website. **If this
isn't your area, please forward it to whoever runs testing & commissioning.**

What it does: engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later.

{HOOK — one sentence naming their actual work. See research above.}

It's live at https://optimustesting.com — worth a two-minute look before you
decide whether to reply.

I'd like to run one of your projects on it end to end, free. If it doesn't save
your team time at handover, you've lost nothing but the call.

15 minutes this week?

Parakh Sharma
Optimus Testing
+91 94135 52887

Reply STOP and I won't write again.
```


---

## 8. Powertest Asia Pvt Ltd (PtA)

**To:** `info@powertestasia.com` — General enquiry  ·  priority 5

**Subject:** `For your T&C head — commissioning software from IIT Bombay`

**Research — turn one of these into the hook sentence:**

- TPIA / independent testing & inspection · Hyderabad
- Why they fit: Independent T&C + TPQI; tan delta, SFRA, ELCID, PDA, OMICRON suites; not tied to any OEM = unbiased report quality
- Angle: LinkedIn + direct call; pitch as the digital layer under their test-cert workflow

```
Hello,

I'm Parakh Sharma, at IIT Bombay. I've built commissioning software for
substation testing teams, and I got this address from your website. **If this
isn't your area, please forward it to whoever runs testing & commissioning.**

What it does: engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later.

{HOOK — one sentence naming their actual work. See research above.}

It's live at https://optimustesting.com — worth a two-minute look before you
decide whether to reply.

I'd like to run one of your projects on it end to end, free. If it doesn't save
your team time at handover, you've lost nothing but the call.

15 minutes this week?

Parakh Sharma
Optimus Testing
+91 94135 52887

Reply STOP and I won't write again.
```


---

## 9. Sun and Jay Engineering Consultants Pvt Ltd

**To:** `cv@sunjay.in` — General enquiry  ·  priority 5

**Subject:** `For your T&C head — commissioning software from IIT Bombay`

**Research — turn one of these into the hook sentence:**

- T&C + SCADA · Mogappair, Chennai
- Why they fit: Pre-commissioning tests, switchyard T&C, SCADA, relay testing, protection - Tamil Nadu / South India; multi-make relay expertise
- Angle: Phone + email via IndiaMART; Chennai office visit

```
Hello,

I'm Parakh Sharma, at IIT Bombay. I've built commissioning software for
substation testing teams, and I got this address from your website. **If this
isn't your area, please forward it to whoever runs testing & commissioning.**

What it does: engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later.

{HOOK — one sentence naming their actual work. See research above.}

It's live at https://optimustesting.com — worth a two-minute look before you
decide whether to reply.

I'd like to run one of your projects on it end to end, free. If it doesn't save
your team time at handover, you've lost nothing but the call.

15 minutes this week?

Parakh Sharma
Optimus Testing
+91 94135 52887

Reply STOP and I won't write again.
```


---

## 10. HEC Infra Projects Ltd

**To:** `elect@hecproject.com` — Electrical division  ·  priority 4

**If it bounces:** `cs@hecproject.com`

**Subject:** `For your T&C head — commissioning software from IIT Bombay`

**Research — turn one of these into the hook sentence:**

- EPC - substations + transmission · Ahmedabad, Gujarat
- Why they fit: SITC substations up to 220kV; GETCO license; PowerGrid contracts (400/220kV substation augmentation); field teams
- Angle: LinkedIn; target Gujarat + Rajasthan field ops

```
Hello,

I'm Parakh Sharma, at IIT Bombay. I've built commissioning software for
substation testing teams, and I got this address from your website. **If this
isn't your area, please forward it to whoever runs testing & commissioning.**

What it does: engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later.

{HOOK — one sentence naming their actual work. See research above.}

It's live at https://optimustesting.com — worth a two-minute look before you
decide whether to reply.

I'd like to run one of your projects on it end to end, free. If it doesn't save
your team time at handover, you've lost nothing but the call.

15 minutes this week?

Parakh Sharma
Optimus Testing
+91 94135 52887

Reply STOP and I won't write again.
```


---

## 11. Hartek Power Pvt Ltd / Hartek Group

**To:** `info@hartek.com` — General enquiry  ·  priority 4

**Subject:** `For your T&C head — commissioning software from IIT Bombay`

**Research — turn one of these into the hook sentence:**

- T&D EPC - top 3 India · Mohali, Punjab
- Why they fit: India Top-3 substation EPC; 765kV, 400kV, solar + substation; multiple concurrent sites nationally
- Angle: LinkedIn Sales Navigator; attend ELECRAMA / Hartek events; pilot at Punjab/Himachal project

```
Hello,

I'm Parakh Sharma, at IIT Bombay. I've built commissioning software for
substation testing teams, and I got this address from your website. **If this
isn't your area, please forward it to whoever runs testing & commissioning.**

What it does: engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later.

{HOOK — one sentence naming their actual work. See research above.}

It's live at https://optimustesting.com — worth a two-minute look before you
decide whether to reply.

I'd like to run one of your projects on it end to end, free. If it doesn't save
your team time at handover, you've lost nothing but the call.

15 minutes this week?

Parakh Sharma
Optimus Testing
+91 94135 52887

Reply STOP and I won't write again.
```


---

## 12. Jyoti Structures Ltd

**To:** `contact@jsl.co.in` — General enquiry  ·  priority 4

**Subject:** `For your T&C head — commissioning software from IIT Bombay`

**Research — turn one of these into the hook sentence:**

- T&D EPC (mid-large) · Mumbai
- Why they fit: Substation EPC 11kV-765kV; recently won ₹639 Cr order for 765kV/400kV TL; substation T&C embedded in EPC delivery
- Angle: LinkedIn; target their commissioning/project management team

```
Hello,

I'm Parakh Sharma, at IIT Bombay. I've built commissioning software for
substation testing teams, and I got this address from your website. **If this
isn't your area, please forward it to whoever runs testing & commissioning.**

What it does: engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later.

{HOOK — one sentence naming their actual work. See research above.}

It's live at https://optimustesting.com — worth a two-minute look before you
decide whether to reply.

I'd like to run one of your projects on it end to end, free. If it doesn't save
your team time at handover, you've lost nothing but the call.

15 minutes this week?

Parakh Sharma
Optimus Testing
+91 94135 52887

Reply STOP and I won't write again.
```


---

## 13. NCC Limited (Electrical T&D Division)

**To:** `info@nccltd.in` — Corporate office  ·  priority 4

**If it bounces:** `ro.mumbai@nccltd.in`

**Subject:** `For your T&C head — commissioning software from IIT Bombay`

**Research — turn one of these into the hook sentence:**

- T&D EPC · Hyderabad
- Why they fit: Expertise in EHV/HV substation ETC + transmission lines; RDSS/33-11kV substations in Maharashtra currently
- Angle: LinkedIn; cite Maharashtra RDSS substation recruitment

```
Hello,

I'm Parakh Sharma, at IIT Bombay. I've built commissioning software for
substation testing teams, and I got this address from your website. **If this
isn't your area, please forward it to whoever runs testing & commissioning.**

What it does: engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later.

{HOOK — one sentence naming their actual work. See research above.}

It's live at https://optimustesting.com — worth a two-minute look before you
decide whether to reply.

I'd like to run one of your projects on it end to end, free. If it doesn't save
your team time at handover, you've lost nothing but the call.

15 minutes this week?

Parakh Sharma
Optimus Testing
+91 94135 52887

Reply STOP and I won't write again.
```


---

## 14. Techno Electric & Engineering Co Ltd (TEECL)

**To:** `techno.email@techno.co.in` — General enquiry  ·  priority 4

**If it bounces:** `desk.investors@techno.co.in`

**Subject:** `For your T&C head — commissioning software from IIT Bombay`

**Research — turn one of these into the hook sentence:**

- T&D EPC (large) · Kolkata
- Why they fit: Substation EPC 765kV; 17 concurrent project sites; internal T&C teams; field engineers need digital test tracking
- Angle: LinkedIn + annual report contacts; position as project tracking tool

```
Hello,

I'm Parakh Sharma, at IIT Bombay. I've built commissioning software for
substation testing teams, and I got this address from your website. **If this
isn't your area, please forward it to whoever runs testing & commissioning.**

What it does: engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later.

{HOOK — one sentence naming their actual work. See research above.}

It's live at https://optimustesting.com — worth a two-minute look before you
decide whether to reply.

I'd like to run one of your projects on it end to end, free. If it doesn't save
your team time at handover, you've lost nothing but the call.

15 minutes this week?

Parakh Sharma
Optimus Testing
+91 94135 52887

Reply STOP and I won't write again.
```


---

## 15. Voltage Infra Pvt Ltd

**To:** `marketing@volt-age.in` — Marketing  ·  priority 4

**Subject:** `For your T&C head — commissioning software from IIT Bombay`

**Research — turn one of these into the hook sentence:**

- Solar EPC + electrical contracting · Pune, Maharashtra
- Why they fit: Solar EPC + conventional electrical contracting for government and private; substation O&M testing services
- Angle: Website contact + LinkedIn Maharashtra

```
Hello,

I'm Parakh Sharma, at IIT Bombay. I've built commissioning software for
substation testing teams, and I got this address from your website. **If this
isn't your area, please forward it to whoever runs testing & commissioning.**

What it does: engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later.

{HOOK — one sentence naming their actual work. See research above.}

It's live at https://optimustesting.com — worth a two-minute look before you
decide whether to reply.

I'd like to run one of your projects on it end to end, free. If it doesn't save
your team time at handover, you've lost nothing but the call.

15 minutes this week?

Parakh Sharma
Optimus Testing
+91 94135 52887

Reply STOP and I won't write again.
```


---

## 16. Bharat Test House Pvt Ltd (BTHPL)

**To:** `bthrai@bharattesthouse.com` — General enquiry  ·  priority 3

**Subject:** `For your T&C head — commissioning software from IIT Bombay`

**Research — turn one of these into the hook sentence:**

- NABL testing lab (electrical + solar) · Delhi NCR
- Why they fit: Multi-disciplinary testing including electrical; solar PV; BIS/NABL approved; some substation equipment testing
- Angle: Email + lab directory

```
Hello,

I'm Parakh Sharma, at IIT Bombay. I've built commissioning software for
substation testing teams, and I got this address from your website. **If this
isn't your area, please forward it to whoever runs testing & commissioning.**

What it does: engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later.

{HOOK — one sentence naming their actual work. See research above.}

It's live at https://optimustesting.com — worth a two-minute look before you
decide whether to reply.

I'd like to run one of your projects on it end to end, free. If it doesn't save
your team time at handover, you've lost nothing but the call.

15 minutes this week?

Parakh Sharma
Optimus Testing
+91 94135 52887

Reply STOP and I won't write again.
```


---

## 17. Ghaziabad Testing Laboratories Pvt Ltd

**To:** `info@gtllab.org` — General enquiry  ·  priority 3

**Subject:** `For your T&C head — commissioning software from IIT Bombay`

**Research — turn one of these into the hook sentence:**

- NABL testing lab · Ghaziabad, UP
- Why they fit: HV/MV testing (MV circuit disconnectors, earthing switches, contactors); independent NABL lab
- Angle: Direct via website + NABL directory

```
Hello,

I'm Parakh Sharma, at IIT Bombay. I've built commissioning software for
substation testing teams, and I got this address from your website. **If this
isn't your area, please forward it to whoever runs testing & commissioning.**

What it does: engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later.

{HOOK — one sentence naming their actual work. See research above.}

It's live at https://optimustesting.com — worth a two-minute look before you
decide whether to reply.

I'd like to run one of your projects on it end to end, free. If it doesn't save
your team time at handover, you've lost nothing but the call.

15 minutes this week?

Parakh Sharma
Optimus Testing
+91 94135 52887

Reply STOP and I won't write again.
```


---

## 18. InGrid (IndiGrid Investment Managers)

**To:** `info@indigrid.com` — General enquiry  ·  priority 3

**Subject:** `For your T&C head — commissioning software from IIT Bombay`

**Research — turn one of these into the hook sentence:**

- Private transmission infra · Mumbai
- Why they fit: 16 substations, 25,050 MVA transformation; TEECL executes projects; T&C embedded
- Angle: LinkedIn; TEECL connection

```
Hello,

I'm Parakh Sharma, at IIT Bombay. I've built commissioning software for
substation testing teams, and I got this address from your website. **If this
isn't your area, please forward it to whoever runs testing & commissioning.**

What it does: engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later.

{HOOK — one sentence naming their actual work. See research above.}

It's live at https://optimustesting.com — worth a two-minute look before you
decide whether to reply.

I'd like to run one of your projects on it end to end, free. If it doesn't save
your team time at handover, you've lost nothing but the call.

15 minutes this week?

Parakh Sharma
Optimus Testing
+91 94135 52887

Reply STOP and I won't write again.
```


---

## 19. Navayuga Engineering Co Ltd

**To:** `nec@navayuga.com` — Corporate  ·  priority 3

**Subject:** `For your T&C head — commissioning software from IIT Bombay`

**Research — turn one of these into the hook sentence:**

- EPC · Hyderabad
- Why they fit: Power sector EPC; hydro + thermal + T&D
- Angle: LinkedIn + industry events

```
Hello,

I'm Parakh Sharma, at IIT Bombay. I've built commissioning software for
substation testing teams, and I got this address from your website. **If this
isn't your area, please forward it to whoever runs testing & commissioning.**

What it does: engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later.

{HOOK — one sentence naming their actual work. See research above.}

It's live at https://optimustesting.com — worth a two-minute look before you
decide whether to reply.

I'd like to run one of your projects on it end to end, free. If it doesn't save
your team time at handover, you've lost nothing but the call.

15 minutes this week?

Parakh Sharma
Optimus Testing
+91 94135 52887

Reply STOP and I won't write again.
```


---

## 20. Power Mech Projects Ltd

**To:** `info@powermech.net` — General enquiry  ·  priority 3

**If it bounces:** `mumbai@powermech.net`

**Subject:** `For your T&C head — commissioning software from IIT Bombay`

**Research — turn one of these into the hook sentence:**

- EPC + O&M (power) · Secunderabad
- Why they fit: BOP, electrical works, substations; T&C embedded in project delivery
- Angle: LinkedIn

```
Hello,

I'm Parakh Sharma, at IIT Bombay. I've built commissioning software for
substation testing teams, and I got this address from your website. **If this
isn't your area, please forward it to whoever runs testing & commissioning.**

What it does: engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later.

{HOOK — one sentence naming their actual work. See research above.}

It's live at https://optimustesting.com — worth a two-minute look before you
decide whether to reply.

I'd like to run one of your projects on it end to end, free. If it doesn't save
your team time at handover, you've lost nothing but the call.

15 minutes this week?

Parakh Sharma
Optimus Testing
+91 94135 52887

Reply STOP and I won't write again.
```


---

## 21. SPML Infra Ltd

**To:** `info@spml.co.in` — General enquiry  ·  priority 3

**Subject:** `For your T&C head — commissioning software from IIT Bombay`

**Research — turn one of these into the hook sentence:**

- Infrastructure EPC (incl. power) · New Delhi
- Why they fit: BESS + power EPC; substation integration; DISCOM projects
- Angle: LinkedIn

```
Hello,

I'm Parakh Sharma, at IIT Bombay. I've built commissioning software for
substation testing teams, and I got this address from your website. **If this
isn't your area, please forward it to whoever runs testing & commissioning.**

What it does: engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later.

{HOOK — one sentence naming their actual work. See research above.}

It's live at https://optimustesting.com — worth a two-minute look before you
decide whether to reply.

I'd like to run one of your projects on it end to end, free. If it doesn't save
your team time at handover, you've lost nothing but the call.

15 minutes this week?

Parakh Sharma
Optimus Testing
+91 94135 52887

Reply STOP and I won't write again.
```


---

## 22. Tata Power (T&C / O&M arm)

**To:** `transmission_tp@tatapower.com` — Transmission business  ·  priority 3

**Subject:** `For your T&C head — commissioning software from IIT Bombay`

**Research — turn one of these into the hook sentence:**

- Integrated power utility · Mumbai
- Why they fit: Tata Power Renewable Energy Ltd's EPC arm; solar + wind substations; DISCOM O&M in Delhi/Mumbai
- Angle: LinkedIn; corporate procurement

```
Hello,

I'm Parakh Sharma, at IIT Bombay. I've built commissioning software for
substation testing teams, and I got this address from your website. **If this
isn't your area, please forward it to whoever runs testing & commissioning.**

What it does: engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later.

{HOOK — one sentence naming their actual work. See research above.}

It's live at https://optimustesting.com — worth a two-minute look before you
decide whether to reply.

I'd like to run one of your projects on it end to end, free. If it doesn't save
your team time at handover, you've lost nothing but the call.

15 minutes this week?

Parakh Sharma
Optimus Testing
+91 94135 52887

Reply STOP and I won't write again.
```


---

## 23. KEC International Ltd

**To:** `kecindia@kecrpg.com` — General enquiry  ·  priority 2

**Subject:** `For your T&C head — commissioning software from IIT Bombay`

**Research — turn one of these into the hook sentence:**

- T&D EPC · Mumbai
- Why they fit: Transmission lines + substations; T&C embedded
- Angle: LinkedIn; KEC annual conference

```
Hello,

I'm Parakh Sharma, at IIT Bombay. I've built commissioning software for
substation testing teams, and I got this address from your website. **If this
isn't your area, please forward it to whoever runs testing & commissioning.**

What it does: engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later.

{HOOK — one sentence naming their actual work. See research above.}

It's live at https://optimustesting.com — worth a two-minute look before you
decide whether to reply.

I'd like to run one of your projects on it end to end, free. If it doesn't save
your team time at handover, you've lost nothing but the call.

15 minutes this week?

Parakh Sharma
Optimus Testing
+91 94135 52887

Reply STOP and I won't write again.
```


---

## 24. Sterling & Wilson (Pvt) Ltd

**To:** `info@sterlingwilson.com` — General enquiry  ·  priority 2

**If it bounces:** `mumbai@sterlingwilson.com`

**Subject:** `For your T&C head — commissioning software from IIT Bombay`

**Research — turn one of these into the hook sentence:**

- Solar EPC + services · Mumbai
- Why they fit: Solar project EPC + O&M; commissioning substations
- Angle: LinkedIn

```
Hello,

I'm Parakh Sharma, at IIT Bombay. I've built commissioning software for
substation testing teams, and I got this address from your website. **If this
isn't your area, please forward it to whoever runs testing & commissioning.**

What it does: engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later.

{HOOK — one sentence naming their actual work. See research above.}

It's live at https://optimustesting.com — worth a two-minute look before you
decide whether to reply.

I'd like to run one of your projects on it end to end, free. If it doesn't save
your team time at handover, you've lost nothing but the call.

15 minutes this week?

Parakh Sharma
Optimus Testing
+91 94135 52887

Reply STOP and I won't write again.
```


---

## After sending each one

Log a `lead_activities` row, channel `EMAIL`. Without it the campaign leaves no
record, and Phase 2 automation has nothing to read.

One follow-up on the same thread after five to seven working days, never a
second. Any reply cancels every later step for that contact.
