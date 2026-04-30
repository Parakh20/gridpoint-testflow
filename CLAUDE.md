# CLAUDE.md — gridpoint-testflow

> **Standing rule:** Update this file whenever making changes that affect the developer reference — new files, removed dependencies, changed conventions, env vars, gotchas, or new infrastructure.

## What This Project Is

**TestFlow** is a **multi-tenant B2B SaaS** platform for electrical substation commissioning. Each client company gets an isolated workspace at their own subdomain (`company.testflow.io`). Field teams manage test projects, record measurements, and generate PDF/AI reports. Sold to commissioning companies — not a public consumer product.

**Multi-tenancy model:** Single Supabase project, `company_id` column on root tables, RLS enforces isolation. Users cannot see or touch another company's data.

**No public sign-up.** All accounts are created by Company SUPERADMINs via the User Management dashboard, which calls the `create-user` Edge Function (Admin API, server-side). Self-registration is permanently disabled.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript (SPA — no SSR, no Next.js) |
| UI Components | shadcn/ui (Radix UI primitives) + Tailwind CSS v3 |
| Backend / Database | Supabase (Postgres + Auth + RLS + Realtime + Edge Functions) |
| Server State | TanStack Query v5 (adopted in SuperadminDashboard; other pages use `useEffect` + direct Supabase) |
| Forms | react-hook-form + zod |
| Routing | react-router-dom v6 |
| Build | Vite with SWC (`@vitejs/plugin-react-swc`) |
| Package Manager | npm (primary; run from root or `frontend/`) |
| AI Reports | Anthropic Claude API (`claude-haiku-4-5-20251001`) — called from Supabase Edge Function only |
| Excel Export | SheetJS (`xlsx`) — browser-side `.xlsx` generation; one sheet per equipment instance |
| CI/CD | GitHub Actions → `supabase db push` + `supabase functions deploy` on push to main |

**Important:** This is a pure Vite SPA. There is no Next.js. Do not add `'use client'` directives — they are meaningless here.

---

## Project Structure

