---
name: gridpoint-testflow
description: Use for any work in the TestFlow electrical substation commissioning system — adding test templates, modifying equipment types, writing DB migrations, updating scope/test workflows, touching dashboards, building UI, or generating AI reports.
---

# TestFlow — Project Skill

## What This Project Does
TestFlow manages electrical substation commissioning: field teams plan test projects, record measurements on physical equipment (power transformers, CTs, breakers, etc.), and generate PDF/AI reports. Internal tool. 4 roles: SUPERADMIN, GM, SUPERVISOR, ENGINEER.

---

## Critical Rules (Do Not Violate)

1. **No `'use client'`** — pure Vite SPA, no Next.js, no SSR directives.
2. **Never hardcode `/gm` or any role path** — always use `dashboardPath(userRole)` from `@/lib/routes.ts`.
3. **`test_records` must use `.upsert()`** — `UNIQUE(test_task_id)` constraint is enforced in DB.
4. **`project_test_scope` saves are delete-then-insert** — not upsert. Intentional.
5. **Equipment generation is one-time** — check `alreadyGenerated` flag; never re-run if instances exist.
6. **`ANTHROPIC_API_KEY` is a Supabase secret** — never in `.env`, never in browser code.
7. **`supabase` CLI must run from repo root**, not from `frontend/`.
8. **Run `npm` scripts from repo root or `frontend/`** — root package.json delegates to `frontend/`.
9. **Never edit `frontend/src/components/ui/`** — shadcn/ui primitives, auto-generated.
10. **Never edit `frontend/src/integrations/supabase/types.ts`** — auto-generated, run `supabase gen types` to update.

---

## Equipment Label Map (in `ProjectTestingScopeTab.tsx`)

```ts
POWER_TRANSFORMER → PTR
CT               → CT
CVT              → CVT
LA               → LA
SF6_BREAKER      → SF6
ISOLATOR         → ISO
VCB              → VCB
EARTH_PIT        → EP
```
Never use `substring(0,3)` — always reference this map.

---

## Project + Task Status Flows

**Project:**
```
DRAFT → APPROVED → ACTIVE → CLOSED
```
Scope editable only in DRAFT or APPROVED: `isEditable = status === 'DRAFT' || status === 'APPROVED'`

**Test Task:**
```
DRAFT → IN_PROGRESS → SUBMITTED → APPROVED | REWORK
```

**Equipment Instance:**
```
UNASSIGNED → ASSIGNED → IN_PROGRESS → SUBMITTED → APPROVED | REWORK | CANCELLED | DEFERRED
```

**`test_templates.tab`** must be: `'NAMEPLATE' | 'PARAMETERS' | 'OVERVIEW'`

---

## Imports — Always Use These

```ts
// Supabase client — NEVER instantiate directly
import { supabase } from '@/integrations/supabase/client';

// Types — from auto-generated file, never edit manually
import type { Tables, Enums } from '@/integrations/supabase/types';

// Navigation — never hardcode role paths
import { dashboardPath } from '@/lib/routes';

// Dates — never toLocaleDateString()
import { formatDate, formatDateTime } from '@/lib/format';

// Toast feedback
import { useToast } from '@/hooks/use-toast';

// Loading spinner
import { Loader2 } from 'lucide-react';
```

---

## Database Schema Quick Reference

| Table | Key constraints / notes |
|---|---|
| `projects` | status: DRAFT→APPROVED→ACTIVE→CLOSED; assigned_to = supervisor FK |
| `scope_items` | UNIQUE `(project_id, equipment_type)` |
| `project_test_scope` | UNIQUE `(project_id, test_template_id)`; save = delete-then-insert |
| `equipment_instances` | UNIQUE `(project_id, equipment_type, seq_number)`; generated once |
| `test_templates` | `fields` is JSON Schema (mostly empty `[]` currently); tab CHECK constraint |
| `test_tasks` | One per `(instance × template)` |
| `test_records` | JSONB; UNIQUE `(test_task_id)` — always upsert |
| `nameplate_records` | UNIQUE `(equipment_instance_id)` |
| `audit_logs` | Append-only |
| `profiles` | Auto-created on signup via Postgres trigger |
| `user_roles` | UNIQUE `(user_id, role)`; `has_role(user_id, role)` used in RLS |
| `supervisor_assignments` | UNIQUE `(gm_id, supervisor_id)` |

