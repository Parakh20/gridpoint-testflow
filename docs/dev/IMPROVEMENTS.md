# Improvements & Known Issues

Legend: 🔲 Pending | ⚠️ Partial

---

## Medium Priority

### 🔲 No server-side pagination for large datasets
`GMDashboard` uses client-side `PAGE_SIZE` slicing. Works now but will degrade when project count exceeds ~500.

**Fix:** Switch to `useInfiniteQuery` with `.range(offset, offset + PAGE_SIZE - 1)` once project count exceeds ~500.

---

## Low Priority

### ✅ No email notification when task is assigned REWORK
Fixed `20260822000010`: `rework_notifications` outbox table + `trg_queue_rework_notification` trigger, drained every 15min by `notify-rework` Edge Function (`.github/workflows/notify-rework.yml`) via Resend. Needs `RESEND_API_KEY` + `RECONCILE_CRON_SECRET` set (already required for other cron functions).

---

## Critical (before first paying client / production-scale use)

### ✅ Frontend TypeScript errors / no type-check CI gate
Verified 2026-08-22: `npx tsc --noEmit -p tsconfig.app.json` is clean (0 errors) — types.ts has since been regenerated. `.github/workflows/frontend.yml` already runs `npx tsc --noEmit -p tsconfig.app.json` as a required step, so this can't silently drift again.

### 🔲 Mobile app has never run on a real device
All `mobile/` work has been static-tested only (tsc, expo export). Never booted on a phone or simulator.

**Fix:** `cd mobile && npm install && npx expo start`; smoke-test login → project list → task list → submit on at least one iOS and one Android device. Look for: SecureStore prompt UX, NetInfo permission, dark-mode contrast in sunlight, keyboard offset on small screens, slow first-Keystore write on Android.

### 🔲 No error monitoring in production (Sentry no-op)
`frontend/src/lib/monitoring.ts` is a console-only stub. `ErrorBoundary` (web + mobile) calls `captureException` but it goes nowhere. Production errors are invisible until a user complains.

**Fix:** `npm install @sentry/react @sentry/react-native`, set `VITE_SENTRY_DSN` (web) + `SENTRY_DSN` extra (mobile), uncomment the `SENTRY:` markers in `lib/monitoring.ts`, wire `Sentry.init()` in App entry points.

### 🔲 Nightly DB backup workflow inactive
`.github/workflows/backup.yml` exists but never runs successfully — `SUPABASE_DB_URL` + S3 secrets are unset. Currently zero off-site backups beyond Supabase's own retention.

**Fix:** Add `SUPABASE_DB_URL`, `BACKUP_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` to repo secrets. Trigger one manual run via `workflow_dispatch` and verify the S3 object lands. Test restore on a scratch project.

### 🔲 Mobile app missing icons + splash assets
`mobile/app.json` references no `icon`/`splash` files. Expo Go shows defaults — fine for dev, blocks any kind of distribution.

**Fix:** Drop 1024×1024 `assets/icon.png` and 2048×2048 `assets/splash.png` in `mobile/assets/`, update `app.json` to reference them. Run `npx expo prebuild` to sanity-check.

---

## High Priority (before scaling past first 2-3 clients)

### 🔲 Mobile: no offline write queue
Engineers in substations frequently lose signal. Currently submit fails outright when offline — the banner warns them but the work is stuck on-device until they come back online and remember.

**Fix:** Local SQLite mirror of pending `test_records` with a sync layer that retries on `NetInfo.isConnected = true`. Conflict resolution: server `updated_at` wins, surface a "merge needed" UI for human resolution. ~2-3 days of work.

### 🔲 Mobile: no camera capture for nameplates
Engineers transcribe nameplate data manually right now. Photo evidence would cut transcription errors and double as audit material.

**Fix:** `expo-camera` + new Supabase Storage bucket `nameplates/` with RLS by `company_id`. Add `nameplate_records.photo_url TEXT[]` column. ~1 day.

### 🔲 Mobile: no push notifications for REWORK
Engineers only learn about rework on next refresh or app foreground. With realtime off they could wait 30s+.

**Fix:** Add `profiles.expo_push_token TEXT` column. Mobile registers token on login. Trigger or Edge Function on `test_tasks.status='REWORK'` POSTs to `https://exp.host/--/api/v2/push/send`. ~1 day.

### 🔲 Mobile: no EAS Build / distribution pipeline
Can't ship a TestFlight or internal Android APK without this. Currently only Expo Go works.

**Fix:** `npx eas-cli init`, configure `eas.json` with `internal` and `preview` profiles, add Apple developer + Google Play credentials. First build will take ~30 min.

### 🔲 No mobile CI
Web has lint+build on push. Mobile has nothing — a broken commit lands silently until you re-bundle locally.

**Fix:** Add `.github/workflows/mobile.yml` running `npm install && npx tsc --noEmit && npx expo export --platform android` on PRs that touch `mobile/**`.

### 🔲 Web E2E tests scaffolded but inactive
`frontend/e2e/` exists with one golden-path test. Playwright not installed.

**Fix:** `npm install -D @playwright/test`, `npx playwright install --with-deps chromium`, set `E2E_SUPERADMIN_EMAIL` + `E2E_SUPERADMIN_PASSWORD` in CI secrets, wire into `.github/workflows/frontend.yml`.

