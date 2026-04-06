# Improvements & Known Issues

Legend: ✅ Fixed/Done | 🔲 Pending | ⚠️ Partial

---

## Critical

### 1. ✅ No `.env.example` file
`.env.example` created with all required variables and instructions on how to obtain each key.

---

### 2. ✅ Equipment generation not idempotent
`ProjectTestingScopeTab` now checks for existing `equipment_instances` before generating. The Generate button is disabled and a warning is shown if instances already exist. The check runs on mount so the state is accurate even after page refresh.

---

### 3. ✅ `AuthContext` stuck loading on role fetch failure
`fetchUserRole` wraps the Supabase call in try/catch/finally and always calls `setLoading(false)` in the `finally` block, even on network errors.

**File:** `frontend/src/contexts/AuthContext.tsx`

---

### 4. ✅ `ProjectDetail` hardcodes navigation to `/gm`
All `navigate('/gm')` calls replaced with `navigate(dashboardPath(userRole))` using the shared `src/lib/routes.ts` utility. Applies to both the Back button and the "not found" fallback. `ProjectStatusActions` (delete) also fixed.

**Files:** `frontend/src/pages/projects/ProjectDetail.tsx`, `frontend/src/components/ProjectStatusActions.tsx`

---

### 5. ✅ `test_records` has no unique constraint per `test_task_id`
Migration added: `supabase/migrations/20260405000001_add_test_record_unique_constraint.sql`
Deduplicates any existing duplicate rows (keeping the most recently updated), then adds `UNIQUE(test_task_id)`. Engineers must now upsert, not insert, when saving test data.

---

### 6. ✅ Email rate limit — Supabase shared SMTP
Supabase free tier SMTP is limited to ~2–4 emails/hour. **Google OAuth implemented** as the primary fix — `signInWithGoogle()` added to `AuthContext`; "Continue with Google" button added to `Auth.tsx`.

**Requires one manual step:** Paste Google OAuth Client ID + Secret in Supabase Dashboard → Auth → Providers → Google.

See `EMAIL_RATE_LIMIT.md` for full setup guide + alternative SMTP solutions (Resend free tier).

**Files:** `frontend/src/contexts/AuthContext.tsx`, `frontend/src/pages/Auth.tsx`

---

## High Priority

### 7. ✅ Widespread use of `any` types
- `GMDashboard`: typed with `Tables<'projects'> & { assigned_supervisor: ... }`
- `SupervisorDashboard`: typed with `Tables<'projects'>`
- `EngineerDashboard`: typed with explicit `AssignedTask` interface
- `ProjectStatusActions`: replaced `any` in `updateProjectStatus` with `Record<string, unknown>`

---

### 8. ⚠️ Data fetching inconsistency — `useEffect` vs TanStack Query
`SuperadminDashboard` already uses TanStack Query. Other pages still use direct `useEffect` + Supabase calls. Full migration to TanStack Query would require rewriting every data-fetching page — deferred as a standalone refactor task. **New pages should use TanStack Query.**

---

### 9. ✅ No loading indicator on `fetchProject` re-calls
`ProjectDetail` now has a `refetching` state (separate from the initial `loading` spinner). A `RefreshCw` spinner appears in the header next to the project number while a status change is being confirmed and data is re-fetching.

**File:** `frontend/src/pages/projects/ProjectDetail.tsx`

---

### 10. 🔲 `test_templates.fields` is empty for most templates
46 test templates exist in the DB, but most have `fields: []` (empty array). Dynamic test forms cannot render meaningful input fields until field schemas are defined.

**Next step:** For each template, define a JSON Schema in the `fields` column:
```json
{
  "type": "object",
  "properties": {
    "measurement": { "type": "number", "title": "Measurement (MΩ)" }
  },
  "required": ["measurement"]
}
```
Write as a migration — never edit existing migrations.

---

### 11. ✅ No error boundary
`ErrorBoundary` class component created at `src/components/ErrorBoundary.tsx`, wrapping the entire app in `src/App.tsx`.

---

### 12. ✅ Supervisor assignment — no empty state explanation
`SupervisorSelector` has an empty state message. GM dashboard shows inline search with supervisor count visible in `AssignProjectDialog`.

---

## Medium Priority

### 13. 🔲 PDF export is browser print only
`ProjectPDFExport` relies on the browser print dialog. Proper PDF generation with `@react-pdf/renderer` is planned in `AI_REPORT_PLAN.md` as a follow-on to AI report output.

---

### 14. 🔲 No pagination on project lists
GM dashboard fetches all projects. Acceptable for current scale. Add offset pagination with TanStack Query's `useInfiniteQuery` when project count exceeds ~500.

---

