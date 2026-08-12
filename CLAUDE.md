# CLAUDE.md — gridpoint-testflow

> **Standing rule:** Update this file when changes affect the dev reference — new conventions, env vars, gotchas, infra.

## What This Project Is

**TestFlow** — multi-tenant B2B SaaS for electrical substation commissioning. Each client gets `company.testflow.io`. Field teams manage test projects, record measurements, generate PDF/AI reports.

- **Mobile app (`mobile/`)** — Expo/React Native for ENGINEER role. Same Supabase backend + RLS.
- **Shared package (`packages/shared/`)** — source-only TS imported by web + mobile via `@testflow/shared`. Holds `EQUIPMENT_LABEL`, `AppRole/ROLE_RANK/highestRole()`, status constants, `explainSupabaseError`, `normalizeFields()`. No build step.
- **Multi-tenancy:** Single Supabase project, `company_id` on root tables, RLS enforces isolation.
- **No public sign-up.** SUPERADMINs create users via `create-user` Edge Function.

## Tech Stack

- **Frontend:** React 18 + Vite + TS (SPA — no SSR, no Next.js, no `'use client'`)
- **UI:** shadcn/ui + Tailwind v3
- **Backend:** Supabase (Postgres + Auth + RLS + Realtime + Edge Functions)
- **State:** TanStack Query v5 (partial adoption)
- **Forms:** react-hook-form + zod
- **Routing:** react-router-dom v6
- **AI:** Anthropic Claude (`claude-haiku-4-5-20251001`) — Edge Function only
- **Excel:** SheetJS (`xlsx`), dynamically imported
- **CI:** GH Actions → `supabase db push` + functions deploy on push to main

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
billing_events       Razorpay webhook idempotency ledger; RLS no-policy (service-role only)
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
- **Company resolution:** `CompanyContext` reads subdomain → fetches `companies` by slug. localhost → null (dev mode).
- **Status transitions:** `ProjectStatusActions` UPDATE includes `.eq('status', current)` optimistic-concurrency guard — don't remove.
- **Project clone:** `clone_project(...)` RPC. Copies scope only.
- **Bulk approve:** Supervisor dashboard checkboxes; UPDATE guarded by `.eq('status','SUBMITTED')`.
- **Idle timeout:** 30 min in AuthContext (`IDLE_TIMEOUT_MS`).
- **Company-scoped login:** `AuthContext` compares `profiles.company_id` to subdomain's `company.id`; mismatch → sign out + `companyMismatch=true`. Skipped on localhost.
- **Sales tracker (platform admin):** Internal outreach CRM in the admin panel's **Sales** tab. `leads` + `lead_activities` tables (RLS enabled, **no policies** → service-role-only via `platform-admin-data`). Seeded from the GTM target list (migration `20260530000004`). 7-stage pipeline `NEW→CONTACTED→DEMO_BOOKED→PILOT→WON|LOST|PARKED`. Edge actions: `get_all_leads`, `get_lead_detail`, `create_lead`, `update_lead`, `add_lead_activity`. UI in `pages/PlatformAdmin/SalesTab.tsx` + `LeadDetailDrawer.tsx`; shared `platformFetch.ts`. Tracking-only — automations (reminders/sending/auto-park/KPIs) are a deferred phase. Regenerate seed via `scripts/gen_leads_seed.py`.
- **Billing webhooks:** `razorpay-webhook` Edge Function verifies HMAC signature, dedupes by `X-Razorpay-Event-Id` header (not `event.id` — that field doesn't exist in Razorpay's payload) via `record_billing_event` RPC against `billing_events`, then upserts `subscriptions` (via `upsert_subscription`, service-role-only) or `orders` (via `upsert_order`). `subscriptions.plan_id` is resolved by `upsert_subscription` from Razorpay's provider plan id via the service-role-only `plan_provider_mapping` table (not `plans` — those columns were removed from `plans` since it's anon-readable). Shared provider abstraction: `supabase/functions/_shared/billing_provider.ts` (`BillingProvider` interface, `RazorpayBillingProvider`).
- **Past-due grace period:** a `past_due` subscription keeps full access for 7 days after `current_period_end` (`GRACE_PERIOD_DAYS` in `is_past_due_grace_expired`, service-role-only), after which `can_invite_user`/`can_create_project` block new writes until payment succeeds or the subscription is cancelled. Existing data stays readable — this only gates INSERT-path checks.

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
| `VITE_PLATFORM_ADMIN_PASSWORD` | Browser (admin panel) | Production scope only in Vercel |
| `VITE_PLATFORM_ADMIN_TOKEN` | Browser (admin panel) | **must exactly match** `PLATFORM_ADMIN_TOKEN` secret |
| `VITE_SENTRY_DSN` | Browser | optional — see `lib/monitoring.ts` |
| `ANTHROPIC_API_KEY` | Edge Function | `supabase secrets set`, never in `.env` |
| `PLATFORM_ADMIN_TOKEN` | Edge Function | guards `create-tenant`, `platform-admin-data` |
| `RAZORPAY_WEBHOOK_SECRET` | Edge Function | required for `razorpay-webhook` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Edge Function | `supabase secrets set`; used by `RazorpayBillingProvider` (`_shared/billing_provider.ts`) |
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
| `razorpay-webhook` | HMAC-verified subscription upsert (scaffold) |
| `health` | Public uptime probe |

