# Improvements Batch — Design Spec
Date: 2026-05-16

## Scope

Fix all outstanding items from IMPROVEMENTS.md except:
- Email notifications on REWORK (deferred — no email provider yet)
- Server-side pagination (GMDashboard already has client-side PAGE_SIZE=20 + Load More)
- EditProject scope bug (already fixed in codebase)

---

## 1. Security: Audit Log RLS Hardening

### Problem
`audit_logs` INSERT policy only checks `company_id = my_company_id()`. It does not enforce `actor_id = auth.uid()`, so any authenticated user in the same company could fabricate entries with another user's `actor_id`.

### Fix

**Migration** (`supabase/migrations/<timestamp>_audit_logs_actor_rls.sql`):
```sql
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = my_company_id()
    AND actor_id = auth.uid()
  );
```

**Frontend — `UserManagementTable.tsx`**: Replace `actor_id: currentUserId` (state, starts null) with `actor_id: (await supabase.auth.getUser()).data.user?.id`. Same pattern already used in `EditRoleDialog.tsx`.

### Audit log on equipment reassignment
In `ProjectEquipmentTab.tsx`, after `.update({ assigned_to: engineerId })` succeeds, insert one `audit_logs` row:
- `action: 'TASK_ASSIGNED'`
- `entity_type: 'test_task'`
- `entity_id: taskId`
- `before: { assigned_to: previousEngineerId }`
- `after: { assigned_to: engineerId }`
- `actor_id` resolved via `supabase.auth.getUser()`
- `company_id` from `useCompany()` context

---

## 2. TanStack Query Migration

### Pattern
Follow the existing pattern in `SuperadminDashboard` and `GMDashboard`:
- Data: `useQuery({ queryKey, queryFn })`
- Writes: `useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries(...) })`
- Realtime subscriptions: on Postgres change events, call `queryClient.invalidateQueries(queryKey)` instead of local `setState`

### Files (migrate in this order)

| File | Query keys |
|---|---|
| `ProjectDetail.tsx` | `['project', id]`, `['scope', id]`, `['equipment-instances', id]` |
| `EditProject.tsx` | `['project', id]`, `['scope', id]`, `['test-scope', id]` |
| `SupervisorDashboard.tsx` | `['supervisor-projects', userId]` |
| `EngineerDashboard.tsx` | `['engineer-tasks', userId]` |
| `EngineerProjectDetail.tsx` | `['engineer-project', id]`, `['engineer-tasks', id]` |

Local UI state (tab selection, dialog open/close, form values) remains in `useState` — only server state moves to `useQuery`.

### Optimistic updates for test task status changes
In `ProjectTestsTab`, wrap approve/rework calls in `useMutation`:
- `onMutate`: snapshot current cache, optimistically update task status
- `onError`: roll back to snapshot
- `onSettled`: invalidate `['test-tasks', instanceId]`

---

## 3. Initials Avatar

### Logic
```ts
function getInitials(fullName: string): string {
  return fullName.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
```
Color is deterministic from the user's id (hash → pick from a palette of 8 Tailwind bg colors).

### Placement
- **DashboardLayout header**: replace current user icon with a `<Avatar>` (shadcn) showing initials
- **Profile page**: show initials avatar circle at the top of the profile card

### Data source
`full_name` from `AuthContext` (already fetched from `profiles`). No DB changes needed.

---

## 4. Overdue Indicator

### Logic
```ts
const isOverdue = (endDate: string | null, status: string) =>
  !!endDate && new Date(endDate) < new Date() && status !== 'CLOSED';
```

### Placement
- **GMDashboard** project rows: red `Badge` variant="destructive" with text "Overdue" inline after the status badge
- **ProjectDetail** header area: red banner/badge below the project title

---

## 5. Tests

Three new files in `frontend/src/test/`:

### `ProjectStatusActions.test.tsx`
- DRAFT + GM role → shows "Submit for Approval" button
- APPROVED + GM role → shows "Activate" button
- ACTIVE + GM role → shows "Close Project" button
- CLOSED + any role → no transition buttons
- Non-GM role → transition buttons hidden

### `ProtectedRoute.test.tsx`
- No session → redirects to `/auth`
- Wrong role → redirects to role's dashboard
- Correct role → renders children

### `UserManagementTable.test.tsx`
- Delete button for current user is disabled
- Clicking delete on another user opens confirmation dialog
- Confirming delete calls the delete handler

---

## Out of Scope (this batch)
- Email notifications on REWORK
- Server-side pagination
- EditProject scope (already fixed)
- Playwright E2E tests
- Full avatar photo upload