---

## File Location Map

| What | Where |
|---|---|
| Frontend env | `frontend/.env` (copy from `frontend/.env.example`) |
| Routes | `frontend/src/App.tsx` |
| Auth state + OAuth | `frontend/src/contexts/AuthContext.tsx` |
| Dashboard path helper | `frontend/src/lib/routes.ts` |
| Date formatting | `frontend/src/lib/format.ts` |
| Supabase client | `frontend/src/integrations/supabase/client.ts` |
| Supabase types | `frontend/src/integrations/supabase/types.ts` — auto-generated |
| shadcn/ui primitives | `frontend/src/components/ui/` — do not edit |
| Equipment label map | `frontend/src/components/ProjectTestingScopeTab.tsx` |
| AI report edge fn | `supabase/functions/generate-report/index.ts` (Deno) |
| DB migrations | `supabase/migrations/` (9 files, timestamp-ordered) |
| CI workflows | `.github/workflows/supabase.yml` + `frontend.yml` |
| Documentation | `CLAUDE.md`, `PROJECT.md`, `DEVELOPMENT.md`, `IMPROVEMENTS.md` |

---

## All Routes (`frontend/src/App.tsx`)

```
/auth           → Auth (public) — email/password + Google OAuth
/               → Index (protected) — role-based redirect
/superadmin     → SuperadminDashboard (SUPERADMIN)
/gm             → GMDashboard (GM)
/projects/new   → NewProject 4-step wizard (GM)
/projects/:id   → ProjectDetail tabbed hub (GM)
/projects/:id/edit → EditProject (GM)
/supervisor     → SupervisorDashboard (SUPERVISOR)
/engineer       → EngineerDashboard (ENGINEER)
*               → NotFound
```

---

## All Components

| Component | File | Purpose |
|---|---|---|
| `AssignProjectDialog` | components/ | Assign supervisor to project |
| `DashboardLayout` | components/ | Shared header/nav shell for all dashboards |
| `EditRoleDialog` | components/ | Change user role (SUPERADMIN) |
| `ErrorBoundary` | components/ | Class component; catches render errors |
| `InviteUserDialog` | components/ | Invite new user (SUPERADMIN) |
| `ProjectEquipmentTab` | components/ | Equipment instances list + assignment |
| `ProjectPDFExport` | components/ | Browser print-to-PDF |
| `ProjectScopeTab` | components/ | Equipment types + quantities |
| `ProjectStatusActions` | components/ | DRAFT→APPROVED→ACTIVE→CLOSED transitions |
| `ProjectTestingScopeTab` | components/ | Scope config + idempotent equipment gen |
| `ProjectTestsTab` | components/ | Test task list with filter/sort |
| `ProtectedRoute` | components/ | Role-gated route wrapper |
| `ScopeManager` | components/ | Add/remove scope_items |
| `StatusBadge` | components/ | Colored status pill |
| `SupervisorSelector` | components/ | Dropdown: select supervisor |
| `TestingScopeSelector` | components/ | Multi-select test templates |
| `UserManagementTable` | components/ | User list for SUPERADMIN |
| `UserRoleBadge` | components/ | Display user role badge |

---

## Providers Stack (in `App.tsx`)

```
ErrorBoundary
  → QueryClientProvider (TanStack Query v5)
    → TooltipProvider
      → BrowserRouter
        → AuthProvider
          → Toaster + Sonner
            → Routes
```

---

## Common Workflows

