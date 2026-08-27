# Outreach mailbox setup

Executes Phase 1, step 1-2 of [OUTREACH_SENDING_PLAN.md](OUTREACH_SENDING_PLAN.md).
That doc decides *whether* to automate; this one is the mechanical setup for the
mailbox we send from by hand.

## Decisions taken

| Decision | Value | Why |
|---|---|---|
| Provider | Zoho Mail, Forever Free plan | Only genuinely free option that is a real mailbox on a custom domain. Google Workspace (~Rs 150/user/mo) remains the upgrade path. |
| Domain | `optimustesting.com` | Operator's call, taken with the reputation caveat below understood. |
| Mailboxes | one named human, e.g. `parakh@optimustesting.com` | Cold mail converts on looking like a person wrote it. Role inboxes get ignored. |

### Known limits of the free plan

- **Webmail only.** No IMAP, no POP, no SMTP, no API. Sending is done in a browser
  tab. This is fine for Phase 1 (~20 messages/day, 36 addresses) and is exactly
  why Phase 2 automation is deferred — the Gmail/Zoho API path needs a paid seat.
- Roughly 5 users, 5 GB each, one domain. Confirm current terms at signup; Zoho
  has changed them before.
- New free accounts are throttled below the published cap. Do not test the ceiling.

### The reputation caveat, stated plainly

`OUTREACH_SENDING_PLAN.md` constraint 2 says cold mail goes on a separate domain.
Sending from `optimustesting.com` accepts a real risk instead of avoiding it:
spam complaints from cold recipients degrade the org domain's reputation, and that
same org domain carries Supabase Auth magic links and password resets. The failure
mode is customers' login mails going to spam — delayed, and hard to attribute back
to the campaign.

Two things reduce it, neither eliminates it:

- Transactional mail already sends from `send.optimustesting.com` with its own
  SPF and DKIM, so the *authentication* records are separate.
- Volume stays low (20/day, PUBLISHED addresses only), so complaint counts stay low.

If login-deliverability complaints ever appear, move outreach to a bought domain
(`optimustesting.in`, ~Rs 500/yr) before doing anything else.

## MX is single-owner — what breaks

Apex `optimustesting.com` MX currently points at `inbound-smtp.ap-northeast-1.amazonaws.com`
(Resend inbound). Pointing it at Zoho **replaces** that. After the change:

- `resend-inbound` Edge Function stops receiving. Leave it deployed — it is
  harmless idle, and reverting the MX restores it.
- `inbound_emails` stops filling. Existing rows are untouched.
- MailTab's inbox pane and `get_unassigned_inbound` return empty. Both already
  degrade cleanly (they handle Postgres `42P01` and empty sets).
- `support@optimustesting.com`, published on `/terms`, `/privacy`, `/contact` and
  hardcoded as `CONTACT_EMAIL` in `frontend/src/pages/legal/LegalPages.tsx`,
  becomes a real human inbox in Zoho. Create it as an alias on the same free seat.

Outbound is unaffected: `resendFrom()` sends from `send.optimustesting.com`, which
has its own SPF and DKIM and does not depend on apex MX.

## Why there is no free branded sender

Checked, and the answer is now dated rather than a matter of taste.

Google's "Send emails from a different address or alias" page states:

> Starting January 2027, Gmail will no longer support the "Send as" feature for
> third-party email addresses, such as @yahoo.com or @outlook.com. This change
> does not affect Google Workspace aliases or other Gmail addresses you own.

That removes the usual free workaround — a personal Gmail sending as
`support@optimustesting.com` — in January 2027. It was never compliant anyway:
the same page requires "the SMTP server ... and the username and password on that
account", meaning a relay for our domain, and every free relay (Brevo, SMTP2GO,
Mailjet) bans cold outreach in its AUP exactly as Resend does.

The rest of the field is gone too. Yandex and Mail.ru dropped free custom-domain
mail. iCloud custom domains need paid iCloud+. ImprovMX and Cloudflare Email
Routing forward **inbound only** and cannot send. Zoho's Forever Free plan is the
last one standing and is US-data-centre only — `workplace.zoho.com/signup?type=org&plan=free`,
which will not convert an org already created on the India DC.

So a branded From address costs money. Mail Lite 5 GB, Rs 59/user/month billed
annually, Rs 708/year. That also lifts the IMAP/POP/ActiveSync exclusion that the
free plan carries — so even a working free plan would not have unblocked Phase 2
automation. Only the paid seat does.

## Interim: personal Gmail, on a separate account

Sending the first 36 messages from a plain `@gmail.com` address is a legitimate
call at this size. The From domain is worth perhaps one or two extra replies
against 36 hand-written messages; it is not worth blocking the campaign.

One condition that is not optional:

**Use a new Gmail account, not the operator's primary one.** The primary account
authenticates the Vercel CLI, gcloud, and the Supabase console. Cold sending is
the exact behaviour that gets a consumer Gmail flagged, and a suspension there
locks us out of the infrastructure, not just the outreach. A fresh account
contains that entirely.

With that in place:

- Signature carries the real identity — name, TestFlow, optimustesting.com, phone.
- PUBLISHED addresses only, 36 of 61.
- ~20/day, spaced, not a burst.
- One `lead_activities` row per send, channel `EMAIL`.

