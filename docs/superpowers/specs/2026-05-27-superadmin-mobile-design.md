# SuperAdmin Mobile Design

**Date:** 2026-05-27
**Phase:** C of 3 (Supervisor → GM → SuperAdmin)
**Scope:** Replace RoleBlockedScreen for SUPERADMIN with a three-tab dashboard: Dashboard, Users, Audit Log

## Summary

SUPERADMIN currently hits `RoleBlockedScreen`. This phase creates a full SuperAdmin section with three bottom-tab screens matching the web SuperAdmin dashboard feature-for-feature.

## Navigation Structure

In `RootNavigator.tsx`, the `role === null` (unknown/SUPERADMIN) branch is replaced with a `createBottomTabNavigator` containing three tabs:

```
SuperAdminTabs (bottom tabs)
  ├── SuperAdminDashboardScreen   (tab: Dashboard)
  ├── SuperAdminUsersScreen       (tab: Users)
  └── SuperAdminAuditScreen       (tab: Audit Log)
```

A `Profile` stack screen is available from the Dashboard tab header (same as other roles).

The `RoleBlockedScreen` is kept for truly unknown roles (i.e. role is set but not one of the four known values).

## Tab 1: Dashboard (`SuperAdminDashboardScreen`)

### Stats Row

Horizontal scroll row of 4 chips, same pattern as GM/Supervisor screens:

| Label | Query |
|---|---|
| Active Users | `profiles` count where `is_active=true` |
| Active Projects | `projects` count where `status='ACTIVE'` |
| System Health | Derived from service checks |

### Service Status Panel

Card showing live health checks for 5 services, refreshing every 30s:
- Database: `SELECT id FROM profiles LIMIT 1` (latency check)
- Auth: `supabase.auth.getSession()`
- `create-user` edge function: invoke with `{action:'__healthcheck__'}` — 400 = running
- `generate-report` edge function: same
- `platform-admin-data` edge function: same

Each row: status icon (✓ green / ✗ red / spinner), service name, latency or error detail. Manual refresh button.

### OAuth Approval Queue

List of users with `oauth_pending=true AND is_active=true`. Each row: name, email, role picker (ENGINEER / SUPERVISOR / GM), Approve + Reject buttons.

- Approve: `supabase.rpc('approve_oauth_user', { _user_id, _role })`
- Reject: `supabase.rpc('reject_oauth_user', { _user_id })`
- Refreshes every 30s. Empty state: "No pending approvals."

## Tab 2: Users (`SuperAdminUsersScreen`)

### User List

Fetches all users with roles via two queries (same as web `UserManagementTable`):
```ts
// 1. All profiles ordered by created_at desc
supabase.from('profiles').select('*').order('created_at', { ascending: false })
// 2. All user_roles
supabase.from('user_roles').select('*')
```
Joined client-side into `UserWithRole[]`.

Search bar (name/email) + role filter chips (All / SUPERADMIN / GM / SUPERVISOR / ENGINEER) + status filter chips (All / Active / Inactive).

Each user row: name, email, role badge, active indicator dot. Long-press or swipe reveals action menu.

### User Actions (bottom sheet per user)

- **Edit Role** — role picker, SUPERADMIN change requires confirmation alert
- **Toggle Active** — enable/disable `profiles.is_active` with confirmation
- **Offboard** — shows workload summary from `user_workload_summary` RPC, transfer-to picker if work exists, calls `offboard_user(_from, _to)` RPC
- **Delete** — calls `delete-user` Edge Function; confirmation required; blocked if user has open work

### Create User (FAB)

Floating "+" button → bottom sheet form: name, email, role picker, password field with show/hide + generate button. Calls `create-user` Edge Function. Same password rules as web (10+ chars, upper+lower+digit).

Password generation: same Fisher-Yates shuffle algorithm from web `InviteUserDialog`.

## Tab 3: Audit Log (`SuperAdminAuditScreen`)

### List

Fetches up to 500 most recent audit log entries ordered by `created_at DESC`:
```ts
supabase
  .from('audit_logs')
  .select('id, created_at, actor_id, action, table_name, record_id, before, after')
  .order('created_at', { ascending: false })
  .limit(500)
```

Actor names hydrated from a secondary `profiles` query on the unique `actor_id` set.

Search bar (actor name, table, action, record_id) + table filter chips (All / projects / equipment_instances / test_tasks / test_records / user_roles) + action filter chips (All / INSERT / UPDATE / DELETE).

Each row: timestamp, actor name, action badge (colour-coded: INSERT=green, UPDATE=amber, DELETE=red), table name.

### Row Detail

Tapping a row navigates to `SuperAdminAuditDetailScreen` showing:
- Header: timestamp, actor, action, table, record ID
- Two scrollable `Text` blocks (monospace): Before JSON and After JSON

## Files Changed

| File | Change |
|---|---|
| `mobile/src/navigation/RootNavigator.tsx` | Replace SUPERADMIN branch with bottom-tab navigator |
| `mobile/src/navigation/types.ts` | Add `SuperAdminAuditDetail: { logId: string }` stack route |
| `mobile/src/screens/SuperAdminDashboardScreen.tsx` | New — stats, health checks, OAuth queue |
| `mobile/src/screens/SuperAdminUsersScreen.tsx` | New — user list, create user FAB, per-user actions |
| `mobile/src/screens/SuperAdminAuditScreen.tsx` | New — audit log list with filters |
| `mobile/src/screens/SuperAdminAuditDetailScreen.tsx` | New — before/after JSON detail |
| `mobile/src/hooks/useAdminUsers.ts` | New — fetch profiles + user_roles joined |
| `mobile/src/hooks/useOAuthPending.ts` | New — fetch oauth_pending users |
| `mobile/src/hooks/useAuditLogs.ts` | New — fetch audit logs with filters |
| `mobile/package.json` | Add `@react-navigation/bottom-tabs` |

## Data Flow

- Dashboard stats: two count queries, no joins
- Health checks: parallel Promise.all of 5 async checks, cached 30s
- OAuth queue: poll 30s, invalidate on approve/reject
- Users: two queries joined client-side, search/filter in-memory (≤ a few hundred users per company)
- Audit log: single query limit 500 + secondary actor name hydration, filter in-memory

## Error Handling

- Health check failures: per-service error state shown inline (not a global error)
- OAuth approve/reject failure: toast error, queue preserved
- Create user failure: inline error below form, stay open
- Edit role / toggle / offboard / delete: toast error on failure
- Audit log load failure: toast + empty state with retry button
