# Outreach email templates

Copy for the first campaign. Per-company drafts are in
[EMAIL_DRAFTS.md](EMAIL_DRAFTS.md); regenerate them with
`python3 scripts/gen_email_drafts.py`.

## The frame: sell, don't ask for feedback

An earlier version of this copy opened with "I'm not selling yet, tell me where
I've got it wrong." It is honest and it reads well, but it asks a busy MD to do
unpaid product work for a stranger. The ask that actually converts is the one
that offers them something: **run a project on it, free, end to end.**

So the message states what the product does, offers a free pilot, and asks for
fifteen minutes. No hedging about being early.

## What we can and cannot claim

**No customers yet.** Nothing in any message may imply otherwise. `Marketing.tsx`
carries an "In use by commissioning teams at" strip — that must not be echoed in
outreach. A claim the reader can check is exactly the kind they do check, and it
costs the relationship outright rather than just the reply.

The free pilot offer is what replaces social proof. It is a real, honest reason
for a first customer to take the risk, and it costs nothing to extend.

**IIT Bombay is in the opening line and the subject**, because from a
`@gmail.com` address with no logos it is the one credential that gets the message
read rather than binned.

The wording is deliberately personal: *"I'm Parakh Sharma, at IIT Bombay."* That
is a fact about the sender. Do **not** escalate it to "IIT Bombay incubated",
"IIT Bombay backed", or "an IIT Bombay startup" — those are claims about the
institute, they are checkable, and an EPC procurement team is exactly the kind of
reader who checks. The personal version does the same work and survives scrutiny.

## Template A — named decision maker

Two of the twenty-four go to a named human (Akuntha, Transerect). These get the
most effort; they are the likeliest replies in the whole list.

```
Subject: Commissioning test records at {Company} — from IIT Bombay

{Salutation},

I'm Parakh Sharma, at IIT Bombay. I've built TestFlow — commissioning software
for substation testing teams. I got your address from {domain}.

What it does: your engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later from whatever is on which laptop.

{HOOK — one sentence naming their actual work}

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

## Template B — role inbox

Twenty-two of the twenty-four go to `info@` / `enquiry@` / `sales@`. Whoever
opens these is usually not the buyer, so the routing ask sits near the top, where
it is read before the reader decides to close the message.

```
Subject: For your T&C head — commissioning software from IIT Bombay

Hello,

I'm Parakh Sharma, at IIT Bombay. I've built commissioning software for
substation testing teams, and I got this address from your website. If this
isn't your area, please forward it to whoever runs testing & commissioning.

What it does: engineers record test results on site, offline if there's no
signal. Supervisors approve from anywhere. The handover report — PDF and Excel —
generates itself when the project closes, instead of being assembled by hand
weeks later.

{HOOK — one sentence naming their actual work}

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

## The hook line is the whole campaign

Everything else is identical across all 24 sends. The hook is the only sentence
that proves a human read their website, and it is left blank on purpose.

Each draft carries the research beneath it — segment, region, why they fit, the
angle — straight from the leads seed. Those are notes, not prose: fragments,
ampersands, `=` shorthand. Every attempt to splice them into a sentence
mechanically produced broken English ("an ePC", "a t&C specialist"), and
half-grammatical text in a message whose whole claim is that a person wrote it is
worse than an obvious blank.

Twenty seconds per message. It is the entire difference between this campaign and
a blast.

## Mechanics that make or break delivery

- **One link, once.** `https://optimustesting.com` sits in the body, where it
  earns a click, and is deliberately absent from the signature — repeating it
  would make two link occurrences from a sender with no history, which is a spam
  signal for no gain.
- **No attachment on the first message.** If they want the sample report, that is
  a reply, which is the goal.
- **Plain text.** No HTML, no signature image, no tracking pixel. Gmail sends
  plain by default — leave it alone.
- **Under 140 words.** Both templates sit near 130.
- **Subject stays plain and specific.** No "Revolutionize", no "Transform", no
  emoji.

## Follow-up

One follow-up, five to seven working days later, on the same thread so it threads
under the original. Never a second.

```
{Salutation},

Following up once on the below, then I'll leave it.

The offer stands — one project, free, start to finish. If it's not a priority
right now, just say so and I'll stop.

Parakh
```

Any reply cancels every later step for that contact. Continuing to send after a
human has replied is the fastest way to look like a spammer to a real buyer.

## After each send

One `lead_activities` row, channel `EMAIL`. That log is the only record the
campaign happened, and it is what Phase 2 automation reads later.