### Adding a New Test Template
```bash
supabase migration new add_<equipment>_<test>_template
# Write INSERT INTO test_templates (...) in the file
supabase db push
supabase gen types typescript --project-id <ref> > frontend/src/integrations/supabase/types.ts
```

### Adding a New Equipment Type
1. Migration to add value to `equipment_type` enum
2. Add to `EQUIPMENT_LABEL` map in `ProjectTestingScopeTab.tsx`
3. Add test templates (separate migration)
4. Regenerate types

### Realtime Subscription Pattern
```ts
supabase.channel('projects')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'projects' }, handler)
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects' }, handler)
  .subscribe();
```
Always use separate INSERT/UPDATE events — never `event: '*'`.

### AI Report Trigger
```ts
const { data, error } = await supabase.functions.invoke('generate-report', {
  body: { project_id: projectId }
});
// data.report is Markdown text
```

### Google OAuth
```ts
// Already implemented in AuthContext:
const { signInWithGoogle } = useAuth();
await signInWithGoogle(); // redirects to Google, back to window.location.origin
```
Requires Google credentials set in Supabase Dashboard → Auth → Providers → Google.

---

## Error Handling Pattern

```ts
try {
  const { data, error } = await supabase.from('table').select('...');
  if (error) throw error;
  // use data
} catch (err) {
  console.error(err);
  toast({ title: 'Error', description: String(err), variant: 'destructive' });
} finally {
  setLoading(false);
}
```

---

## TanStack Query Pattern (for new pages)

```ts
const { data, isLoading, error } = useQuery({
  queryKey: ['projects', userId],
  queryFn: async () => {
    const { data, error } = await supabase.from('projects').select('*');
    if (error) throw error;
    return data;
  },
});
```

New pages should use TanStack Query. Existing pages use `useEffect` — don't mix patterns in the same file.

---

## AuthContext Gotcha

`setTimeout(..., 0)` defers role fetch inside `onAuthStateChange` — avoids Supabase internal lock. Do not remove or "fix" this.

---

## Test Templates — Summary by Equipment

| Equipment | Count | Templates |
|---|---|---|
| POWER_TRANSFORMER | 13 | PT_VRT, PT_HVMC, PT_LVMC, PT_MBHV, PT_MBLV, PT_WRHV, PT_WRLV, PT_TRT, PT_TDHV, PT_TDLV, PT_TDW, PT_IR, PT-007 (SFRA) |
| CT | 6 | CT_ANALYZER, CT_WRM, CT_POL, CT_CRI, CT_TD, CT_IR |
| CVT | 6 | CVT_VRT, CVT_POL, CVT_SWR, CVT_CON, CVT_TD, CVT_IR |
| LA | 4 | LA_SCT, LA_THRC, LA_TD, LA_IR |
| SF6_BREAKER | 7 | SF6_TM, SF6_CR, SF6_CC, SF6_DCR, SF6_DP, SF6_IRO, SF6_IRC |
| ISOLATOR | 3 | ISO_CRI, ISO_CRE, ISO_IR |
| VCB | 6 | VCB_TM, VCB_CR, VCB_CON, VCB_HV, VCB_IRO, VCB_IRC |
| EARTH_PIT | 1 | EP_EPM |

**Note:** Most templates have `fields: []` (empty). Field JSON schemas need to be defined per template.

---

## Known Gaps (see `IMPROVEMENTS.md` for full list)

- `test_templates.fields` is empty for most templates — dynamic forms can't render fields until schemas are written
- PDF export is browser print only — `@react-pdf/renderer` integration pending
- AI report frontend trigger UI not yet built
- Dark theme planned (`FRONTEND_REVAMP.md`) but not implemented — `ThemeContext`, `ThemeToggle`, CSS variables all pending
- No test suite (Vitest + React Testing Library + Playwright recommended)
- TanStack Query adoption is partial — only `SuperadminDashboard` uses it
