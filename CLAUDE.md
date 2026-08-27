# CLAUDE.md — gridpoint-testflow

> **Standing rule:** Update this file when changes affect the dev reference — new conventions, env vars, gotchas, infra.

## What This Project Is

**TestFlow** — multi-tenant B2B SaaS for electrical substation commissioning, sold at `optimustesting.com` and served at `app.optimustesting.com`. Field teams manage test projects, record measurements, generate PDF/AI reports. (Per-company subdomains still resolve as cosmetic aliases — see the host model under Key Workflows — but the tenant comes from the signed-in user, not the URL.)

- **Mobile app (`mobile/`)** — Expo/React Native for ENGINEER role. Same Supabase backend + RLS.
- **Shared package (`packages/shared/`)** — source-only TS imported by web + mobile via `@testflow/shared`. Holds `EQUIPMENT_LABEL`, `AppRole/ROLE_RANK/highestRole()`, status constants, `explainSupabaseError`, `normalizeFields()`. No build step.
- **Multi-tenancy:** Single Supabase project, `company_id` on root tables, RLS enforces isolation.
- **No public sign-up to an existing tenant.** SUPERADMINs create users via `create-user` Edge Function. The one exception is brand-new company creation: `start-trial` (public, rate-limited) lets a visitor self-serve a new trial company + its first SUPERADMIN — see Key Workflows. This does not use Supabase's client-side `supabase.auth.signUp()` (still removed, see gotcha #6) — it goes through `admin.createUser()` server-side, same as `create-tenant`.

## Tech Stack

- **Frontend:** React 18 + Vite + TS (SPA — no SSR, no Next.js, no `'use client'`)
- **UI:** shadcn/ui + Tailwind v3
- **Backend:** Supabase (Postgres + Auth + RLS + Realtime + Edge Functions)
- **State:** TanStack Query v5 (partial adoption)
- **Forms:** react-hook-form + zod
- **Routing:** react-router-dom v6
- **AI:** Anthropic Claude (`claude-haiku-4-5-20251001`) — Edge Function only
- **Excel:** SheetJS (`xlsx`), dynamically imported
- **CI:** GH Actions → `supabase db push` + functions deploy on push to main; billing/webhook Deno integration tests (`test-billing-functions` job in `supabase.yml`) gate the functions deploy — if this job fails, ALL function deploys are blocked while migrations still proceed. Its `supabase start` step splits migration `20260411000005` into two ephemeral files at CI time (never committed) to work around a pre-existing Postgres 55P04 error (a new enum value used in the same file/transaction that adds it) that only surfaces on a from-scratch replay, never on production's already-migrated DB — migrations are forward-only so that historical file can't be edited directly. Custom function secrets (`RAZORPAY_WEBHOOK_SECRET`/`RECONCILE_CRON_SECRET`) are written to both `supabase/.env` and `supabase/functions/.env` — empirically, only the latter reached the local edge-runtime in testing.

## Project Layout

```
frontend/src/
  App.tsx                          # Routes + providers + ErrorBoundary
  contexts/{AuthContext,CompanyContext}.tsx
  lib/{routes,format,utils,projectExcelExport,realtime,monitoring,testSectionTables}.ts
  components/   # DashboardLayout, ProtectedRoute, Project* tabs, ui/ (shadcn — don't edit)
  pages/        # Auth, Index, dashboards/, projects/, PlatformAdmin/, Marketing.tsx
  integrations/supabase/{client.ts, types.ts}    # types.ts auto-generated
mobile/                              # Expo app, ENGINEER only
packages/shared/                     # @testflow/shared, source-only
supabase/
  config.toml
  migrations/                        # timestamp-ordered, never edit existing
  functions/                         # Deno; share cors.ts, rate_limit.ts
.github/workflows/                   # supabase.yml, frontend.yml, backup.yml
```

## Roles

| Role | Can Do |
|---|---|
| SUPERADMIN | Manage users, full visibility |
| GM | Create/edit projects, scope, assign supervisors |
| SUPERVISOR | Manage assigned projects, assign engineers |
| ENGINEER | Execute tests, submit records |

- Roles in `user_roles` table; `has_role(user_id, role)` used in RLS
- `AuthContext` defers role fetch with `setTimeout(..., 0)` to avoid Supabase deadlock — **do not remove**
- Use `dashboardPath(userRole)` from `@/lib/routes` — never hardcode `/gm`

## Database (Key Tables)

```
projects             status: DRAFT → APPROVED → ACTIVE → CLOSED
                     soft-delete via deleted_at
scope_items          UNIQUE(project_id, equipment_type); quantity CHECK 1–500
project_test_scope   UNIQUE(project_id, test_template_id); save = delete-then-insert
equipment_instances  auto-labeled (PTR-001 etc.); UNIQUE(project_id, type, seq); soft-delete
test_templates       JSON Schema fields; tab IN ('NAMEPLATE','PARAMETERS','OVERVIEW'); global (no company_id)
test_tasks           per (instance × template); status: DRAFT→IN_PROGRESS→SUBMITTED→APPROVED|REWORK
test_records         JSONB; UNIQUE(test_task_id) → always upsert; soft-delete
nameplate_records    UNIQUE(equipment_instance_id)
audit_logs           append-only, written by Postgres triggers (not app)
profiles             auto-created via auth.users trigger
user_roles           UNIQUE(user_id, role)
supervisor_assignments
companies            trial_ends_at (default NOW()+14d), features JSONB
subscriptions        Razorpay scaffold, one per company
rate_limits          backs rate_limit_check RPC
leads                platform-internal sales CRM; stage pipeline; RLS no-policy (service-role only)
lead_activities      append-only outreach log per lead; FK ON DELETE CASCADE
lead_contacts        many contacts per lead (C-suite/manager contact book); RLS no-policy (service-role only)
billing_events       Razorpay webhook idempotency ledger; RLS no-policy (service-role only)
email_log            operator-sent mail, append-only, holds Resend message id; RLS no-policy (service-role only)
inbound_emails       Resend-received mail; UNIQUE(provider_event_id) is the webhook idempotency key; RLS no-policy (service-role only)
orders               one-time implementation/addon/custom_development/training fees; RLS no-policy (service-role only)
plan_provider_mapping  razorpay_plan_id_monthly/_annual → plans.id; RLS no-policy (service-role only)
```

