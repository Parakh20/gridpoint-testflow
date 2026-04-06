# Style and Conventions

## TypeScript
- Strict TypeScript throughout
- Use `Tables<'table_name'>`, `Enums<'enum_name'>` from `@/integrations/supabase/types`
- No `any` — use proper Supabase-generated types

## Imports / Paths
- `@/` alias → `frontend/src/` (configured in tsconfig.app.json and vite.config.ts)
- Supabase client: always import from `@/integrations/supabase/client`
- Never edit `frontend/src/integrations/supabase/types.ts` manually (auto-generated)
- Never edit `frontend/src/components/ui/` (shadcn primitives)

## Navigation
- **Never hardcode `/gm` or other role paths** — always use `dashboardPath(userRole)` from `@/lib/routes`

## Dates
- Always use `formatDate()` / `formatDateTime()` from `@/lib/format` (date-fns based)
- Never use `.toLocaleDateString()`

## UI Feedback
- Toast: `useToast` from `@/hooks/use-toast`
- Loading spinner: `Loader2` from lucide-react with `animate-spin`

## Error Handling
- All Supabase calls in try/catch
- Errors shown via toast + logged to console

## Database
- `test_records`: upsert (not insert) — UNIQUE(test_task_id) constraint enforced
- `scope_items`: unique on (project_id, equipment_type) — one row per type per project
- `project_test_scope` save: delete-then-insert (not upsert) — intentional for clean removal
- Equipment labels: use EQUIPMENT_LABEL map in ProjectTestingScopeTab.tsx (PTR, CT, CVT, LA, SF6, ISO, VCB, EP)

## React Patterns
- No SSR, no `'use client'` directives (pure Vite SPA)
- Realtime: separate INSERT/UPDATE subscriptions (not `event: '*'`)
- AuthContext uses setTimeout(..., 0) to defer role fetch — do not remove (avoids Supabase deadlock)
- Equipment generation is one-time: alreadyGenerated flag prevents re-runs

## Scope Editability
- `isEditable = projectStatus === 'DRAFT' || projectStatus === 'APPROVED'`