```
gridpoint-testflow/                  ← repo root
│
├── frontend/                        ← React Vite SPA (all UI work happens here)
│   ├── src/
│   │   ├── App.tsx                  # Routes + providers + ErrorBoundary + QueryClient
│   │   ├── main.tsx                 # React entry point
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx      # Auth state + role fetch (deadlock-safe setTimeout); NO signUp/signInWithGoogle
│   │   │   └── CompanyContext.tsx   # Reads subdomain slug → fetches company row → exposes { company, loading }
│   │   ├── lib/
│   │   │   ├── routes.ts                # dashboardPath(role) — never hardcode /gm
│   │   │   ├── format.ts                # formatDate / formatDateTime with date-fns
│   │   │   ├── utils.ts                 # cn() Tailwind helper
│   │   │   └── projectExcelExport.ts    # SheetJS-based Excel export (one sheet per equipment instance)
│   │   ├── hooks/
│   │   │   ├── use-toast.ts         # Sonner toast hook
│   │   │   └── use-mobile.tsx       # Mobile viewport detection
│   │   ├── components/
│   │   │   ├── ErrorBoundary.tsx    # Class component — catches unhandled render errors
│   │   │   ├── DashboardLayout.tsx  # Shared header/nav shell
│   │   │   ├── ProtectedRoute.tsx   # Role-gated route wrapper
│   │   │   ├── AssignProjectDialog.tsx     # Assign supervisor to project
│   │   │   ├── EditRoleDialog.tsx          # Change user role (SUPERADMIN)
│   │   │   ├── InviteUserDialog.tsx        # Invite new user (SUPERADMIN)
│   │   │   ├── ProjectEquipmentTab.tsx     # Equipment instances list + assignment
│   │   │   ├── ProjectPDFExport.tsx        # Browser print-to-PDF export
│   │   └── (see lib/projectExcelExport.ts for Excel export)
│   │   │   ├── ProjectScopeTab.tsx         # Equipment types + quantities
│   │   │   ├── ProjectStatusActions.tsx    # DRAFT→APPROVED→ACTIVE→CLOSED transitions
│   │   │   ├── ProjectTestingScopeTab.tsx  # Scope config + idempotent equipment gen
│   │   │   ├── ProjectTestsTab.tsx         # Test task list with filter/sort
│   │   │   ├── ScopeManager.tsx            # Add/remove scope_items
│   │   │   ├── StatusBadge.tsx             # Colored status pill
│   │   │   ├── SupervisorSelector.tsx      # Dropdown — select supervisor
│   │   │   ├── TestingScopeSelector.tsx    # Multi-select test templates
│   │   │   ├── UserManagementTable.tsx     # User list for SUPERADMIN
│   │   │   ├── UserRoleBadge.tsx           # Display user role badge
│   │   │   └── ui/                         # shadcn/ui primitives — DO NOT edit
│   │   ├── pages/
│   │   │   ├── Auth.tsx             # Sign in / Sign up + Google OAuth button
│   │   │   ├── Index.tsx            # Role-based redirect after login
│   │   │   ├── NotFound.tsx         # 404 catch-all
│   │   │   ├── dashboards/
│   │   │   │   ├── SuperadminDashboard.tsx  # Uses TanStack Query; user management
│   │   │   │   ├── GMDashboard.tsx          # Search, realtime, typed
│   │   │   │   ├── SupervisorDashboard.tsx  # Realtime, typed
│   │   │   │   └── EngineerDashboard.tsx    # Real assigned task data
│   │   │   └── projects/
│   │   │       ├── NewProject.tsx   # 4-step wizard
│   │   │       ├── ProjectDetail.tsx # Main hub — tabbed, uses dashboardPath + formatDate
│   │   │       └── EditProject.tsx
│   │   └── integrations/supabase/
│   │       ├── client.ts            # Supabase singleton — always import from here
│   │       └── types.ts             # Auto-generated — DO NOT edit manually
│   ├── public/
│   ├── index.html
│   ├── package.json                 # Frontend deps + scripts
│   ├── vite.config.ts               # @/ alias → ./src; port 8080; host "::"
│   ├── tailwind.config.ts           # Custom status colors; dark mode: 'class'
│   ├── components.json              # shadcn/ui config — run from frontend/
│   └── .env                         # GITIGNORED — copy from frontend/.env.example
│
├── supabase/                        ← Supabase project (Supabase CLI must run from ROOT)
│   ├── config.toml                  # project_id only
│   ├── migrations/                  ← DATABASE — SQL files, timestamp-ordered (9 total)
│   └── functions/                   ← BACKEND — Deno edge functions
│       └── generate-report/
│           └── index.ts             # AI report: fetches data → Claude API → returns Markdown
│
├── .github/
│   └── workflows/
│       ├── supabase.yml             # Auto: db push + functions deploy on push to main
│       └── frontend.yml             # Auto: lint + build check on push to main
│
├── skills/
│   └── gridpoint-testflow/
│       └── SKILL.md                 # Project skill file for Claude
│
├── package.json                     # Root convenience scripts (delegates to frontend/)
├── .gitignore                       # Ignores .env, frontend/.env, node_modules, dist
├── .env.example                     # Full reference for ALL keys across all layers
└── [*.md documentation files]
```

---

## Role System

| Role | Can Do |
|---|---|
| `SUPERADMIN` | Manage users, assign roles, full visibility |
| `GM` | Create/edit projects, define scope, assign supervisors, drive lifecycle |
| `SUPERVISOR` | Manage assigned projects, assign engineers |
| `ENGINEER` | Execute test tasks, submit records |

- Roles stored in `user_roles` table (separate from `auth.users`)
- `has_role(user_id, role)` Postgres function used in RLS policies
- `AuthContext` fetches role separately after session; uses `setTimeout(..., 0)` to avoid deadlock
- `AuthContext` exposes `signInWithGoogle()` → calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`
- New OAuth users land on `Index.tsx` showing "role being configured" until SUPERADMIN assigns one
- **Never hardcode `/gm`** in navigate calls — use `dashboardPath(userRole)` from `src/lib/routes.ts`

---

## Database Schema (Key Tables)

```
projects           — status: DRAFT → APPROVED → ACTIVE → CLOSED
                     columns: project_number (UNIQUE), site_name, site_address, client,
                              start_date, end_date, created_by, approved_at, approved_by, assigned_to

scope_items        — equipment types + quantities (UNIQUE per project+type)

project_test_scope — which test_templates are enabled per equipment type
                     UNIQUE(project_id, test_template_id)
                     save is delete-then-insert (not upsert)

equipment_instances — physical units; auto-labeled with EQUIPMENT_LABEL map (e.g. PTR-001)
                      UNIQUE(project_id, equipment_type, seq_number)

