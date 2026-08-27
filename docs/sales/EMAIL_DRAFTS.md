# Email drafts — first campaign

One message per company. 10 drafts — small and mid-size firms
only, with 14 large or listed companies deferred (see
[SEND_QUEUE.md](SEND_QUEUE.md) for why). Generated from
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

## 4. GK Expertise / GK Power Expertise Pvt Ltd

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

## 5. Powertest Asia Pvt Ltd (PtA)

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

## 6. Sun and Jay Engineering Consultants Pvt Ltd

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

## 7. Voltage Infra Pvt Ltd

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

## 8. Ghaziabad Testing Laboratories Pvt Ltd

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

## 9. Elite Powertech Pvt Ltd (EPPL)

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

## 10. Eternergy Engineering Pvt Ltd

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

## After sending each one

Log a `lead_activities` row, channel `EMAIL`. Without it the campaign leaves no
record, and Phase 2 automation has nothing to read.

One follow-up on the same thread after five to seven working days, never a
second. Any reply cancels every later step for that contact.