Nothing here is wasted if the paid seat is bought later: the DNS work below is
unchanged, and the activity log is what Phase 2 reads.

## Steps

### 1. Zoho signup

1. Sign up for Zoho Mail, Forever Free plan, add domain `optimustesting.com`.
2. Pick the India data center if billing is India — it decides whether your
   records read `zoho.in` or `zoho.com`. Copy hostnames from Zoho's own setup
   wizard rather than from this file; they differ per data center.
3. Verify the domain with the TXT (or CNAME) token Zoho issues.

### 2. DNS records — automated

DNS for `optimustesting.com` is hosted on **Vercel** (`ns1/ns2.vercel-dns.com`),
and `scripts/setup-zoho-dns.sh` drives it through the operator's own
already-authenticated Vercel CLI session. No API token is stored anywhere —
same posture as `scripts/provision-custom-domains.sh`.

The script runs in two deliberately separate stages.

**Stage 1 — additive, safe to run immediately after signup:**

```bash
scripts/setup-zoho-dns.sh verify <verification-token> <dkim-selector> <dkim-value>
```

Adds the ownership TXT, the apex SPF (`v=spf1 include:zohomail.in ~all`) and the
apex DKIM. Nothing about mail delivery changes, so this can run before Zoho has
confirmed anything. Set `ZOHO_DC=com` if Zoho assigns a US data centre rather
than the India one.

**Stage 2 — destructive, only after Zoho reports the domain VERIFIED:**

```bash
scripts/setup-zoho-dns.sh mx
```

Replaces the Resend/SES inbound MX with Zoho's three. Prompts for a typed
confirmation first and prints the exact consequences. Reversible:

```bash
scripts/setup-zoho-dns.sh rollback-mx
```

Running `mx` before the domain is verified makes mail to `@optimustesting.com`
bounce outright — Zoho refuses delivery for domains it has not confirmed. Order
matters more than timing here.

Inspect current state any time with `scripts/setup-zoho-dns.sh show`.

These records are Resend's and the script never touches them:

```
send.optimustesting.com.              TXT  "v=spf1 include:amazonses.com ~all"
send.optimustesting.com.              MX 10 feedback-smtp.ap-northeast-1.amazonses.com.
resend._domainkey.optimustesting.com. TXT  "p=MIGfMA0GCSq..."
```

### 3. DMARC — already done

`_dmarc.optimustesting.com` did not exist. It does now:

```
_dmarc  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@optimustesting.com; fo=1"
```

`p=none` reports without rejecting, so it changed no delivery behaviour. Its
absence was already costing deliverability on transactional mail under Google
and Yahoo's bulk-sender rules, independent of any outreach plan.

Aggregate reports go to `dmarc@optimustesting.com`. Until Zoho is live that
address routes to Resend inbound, which stores attachment metadata but not
attachment bytes — so the gzipped XML reports are effectively dropped. Create
`dmarc@` as a Zoho alias during setup and they start collecting.

Read reports for two weeks, confirm both Resend and Zoho pass alignment, then
move to `p=quarantine`. Jumping straight to `p=reject` with an unverified Zoho
setup bounces real mail.

### 4. Warmup - the step that gets skipped

Two to three weeks of low-volume real conversation from the new mailbox before
the first cold send. Reply to internal threads, sign up for things, mail people
who will reply. A brand-new mailbox that starts by sending 20 cold messages is
the single most common way a sending identity gets burned.

Zoho's free plan has no built-in warmup tooling. Manual is fine at this scale.

### 5. First campaign

Per `OUTREACH_SENDING_PLAN.md` Phase 1:

- Source: `docs/sales/outreach_contacts.csv`, priority 5 first.
- **PUBLISHED addresses only** — 36 of 61 rows. The 25 `UNVERIFIED` are directory
  sourced or inferred; verify by hand before sending. A bounce on a mailbox with
  no history is expensive.
- ~20/day, spaced, not a burst.
- Log every send as a `lead_activities` row with channel `EMAIL`. That is what
  makes Phase 2 possible without re-deriving history.

## Repo changes already made

- `frontend/src/lib/contact.ts` — new `SUPPORT_EMAIL` constant. `LegalPages.tsx`
  and `Marketing.tsx` both read it, so the address published in the policies and
  the one shown when the demo form fails can no longer disagree. Razorpay's
  website review checks the published address is reachable.
- `Marketing.tsx` no longer hardcodes a personal Gmail in its form-error string.
- `notify-demo-request` now defaults `DEMO_NOTIFY_EMAIL` to
  `support@optimustesting.com` instead of a personal Gmail. Override per
  environment with `supabase secrets set DEMO_NOTIFY_EMAIL=...`.

## Still open

- `RESEND_REPLY_TO` is unset, so transactional mail carries no `Reply-To`.
  Replies to trial confirmations currently go nowhere. Set it once the Zoho
  mailbox exists and is monitored:
  `supabase secrets set RESEND_REPLY_TO=support@optimustesting.com`
- Phase 2 outreach automation stays deferred — Zoho's free plan has no
  IMAP/SMTP/API, and at 36 sendable addresses the automation costs more than it
  saves. See `OUTREACH_SENDING_PLAN.md`.