test_templates     — JSON Schema field definitions drive dynamic form rendering
                     tab: CHECK IN ('NAMEPLATE', 'PARAMETERS', 'OVERVIEW')
                     UNIQUE(equipment_type, test_code)

test_tasks         — one per (instance × template)
                     status: DRAFT → IN_PROGRESS → SUBMITTED → APPROVED | REWORK
                     rework_reason: text — set by supervisor when sending back; shown to engineer

test_records       — JSONB test data. UNIQUE(test_task_id) — always upsert, never insert

nameplate_records  — equipment nameplate info; one-to-one with equipment_instances
                     UNIQUE(equipment_instance_id)

audit_logs         — append-only before/after log; written at app level (not DB triggers)

profiles           — auto-created on signup via Postgres trigger on auth.users

user_roles         — role assignments; UNIQUE(user_id, role)

supervisor_assignments — GM ↔ Supervisor relationship; UNIQUE(gm_id, supervisor_id)
```

---

## Test Templates — Full Library (46 templates)

| Equipment | Code | Name |
|---|---|---|
| POWER_TRANSFORMER | PT_VRT | Voltage Ratio Test |
| POWER_TRANSFORMER | PT_HVMC | HV Magnetizing Current |
| POWER_TRANSFORMER | PT_LVMC | LV Magnetizing Current |
| POWER_TRANSFORMER | PT_MBHV | Magnetic Balance HV |
| POWER_TRANSFORMER | PT_MBLV | Magnetic Balance LV |
| POWER_TRANSFORMER | PT_WRHV | Winding Resistance HV |
| POWER_TRANSFORMER | PT_WRLV | Winding Resistance LV |
| POWER_TRANSFORMER | PT_TRT | Transformer Turns Ratio |
| POWER_TRANSFORMER | PT_TDHV | Tan Delta HV |
| POWER_TRANSFORMER | PT_TDLV | Tan Delta LV |
| POWER_TRANSFORMER | PT_TDW | Tan Delta Winding |
| POWER_TRANSFORMER | PT_IR | Insulation Resistance |
| POWER_TRANSFORMER | PT-007 | SFRA — Sweep Frequency Resonance Analysis |
| CT | CT_ANALYZER | CT Analyzer |
| CT | CT_WRM | Winding Resistance Measurement |
| CT | CT_POL | Polarity Test |
| CT | CT_CRI | CT Ratio & Interface |
| CT | CT_TD | Tan Delta |
| CT | CT_IR | Insulation Resistance |
| CVT | CVT_VRT | Voltage Ratio Test |
| CVT | CVT_POL | Polarity Test |
| CVT | CVT_SWR | Swept Wave Response |
| CVT | CVT_CON | Capacitance Test |
| CVT | CVT_TD | Tan Delta |
| CVT | CVT_IR | Insulation Resistance |
| LA | LA_SCT | Surge Counter Test |
| LA | LA_THRC | Thermal & High Rate Current |
| LA | LA_TD | Tan Delta |
| LA | LA_IR | Insulation Resistance |
| SF6_BREAKER | SF6_TM | Timing Measurement |
| SF6_BREAKER | SF6_CR | Contact Resistance |
| SF6_BREAKER | SF6_CC | Coil Current |
| SF6_BREAKER | SF6_DCR | Dynamic Contact Resistance |
| SF6_BREAKER | SF6_DP | Dynamic Pressure |
| SF6_BREAKER | SF6_IRO | Insulation Resistance Open |
| SF6_BREAKER | SF6_IRC | Insulation Resistance Closed |
| ISOLATOR | ISO_CRI | Contact Resistance Inspection |
| ISOLATOR | ISO_CRE | Contact Resistance External |
| ISOLATOR | ISO_IR | Insulation Resistance |
| VCB | VCB_TM | Timing Measurement |
| VCB | VCB_CR | Contact Resistance |
| VCB | VCB_CON | Continuity |
| VCB | VCB_HV | High Voltage Test |
| VCB | VCB_IRO | Insulation Resistance Open |
| VCB | VCB_IRC | Insulation Resistance Closed |
| EARTH_PIT | EP_EPM | Earth Pit Measurement |

---

## Equipment Label Map

Use the `EQUIPMENT_LABEL` map in `ProjectTestingScopeTab.tsx` — do not use `substring(0,3)`:

| Type | Label prefix |
|---|---|
| `POWER_TRANSFORMER` | `PTR` |
| `CT` | `CT` |
| `CVT` | `CVT` |
| `LA` | `LA` |
| `SF6_BREAKER` | `SF6` |
| `ISOLATOR` | `ISO` |
| `VCB` | `VCB` |
| `EARTH_PIT` | `EP` |

---

## Key Workflows

### Equipment Generation (Idempotent)
`ProjectTestingScopeTab` checks for existing instances on mount (`alreadyGenerated` flag). Generate button is disabled if instances exist. On generate:
1. Insert `equipment_instances` using `EQUIPMENT_LABEL` map for labels
2. Insert `test_tasks` for each (instance × enabled template)

### Dynamic Test Forms
`test_templates.fields` is a JSON Schema (`type: object`, `properties`, `required`). Form rendering must interpret this at runtime. Field types: `string`, `number`, `string`+`enum`.

### Project Status Transitions
`DRAFT → APPROVED → ACTIVE → CLOSED`
- Scope editable only when `DRAFT` or `APPROVED`
- `isEditable = projectStatus === 'DRAFT' || projectStatus === 'APPROVED'`

### Realtime
Dashboards subscribe to Postgres changes on `projects`. Use separate `INSERT`/`UPDATE` event subscriptions rather than `event: '*'`.

### AI Report Generation
GM triggers `supabase.functions.invoke('generate-report', { body: { project_id } })`.
Edge function fetches data → builds prompt → calls Anthropic API → returns Markdown report.
Model: `claude-haiku-4-5-20251001`. See `AI_REPORT_PLAN.md` for full plan.
**Frontend UI:** "AI Report" button in `ProjectDetail.tsx` header — visible to GM/SUPERADMIN when `status = CLOSED`. Displays result in a scrollable dialog with a "Download .md" option.

### User Creation (Admin-only)
SUPERADMIN creates users via `InviteUserDialog` → `supabase.functions.invoke('create-user', { body })`.
Edge Function authenticates the caller, verifies SUPERADMIN role, then uses `admin.createUser()` (service role key) to create the auth user with `email_confirm: true`. It immediately updates the new user's profile with the caller's `company_id` and inserts the role row. Public `signUp()` is never called from the browser.

### User Deletion
`UserManagementTable` delete button → `supabase.functions.invoke('delete-user', { body: { user_id } })`.
Edge Function verifies target user is in the same company, then calls `admin.deleteUser()` which cascades to profiles and user_roles via DB foreign key constraints.

### Company Resolution
`CompanyContext` reads `window.location.hostname` on mount, extracts subdomain (e.g. `powergrid` from `powergrid.testflow.io`), fetches the `companies` row by slug, and exposes `{ company, loading }`. On localhost (no subdomain), `company` is `null` — app works in dev mode. Unknown slugs render `CompanyNotFound` page.

---

## Coding Conventions

- **Working directory**: run `npm run dev / build / lint` from **repo root** (delegates) or from `frontend/`; run `supabase` CLI commands from **repo root**
- **Path alias**: `@/` → `frontend/src/` (configured in `frontend/tsconfig.app.json` and `frontend/vite.config.ts`)
- **Supabase client**: always import from `@/integrations/supabase/client`
- **Types**: use `Tables<'table_name'>`, `Enums<'enum_name'>` from `@/integrations/supabase/types`
- **Navigation**: always use `dashboardPath(userRole)` — never hardcode role paths
- **Dates**: always use `formatDate()` / `formatDateTime()` from `@/lib/format` — never `toLocaleDateString()`
- **Toast**: `useToast` from `@/hooks/use-toast` for all user feedback
- **Loading**: `Loader2` from lucide-react with `animate-spin`
- **Error handling**: all Supabase calls in try/catch; errors shown via toast + logged to console
- **test_records**: upsert (not insert) — `UNIQUE(test_task_id)` constraint enforced in DB
- **shadcn/ui**: never edit files in `frontend/src/components/ui/` — run `npx shadcn-ui@latest add <component>` from `frontend/`

---

## Environment Variables

| Variable | Used by | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Browser | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser | Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Optional convenience | Project ref |
| `SUPABASE_PROJECT_ID` | GitHub Actions CI | Project ref for `supabase link` |
| `ANTHROPIC_API_KEY` | Edge Function (server) | Claude API key — set via `supabase secrets set`, never in `.env` |
| `PLATFORM_ADMIN_TOKEN` | Edge Function (server) | Token for `create-tenant` — set via `supabase secrets set PLATFORM_ADMIN_TOKEN=<value>` |
| `VITE_PLATFORM_ADMIN_TOKEN` | Browser (platform panel only) | Must exactly match `PLATFORM_ADMIN_TOKEN` Supabase secret |
| `SUPABASE_ACCESS_TOKEN` | GitHub Actions CI | Supabase personal access token |
| `SUPABASE_DB_PASSWORD` | GitHub Actions CI | DB password for `supabase db push` |

**Frontend env file lives at `frontend/.env`** (not root). Copy from `frontend/.env.example`.

**Edge Functions automatically get** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` injected by Supabase — no manual setup needed for those.

