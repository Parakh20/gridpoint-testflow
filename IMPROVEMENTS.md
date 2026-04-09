# Improvements & Known Issues

Legend: ✅ Fixed/Done | 🔲 Pending | ⚠️ Partial

---

## Critical

### 1. ✅ No `.env.example` file
`.env.example` created with all required variables and instructions on how to obtain each key.

---

### 2. ✅ Equipment generation not idempotent
`ProjectTestingScopeTab` checks for existing `equipment_instances` before generating. The Generate button is disabled and a warning is shown if instances already exist.

---

### 3. ✅ `AuthContext` stuck loading on role fetch failure
`fetchUserRole` wraps the Supabase call in try/catch/finally and always calls `setLoading(false)` in the `finally` block.

**File:** `frontend/src/contexts/AuthContext.tsx`

---

### 4. ✅ `ProjectDetail` hardcodes navigation to `/gm`
All `navigate('/gm')` calls replaced with `navigate(dashboardPath(userRole))` via `src/lib/routes.ts`.

---

### 5. ✅ `test_records` has no unique constraint per `test_task_id`
Migration added: `supabase/migrations/20260405000001_add_test_record_unique_constraint.sql`. Deduplicates existing rows (keeping most recent), then adds `UNIQUE(test_task_id)`.

---

### 6. ✅ Email rate limit — Supabase shared SMTP
Google OAuth added as the primary fix (`signInWithGoogle()` in `AuthContext`, "Continue with Google" button on `Auth.tsx`). See `EMAIL_RATE_LIMIT.md` for full setup.

---

### 7. 🔲 `test_templates.fields` is empty for most templates
46 test templates exist in the DB, but most have `fields: []`. Dynamic test forms cannot render meaningful inputs until field schemas are defined.

**Next step:** For each template, add a JSON Schema migration to populate the `fields` column:
```json
{
  "type": "object",
  "properties": {
    "measurement": { "type": "number", "title": "Measurement (MΩ)" }
  },
  "required": ["measurement"]
}
```
Write as a new migration — never edit existing ones.

---

### 8. ✅ No rework reason / comment from supervisor
`rework_reason text` column added to `test_tasks` via migration `20260407000001_add_rework_reason_to_test_tasks.sql`. When supervisor clicks "Rework", a modal prompts for a reason (optional). The reason is stored and shown:
- In `ProjectTestsTab` expanded row (orange callout)
- In `SupervisorDashboard` rework dialog
- In `EngineerProjectDetail` as an orange banner on tasks in `REWORK` status

---

## High Priority

### 9. ⚠️ Data fetching inconsistency — `useEffect` vs TanStack Query
`SuperadminDashboard` already uses TanStack Query. All other pages still use direct `useEffect` + Supabase calls. Full migration deferred as a standalone refactor. **New pages should use TanStack Query.**

---

### 10. 🔲 No email / in-app notifications
No notifications are sent when:
- An engineer submits a test (supervisor should be notified)
- A supervisor approves or sends back a test (engineer should be notified)
- A project is assigned to a supervisor (supervisor should be notified)

**Options:**
- Supabase Edge Function triggered by DB webhook → send email via Resend
- In-app notifications table (`notifications`) with unread badge in the header

---

### 11. ✅ Project auto-close prompt when all tests are approved
After the last test task is approved (individually or via bulk approve), `ProjectTestsTab` fires `onAllApproved()` callback. `ProjectDetail` handles this by toasting GM/SUPERADMIN with "All tests approved! You can now close the project." when the project is ACTIVE.

---

### 12. ✅ No bulk approve for supervisor
Added checkbox multi-select in `ProjectTestsTab`. A toolbar appears when any `SUBMITTED` tests exist showing "Select all submitted (N)" checkbox and an "Approve Selected (N)" button. Individual row checkboxes appear on submitted tasks.

---

### 13. ✅ AI report frontend integration incomplete
Added "AI Report" button to `ProjectDetail.tsx` header — visible to GM/SUPERADMIN when `status = CLOSED`. Calls `supabase.functions.invoke('generate-report', { body: { project_id } })`. Report is displayed in a scrollable dialog with a "Download .md" button.