### 15. ✅ Equipment labels use only the first 3 characters
`ProjectTestingScopeTab` now uses a `EQUIPMENT_LABEL` lookup map (PTR, CT, CVT, LA, SF6, ISO, VCB, EP). Never use `substring(0,3)`.

---

### 16. 🔲 No optimistic updates
Status changes still do a full round-trip. Acceptable for now. Add optimistic updates with TanStack Query `onMutate` when migrating data fetching.

---

### 17. ✅ Realtime subscription scope too broad
`GMDashboard` and `SupervisorDashboard` now subscribe to `INSERT` and `UPDATE` events separately instead of `event: '*'`.

---

### 18. 🔲 No favicon beyond default placeholder
`public/favicon.ico` is still the generic placeholder. Replace with an SVG favicon using the Zap icon from the app header.

---

### 19. 🔲 Dark theme not yet implemented
`next-themes` is installed and `tailwind.config.ts` has `darkMode: 'class'`. Full dark theme implementation is planned in `FRONTEND_REVAMP.md` — Grid Control palette, CSS variables, `ThemeContext`, and a `ThemeToggle` button.

**Pending work:** `ThemeContext.tsx`, `ThemeToggle.tsx`, CSS variable theme, `DashboardLayout` revamp.

---

### 20. 🔲 AI report frontend integration incomplete
The edge function (`generate-report`) is deployed and working. The frontend trigger UI is not yet built.

**Next step:** Add an "Generate AI Report" button to `ProjectDetail.tsx` (visible to GM when status = CLOSED). See `AI_REPORT_PLAN.md` for full checklist and implementation plan.

---

## Low Priority

### 21. ✅ No search on project lists
`GMDashboard` now has real-time client-side search filtering by project number, site name, client, and address.

---

### 22. ✅ Inconsistent date formatting
`src/lib/format.ts` created with `formatDate()` and `formatDateTime()` using `date-fns`. Applied across dashboards and `ProjectDetail`. All `toLocaleDateString()` calls should be replaced as pages are touched.

---

### 23. 🔲 No test suite
No unit, component, or E2E tests exist.

**Recommended setup:**
- **Vitest** — zero-config test runner for Vite
- **React Testing Library** — component tests
- **Playwright** — E2E for critical flows (login, equipment generation, status transitions)

---

### 24. 🔲 Dev server exposed on all network interfaces
`vite.config.ts` uses `host: "::"` which exposes the dev server on the local network. Change to `host: "localhost"` for pure local dev. Leave as `"::"` if running inside Docker or WSL.

---

### 25. 🔲 No Content-Security-Policy headers
No CSP configured. Add to the production web server config (Nginx, Vercel headers) restricting `script-src` and `connect-src` to known origins.

---

### 26. 🔲 Supabase anon key is in the browser bundle
By design for Supabase (RLS enforces security). Ensure RLS policies remain strict. The anon key alone cannot bypass RLS. Document this in onboarding so new devs don't remove RLS thinking the key is a security issue.

---

## Dependency Cleanup

| Package | Issue | Status |
|---|---|---|
| `next-themes` | Installed but dark mode not implemented yet | 🔲 Keep — needed for FRONTEND_REVAMP dark theme |
| `embla-carousel-react` | shadcn/ui bundle dep — no carousel in app | 🔲 Remove if no carousel planned |
| `input-otp` | OTP component — no OTP flow in app | 🔲 Remove if no OTP planned |
| `vaul` | Drawer component — not actively used | 🔲 Remove if no drawer planned |
| `recharts` | Chart library — no charts currently visible | 🔲 Remove or implement analytics/stats charts |

---

## Implemented Features (Reference)

### ✅ Google OAuth (`Auth.tsx` + `AuthContext.tsx`)
- `signInWithGoogle()` in `AuthContext` calls `supabase.auth.signInWithOAuth`
- "Continue with Google" button with proper Google SVG icon on both Sign In + Sign Up tabs
- `oauthLoading` state prevents double-clicks
- New OAuth users with no role land on Index.tsx "role being configured" screen

### ✅ AI Report Generation (Edge Function)
- Edge function: `supabase/functions/generate-report/index.ts` (Deno)
- Fetches all project data, builds structured prompt, calls Claude API
- Returns 5-section formal commissioning report as Markdown
- Frontend invocation: `supabase.functions.invoke('generate-report', { body: { project_id } })`

### ✅ GitHub Actions CI — Auto-migrate + deploy
- `supabase.yml` — triggers on changes to `supabase/migrations/**` or `supabase/functions/**`
- `frontend.yml` — triggers on changes to `frontend/src/**`

### ✅ GM-Supervisor Assignment
- `supervisor_assignments` table with UNIQUE(gm_id, supervisor_id)
- `assigned_to` column on `projects` table
- Audit trigger logs project assignment changes
