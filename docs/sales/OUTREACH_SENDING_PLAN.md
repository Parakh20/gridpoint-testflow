# How we actually send the outreach

Decision doc for automating mail against `lead_contacts`. Three constraints
decide almost everything below, so they come first.

## Constraint 1 — Resend is off the table, and not for a soft reason

Resend's Acceptable Use Policy prohibits unsolicited mail, cold outreach,
scraped contact data and purchased lists. Our list is exactly that: addresses
harvested off company websites, with no prior relationship.

The problem is not "we might get told off." It is that **the same Resend account
sends our transactional mail** — `notify-rework` (engineers' rework notices),
`start-trial` (new-tenant confirmations) and `notify-demo-request` all call
`api.resend.com` with the one `RESEND_API_KEY`. One AUP strike on a cold campaign
suspends that account, and the blast radius is:

- field engineers stop being told their test tasks were sent back for rework,
- new trial signups never get their confirmation,
- inbound demo requests are silently dropped.

Sales experiment takes down production. Not worth it at any conversion rate.

## Constraint 2 — never cold-send from `optimustesting.com`

That domain carries Supabase Auth magic links and password resets. Cold mail
attracts spam complaints; complaints degrade domain reputation; degraded
reputation means **magic links land in spam and customers cannot log in**. The
failure is delayed and hard to attribute, which makes it worse.

Cold outreach goes out on a **separate domain**, bought for the purpose
(`gettestflow.com`, `optimustesting.in`, similar). Separate domain, separate
sending reputation, separate blast radius. Standard practice, and the one rule
you cannot skip.

## Constraint 3 — the app is not on Google Cloud

Worth correcting, since it shapes the option set: TestFlow runs on **Vercel +
Supabase**. The `gcloud` CLI on this machine is authed as
`sharmaparakh05@gmail.com` against an unrelated project (`axalonml`). There is no
GCP infrastructure here to hang a mailer off. Gmail is still a good *sending
channel* — via the Gmail API on a Google Workspace mailbox — but that is an API
credential, not "deploy it on our GCP."

## Recommendation

**Google Workspace mailbox on a separate domain, sent via Gmail API.**

Why Gmail and not a bulk ESP (SendGrid, Mailgun, Brevo): cold outreach converts
on looking like a person wrote it. Gmail sends from a real mailbox, so replies
land in a real inbox, threading works, and there is no ESP tracking-pixel
footprint or `via sendgrid.net` header. It is also the channel every cold-email
tool (Instantly, Smartlead, Lemlist) drives underneath.

### Volume reality — this is the part that changes the plan

| Limit | Number |
|---|---|
| Google Workspace hard cap | 2,000/day |
| **Safe cold volume, warmed mailbox** | **20–50/day** |
| Safe cold volume, new mailbox | 10–20/day, ramping over 3–4 weeks |

We have **38 addresses.** At a safe 20/day that is **two days of sending**, by
hand, from a normal Gmail window.

**So: do not build the automation yet.** A queue, a cron, OAuth token refresh,
bounce parsing and reply detection is roughly a week of work to save under an
hour of clicking — and hand-written mail to 38 prospects will outperform anything
templated, because at this size every message can name the company's actual
project. The existing `outreach_approach` field on each lead is already written
per-company for exactly this.

Build the pipeline when the list passes **~200 contacts** or we run repeating
multi-step sequences. Design for that below, so today's manual sending logs into
the same tables.

## Phase 1 — now, manual send (~1 day of setup)

1. Buy the outreach domain. Google Workspace on it (~₹150/user/month).
2. Auth it properly before the first send: **SPF, DKIM, DMARC** (`p=none` to
   start), or Gmail's own bulk-sender rules bounce us.
3. Warm the mailbox 2–3 weeks — real conversation, low volume, before any cold
   send. Skipping warmup is the single most common way a new domain gets burned.
4. Send from `docs/sales/outreach_contacts.csv`, priority 5 first, ~20/day.
5. **Send `PUBLISHED` addresses only.** The `UNVERIFIED` ones are directory-
   sourced or inferred; a bounce on a cold domain with no history is expensive.
   Verify those by hand first (open the company page, read the address).
6. Log every send as a `lead_activities` row, channel `EMAIL`. That is already
   built and it is what makes Phase 2 possible.

Expected: 38 sends → ~5-8 opens-to-reply on a good list → 1-3 demos. The named
contacts (Ravi Kamdar at Akuntha, `elect@hecproject.com` at HEC) are worth a
hand-written message each rather than a template.

## Phase 2 — the pipeline, when volume justifies it

### Schema

```
outreach_campaigns   id, name, from_mailbox, daily_cap, status, created_at
outreach_steps       campaign_id, step_no, delay_days, subject_tpl, body_tpl
outreach_messages    campaign_id, lead_contact_id, step_no, status
                     (QUEUED|SENT|REPLIED|BOUNCED|SKIPPED|CANCELLED),
                     scheduled_for, sent_at, gmail_thread_id, error
outreach_suppressions email (unique), reason, created_at
```

`outreach_messages` is the queue and the audit log in one. RLS enabled with no
policies, service-role only — same posture as `leads`/`lead_contacts`.

### Sending

New Edge Function `send-outreach`, `X-Cron-Secret`-gated, invoked by a GitHub
Actions cron — the same shape as `notify-rework` and `retention-cleanup`, so
there is nothing novel to operate.

Each run:

1. Claim up to `daily_cap` messages with `scheduled_for <= now()` and status
   `QUEUED`, using `FOR UPDATE SKIP LOCKED` (the `generate_project_equipment`
   locking pattern) so two overlapping runs cannot double-send.
2. Drop any whose email is in `outreach_suppressions`, or whose contact is
   `BOUNCED`/`OPTED_OUT`.
3. Send via Gmail API `users.messages.send`, store `gmail_thread_id`.
4. Write a `lead_activities` row so the sales tab shows it like any other touch.
5. **Jitter the spacing** — a few minutes randomly between sends, not a burst.
   Bursts are a bot signal.

Credentials: a Google Cloud OAuth client (this is the one place GCP appears),
one-time consent, refresh token stored via `supabase secrets set`. Domain-wide
delegation only if we ever send from several mailboxes.

### The two features that make it safe

**Reply detection.** A cron polls Gmail for replies on stored `thread_id`s and
cancels every later step for that contact. Automation that keeps sending after
someone has replied is the fastest way to look like a spammer to a real buyer.
This is not optional — build it before the first automated send, not after.

**Opt-out.** A plain-text "reply STOP and I won't write again" line, plus an
unsubscribe link hitting a public Edge Function that inserts into
`outreach_suppressions` and flips the contact to `OPTED_OUT`. Honour it
permanently — the status already exists on `lead_contacts` for this.

**Bounce handling.** Gmail bounces arrive as a message in the sending mailbox,
not as a webhook. The reply-poller parses them and sets `BOUNCED`. Keep bounce
rate under ~3%; above ~5% Google throttles the mailbox.

### Legal

India has no CAN-SPAM equivalent, but the **DPDP Act 2023** covers personal data,
and a named individual's work address (`ravi@akuntha.com`) is personal data —
role inboxes (`info@`, `sales@`) are much lower risk. Practical compliance:
identify ourselves honestly, state where we got their details, honour opt-outs
immediately, keep the suppression list forever. All three are cheap and are what
the schema above already records.

## What I'd do

Phase 1 now. Two days of hand-sent mail against 38 addresses tells us whether the
message lands. If it does, the list is the bottleneck — not the sending — and the
next spend is contact discovery (a paid data provider, or LinkedIn Sales Navigator
against the ~60 leads that currently have only a phone number), not a mailer.
Build Phase 2 when there is a list big enough to need it.
