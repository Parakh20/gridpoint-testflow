# Improvements & Known Issues

Legend: 🔲 Pending | ⚠️ Partial

---

## Medium Priority

### 🔲 No server-side pagination for large datasets
`GMDashboard` uses client-side `PAGE_SIZE` slicing. Works now but will degrade when project count exceeds ~500.

**Fix:** Switch to `useInfiniteQuery` with `.range(offset, offset + PAGE_SIZE - 1)` once project count exceeds ~500.

---

## Low Priority

### 🔲 No email notification when task is assigned REWORK
Engineers currently see rework tasks only via `NotificationBell` (realtime). There is no email notification.

**Fix:** Add a Supabase DB trigger or Edge Function webhook that fires on `test_tasks.status = 'REWORK'` and sends an email to the assigned engineer via Resend/SendGrid.

---

## Critical (before first paying client / production-scale use)

### 🔲 Frontend has 45 pre-existing TypeScript errors
`npx tsc --noEmit -p tsconfig.app.json` from `frontend/` returns exit 2 with 45 errors. All stale-type issues — newer migrations added the `instruments` table, `audit_logs.table_name` column, and several RPCs (`clone_project`, `generate_project_equipment`, `offboard_user`, `user_workload_summary`), but `frontend/src/integrations/supabase/types.ts` was never regenerated. Build still succeeds because Vite doesn't enforce TS errors. Mobile is unaffected — `mobile/` tsc is clean.

**Fix:** `supabase gen types typescript --project-id hxfilijpaocogsgjrjnq > frontend/src/integrations/supabase/types.ts`, then `npx tsc --noEmit -p tsconfig.app.json` to confirm zero errors. Add `npx tsc --noEmit` to `.github/workflows/frontend.yml` so this can't drift again.

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

### 🔲 Razorpay billing scaffolded, not wired
`subscriptions` table + `upsert_subscription` RPC + `razorpay-webhook` Edge Function all exist. No account, plans, or checkout flow.

**Fix:** Create Razorpay account, plans, set `RAZORPAY_WEBHOOK_SECRET`, build the checkout flow in web (Settings → Billing tab in SuperadminDashboard). Out of mobile scope.

### 🔲 No GDPR/data-export flow for individual users
Users can be offboarded (work transferred) but can't request a copy of all personal data or request deletion. Matters at EU clients.

**Fix:** `request_data_export(_user_id)` RPC emitting a signed download URL; `delete_user_data(_user_id)` flow gated behind SUPERADMIN + double-confirm.

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

### 🔲 Audit log retention policy
`audit_logs` table grows unbounded. No archival.

**Fix:** pg_cron job archiving rows older than 180 days to cold storage.

### 🔲 Soft-deleted projects never hard-deleted
`deleted_at` is set but rows live forever. Affects index size and storage cost over time.

**Fix:** pg_cron job: hard-delete rows where `deleted_at < NOW() - INTERVAL '90 days'`.

### 🔲 No load testing
Edge Functions, RLS-heavy queries (`my_company_id` is `SECURITY DEFINER`), AI report path — none tested under concurrent load.

**Fix:** k6 or Artillery scripts hitting the worst cases. Establish a perf budget before scaling.

---
