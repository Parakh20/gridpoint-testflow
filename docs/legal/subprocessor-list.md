> ⚠️ **DRAFT — NOT LEGALLY REVIEWED — DO NOT PUBLISH** ⚠️
>
> Internal working draft only. Not reviewed by counsel, not legal advice, and not to be published or relied upon until reviewed and approved by a licensed attorney. `[PLACEHOLDER: ...]` marks facts the codebase cannot supply. This list was compiled by inspecting actual code and configuration in this repository — every entry below has direct evidence cited. Do not add a vendor here without equivalent evidence, and remove any entry that stops being true.

# Subprocessor List (Draft)

**Last updated:** [PLACEHOLDER: effective date — keep in sync whenever a subprocessor is added or removed]

TestFlow uses the following subprocessors to provide the Service. This list will be updated as our subprocessor relationships change; [PLACEHOLDER: define change-notification process/lead time with counsel — commonly a change log or email notice with an objection window].

| Subprocessor | Purpose | Data Involved | Evidence |
|---|---|---|---|
| **Supabase** | Primary database (Postgres), authentication, row-level-security enforcement, Realtime, and Edge Function hosting | All application data: accounts, projects, equipment, test records, audit logs, billing records | Core backend per `CLAUDE.md` tech stack; `frontend/src/integrations/supabase/client.ts`; entire `supabase/` directory (migrations, Edge Functions) |
| **Vercel** | Frontend application hosting / CDN, security headers, routing | Static frontend assets; requests are proxied to Supabase from the browser, not through Vercel servers, but Vercel serves the app users interact with | `vercel.json` (rewrites, CSP, HSTS, and other security headers present at repo root) |
| **Razorpay** | Payment processing for subscription billing and one-time orders | Billing/subscription metadata (plan, status, period dates); Razorpay itself handles card/payment-instrument data — TestFlow does not store it | `supabase/functions/_shared/billing_provider.ts` (`BillingProvider` interface, `RazorpayBillingProvider`); `supabase/functions/razorpay-webhook/`; `subscriptions`, `orders`, `billing_events`, `plan_provider_mapping` tables; `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/`RAZORPAY_WEBHOOK_SECRET` env vars in `CLAUDE.md` |
| **Anthropic** | AI-assisted commissioning report generation (opt-in feature) | Project, equipment, and test-record data explicitly included in a report generation request, sent to the Claude API (model `claude-haiku-4-5-20251001`) | `generate-report` Edge Function; `ANTHROPIC_API_KEY` env var (Edge Function only, never in `.env`); `vercel.json` CSP `connect-src` includes `https://api.anthropic.com` |
| **Resend** | Transactional email — internal notification when a prospective customer submits a demo request via the marketing site | Demo-request submitter's contact details (name/email/company, as submitted in the form) | `supabase/functions/notify-demo-request/index.ts` — uses `RESEND_API_KEY` and posts to `https://api.resend.com/emails` |

## Not a Subprocessor (Clarifications)

- **Supabase's built-in SMTP** is used to send user-invite/auth emails (magic links, password resets) for TestFlow accounts, as a feature of the Supabase Auth product itself rather than a separately contracted subprocessor. [PLACEHOLDER: confirm with counsel whether Supabase's built-in email delivery should still be listed as a named sub-subprocessor for transparency, since it does deliver personal data (email addresses, invite links) via Supabase's infrastructure.] Organizations sending high invite volumes may configure their own custom SMTP provider in the Supabase dashboard (see `CLAUDE.md` gotcha #13 and `BulkInviteDialog.tsx`) — if a customer does so, that provider becomes a subprocessor of the customer's own choosing, not ours.
- No SMS, push-notification, or analytics/tracking subprocessor is currently integrated in this codebase — none was found in `frontend/`, `mobile/`, or `supabase/functions/`. If Sentry error monitoring is enabled by a deployment (`VITE_SENTRY_DSN`), Sentry (and its `*.sentry.io` / `*.ingest.sentry.io` / `*.ingest.de.sentry.io` endpoints allowed in `vercel.json`'s CSP) becomes a subprocessor for error/crash telemetry when that env var is actually set. [PLACEHOLDER: confirm whether Sentry is enabled in production for this deployment; if yes, add it as a full table row above with the data categories it receives.]

## Regional Note

[PLACEHOLDER: for DPDP Act compliance, confirm and document the actual data-hosting region(s) used by Supabase and Vercel for this project, and whether any subprocessor above stores or processes data outside India in a manner requiring specific disclosure.]
