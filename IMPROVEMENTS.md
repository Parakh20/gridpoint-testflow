# Improvements & Known Issues

Legend: 🔴 Security | 🔲 Pending | ⚠️ Partial | ✅ Fixed

---

## 2026-04-29 — Pre-sale security pass (✅ all fixed)

- ✅ **Cross-tenant escalation via profiles.company_id** — `profiles_update_own` had no `WITH CHECK`, so any user could change their own `company_id` to another tenant's UUID. `my_company_id()` reads from profiles, so this would have given full read access to that other company's data. Fixed in migration `20260429000001` by adding a `WITH CHECK` that requires the new `company_id` equal the existing one.
- ✅ **`generate-report` Edge Function had no auth** — anyone with the URL could pass any `project_id` and receive an AI-generated report on it (data leak + Anthropic-bill abuse). Now requires JWT, verifies caller role is GM/SUPERADMIN, and confirms the project belongs to the caller's company.
- ✅ **CORS wildcard on Edge Functions** — switched `Access-Control-Allow-Origin: *` to an allow-list (`optimustesting.com`, `*.optimustesting.com`, localhost dev ports) via `_shared/cors.ts::buildCorsHeaders`.
- ✅ **Missing `WITH CHECK` on SUPERADMIN profile/user_roles management and project UPDATE** — added so a SUPERADMIN can't move a row to another tenant.
- ✅ **Password length minimum was 6 in Auth reset flow** — bumped to 8, matching `InviteUserDialog` zod schema and the new server-side check in `create-user`.
- ✅ **`create-user` Edge Function lacked input validation** — added strict email regex + 8-char password floor server-side (defense in depth — UI validation is not a security boundary).

---

## Security

### ✅ User invite bypasses admin server-side creation
`InviteUserDialog` now calls the `create-user` Edge Function (Supabase Admin SDK, service role key) instead of `supabase.auth.signUp()`. Email confirmation is skipped; account state is deterministic.

---

### ✅ Deleted users remain in auth.users
`delete-user` Edge Function calls `supabase.admin.deleteUser(userId)` using the service role. `UserManagementTable` delete button calls `functions.invoke('delete-user', ...)`. Cascades clean `profiles` and `user_roles`.

---

### 🔴 Audit logs inserted from browser with unvalidated actor_id
All `audit_logs` inserts happen client-side. `actor_id` is taken from `currentUserId` state which starts as `null` and could be null if `getUser()` hasn't resolved yet. Additionally, any authenticated user could insert fabricated audit entries for any `entity_id` since there's no RLS enforcement on the insert side.

**Fix:**
1. Always resolve `actor_id` from `auth.uid()` via a DB function/trigger rather than the client.
2. Add an RLS policy on `audit_logs` insert: `actor_id = auth.uid()` must match.

---

### ✅ `currentPassword` field in Profile removed
`Profile.tsx` no longer has a `currentPassword` field. Password update uses `supabase.auth.updateUser({ password: newPassword })` directly. The misleading "verify old password" UI that was never enforced server-side has been removed.

---

## Bugs

### 🔲 EditProject does not load existing testing scope
`EditProject.tsx` line 45 initializes `testingScope` as `{}` and never fetches the existing `project_test_scope` records from the DB. When the user reaches step 3 and saves, all existing test scope is deleted and replaced with an empty set (blocked by `validateStep3`, but only if the user reaches step 3 — saving on step 2 is not blocked and would silently wipe test scope).

**Fix:** In `fetchProject()`, after fetching scope_items, also query `project_test_scope` filtered by `project_id` and populate `testingScope` state to match the existing selection.

---

### ✅ `currentPassword` state removed from Profile
Removed along with the misleading password field. See Security section above.

---

### ✅ SuperadminDashboard grid has an empty 4th column
Fixed — `SuperadminDashboard.tsx` now uses `md:grid-cols-3`.

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

### 🔲 test_templates.fields is empty for most templates
Migration `20260409000002_populate_template_fields.sql` was written but most templates in the seeded DB still have `fields: []`. Until applied, `EngineerProjectDetail` renders "No fields defined" for most test forms.

**Fix:** Run `supabase db push` to apply the migration, or verify it was applied with `SELECT test_code, fields FROM test_templates LIMIT 5`.

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
