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

### 8. 🔲 No rework reason / comment from supervisor
When a supervisor sends a test back for rework, no reason is stored or shown to the engineer. The engineer only sees the status change to `REWORK` with no context.

**Next step:** Add a `rework_reason` text column to `test_tasks`. Show a required textarea modal when the supervisor clicks "Rework". Display the last rework reason in the engineer's test form.

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

### 11. 🔲 Project auto-close when all tests are approved
There is no workflow to automatically (or prompt to) mark a project `CLOSED` when every test task reaches `APPROVED` status. Currently a GM must manually trigger closure.

**Next step:** In `syncEquipmentStatus` (or a Supabase trigger), check if all test_tasks for a project are `APPROVED` and prompt the GM to close the project.

---

### 12. 🔲 No bulk approve for supervisor
Supervisors must approve tests one at a time. For large projects (50+ tests) this is very slow.

**Next step:** Add a "Select All / Approve Selected" multi-select action to `ProjectTestsTab` and the pending-review list on `SupervisorDashboard`.

---

### 13. 🔲 AI report frontend integration incomplete
The edge function (`generate-report`) is deployed and working. The frontend trigger UI is not built.

**Next step:** Add a "Generate AI Report" button to `ProjectDetail.tsx` (visible to GM when status = CLOSED). See `AI_REPORT_PLAN.md` for full checklist.

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

### 18. 🔲 Dark theme not yet implemented
`next-themes` is installed and `tailwind.config.ts` has `darkMode: 'class'`. Implementation is planned in `FRONTEND_REVAMP.md`.

**Pending:** `ThemeContext.tsx`, `ThemeToggle.tsx`, CSS variable overrides, `DashboardLayout` revamp.

---

### 19. 🔲 No auto-save for engineer test forms
If an engineer fills in a test form and navigates away (or the session expires), all unsaved data is lost.

**Next step:** Persist draft payloads to `localStorage` keyed by `test_task_id`. Restore on re-open, clear on successful save.

---

### 20. 🔲 Instrument ID is a free-text field — no reuse
Instrument IDs are typed as plain strings. There is no way to look up previously used instruments, their calibration dates, or validate format.

**Next step:** Add an `instruments` table (`id`, `serial_number`, `type`, `last_calibrated_at`, `owned_by`). Replace the free-text input with a searchable `Combobox`. This also enables calibration expiry warnings.

---

### 21. 🔲 No project-level activity log visible in UI
The DB has an audit trigger that logs assignment changes, but there is no UI to view the log. Engineers and supervisors cannot see who changed what or when.

**Next step:** Add an "Activity" tab to `ProjectDetail.tsx` that reads from the `audit_log` table (or a similar history table) and shows a timeline.

---

### 22. 🔲 Analytics / stats charts not rendered
`recharts` is installed but no charts are shown anywhere. The stat cards on dashboards are plain numbers.

**Next step:** Add a simple bar/pie chart to `GMDashboard` showing project status breakdown, and a line chart showing test approval rate over time. Use existing `recharts` — no new dependency needed.

---

### 23. 🔲 No export to CSV / Excel
There is no way to download raw test data in a spreadsheet format. Clients often ask for this alongside the PDF report.

**Next step:** Add a "Export CSV" button to `ProjectTestsTab`. Use the `papaparse` or `xlsx` library (both are lightweight) to generate a spreadsheet from `tasksByEquipment`.

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

### 26. 🔲 No password reset flow
There is no "Forgot password" link on the login page. Users who forget their password are locked out unless a superadmin resets it manually.

**Next step:** Add a "Forgot password?" link on `Auth.tsx` → call `supabase.auth.resetPasswordForEmail()`. Handle the `PASSWORD_RECOVERY` event in `AuthContext` to redirect to a reset form.

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