---

## Project Documentation Files

| File | Purpose |
|---|---|
| `CLAUDE.md` | This file — developer reference |
| `SAAS_ROADMAP.md` | Full multi-tenant SaaS transformation plan and remaining roadmap |
| `PROJECT.md` | Domain/product description — roles, workflows, data model |
| `DEVELOPMENT.md` | Setup, env vars, local Supabase, building, CI secrets |
| `DEPLOYMENT.md` | Deployment guide — Vercel/Netlify, secrets safety, first-run checklist |
| `IMPROVEMENTS.md` | Bug tracker and enhancement backlog (✅ fixed / 🔲 pending) |
| `AI_REPORT_PLAN.md` | AI report generation plan, architecture, checklist |
| `FRONTEND_REVAMP.md` | 2D dark design revamp — Grid Control theme, dark/light toggle, framer-motion |
| `EMAIL_RATE_LIMIT.md` | Email rate limit solutions — custom SMTP, OAuth (✅ implemented), provider pricing |
| `skills/gridpoint-testflow/SKILL.md` | Claude project skill file — critical rules, quick reference |

---

## Supabase Notes

- **RLS is enforced** on all tables. Missing data usually means a policy issue, not a query bug.
- **`types.ts` is auto-generated**: `supabase gen types typescript --project-id <ref> > frontend/src/integrations/supabase/types.ts`
- **Migrations**: add files to `supabase/migrations/` with timestamp naming. Never alter existing migration files.
- **Edge Functions**: Deno runtime. Import from `https://esm.sh/` or `npm:` specifiers.
- **`has_role` signature**: `has_role(_user_id UUID, _role app_role)` — note argument order in SQL.
- **CI auto-deploys**: Push to `main` → GitHub Actions runs migrations + deploys edge functions automatically.
- **Realtime**: `projects` table added to `supabase_realtime` publication (migration 4).
- **The Supabase anon key in the browser bundle is intentional and safe.** It only grants access that RLS policies permit — it is not a secret and does not identify a privileged user. Security is enforced entirely by Row Level Security on the DB. Never remove RLS thinking the anon key will protect data instead.