---

## Medium Priority — additions

### 🔲 Code drift between web and mobile
`EQUIPMENT_LABEL` lives in `frontend/src/components/ProjectTestingScopeTab.tsx` AND `mobile/src/lib/supabase.ts`. Same for status color logic, role-rank order, error explainer. Adding a new equipment type = manual sync in two places.

**Fix:** Extract `packages/shared/` (npm workspaces) with equipment labels, status colors, role rank, `explainSupabaseError`, `normalizeFields`. Both apps import from `@testflow/shared`. ~1 day.

### 🔲 Supabase types regenerated separately per client
Each app has its own `integrations/supabase/types.ts`. Schema change = regenerate twice.

**Fix:** Generate once into `packages/shared/supabase-types.ts` and re-export. Or document a single regen command.

### ⚠️ Razorpay checkout flow wired, no live account yet
Fixed the code gap `20260822000013`/`manage-subscription`: a `subscribe` action (creates a Razorpay customer + subscription, returns `subscription_id` for client-side Checkout.js) plus `SubscribeCard` in `BillingSettingsPage` — a trial company with no `subscriptions.provider_subscription_id` on file now sees a plan picker + "Subscribe" button that opens Razorpay's checkout modal, instead of only upgrade/downgrade/cancel actions that assumed a subscription already existed. `vercel.json` CSP `script-src`/`connect-src`/`frame-src` updated for `checkout.razorpay.com`. Also fixed while touching this: `upsert_subscription`'s 10-arg overload (the one actually in use since `20260814000002`) never got `REVOKE FROM PUBLIC`/`GRANT TO service_role` — only the old 9-arg signature did — so it carried Postgres's default PUBLIC execute grant; closed in `20260822000013`.

**Still blocking a live launch (not code — needs your Razorpay dashboard):** a real Razorpay account, `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/`RAZORPAY_WEBHOOK_SECRET` set via `supabase secrets set`, and Plans created in the Razorpay dashboard with their ids inserted into `plan_provider_mapping`. Untested against a live Razorpay sandbox — no Razorpay account available in this environment.

### ✅ No GDPR/data-export flow for individual users
Fixed `20260822000011`: `request_data_export(_user_id)` RPC (returns a JSONB snapshot directly — no storage/signed-URL infra exists yet, so the admin panel offers it as a JSON download) and `erase_user_data(_user_id)` (anonymizes profile name/email + deactivates; requires no open assignments — run `offboard_user` first). Both SUPERADMIN + same-company gated. ⚠️ Not yet wired into the admin panel UI — RPCs only.

### 🔲 No staging environment
Pushes to main go straight to prod. One bad migration = downtime.

**Fix:** Second Supabase project + Vercel preview env. Promote migrations from staging → prod via a manual workflow step.

### 🔲 Realtime off by default on both clients (Free tier)
`VITE_REALTIME_ENABLED=false` + `app.json.realtimeEnabled=false`. 30s polling fallback works but there's lag. Infrastructure is in place — just flip both flags after upgrading the Supabase plan.

### 🔲 Mobile dark-only; no accessibility audit
Field engineers might need light mode in shade; visually-impaired users not tested.

**Fix:** Run iOS Accessibility Inspector + Android TalkBack. Add a theme toggle hooked to `useColorScheme()`. Half a day.

### 🔲 Mobile: no read-only submission history view
Engineers can drill into a SUBMITTED task and see their values, but no "what have I submitted this week" overview.

**Fix:** Profile → Recent Submissions card listing last 20 `test_records` for the user. Low effort.

---

## Low Priority — additions

### 🔲 Mobile: biometric unlock within idle window
30-min idle timeout signs the user out. Re-entering credentials repeatedly is friction.

**Fix:** `expo-local-authentication` — soft-lock flag, unlock with FaceID/fingerprint when returning within 30 min, full re-auth after.

### 🔲 Web: dark theme not implemented
`next-themes` installed, Grid Control design system planned in `FRONTEND_REVAMP.md`, no toggle yet.

**Fix:** Follow FRONTEND_REVAMP.md plan. Several days for full design system buildout.

### 🔲 Mobile: tablet/landscape layout
Locked to portrait. Tablets in the field aren't unheard of.

**Fix:** Drop `"orientation": "portrait"` from `app.json`; add layout breakpoints where useful (TaskList → TestForm side-by-side).

### ✅ Audit log retention policy / soft-deleted rows never hard-deleted
Fixed `20260822000012`: no `pg_cron` extension in this project, so both jobs run via the same GH Actions-cron pattern as `reconcile-cancellations` — `retention-cleanup` Edge Function (`.github/workflows/retention-cleanup.yml`, nightly) calls `purge_old_soft_deleted()` (hard-deletes `projects`/`equipment_instances`/`test_records` rows with `deleted_at < NOW() - 90d`) and `archive_old_audit_logs()` (moves `audit_logs` rows older than 180 days into `audit_logs_archive`).

### 🔲 No load testing
Edge Functions, RLS-heavy queries (`my_company_id` is `SECURITY DEFINER`), AI report path — none tested under concurrent load.

**Fix:** k6 or Artillery scripts hitting the worst cases. Establish a perf budget before scaling.

---
