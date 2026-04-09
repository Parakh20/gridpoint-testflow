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

---

### 4. ✅ `ProjectDetail` hardcodes navigation to `/gm`
All `navigate('/gm')` calls replaced with `navigate(dashboardPath(userRole))` via `src/lib/routes.ts`.

---

### 5. ✅ `test_records` has no unique constraint per `test_task_id`
Migration added: `supabase/migrations/20260405000001_add_test_record_unique_constraint.sql`.

---

### 6. ✅ Email rate limit — Supabase shared SMTP
Google OAuth added as the primary fix. See `EMAIL_RATE_LIMIT.md` for setup.

---

### 7. 🔲 `test_templates.fields` is empty for most templates
46 test templates exist but most have `fields: []`. Requires writing per-template JSON Schema migrations — one per template, 46 total. Deferred as content work (not a code bug). Prioritize when field engineers are onboarded.

---

### 8. ✅ No rework reason / comment from supervisor
`rework_reason text` column added. Modal prompts for reason. Shown in ProjectTestsTab, SupervisorDashboard, and EngineerProjectDetail.

---

## High Priority

### 9. ⚠️ Data fetching inconsistency — `useEffect` vs TanStack Query
`SuperadminDashboard` uses TanStack Query. All other pages use `useEffect` + Supabase. Full migration deferred as standalone refactor. New pages should use TanStack Query.

---

### 10. ✅ In-app notifications
`NotificationBell` component added to the sidebar (bottom controls area) for SUPERVISOR and ENGINEER roles:
- **Supervisor**: shows count of SUBMITTED tests across their assigned projects
- **Engineer**: shows count of REWORK tasks on their assigned equipment
Realtime subscription on `test_tasks` keeps count live.

**Files:** `frontend/src/components/NotificationBell.tsx`, `DashboardLayout.tsx`

---

### 11. ✅ Project auto-close prompt when all tests are approved
`ProjectTestsTab` fires `onAllApproved()` callback after the last test is approved. `ProjectDetail` toasts GM/SUPERADMIN: "All tests approved! You can now close the project."

---

### 12. ✅ No bulk approve for supervisor
Checkbox multi-select in `ProjectTestsTab`. Toolbar with "Select all submitted" + "Approve Selected (N)" button.

---

### 13. ✅ AI report frontend integration
"AI Report" button in `ProjectDetail` header — visible to GM/SUPERADMIN when `status = CLOSED`. Result shown in scrollable dialog with "Download .md" option.

---

## Medium Priority

### 14. ✅ PDF export — empty output / Lovable favicon
Fixed `position: absolute` + CSS custom property injection. Favicon replaced.

---

### 15. ✅ Supervisor can only approve tests from inside a project
`SupervisorDashboard` shows "Tests Pending Approval" card with inline Approve / Rework buttons.

---

### 16. 🔲 No pagination on project lists
Acceptable for current scale. Add `useInfiniteQuery` offset pagination when project count exceeds ~500.

---

### 17. 🔲 No optimistic updates
Status changes do a full round-trip. Add optimistic updates with TanStack Query `onMutate` when migrating data fetching.

---

### 18. ✅ Dark theme + frontend revamp (Phase 1 + Phase 2)
- `ThemeContext.tsx` + `ThemeToggle.tsx` — dark/light toggle, defaults to dark, localStorage persistence
- Pure black dark palette in `index.css` (`0 0% 5%` background, `0 0% 8%` card)
- `DashboardLayout.tsx` — fixed 240px sidebar, role nav, frosted header
- `StatusBadge.tsx` — glow rings: amber pulse (ACTIVE), red pulse (REWORK)
- `HoverCard.tsx` + `PageTransition.tsx` + `AnimatedCounter.tsx` — framer-motion
- `Auth.tsx` — dark glass card, animated dot-grid, glowing Zap logo
- `GMDashboard.tsx` + `SupervisorDashboard.tsx` + `EngineerDashboard.tsx` + `SuperadminDashboard.tsx` — AnimatedCounter stat cards, motion hover lifts
- `EquipmentIcon.tsx` — 8 IEEE schematic SVG symbols
- `EquipmentCard.tsx` + `ProjectEquipmentTab.tsx` — card grid with SVG icons
- `EngineerDashboard.tsx` — per-project progress bar with animated fill