---

## GitHub Actions Secrets Required

Add these in: repo → Settings → Secrets and variables → Actions

| Secret | Description | Where to get it |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | Supabase personal access token | supabase.com → Account → Access Tokens |
| `SUPABASE_PROJECT_ID` | Project ref (e.g. `srlsypemgnkpoamhmbrf`) | Supabase Dashboard → Settings → General |
| `SUPABASE_DB_PASSWORD` | Database password | Supabase Dashboard → Settings → Database |
| `VITE_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key | Supabase Dashboard → Settings → API |

---

## Multi-Tenancy Architecture

### Tables with `company_id` column
`profiles`, `user_roles`, `projects`, `audit_logs`, `instruments` — all have a direct `company_id UUID` column.

### Tables protected via FK chain (no extra column)
`scope_items`, `project_test_scope`, `equipment_instances`, `test_tasks`, `nameplate_records`, `test_records` — RLS uses `EXISTS` subquery up the FK chain to `projects.company_id`.

### Global tables (no company isolation)
`test_templates` — shared library across all tenants. All authenticated users can read them.

### Key SQL function
`my_company_id()` — `SECURITY DEFINER` function that returns `auth.uid()`'s company_id from profiles. Used in every RLS policy. Returning NULL means user has no company → they see nothing.

### Onboarding a new client (GridPoint internal)
Use the Platform Admin panel at `optimustesting.com/admin` → **Create Company + Admin** form. The form creates the company row, the SUPERADMIN auth user, their profile, and the role assignment in one call to the `create-tenant` Edge Function.

Only remaining manual step:
1. Add `https://{slug}.optimustesting.com` to `supabase/functions/_shared/cors.ts` `ALLOWED_ORIGINS` → push to `main` (CI deploys automatically)
2. Send workspace URL + credentials to client