All share CORS via `_shared/cors.ts`. New domains → add to `ALLOWED_ORIGINS`. Use `buildCorsHeaders(origin)`. Wrap mutations with `enforceRateLimit(...)` from `_shared/rate_limit.ts`.

## Platform Admin Panel

`admin.optimustesting.com`. Apex serves marketing site (`Marketing.tsx`). `App.tsx` three-way routes by hostname: admin / marketing / tenant. Query overrides: `?admin`, `?marketing`.

- No Supabase Auth; gated by `VITE_PLATFORM_ADMIN_PASSWORD` + `sessionStorage`.
- Data queries go via `platform-admin-data` Edge Function (service role).
- Magic links: Supabase ignores `redirectTo` in `admin.generateLink()` — must rewrite `action_link?redirect_to=...` after generation. Requires `https://*.optimustesting.com/**` in Supabase Auth → URL Configuration.

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
6. `signUp()` and `signInWithGoogle()` are gone — don't re-add.
7. `companies` SELECT is `USING (TRUE)` (anon needs it); INSERT/DELETE for anon allowed for platform admin only (migration `20260430000002`).
8. `profiles_update_own` RLS WITH CHECK prevents self-changing `company_id` — anti-escalation gate, don't weaken.
9. `PLATFORM_ADMIN_TOKEN` mismatch between Vercel and Supabase secret = 401 on all platform calls.
10. `vercel.json` has strict CSP — add new third-parties to `connect-src`/`frame-src`/`script-src`.
11. PDF + Excel exports share section rendering. `testSectionTables.tsx` (`SectionTable`) and `projectExcelExport.ts` (`renderSection`) **must stay in lock-step**.
12. Heavy libs (`xlsx`, `jspdf`, `html2canvas`) are dynamically imported. `recharts`/`radix-ui`/`@supabase/supabase-js` are manual chunks. Don't add static imports.
13. Bulk invites: `BulkInviteDialog` posts to `create-user` sequentially with 800ms delay; stops on rate-limit error. Custom SMTP required for >30.
14. Password policy: 10+ chars, upper+lower+digit. Enforced client (zod) + server (Edge Functions).
15. Trial mode: `companies.trial_ends_at` (14d default via trigger). Feature flags: `companies.features` JSONB + `has_feature()` SQL fn + `useFeature()` hook. Flags default TRUE.
16. Demo tenants `companya`/`companyb`/`companyc` seeded by migration `20260429000001` — rotate passwords before exposing.
17. The anon key in the browser bundle is intentional and safe — RLS is the security boundary.

## Docs

- `MIGRATIONS.md` — migration playbook
- `SAAS_ROADMAP.md` — multi-tenant roadmap
- `IMPROVEMENTS.md` — bug + enhancement tracker
- `AI_REPORT_PLAN.md` — AI report architecture
- `EMAIL_RATE_LIMIT.md` — SMTP/OAuth options
- `skills/gridpoint-testflow/SKILL.md` — Claude project skill