---

## Medium Priority

### 14. ✅ PDF export — empty output / Lovable favicon
Two bugs fixed:
- **Empty PDF:** `position: fixed` + `left: -100000px` caused html2canvas to capture a blank area. Changed to `position: absolute` + `visibility: hidden`; CSS custom property values injected via the `onclone` callback.
- **Favicon:** `public/favicon.ico` contained the Lovable heart logo. Replaced with a 64×64 ICO matching the app's SVG (blue rounded square + white lightning bolt).

---

### 15. ✅ Supervisor can only approve tests from inside a project
`SupervisorDashboard` now shows a **"Tests Pending Approval"** card listing all `SUBMITTED` tests across all assigned projects with inline Approve / Rework buttons. A "Pending Review" stat counter is shown at the top.

---

### 16. 🔲 No pagination on project lists
GM dashboard fetches all projects. Acceptable for current scale. Add offset pagination with `useInfiniteQuery` when project count exceeds ~500.

---

### 17. 🔲 No optimistic updates
Status changes still do a full round-trip. Add optimistic updates with TanStack Query `onMutate` when migrating data fetching.

---

### 18. ✅ Dark theme implemented (Phase 1 + Phase 2 complete)
Grid Control dark palette applied. Full sidebar layout. ThemeToggle persists to localStorage. See `FRONTEND_REVAMP.md`.

**Delivered:**
- `ThemeContext.tsx` + `ThemeToggle.tsx` — dark/light toggle, defaults to dark
- Deep Grid Control dark CSS vars (`index.css`) + glow keyframes (`tailwind.config.ts`)
- `DashboardLayout.tsx` — fixed 240px dark sidebar with role nav, frosted header, sign-out
- `StatusBadge.tsx` — glow rings: amber pulse (ACTIVE), red pulse (REWORK), green/purple/blue glows
- `HoverCard.tsx` + `PageTransition.tsx` + `AnimatedCounter.tsx` — framer-motion components
- `Auth.tsx` — dark glass card with animated dot-grid background + glowing Zap logo
- `GMDashboard.tsx` + `SupervisorDashboard.tsx` — animated stat counters + hover lift cards
- `EquipmentIcon.tsx` — 8 IEEE-style schematic SVG symbols (PT, CT, CVT, LA, SF6, ISO, VCB, EP)
- `EquipmentCard.tsx` — card with SVG icon colored by status + spring hover lift
- `ProjectEquipmentTab.tsx` — card grid replacing flat table view

---

### 19. ✅ No auto-save for engineer test forms
`EngineerProjectDetail` now persists form drafts to `localStorage` keyed by `testflow_draft_<task_id>` on every field change. On load, drafts are restored for tasks with no existing DB record. Drafts are cleared after a successful save/submit. A "Draft" indicator (HardDrive icon) appears in the task header when an unsaved draft is detected.

---

### 20. 🔲 Instrument ID is a free-text field — no reuse
Instrument IDs are typed as plain strings. There is no way to look up previously used instruments, their calibration dates, or validate format.

**Next step:** Add an `instruments` table (`id`, `serial_number`, `type`, `last_calibrated_at`, `owned_by`). Replace the free-text input with a searchable `Combobox`. This also enables calibration expiry warnings.

---

### 21. 🔲 No project-level activity log visible in UI
The DB has an audit trigger that logs assignment changes, but there is no UI to view the log. Engineers and supervisors cannot see who changed what or when.

**Next step:** Add an "Activity" tab to `ProjectDetail.tsx` that reads from the `audit_log` table (or a similar history table) and shows a timeline.

---

### 22. ✅ Analytics / stats charts not rendered
Added two charts to `GMDashboard` using the existing `recharts` dependency:
- **Bar chart** — project status breakdown (Draft / Approved / Active / Closed)
- **Donut pie chart** — assignment overview (Assigned vs Unassigned)
Charts are conditionally rendered only when there is at least one project.

---

### 23. ✅ CSV export
"Export CSV" button added to the Test Progress card in `ProjectTestsTab`. Downloads all test tasks with equipment label, type, test name/code, status, pass/fail, instrument ID, and remarks. No external library needed — uses native Blob + URL.createObjectURL.