### Edge Functions
| Function | Purpose |
|---|---|
| `create-user` | Admin-only user creation via `auth.admin.createUser()` — sets `company_id`, assigns role |
| `delete-user` | Admin-only user deletion via `auth.admin.deleteUser()` — cascades to profile/roles |
| `generate-report` | AI report generation via Anthropic API |
| `create-tenant` | Platform-level: creates company + SUPERADMIN user atomically; guarded by `X-Platform-Token` header |
| `platform-admin-data` | Platform-level: RLS-bypassing data proxy for the admin panel; actions: `get_stats`, `get_all_companies`, `get_company_detail`; guarded by `X-Platform-Token` |

All functions share CORS headers from `supabase/functions/_shared/cors.ts`.

---

## Platform Admin Panel

The platform owner (Parakh) manages all tenant companies at `optimustesting.com` (root domain).

### How it works
- `App.tsx` checks `window.location.hostname` at startup. If it matches `optimustesting.com` or `www.optimustesting.com`, the normal tenant router (CompanyProvider + AuthProvider + tenant routes) is **not rendered**. Instead a minimal 2-route platform router is rendered.
- **No Supabase Auth involved.** The panel is gated purely by a hardcoded platform password stored in `VITE_PLATFORM_ADMIN_PASSWORD`. On success, `sessionStorage.setItem('platform_authed', 'true')` is set and the user is navigated to `/admin`.
- Each page checks `sessionStorage.getItem('platform_authed')` on mount; mismatches redirect to `/`.
- The panel uses the standard anon Supabase client (`@/integrations/supabase/client`).

### Routes (root domain only)
| Path | Component | Description |
|---|---|---|
| `/` | `PlatformLogin` | Password entry screen |
| `/admin` | `PlatformDashboard` | Full admin panel |
| `*` | Redirect → `/` | Catch-all |

### Features
- **Stats bar**: total companies, total users (profiles), active projects
- **Companies table**: name, slug, workspace URL, created date; Open ↗ and Delete actions
- **Create Company + Admin form**: two-section form — Company Details (name + auto-slug) + SUPERADMIN Account (name, email, password with show/hide). Single submit calls the `create-tenant` Edge Function. On success shows a dismissable credential card (workspace URL, email, password with copy buttons — shown once only).
- **Post-creation checklist**: 2-step reminder (CORS entry + send credentials)

### Files
| File | Purpose |
|---|---|
| `frontend/src/pages/PlatformAdmin/PlatformLogin.tsx` | Password gate page |
| `frontend/src/pages/PlatformAdmin/PlatformDashboard.tsx` | Main admin panel |
| `frontend/src/pages/PlatformAdmin/index.ts` | Barrel export |
| `supabase/functions/create-tenant/index.ts` | Platform Edge Function — atomic company + SUPERADMIN creation |