`my_company_id()` SECURITY DEFINER fn used in every RLS policy. NULL → user sees nothing.

## Equipment Labels (don't use `substring`)

`POWER_TRANSFORMER→PTR, CT→CT, CVT→CVT, LA→LA, SF6_BREAKER→SF6, ISOLATOR→ISO, VCB→VCB, EARTH_PIT→EP`. Map in `ProjectTestingScopeTab.tsx`. Server mirrors in `generate_project_equipment` RPC.

## Key Workflows

- **Equipment generation:** Server-side `generate_project_equipment(_project_id)` RPC with `FOR UPDATE` lock. Idempotent — returns `{already_existed: true}` if instances exist.
- **Dynamic forms:** Interpret `test_templates.fields` JSON Schema at runtime. Many templates have `[]` — handle empty gracefully.
- **Scope editable** only when status is DRAFT or APPROVED.
- **Realtime:** All channels go through `useRealtimeChannel` (web + mobile). Pair with `usePollingFallback(refetch, 30_000)`. Kill switch: `VITE_REALTIME_ENABLED=false`. Channel names include `user.id`. `projects` + `test_tasks` are in `supabase_realtime` publication with `REPLICA IDENTITY FULL`.
- **AI report:** `generate-report` function; concurrency-locked via `claim_ai_report_lock`/`release_ai_report_lock` (5-min expiry). GM/SUPERADMIN, status=CLOSED.
- **User creation:** `create-user` Edge Function (admin API). Public `signUp()` is removed — do not re-add.
- **User deletion:** `delete-user` Edge Function, same-company check.
- **User offboarding:** `offboard_user(_from, _to)` RPC transfers all work then deactivates. Do not delete users with open work.
- **GDPR export/erasure:** `request_data_export(_user_id)` returns a JSONB snapshot of everything tied to a user (SUPERADMIN, same-company). `erase_user_data(_user_id)` anonymizes profile name/email + deactivates — requires no open assignments (`offboard_user` first); full row deletion isn't possible without breaking `created_by`/`actor_id` NOT NULL FKs on `test_records`/`audit_logs` by design. Both RPCs only — no admin panel UI wired yet (migration `20260822000011`).
- **Rework email notification:** `test_tasks` flipping to `REWORK` queues a row in `rework_notifications` via `trg_queue_rework_notification`; `notify-rework` Edge Function drains it every 15min via GH Actions cron and sends via Resend (`RESEND_API_KEY` required, migration `20260822000010`).
- **Retention cleanup:** nightly GH Actions cron (`retention-cleanup` Edge Function) hard-deletes `projects`/`equipment_instances`/`test_records` rows soft-deleted >90 days ago and archives `audit_logs` rows >180 days old into `audit_logs_archive` (migration `20260822000012`). No `pg_cron` extension in this project — same GH Actions-cron pattern as `reconcile-cancellations`.
- **Company resolution:** `CompanyContext` reads subdomain → fetches `companies` by slug. localhost → null (dev mode).
- **OAuth sign-in:** `AuthContext.signInWithOAuth(provider)` (`AUTH_PROVIDERS`: `google`→`google`, `microsoft`→`azure`, `linkedin`→`linkedin_oidc`, `apple`→`apple`) wraps `supabase.auth.signInWithOAuth`. All four render as buttons on `Auth.tsx`, gated the same way Google always was — `company.oauth_provisioning === 'off'` blocks all of them, not just Google. Each provider must be individually enabled in Supabase Dashboard → Authentication → Providers with its own client id/secret before it actually works; the frontend code path is provider-agnostic but Supabase rejects sign-in for a provider that isn't configured there.
- **Workspace self-service:** `update_company_slug(_new_slug)` RPC (SUPERADMIN, same-company) lets a tenant rename its own `companies.slug` — same format rules as `start-trial`'s auto-derived slug. `WorkspaceSettingsPage` (`/settings/workspace`) is the UI; confirms via dialog since it changes the subdomain immediately (other sessions on the old subdomain hit the company-mismatch guard until they reload on the new one).
- **Status transitions:** `ProjectStatusActions` UPDATE includes `.eq('status', current)` optimistic-concurrency guard — don't remove.
- **Project clone:** `clone_project(...)` RPC. Copies scope only.
- **Bulk approve:** Supervisor dashboard checkboxes; UPDATE guarded by `.eq('status','SUBMITTED')`.
- **Idle timeout:** 30 min in AuthContext (`IDLE_TIMEOUT_MS`).
- **Company-scoped login:** `AuthContext` compares `profiles.company_id` to subdomain's `company.id`; mismatch → sign out + `companyMismatch=true`. Skipped on localhost.
- **Operator email (platform admin):** The company detail row in the admin panel has a two-way mail view (`CompanyEmailPanel.tsx`). Outbound: `send_company_email` renders one of the templates in `supabase/functions/_shared/email_templates.ts` (`custom`, `welcome`, `trial_ending`, `payment_failed`) and sends via Resend using `resendFrom()` — never a hardcoded From. It addresses the recipient by **profile id, not a typed address**, so a leaked platform token can't turn the panel into an open relay on our verified domain; the recipient must belong to the named company. Own rate-limit bucket (60/hr) on top of the function-wide 300/hr. Every send — success or failure — is written to `email_log` (migration `20260823000009`, RLS enabled, no policies) with Resend's message id, which is the only join key into Resend's own delivery/bounce record. `Reply-To` is set only when the `RESEND_REPLY_TO` secret names a real mailbox.
- **Inbound email:** `resend-inbound` Edge Function receives Resend's `email.received` webhook into `inbound_emails` (migration `20260823000010`). Needs `verify_jwt = false` in `config.toml` (present) — Resend carries no Supabase JWT and the gateway would reject the delivery before the handler's own check. Resend signs with **Svix**, not Razorpay's plain HMAC-over-body: signed content is `${svix-id}.${svix-timestamp}.${body}`, the secret is base64 after a `whsec_` prefix, and the header may carry several `v1,<sig>` entries during rotation — `_shared/svix.ts`, secret `RESEND_WEBHOOK_SECRET`. Idempotency mirrors `record_billing_event`: `record_inbound_email(...)` inserts `ON CONFLICT (provider_event_id) DO NOTHING` keyed on the Svix delivery id, and resolves `company_id` by matching the sender against `profiles.email` (a NULL company is normal — prospects, vendors, Razorpay reviewers). Attachments arrive as **metadata only** (id/filename/content_type/size), never bytes. Admin actions: `get_email_templates`, `get_company_emails`, `get_unassigned_inbound`, `mark_inbound_handled`. Operator setup step: paste `https://<project-ref>.supabase.co/functions/v1/resend-inbound` into Resend → Webhooks → event `email.received`.
- **Plan self-service (platform admin):** The admin panel's **Plans** tab edits the `plans` / `plan_features` catalog through `platform-admin-data` — no migration needed to change a price, cap, or feature flag. Actions: `get_plan_catalog`, `create_plan`, `update_plan`, `set_plan_feature`, `set_plan_provider_mapping`, `create_provider_plans`, `get_company_feature_flags`, `set_company_feature_flags`. Writes stay service-role-only — `plans`/`plan_features` still have public-SELECT-only RLS because the marketing pricing page reads them anonymously. UI: `PlansTab.tsx` + `PlanEditorDrawer.tsx` + `PlanProviderMappingPanel.tsx` + `planTypes.ts`. `plans.slug` is create-only (entitlement fallbacks resolve by slug) and `update_plan` refuses to deactivate the `trial`/`starter`/`enterprise` fallback plans. Plans are never deleted — deactivate. Every write lands in `billing_audit_logs` under a `PLAN_*` action.
- **Razorpay price drift (real-money hazard):** Razorpay plan **amounts are immutable**, so editing `plans.monthly_price_inr` changes only what the pricing page advertises — checkout still charges whatever the plan id in `plan_provider_mapping` was created at. `20260823000008` adds `monthly_price_inr_at_mapping` / `annual_price_inr_at_mapping` / `provider_mode` to that table so the gap is detectable; `get_plan_catalog` returns a `price_drift` flag per plan and `mode_mismatch` when a test-mode mapping is paired with a live `RAZORPAY_KEY_ID`. Fix is always "create a new Razorpay plan and remap", never an edit: `create_provider_plans` does it via `RazorpayBillingProvider.createPlan()`. Irreversible at the provider — Razorpay plans cannot be deleted, only orphaned; in-flight subscriptions keep their old plan id and price.
- **Two feature namespaces — don't conflate:** `plan_features` (billing entitlements, read by `get_company_entitlements` / `useFeatureEntitlement`, per-plan) vs `companies.features` JSONB (per-tenant operational kill switches, read by `has_feature()` / `useFeature`, default-open). `get_company_entitlements` does **not** look at `companies.features`. Per-company entitlement overrides go through `enterprise_contracts` (replaces caps, merges `custom_features`) or `subscription_addons` (`extra_users`/`extra_projects`, feature add-ons) — both already have admin actions and panels. `CompanyFeatureFlagsPanel.tsx` (in `SubscriptionDetailDrawer`) edits the kill-switch namespace only. Feature-key lists live in `packages/shared/src/billing.ts` and `supabase/functions/_shared/feature_keys.ts` — keep both in sync or the flag is silently false.
- **Sales tracker (platform admin):** Internal outreach CRM in the admin panel's **Sales** tab. `leads` + `lead_activities` tables (RLS enabled, **no policies** → service-role-only via `platform-admin-data`). Seeded from the GTM target list (migration `20260530000004`). 7-stage pipeline `NEW→CONTACTED→DEMO_BOOKED→PILOT→WON|LOST|PARKED`. Edge actions: `get_all_leads`, `get_lead_detail`, `create_lead`, `update_lead`, `add_lead_activity`, `upsert_lead_contact`, `delete_lead_contact`. UI in `pages/PlatformAdmin/SalesTab.tsx` + `LeadDetailDrawer.tsx`; shared `platformFetch.ts`. Tracking-only — automations (reminders/sending/auto-park/KPIs) are a deferred phase. Regenerate seed via `scripts/gen_leads_seed.py`.
- **Outreach sending (platform admin → Sales):** cold mail leaves over **SMTP from a real mailbox** (`_shared/smtp.ts`, `SMTP_USER`/`SMTP_APP_PASSWORD`), **never through Resend** — Resend's AUP prohibits cold outreach and its one API key also carries `notify-rework`/`start-trial`, so an AUP strike would stop rework notices reaching engineers. `outreach_drafts` is both outbox and record: a row is authored in the repo (`scripts/gen_email_drafts.py` + `scripts/outreach_hooks.py`), seeded by `scripts/gen_draft_seed.py` into a migration, reviewed/edited in `OutreachDraftsPanel`, then `SENT` or `FAILED` with the error kept. **`send_outreach_draft` re-resolves the recipient from `lead_contacts` via `contact_id` and refuses a draft without one** — that's what stops a leaked platform token turning the panel into an open relay on the operator's personal Gmail; it also refuses `BOUNCED`/`OPTED_OUT`. Sending logs the `lead_activities` touch, flips the lead to `CONTACTED` and sets `next_action_date` server-side, because those are the steps that get skipped by hand. `create_outreach_draft` composes an ad-hoc draft — still addressed by `contact_id`, never a typed address — which is how you smoke-test SMTP without spending a real cold email on it. `denomailer` is imported **dynamically** inside `sendPlainMail` — a top-level import that failed to resolve would take every admin action down, not just mail. Gmail free accounts cap around 500/day; at 10-20/day that's irrelevant, but bulk sending from a personal account risks the account itself.
- **Outreach queue (platform admin → Sales):** `OutreachQueuePanel` sits above the pipeline table and answers "who do I contact today" rather than "what does the pipeline look like" — four buckets (overdue / due today / gone quiet / never contacted), worked in that order. `leads.last_contacted_at` is maintained by `trg_leads_touch_stamp` from `lead_activities` and **must never be written directly** (it's absent from `update_lead`'s ALLOWED list on purpose); `NOTE`-channel activities deliberately don't count as a touch. The `log_touch` action writes the activity, the stage and `next_action_date` in one call — two round trips is how the follow-up date ends up unset. `leads.tech_stack` / `tech_stack_source` hold what a company uses today; a website crawl of all phase-1 companies (`20260827000002`) found **no** disclosed reporting software, so that column is a question for a phone call, not something to infer. Bucket logic is unit-tested in `OutreachQueuePanel.test.tsx`.
- **Self-serve signups vs the lead pipeline:** since `/start-trial` went live a company can exist in `companies` with **no `leads` row behind it** — nobody worked it, so the `NEW→…→WON` pipeline no longer accounts for every customer. Self-serve signups are deliberately **not** auto-created as leads: a signup is a customer, not a prospect, and injecting one into an outreach pipeline corrupts the "who have we actually contacted" record the contact book exists to keep. Instead `get_selfserve_signups` (platform-admin-data) returns companies unreferenced by any `leads.company_id`, rendered by `SelfServeSignupsPanel` above the Sales tab table. Where a company name matches a lead it is offered as a *suggestion* only — names collide, so `link_company_to_lead` (which also closes the lead at `WON`) stays a human decision.
- **Lead contact book:** `lead_contacts` (migration `20260823000005`) holds many contacts per lead, because at a mid/large EPC the buying committee is several people while `leads.contact_*` has room for one. `leads.contact_*` is kept as the primary contact and mirrored by `upsert_lead_contact` whenever `is_primary` is set, so nothing reading the old columns breaks. `email_status` is the trust marker: `PUBLISHED` = read off a page the company controls, `UNVERIFIED` = third-party directory or an inferred name-to-mailbox mapping. **Never seed a pattern-guessed `first.last@domain` address** — a guessed address that bounces burns the sending domain's reputation for every later campaign. A known decision maker with no published address is stored as a name with a NULL email instead. Seed data + per-contact provenance notes: `20260823000006_seed_lead_contacts.sql`.
- **Billing webhooks:** `razorpay-webhook` Edge Function verifies HMAC signature, dedupes by `X-Razorpay-Event-Id` header (not `event.id` — that field doesn't exist in Razorpay's payload) via `record_billing_event` RPC against `billing_events`, then upserts `subscriptions` (via `upsert_subscription`, service-role-only) or `orders` (via `upsert_order`). `subscriptions.plan_id` is resolved by `upsert_subscription` from Razorpay's provider plan id via the service-role-only `plan_provider_mapping` table (not `plans` — those columns were removed from `plans` since it's anon-readable). Shared provider abstraction: `supabase/functions/_shared/billing_provider.ts` (`BillingProvider` interface, `RazorpayBillingProvider`). `upsert_subscription` also guards against out-of-order/delayed webhook delivery via `subscriptions.last_event_at` compared against each event's own `created_at` (passed as `_event_created_at`) — a stale event no-ops instead of overwriting newer state (migration `20260814000002`). A second **identity guard** (migration `20260823000012`) ignores an event whose `provider_subscription_id` differs from the one on file while that stored subscription is in a live status (`created`/`authenticated`/`active`/`pending`/`halted`/`past_due`) — `subscriptions` is keyed on `company_id` alone, so without it any event for *any* of a company's provider subscriptions overwrites the same row, and the ordering guard can't help because it compares timestamps per company, not per subscription. Found live during the cutover probe when a cancellation for an unused subscription clobbered the real one. A genuine re-subscribe is unaffected: the old subscription is terminal (or has no provider id) by then.
- **Marketing funnel:** `optimustesting.com` → `PricingSection` (live prices/features from `plans`/`plan_features`) → non-custom plan CTAs go to `/start-trial?plan=<slug>` (Enterprise stays `#cta` demo-request, sales-assisted). `start-trial` Edge Function creates the company (slug auto-derived from company name, collision-suffixed) + SUPERADMIN atomically, same rollback discipline as `create-tenant` but public + rate-limited, no platform token. New company gets the default `trial` plan tier + 14-day `trial_ends_at` via the existing trigger — nothing in `start-trial` sets those explicitly. Signup itself lives on the APP host, not the marketing site, so the session it creates (especially via OAuth) is on the same origin as the workspace. Nav "Sign in"/"Get started" cross to the app origin via `lib/appOrigin.ts`.