---

## Low Priority

### 24. 🔲 No test suite
No unit, component, or E2E tests exist.

**Recommended setup:**
- **Vitest** — zero-config test runner for Vite
- **React Testing Library** — component tests for `ProjectTestsTab`, `AuthContext`
- **Playwright** — E2E for critical flows (login, equipment generation, status transitions, PDF download)

---

### 25. 🔲 No user profile page
Users cannot change their display name or password from the UI. The only way to update profile data is via Supabase Dashboard.

**Next step:** Add a `/profile` route with a form for name + password change (using `supabase.auth.updateUser`). Link from the header.

---

### 26. ✅ Password reset flow
"Forgot password?" button added below the Sign In form. Opens a dialog that calls `supabase.auth.resetPasswordForEmail()` with `redirectTo: /auth?reset=true`. `AuthContext` handles `PASSWORD_RECOVERY` event → navigates to `/auth?reset=true`. That URL renders a "Set New Password" form that calls `supabase.auth.updateUser({ password })`.

**Files:** `Auth.tsx`, `AuthContext.tsx`

---

### 27. 🔲 Dev server exposed on all network interfaces
`vite.config.ts` uses `host: "::"`. Change to `host: "localhost"` for pure local dev. Leave as `"::"` only inside Docker or WSL.

---

### 28. 🔲 No Content-Security-Policy headers
No CSP configured. Add to the Vercel `vercel.json` headers config restricting `script-src` and `connect-src` to known origins.

---

### 29. 🔲 Supabase anon key in browser bundle — undocumented
By design for Supabase (RLS enforces security), but new devs may misunderstand it as a security hole and remove RLS. Document explicitly in `README.md` onboarding section.

---

## Dependency Cleanup

| Package | Issue | Status |
|---|---|---|
| `next-themes` | Installed but dark theme not yet implemented | 🔲 Keep — needed for dark theme |
| `embla-carousel-react` | shadcn/ui bundle dep — no carousel in the app | 🔲 Remove if no carousel planned |
| `input-otp` | OTP component — no OTP flow | 🔲 Remove if no OTP planned |
| `vaul` | Drawer component — not actively used | 🔲 Remove if no drawer planned |
| `recharts` | Installed — no charts rendered yet | 🔲 Implement analytics charts or remove |
| `papaparse` / `xlsx` | Not yet installed — needed for CSV export | 🔲 Add when CSV export is built |

---

## Security Fixes Applied

### ✅ Unguarded JSON.parse on test_template.fields
`EngineerProjectDetail.tsx` and `ProjectTestsTab.tsx` both called `JSON.parse(rawFields)` without a try/catch. If a template's `fields` column contained malformed JSON, the entire task list would crash. Wrapped in try/catch with `parsedFields = null` fallback — forms gracefully render the generic "Reading Value" input instead.

---

## Implemented Features (Reference)

### ✅ Google OAuth (`Auth.tsx` + `AuthContext.tsx`)
- `signInWithGoogle()` calls `supabase.auth.signInWithOAuth`
- "Continue with Google" button on both Sign In + Sign Up tabs
- New OAuth users with no role land on Index.tsx "role being configured" screen

### ✅ AI Report Generation (Edge Function)
- `supabase/functions/generate-report/index.ts` (Deno)
- Fetches all project data, builds structured prompt, calls Claude API
- Returns 5-section formal commissioning report as Markdown

### ✅ GitHub Actions CI — Auto-migrate + deploy
- `supabase.yml` — triggers on `supabase/migrations/**` or `supabase/functions/**` changes
- `frontend.yml` — triggers on `frontend/src/**` changes

### ✅ GM-Supervisor Assignment
- `supervisor_assignments` table with `UNIQUE(gm_id, supervisor_id)`
- `assigned_to` column on `projects`
- Audit trigger logs assignment changes

### ✅ html2canvas PDF Download
- `ProjectPDFExport` generates a multi-page A4 PDF client-side
- Covers: project info, equipment scope, test results summary, per-equipment test tables with readings