### Environment variables
`VITE_PLATFORM_ADMIN_PASSWORD` — set in `frontend/.env` and in Vercel → Environment Variables → Production (scope: Production only is recommended so preview deployments don't expose the panel).

`VITE_PLATFORM_ADMIN_TOKEN` — must exactly match the `PLATFORM_ADMIN_TOKEN` Supabase secret. Set both together:
```
supabase secrets set PLATFORM_ADMIN_TOKEN=<strong-random-value>
# then set VITE_PLATFORM_ADMIN_TOKEN=<same-value> in Vercel → Env Vars → Production
```

### RLS notes
- `companies` SELECT: already `USING (TRUE)` (all roles including anon can read — needed by `CompanyContext`)
- `companies` INSERT / DELETE for anon: added in migration `20260430000002` — allows the platform admin panel to create/remove companies using the anon key. The `companies` table holds only metadata (id, name, slug); actual sensitive data is in other tables protected by separate RLS policies. FK constraints prevent deleting a company that still has associated profiles or projects.

---

## Common Gotchas

1. **`AuthContext` uses `setTimeout(..., 0)`** to defer role fetching — avoids Supabase deadlock inside `onAuthStateChange`. Do not remove.
2. **Equipment generation is one-time** — `alreadyGenerated` flag prevents re-runs. The Generate button is disabled if instances exist.
3. **`project_test_scope` save is delete-then-insert** — not upsert. Intentional for clean removal of deselected templates.
4. **`test_records` requires upsert** — `UNIQUE(test_task_id)` constraint is now active. Use `.upsert()` when saving test data.
5. **Equipment tabs are conditionally rendered** based on `hasEquipment` state — they appear only after generation.
6. **`test_templates.tab`** is constrained to `'NAMEPLATE' | 'PARAMETERS' | 'OVERVIEW'` by DB check constraint.
7. **`scope_items` has a unique constraint** on `(project_id, equipment_type)` — one row per type per project.
8. **`ANTHROPIC_API_KEY` must be a Supabase secret** — not an `.env` variable. It runs server-side in the edge function only.
9. **`test_templates.fields` is an empty array `[]`** for most templates in the current seed. Forms rendering these should handle empty fields gracefully.
10. **New users have `company_id = NULL` for a brief moment** — the `handle_new_user` trigger creates the profile row before the Edge Function sets `company_id`. During this window the user sees no data (safe default — `my_company_id()` returns NULL → all RLS checks fail).
11. **`signUp()` and `signInWithGoogle()` are removed** from `AuthContext`. Do not re-add them. All user creation goes through the `create-user` Edge Function only.
12. **`companies` table has no INSERT policy for regular users** — only service role (Edge Functions) can create companies. Add new clients via Supabase Dashboard SQL editor.
13. **`vercel.json` at repo root** rewrites all paths to `/` for SPA routing. Wildcard subdomain (`*.testflow.io`) must be added in Vercel project settings and DNS.
10. **`vite.config.ts` binds to `host: "::"`** — exposes dev server on all interfaces (useful for Docker/WSL; change to `localhost` for local-only dev).
11. **Google OAuth needs Supabase Dashboard config** — code is implemented; paste Client ID + Secret in Auth → Providers → Google. See `EMAIL_RATE_LIMIT.md`.
12. **`next-themes`** is installed but dark theme is not yet implemented in the app — planned in `FRONTEND_REVAMP.md`.
13. **`profiles_update_own` RLS has WITH CHECK preventing self-change of `company_id`** (migration `20260429000001`). Do NOT weaken this — it is the gate against cross-tenant escalation.
14. **Edge Function CORS uses an allow-list, not wildcard.** When adding a new client domain, add it to `supabase/functions/_shared/cors.ts::ALLOWED_ORIGINS`. The legacy `corsHeaders` export still exists for backwards-compat but new functions should use `buildCorsHeaders(req.headers.get('Origin'))`.
14. **`generate-report` requires GM/SUPERADMIN auth + same-company project ownership.** If you add new edge functions that touch project data, copy the auth/role/tenant-check pattern from `generate-report/index.ts`.
15. **PDF + Excel exports share section rendering logic.** `frontend/src/lib/testSectionTables.tsx` (`SectionTable` component) and `frontend/src/lib/projectExcelExport.ts` (`renderSection` function) MUST stay in lock-step — both consume the same v2 template schema and the same payload key convention from `TestFormV2`. Change one, change the other.
16. **Company-scoped login guard in `AuthContext`** — after session resolves, `fetchUserRole` fetches `profiles.company_id` and compares it against the subdomain's `company.id` from `CompanyContext`. If they differ and `company !== null` (i.e. not localhost/dev), the session is immediately signed out and `companyMismatch = true` is set before any role data is exposed. `Auth.tsx` shows a "Wrong workspace" message; `ProtectedRoute` redirects to `/auth?error=wrong_company`. On localhost `company` is null so the check is skipped entirely — dev mode is unaffected.
16. **Demo tenants `companya` / `companyb` / `companyc`** are seeded by migration `20260429000001` with admins `admin@companya.com` / `admin@companyb.com` / `admin@companyc.com`. Demo passwords live in the migration file (rotate via User Management before exposing to a real prospect).
17. **`PLATFORM_ADMIN_TOKEN` must match exactly** between the `VITE_PLATFORM_ADMIN_TOKEN` Vercel env var and the `PLATFORM_ADMIN_TOKEN` Supabase secret — any mismatch causes 401 on all `create-tenant` and `platform-admin-data` calls. Set both from the same value at the same time.
18. **Platform admin data queries bypass RLS** via the `platform-admin-data` Edge Function using the service role key. The service role key lives only in the Edge Function's environment — it is never exposed to the browser. The browser only sends the `VITE_PLATFORM_ADMIN_TOKEN` to authenticate the call.