- **Host model (single-domain + aliases):** `lib/appOrigin.ts` owns the taxonomy. `optimustesting.com`/`www` = marketing; `admin.` = platform admin; `app.optimustesting.com` = the tenant app for EVERY company; `<slug>.optimustesting.com` = the same app, a cosmetic branded alias; a customer's own domain = the premium `custom_domain` feature. **The host never selects the tenant** — `CompanyContext` resolves the company from the signed-in user's `profiles.company_id`, and RLS (`my_company_id()`) is the isolation boundary as it always was. The old company-mismatch guard in `AuthContext` was removed because with no per-company host there is nothing to mismatch. One sign-in spans app host + all subdomain aliases (see gotcha 23); a custom domain is a separate origin and keeps its own session.
- **Custom domains (Business+):** `company_domains` holds one domain per company with a DNS TXT token. `request_custom_domain`/`remove_custom_domain` are SUPERADMIN + entitlement gated; `mark_custom_domain_verified`/`_provisioned` are service-role only so a tenant can never self-verify. `verify-custom-domain` proves control via DNS-over-HTTPS (Cloudflare, Google fallback) on an hourly cron, then registers the host with Vercel if `VERCEL_API_TOKEN` is set — otherwise an operator runs `scripts/provision-custom-domains.sh`, which uses their own CLI session rather than parking an account-wide Vercel token in Supabase secrets.
- **Outbound email:** every sender goes through `resendFrom()` (`_shared/email.ts`), reading the `RESEND_FROM` secret and defaulting to Resend's sandbox address. Never hardcode a From — Resend's shared `onboarding@resend.dev` only delivers to the account owner, so a hardcoded sandbox sender silently fails for real customers. `optimustesting.com` is verified for sending; the apex also has an MX for Resend inbound.
- **Mailboxes / DNS:** DNS for `optimustesting.com` is on **Vercel** (`ns1/ns2.vercel-dns.com`), so `vercel dns` is the way to change it — no API token is stored. `_dmarc` now exists at `p=none` (it did not before; its absence cost deliverability under Google/Yahoo bulk-sender rules). Apex MX belongs to Resend inbound and is **single-owner**: putting a real mailbox (Zoho) on the apex swaps it, which silences `resend-inbound`/`inbound_emails`/MailTab's inbox pane and turns `support@` into a human inbox. `scripts/setup-zoho-dns.sh` does this in two stages (`verify` additive, `mx` destructive + confirmed + `rollback-mx`). Transactional sending is unaffected either way — it goes out from `send.optimustesting.com`, which carries its own SPF/DKIM. Runbook: `docs/sales/MAILBOX_SETUP.md`.
- **Cold outreach never goes through Resend and never from a mailbox that matters.** Resend's AUP bans unsolicited mail and scraped lists, and the one `RESEND_API_KEY` also runs `notify-rework`/`start-trial`/`notify-demo-request` — an AUP strike stops rework notices and trial confirmations. The public support address is `SUPPORT_EMAIL` in `frontend/src/lib/contact.ts`; don't re-hardcode it (Razorpay's review checks the address published in the legal pages is reachable).
- **Legal pages:** `/terms`, `/privacy`, `/refund-policy`, `/contact` (`pages/legal/LegalPages.tsx`) exist for Razorpay's website review and describe what the code actually does (cancel at period end, no pro-rata refund, 90-day purge, 180-day audit archival). Business identity is a set of constants at the top of that file and must match the Razorpay account registration exactly.
- **Checkout flow:** `manage-subscription`'s `subscribe` action (company has no `subscriptions.provider_subscription_id` yet — trial only) creates a Razorpay customer + subscription via `RazorpayBillingProvider`, returns `subscription_id`/`razorpay_key_id` to the client. `SubscribeCard.tsx` (`BillingSettingsPage`) loads `checkout.razorpay.com/v1/checkout.js` client-side and opens the payment modal against that `subscription_id`. Deliberately no local `subscriptions` row write in `subscribe` — `razorpay-webhook`'s `subscription.authenticated`/`.activated` events (resolved via `notes.company_id`, set at `createSubscription` time) are the single source of truth for "checkout actually completed." `vercel.json` CSP allows `checkout.razorpay.com` in `script-src`/`connect-src`/`frame-src`.
- **Razorpay is LIVE (cut over 2026-08-27).** Six live plans exist (`plan_TUqq…`, created via the API at the charm prices) and `plan_provider_mapping` points at them with `provider_mode = 'live'` (migration `20260823000011`); the superseded test plans stay orphaned at Razorpay because plans cannot be deleted. Live webhook `TUqr4PwenTnwMs` targets `/functions/v1/razorpay-webhook` with 12 `subscription.*`/`payment.*` events. Verified end to end with a real ₹1 charge through the production app: `manage-subscription` → Checkout.js → signed webhook → `record_billing_event` → `upsert_subscription` → `active` row. Two things the probe taught: Razorpay's **hosted subscription page (`short_url`) is not enabled on this account** — irrelevant, since TestFlow uses Checkout.js — and live mode enforces the **registered-website check**, so checkout only works from an origin registered with Razorpay (`optimustesting.com`). A localhost page gets "Payment blocked as website does not match registered website(s)" before any payment method can authorize.
- **Billing page pricing:** `BillingSettingsPage` shows a Plans card (every public plan, monthly + annual, current one badged) and prices each option in the subscribe/upgrade/downgrade pickers. Formatting lives in `frontend/src/lib/planOptions.ts` (`planOptionLabel`, `formatPlanPrice`, `annualSavingPct`) — a native `<option>` renders text only, so the price is baked into the label string. Prices are read from `plans`, the same table the marketing pricing page and the admin Plans tab use, so they cannot drift. Custom plans have NULL prices by design and render "contact sales". Upgrade/downgrade labels use `subscriptions.billing_interval` so an annual subscriber isn't shown a monthly sticker price.
- **Add-ons (self-service, one-time orders):** `addon_catalog` (migration `20260827000002`) is the price list — `kind` is `quantity` (bought in multiples, quantities sum into the entitlement caps) or `flag` (a single on/off grant). Readable by any authenticated user so the billing page can render prices; writes are service-role only, same shape as `plans`. `manage-subscription`'s `purchase_addon` action (SUPERADMIN-checked server-side) computes the amount **from the catalogue, never from the request body**, refuses a flag add-on that is already active and a company with no subscription, then creates a Razorpay **order** via `RazorpayBillingProvider.createOrder()` and returns `order_id` for Checkout.js. `AddonsCard.tsx` opens the modal with `order_id` (not `subscription_id` — that is the recurring path). On `payment.captured`, `razorpay-webhook` writes `orders` as before **and** calls `record_addon_purchase`, which grants the entitlement; it is idempotent on `subscription_addons.provider_payment_id` (partial UNIQUE index), so a redelivered webhook cannot grant twice. `unit_price_inr` on the grant records what was actually paid and is deliberately not rewritten when the catalogue price changes. One-time only: a recurring add-on is a different Razorpay API billed on the next invoice, and `orders` + the webhook are shaped for one-time charges. `dedicated_environment` and `custom_integration` are intentionally absent from the catalogue — sales-assisted, still operator-granted via `admin_create_addon`.
- **Invoice history:** `manage-subscription`'s `invoices` action (SUPERADMIN-checked server-side against `user_roles`, own rate-limit bucket of 60/hr since it runs on every billing-page load) reads live from Razorpay via `RazorpayBillingProvider.getInvoices(provider_customer_id)` — there is no local invoice mirror table, which is why `razorpay-webhook` deliberately no-ops `invoice.*` events. A company with no `subscriptions.provider_customer_id` yet (trial, or abandoned checkout) gets `{invoices: []}`, not an error. UI: `InvoiceHistoryCard.tsx` on `BillingSettingsPage`; the receipt link is Razorpay's `short_url`.
- **Cancellation flow:** `request_subscription_cancellation` sets `cancel_at = current_period_end` (idempotent — a second call is a no-op), then `manage-subscription`'s cancel action calls `RazorpayBillingProvider.cancelSubscription(provider_subscription_id, true)`, which tells Razorpay `cancel_at_cycle_end:1` — Razorpay itself now defers the real stop-billing cutoff to end of the paid cycle, matching the local `cancel_at` semantics in one call. If that provider call fails, `cancel_at` is NOT rolled back (the response carries `provider_cancel_warning` instead) so a network blip can't silently un-cancel a subscription the user confirmed. `flip_expired_cancellations()` RPC (service-role only) remains a DB-side reconciliation backstop for the case where Razorpay's confirming `subscription.cancelled` webhook never arrives — invoked daily by `reconcile-cancellations` Edge Function via `.github/workflows/reconcile-cancellations.yml` (needs `RECONCILE_CRON_SECRET` set as both a Supabase secret and a GH Actions secret). - **Downgrade flow:** `request_plan_downgrade` sets `pending_plan_id` after a feasibility check, then `manage-subscription`'s downgrade action calls `RazorpayBillingProvider.changeSubscription(provider_subscription_id, providerPlanId, 'cycle_end')` so Razorpay bills the lower amount from the next cycle, matching the local `pending_plan_id` semantics. The provider plan id and the subscription row are read **before** the RPC runs, so a plan with no `plan_provider_mapping` entry is rejected outright rather than leaving a pending downgrade that can never reach Razorpay; a company with no provider subscription (trial) is a legitimate DB-only downgrade and skips the provider call. On provider failure `pending_plan_id` is NOT rolled back — the response carries `provider_downgrade_warning`, same discipline as cancellation. `upsert_subscription` still applies the pending plan locally on the next period rollover. (The long-standing `TODO(Plan 2)` here was closed on 2026-08-27; **upgrade** was already wired and Razorpay prorates it via `schedule_change_at: 'now'`, so `docs/dev/BILLING_QA_MATRIX.md`'s "no proration/upgrade codepath" gap note is stale.)
- **Billing/webhook tests:** `supabase/functions/_shared/billing_provider_invoices.test.ts` is a pure unit suite (stubs `globalThis.fetch`, no `supabase start`, no network — run it alone with `deno test --allow-env`). The rest — `supabase/functions/_shared/entitlements.test.ts`, `supabase/functions/razorpay-webhook/index.test.ts`, `supabase/functions/reconcile-cancellations/index.test.ts` are live Deno integration tests (no mocks — real Postgres + real local Edge Runtime via `supabase start`), 9/9 passing as of `20260822000003`. Run locally: split `supabase/migrations/20260411000005_add_vt_equipment_type_and_templates.sql` the same way `supabase.yml`'s `test-billing-functions` job does (see that job's "Split migration..." step — don't skip this, `supabase start` fails on it otherwise), `supabase start`, write `RAZORPAY_WEBHOOK_SECRET`/`RECONCILE_CRON_SECRET` test values into **both** `supabase/.env` and `supabase/functions/.env`, export `SUPABASE_SERVICE_ROLE_KEY` from `supabase status -o json`, then `cd supabase/functions && deno test --allow-net --allow-env _shared/entitlements.test.ts razorpay-webhook/index.test.ts reconcile-cancellations/index.test.ts`. Needs `service_role` to have `SELECT`/`INSERT`/`DELETE` on `companies` and full CRUD on `plans`/`subscriptions`/`enterprise_contracts`/`billing_events`/`subscription_addons` (migrations `20260822000002`/`20260822000003`) — these tables' RLS policies never required an explicit service_role grant until this suite's fixture helper (`test_helpers.ts`) started reading/writing them directly via the standard client.
- **Past-due grace period:** a `past_due` subscription keeps full access for 7 days after `current_period_end` (`GRACE_PERIOD_DAYS` in `is_past_due_grace_expired`, service-role-only), after which `can_invite_user`/`can_create_project` block new writes until payment succeeds or the subscription is cancelled. Existing data stays readable — this only gates INSERT-path checks. New-project creation is enforced via the `projects` INSERT RLS policy calling `can_create_project()` directly; new-user seat gating goes through `create-user`'s call to `get_resource_limit_status('users', ...)` (not `can_invite_user()` — that function is otherwise unused), so any future grace/entitlement logic must be added to **both** `can_invite_user()` and `get_resource_limit_status()` or they will drift (see migration `20260814000001` for a past drift incident).

## Conventions

- Run `npm run dev/build/lint` from repo root or `frontend/`. Run `supabase` from repo root.
- Path alias `@/` → `frontend/src/`
- Supabase client: always import from `@/integrations/supabase/client`
- Types: `Tables<'...'>`, `Enums<'...'>` from `@/integrations/supabase/types` (auto-gen, don't edit)
- Dates: `formatDate`/`formatDateTime` from `@/lib/format` — never `toLocaleDateString()`
- Toast: `useToast` from `@/hooks/use-toast`
- All Supabase calls in try/catch; toast + console on error
- shadcn/ui in `components/ui/` — never edit; run `npx shadcn-ui@latest add <c>` from `frontend/`
- **Soft-delete** projects / equipment_instances / test_records by setting `deleted_at = NOW()`, not `.delete()`. SUPERADMIN sees soft-deleted rows; use `restore_project(id)` RPC.
- Audit triggers cover projects / equipment_instances / test_tasks / test_records / user_roles — don't write app-level inserts for these.

## Environment Variables

| Variable | Scope | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser | anon key intentionally exposed — RLS enforces security |
| `VITE_REALTIME_ENABLED` | Browser | default true; set false on Free tier |
| ~~`VITE_PLATFORM_ADMIN_PASSWORD`~~ | **removed** | The admin login had two fields (client-side password + platform token); the password proved nothing to the server, so it was dropped. Token only. Delete this var from Vercel. |
| ~~`VITE_PLATFORM_ADMIN_TOKEN`~~ | **removed** | Never build the platform token into the bundle — the operator types it at admin login (`platformToken.ts`, sessionStorage). Delete this var from Vercel. |
| `VITE_SENTRY_DSN` | Browser | optional — see `lib/monitoring.ts` |
| `ANTHROPIC_API_KEY` | Edge Function | `supabase secrets set`, never in `.env` |
| `PLATFORM_ADMIN_TOKEN` | Edge Function | guards `create-tenant`, `platform-admin-data` |
| `RAZORPAY_WEBHOOK_SECRET` | Edge Function | required for `razorpay-webhook` |
| `RECONCILE_CRON_SECRET` | Edge Function + GH Actions | `supabase secrets set`; must match the `RECONCILE_CRON_SECRET` GH Actions secret used by `reconcile-cancellations.yml` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Edge Function | `supabase secrets set`; used by `RazorpayBillingProvider` (`_shared/billing_provider.ts`). **Live keys (`rzp_live_…`) since 2026-08-27 — checkout charges real cards.** |
| `RESEND_WEBHOOK_SECRET` | Edge Function | required for `resend-inbound`; the `whsec_...` signing secret from Resend → Webhooks |
| `RESEND_REPLY_TO` | Edge Function | optional; set only to a mailbox that can actually receive — unset means no `Reply-To` header at all |
| `SMTP_USER` / `SMTP_APP_PASSWORD` | Edge Function | outreach sending only, never transactional. Gmail **App Password** (needs 2-Step Verification), not the account password. Unset = sending disabled, panel says so |
| `SMTP_FROM_NAME` / `SMTP_HOST` / `SMTP_PORT` | Edge Function | optional; default `smtp.gmail.com:465` implicit TLS |
| GH Actions | CI | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |

Frontend env: `frontend/.env` (not root). Edge Functions auto-get `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`.

## Edge Functions

| Function | Purpose |
|---|---|
| `create-user` | Admin user creation (30/hr/SUPERADMIN) |
| `delete-user` | Admin deletion, same-company check (30/hr) |
| `generate-report` | AI report, concurrency-locked (10/hr) |
| `create-tenant` | Platform: atomic company+SUPERADMIN; `X-Platform-Token` (20/hr/IP) |
| `platform-admin-data` | RLS-bypass proxy for admin panel; service role; same token |
| `razorpay-webhook` | HMAC-verified subscription upsert — **live mode since 2026-08-27** |
| `health` | Public uptime probe |
| `start-trial` | Public, self-serve: creates a new trial company + SUPERADMIN (5/hr/IP) |
| `reconcile-cancellations` | Daily cron backstop, flips expired `cancel_at` subscriptions to `cancelled` (`X-Cron-Secret` gated) |
| `notify-rework` | 15-min cron, drains `rework_notifications` outbox and emails assigned engineer via Resend (`X-Cron-Secret` gated) |
| `retention-cleanup` | Nightly cron, hard-deletes >90d soft-deleted rows + archives >180d `audit_logs` (`X-Cron-Secret` gated) |
| `resend-inbound` | Resend `email.received` webhook; Svix-signature verified, deduped by delivery id into `inbound_emails` |

All share CORS via `_shared/cors.ts`. New domains → add to `ALLOWED_ORIGINS`. Use `buildCorsHeaders(origin)`. Wrap mutations with `enforceRateLimit(...)` from `_shared/rate_limit.ts`.

## Platform Admin Panel

`admin.optimustesting.com`. Apex serves marketing site (`Marketing.tsx`). `App.tsx` three-way routes by hostname: admin / marketing / tenant. Query overrides: `?admin`, `?marketing`.

- No Supabase Auth; single credential = the platform token, typed at login, verified against `platform-admin-data` (`get_stats`), then held in `sessionStorage`.
- Data queries go via `platform-admin-data` Edge Function (service role).
- Magic links: Supabase ignores `redirectTo` in `admin.generateLink()` — must rewrite `action_link?redirect_to=...` after generation. Requires `https://*.optimustesting.com/**` in Supabase Auth → URL Configuration.

## Mobile Entitlements & Billing Awareness

Mobile has no billing surface (billing is SUPERADMIN-only and lives on the web app), but it does surface billing *state* so field users aren't blocked by an unexplained RLS rejection:

- `mobile/src/lib/entitlements.ts` — `useEntitlements()` / `useFeatureEntitlement()`, mirroring `frontend/src/lib/entitlements.ts` against the same `get_company_entitlements` RPC. The only difference is where the company id comes from: web reads `CompanyContext` (host-derived), mobile reads `profile.company_id` (mobile has no host).
- `mobile/src/lib/trialStatus.ts` — pure `trialBannerState()` holding the branching that web keeps inline in `TrialBanner.tsx`; unit-tested, same treatment as `taskProgress.ts`. Keep it in lock-step with the web component's thresholds (7-day window, 3-day escalation).
- `mobile/src/components/TrialBanner.tsx` — renders that state as a bottom strip alongside `NetworkBanner`/`RealtimeStatusBanner` in `App.tsx`. No "Manage billing" CTA by design; it points the user at their administrator.
- `mobile/src/lib/planLimits.ts` — `planLimitMessage()` / `isPlanGateRlsError()`. `CreateProjectScreen` pre-flights `check_can_create_project` before inserting, so a GM at the plan cap gets a real reason instead of the bare "You don't have permission" that `explainSupabaseError` produces for the `projects` INSERT policy's RLS rejection. Web does the same in `pages/projects/NewProject.tsx` but escalates to `UpgradeModal`.

Mobile deliberately does NOT mirror two web changes: the cookie-backed cross-subdomain session storage (React Native has no shared-cookie concept — mobile stays on SecureStore, changing it would sign every engineer out) and the company-mismatch guard removal (mobile never had one; it has always resolved company from `profiles.company_id`, not a hostname).

## Mobile Deployment (EAS)

The mobile app uses EAS (Expo Application Services) for builds and OTA updates.

**OTA updates (automatic):** CI publishes a new JS bundle to the `production` channel on every push to `main`. Engineers receive updates silently on next app launch — no reinstall needed.

**Cut a new native build when:**
- Adding a new Expo/native module (e.g., `expo-camera`, `expo-notifications`)
- Bumping `version`, `versionCode`, or `buildNumber` in `mobile/app.config.js`
- Changing native config: permissions, deep-link scheme, splash/icon assets

To build: `cd mobile && eas build --profile production`

Share the resulting install link (QR code in Expo dashboard) with field engineers. Android: direct APK install. iOS: device UDID must be registered in Apple Developer first.

**Secrets:** Supabase URL/key and platform admin tokens are in EAS Secrets (Expo dashboard → project → Secrets). For local dev, they're in `mobile/.env` (committed for public values) and `mobile/.env.local` (gitignored for private values).

**EAS project ID:** In `mobile/app.config.js` → `PROJECT_ID` constant (`fdb44eda-7e1e-4b67-93e9-fb314f0b105d`). Do not change without also updating the `updates.url` field.

## Gotchas

1. `AuthContext` `setTimeout(..., 0)` — don't remove.
2. `project_test_scope` save is delete-then-insert by design.
3. `test_records` must be upsert (UNIQUE constraint).
4. `test_templates.fields = []` is common — render gracefully.
5. New users have `company_id = NULL` briefly between trigger and Edge Function — safe (RLS returns nothing).
6. Public `signUp()` (self-serve add-a-user-to-an-existing-tenant) is gone — don't re-add. Don't confuse with OAuth: `AuthContext.signInWithOAuth(provider)` (Google/Microsoft/LinkedIn/Apple) and `start-trial` (new-company self-serve) are both intentional, current, and separate from that removed flow.
7. `companies` SELECT is `USING (TRUE)` (anon needs it pre-login) but **column-scoped by GRANT** (`20260813000021`) — anon sees only id/name/slug/is_active/oauth_provisioning/allowed_domains. Anon INSERT/DELETE was revoked in the same migration; tenant creation goes through `create-tenant` (service role).
8. `profiles_update_own` RLS WITH CHECK prevents self-changing `company_id` — anti-escalation gate, don't weaken.
9. `PLATFORM_ADMIN_TOKEN` mismatch between Vercel and Supabase secret = 401 on all platform calls.
10. `vercel.json` has strict CSP — add new third-parties to `connect-src`/`frame-src`/`script-src`.
11. PDF + Excel exports share section rendering. `testSectionTables.tsx` (`SectionTable`) and `projectExcelExport.ts` (`renderSection`) **must stay in lock-step**.
12. Heavy libs (`xlsx`, `jspdf`, `html2canvas`) are dynamically imported. `recharts`/`radix-ui`/`@supabase/supabase-js` are manual chunks. Don't add static imports.
13. Bulk invites: `BulkInviteDialog` posts to `create-user` sequentially with 800ms delay; stops on rate-limit error. Custom SMTP required for >30.
14. Password policy: 10+ chars, upper+lower+digit. Enforced client (zod) + server (Edge Functions).
15. Trial mode: `companies.trial_ends_at` (14d default via trigger). Feature flags: `companies.features` JSONB + `has_feature()` SQL fn + `useFeature()` hook. Flags default TRUE.
16. Demo tenants `companya`/`companyb`/`companyc` seeded by migration `20260429000001` — rotate passwords before exposing.
17. The anon key in the browser bundle is intentional and safe — RLS is the security boundary. The **platform admin token is not** — it bypasses RLS, so it never goes in a `VITE_*` var — it is typed at admin login and held in sessionStorage.
18. `my_company_id()` returns NULL when `profiles.is_active` or `companies.is_active` is FALSE (`20260813000021`) — deactivation/suspension is enforced in the DB, not just in `AuthContext`/`CompanyContext`. Every tenant policy inherits this.
19. Approval is RLS-gated: only SUPERVISOR/GM/SUPERADMIN may set `test_tasks.status` to `APPROVED`/`REWORK`; ENGINEERs write `test_records`/`nameplate_records` only for tasks assigned to them (`20260813000021`).
20. New SECURITY DEFINER functions get `EXECUTE` for PUBLIC by default. Always `REVOKE ALL ... FROM PUBLIC` + `GRANT ... TO service_role` unless the function is genuinely caller-safe and guarded on `my_company_id()`. **`CREATE OR REPLACE FUNCTION` with a CHANGED parameter list creates a NEW overload — the old signature's REVOKE does NOT apply to it.** `upsert_subscription`'s 10-arg overload carried a default PUBLIC grant for days because of this (`20260822000013`).
21. **`verify_jwt = false` in `supabase/config.toml` is required** for any function whose caller has no Supabase JWT — webhooks (Razorpay, Resend) and GH Actions crons. Without it Supabase's gateway rejects the request *before* your handler runs, so a handler-level secret check never executes. `notify-rework` and `retention-cleanup` failed silently this way. A cron-gated function is also only half-built until a `.github/workflows/` file actually calls it.
22. **Only `frontend/vercel.json` is live** — Vercel's root directory is `frontend/`. A second `vercel.json` at the repo root was dead config and has been deleted; don't recreate it. CSP lives there: Razorpay checkout needs `checkout.razorpay.com` in `script-src`, `connect-src` **and** `frame-src`.
23. **Sessions are cookie-backed, scoped to `.optimustesting.com`** (`integrations/supabase/sessionStorageAdapter.ts`), not localStorage — that's what lets one sign-in span the app host and every company subdomain. Chunked, because a session JSON exceeds the ~4KB cookie cap; `SameSite=Lax` because OAuth and email-confirm return via cross-site navigation that `Strict` would strip.
24. **`supabase secrets list` shows digests, not values.** You cannot read a secret back — don't test an endpoint with a value copied from that output.
25. **Razorpay plan amounts are immutable.** A price change is always create-a-new-plan-and-remap (`plan_provider_mapping`), never an edit. Editing a price without remapping makes the pricing page advertise one number while checkout charges another. Since the live cutover this is real money — the mapping now holds live plan ids, so a bad remap charges real cards.
26. Migration numbering collides easily when several sessions work at once — **check the highest existing number before choosing one.** Three collisions happened on 2026-08-23 alone; see `f640462` / `8036eb9` for the phantom-history repair that follows a bad push.
27. **Refunds need settled balance.** A refund issued before the payment settles fails with "Your account does not have enough balance to carry out the refund operation" — not a permissions or API problem, just timing (T+2/3). Retry after settlement or top up the Razorpay balance.
28. **Live Razorpay enforces the registered-website check.** Checkout only authorizes from an origin registered on the Razorpay account (`optimustesting.com`). From anywhere else — localhost, a `*.vercel.app` preview — every payment method fails with "Payment blocked as website does not match registered website(s)", and UPI shows no QR at all. Test checkout from the real app host, not a local page.

## Docs

- `docs/dev/ADMIN_PANEL_BRIEF.md` — hand-off brief for making the admin panel self-service (plans/features are migration-only today)
- `docs/dev/MIGRATIONS.md` — migration playbook
- `docs/dev/BILLING_QA_MATRIX.md` — hand-traced billing/subscription QA matrix (trial/upgrade/downgrade/webhook edge cases) + known launch-readiness gaps (no proration/upgrade codepath, cancellation doesn't stop billing at Razorpay — see gotcha below)
- `skills/gridpoint-testflow/SKILL.md` — Claude project skill

(`SAAS_ROADMAP.md`, `IMPROVEMENTS.md`, `AI_REPORT_PLAN.md`, `EMAIL_RATE_LIMIT.md` referenced here previously do not exist in this repo — removed as stale pointers.)