---

### 19. ✅ No auto-save for engineer test forms
Draft persistence to `localStorage` keyed by `testflow_draft_<task_id>`. Drafts restored on load, cleared after save/submit. "Draft" indicator in task header.

---

### 20. 🔲 Instrument ID is a free-text field — no reuse
Requires new `instruments` DB table + searchable Combobox. Deferred — needs schema migration and calibration expiry logic.

---

### 21. ✅ No project-level activity log in UI
"Activity" tab added to `ProjectDetail.tsx` reading from `audit_logs` table. Shows a timeline with color-coded dots, actor names, and readable action labels derived from before/after data diffs.

**Files:** `frontend/src/components/ProjectActivityTab.tsx`, `ProjectDetail.tsx`

---

### 22. ✅ Analytics / stats charts
Bar chart (project status breakdown) + donut pie chart (assignment overview) in `GMDashboard` via `recharts`.

---

### 23. ✅ CSV export
"Export CSV" button in `ProjectTestsTab`. Downloads all test tasks. Native Blob — no external library.

---

## Low Priority

### 24. 🔲 No test suite
No unit, component, or E2E tests.

**Recommended:** Vitest (unit), React Testing Library (components), Playwright (E2E for login, equipment generation, PDF download).

---

### 25. ✅ No user profile page
`/profile` route added — name update (writes to `profiles` table) and password change (via `supabase.auth.updateUser`). Linked from sidebar nav for all roles.

**Files:** `frontend/src/pages/Profile.tsx`, `App.tsx`, `DashboardLayout.tsx`

---

### 26. ✅ Password reset flow
"Forgot password?" dialog calls `resetPasswordForEmail`. `PASSWORD_RECOVERY` event → `/auth?reset=true` → "Set New Password" form.

---

### 27. 🔲 Dev server exposed on all network interfaces
`vite.config.ts` uses `host: "::"`. Change to `host: "localhost"` for local-only dev; keep `"::"` for Docker/WSL.

---

### 28. ✅ Content-Security-Policy headers
CSP + security headers added to `frontend/vercel.json`:
- `Content-Security-Policy` — restricts script-src, connect-src to Supabase, frame-ancestors none
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — disables camera, mic, geolocation

---

### 29. 🔲 Supabase anon key in browser bundle — undocumented
By design (RLS enforces security), but undocumented for new devs. Add explanation to README onboarding section.

---

## Dependency Cleanup

| Package | Status |
|---|---|
| `next-themes` | Kept — used by shadcn `sonner.tsx` |
| `embla-carousel-react` | ✅ Removed — `carousel.tsx` shadcn component deleted (unused) |
| `input-otp` | ✅ Removed — `input-otp.tsx` shadcn component deleted (unused) |
| `vaul` | ✅ Removed — `drawer.tsx` shadcn component deleted (unused) |
| `recharts` | ✅ In use — bar + donut charts in GMDashboard |

---

## Security Fixes Applied

### ✅ Unguarded JSON.parse on test_template.fields
Both `EngineerProjectDetail.tsx` and `ProjectTestsTab.tsx` wrapped in try/catch with `parsedFields = null` fallback.

---

## Implemented Features (Reference)

### ✅ Google OAuth
`signInWithGoogle()` in `AuthContext`. "Continue with Google" on Auth.tsx.

### ✅ AI Report Generation (Edge Function)
`supabase/functions/generate-report/index.ts` — Deno, Claude API (`claude-haiku-4-5-20251001`), returns Markdown.

### ✅ GitHub Actions CI
`supabase.yml` — auto migrate + deploy on push to main. `frontend.yml` — lint + build check.

### ✅ GM-Supervisor Assignment
`supervisor_assignments` table, `assigned_to` on projects, audit trigger.

### ✅ html2canvas PDF Download
`ProjectPDFExport` — multi-page A4 PDF, client-side.
