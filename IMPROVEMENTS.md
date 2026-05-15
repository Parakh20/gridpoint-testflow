# Improvements & Known Issues

Legend: 🔴 Security | 🔲 Pending | ⚠️ Partial

---

## Security

### 🔴 Audit logs inserted from browser with unvalidated actor_id
All `audit_logs` inserts happen client-side. `actor_id` is taken from `currentUserId` state which starts as `null` and could be null if `getUser()` hasn't resolved yet. Additionally, any authenticated user could insert fabricated audit entries for any `entity_id` since there's no RLS enforcement on the insert side.

**Fix:**
1. Always resolve `actor_id` from `auth.uid()` via a DB function/trigger rather than the client.
2. Add an RLS policy on `audit_logs` insert: `actor_id = auth.uid()` must match.

---

## Bugs

### 🔲 EditProject does not load existing testing scope
`EditProject.tsx` line 45 initializes `testingScope` as `{}` and never fetches the existing `project_test_scope` records from the DB. When the user reaches step 3 and saves, all existing test scope is deleted and replaced with an empty set (blocked by `validateStep3`, but only if the user reaches step 3 — saving on step 2 is not blocked and would silently wipe test scope).

**Fix:** In `fetchProject()`, after fetching scope_items, also query `project_test_scope` filtered by `project_id` and populate `testingScope` state to match the existing selection.

---

### 🔲 test_templates.fields is empty for most templates
Migration `20260409000002_populate_template_fields.sql` was written but most templates in the seeded DB still have `fields: []`. Until applied, `EngineerProjectDetail` renders "No fields defined" for most test forms.

**Fix:** Run `supabase db push` to apply the migration, or verify it was applied with `SELECT test_code, fields FROM test_templates LIMIT 5`.

---

## Medium Priority

### ⚠️ Data fetching inconsistency — useEffect vs TanStack Query
`SuperadminDashboard` and `GMDashboard` use TanStack Query. All other pages use `useEffect` + Supabase directly. This inconsistency means different stale-data behavior, no shared cache, and duplicated loading/error logic.

**Fix:** Migrate `ProjectDetail`, `EditProject`, `SupervisorDashboard`, `EngineerDashboard`, `EngineerProjectDetail` to `useQuery`/`useMutation` when doing refactor passes.

---

### ⚠️ Optimistic updates only on status transitions
`ProjectStatusActions` has an `onOptimisticUpdate` prop that immediately updates local state. But approve/rework in `ProjectTestsTab`, assignment changes, and scope edits all do full round-trips.

**Fix:** Migrate test task status changes to TQ mutations with `onMutate` / `onError` rollback when doing the data fetching consistency pass above.

---

### ⚠️ Test suite is minimal
Two test files exist (`format.test.ts`, `StatusBadge.test.tsx`) but cover only utility functions and one component. No coverage of critical flows: equipment generation, test task approval, scope saving, auth/role gating.

**Recommended additions:**
- `ProjectStatusActions.test.tsx` — transition button visibility per role/status
- `ProtectedRoute.test.tsx` — redirects for unauthenticated / wrong-role users
- `UserManagementTable.test.tsx` — deactivate/delete confirmations, self-deactivation block
- Playwright E2E: login → create project → generate equipment → submit test → approve

---

### 🔲 No server-side pagination for large datasets
`GMDashboard` fetches all projects with no server-side `LIMIT`/`OFFSET`. Client-side slicing works now but will degrade when project count grows.

**Fix:** Switch to `useInfiniteQuery` with `.range(offset, offset + PAGE_SIZE - 1)` once project count exceeds ~500.

---

## Low Priority

### 🔲 Profile page has no avatar / photo upload
Profile shows name and password change only. No gravatar, initials avatar, or photo upload.

**Fix:** Use `supabase.storage` bucket for avatar uploads. Display initials avatar as fallback in `DashboardLayout` header.

---

### 🔲 No email notification when task is assigned REWORK
Engineers currently see rework tasks only via `NotificationBell` (realtime). There is no email notification.

**Fix:** Add a Supabase DB trigger or Edge Function webhook that fires on `test_tasks.status = 'REWORK'` and sends an email to the assigned engineer via Resend/SendGrid.

---

### 🔲 No due-date enforcement or overdue indicator
`projects.end_date` is stored but never shown with overdue styling or alerts. Projects past their end date look identical to on-track ones.

**Fix:** In `GMDashboard` project rows and `ProjectDetail` header, compare `end_date` to today and show a red badge if overdue.

---

### 🔲 Equipment instances cannot be reassigned after generation
Once equipment is generated, `equipment_instances.assigned_to` can only be changed in `ProjectEquipmentTab`. There is no confirmation or audit log when reassignment happens.

**Fix:** Write an audit log entry when `assigned_to` is updated in `ProjectEquipmentTab`.

---
