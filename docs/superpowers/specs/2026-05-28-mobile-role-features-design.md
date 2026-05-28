# Mobile Role Features — Design Spec

**Date:** 2026-05-28  
**Status:** Approved  
**Scope:** Full role-based feature parity on mobile for GM, SUPERVISOR, and SUPERADMIN roles (excluding PDF/Excel/AI export)

---

## 1. Overview

The mobile app currently shows GM/SUPERADMIN a read-only projects list and SUPERVISOR a read-only review queue. This spec adds full management capabilities for all three roles, matching the web app's feature set for data entry and management operations.

---

## 2. Roles & Feature Matrix

| Feature | GM | SUPERADMIN | SUPERVISOR |
|---|---|---|---|
| Create project | ✅ | ✅ | ❌ |
| Edit project (info + status) | ✅ | ✅ | ❌ |
| Manage scope items | ✅ | ✅ | ❌ |
| Assign supervisor to project | ✅ | ✅ | ❌ |
| Assign engineers to instances | ✅ | ✅ | ✅ |
| List / create / edit users | ❌ | ✅ | ❌ |
| Deactivate / reactivate users | ❌ | ✅ | ❌ |

---

## 3. Navigation Architecture

### Approach: Dedicated Screens (Stack Navigation)

All new screens slot into the existing `createNativeStackNavigator` pattern. No bottom-tab navigation introduced.

### New Navigation Routes (`RootStackParamList`)

```typescript
CreateProject: undefined;
EditProject: { projectId: string; projectNumber: string };
ScopeManagement: { projectId: string; projectNumber: string };
AssignSupervisor: { projectId: string; projectNumber: string };
EngineerAssignment: { projectId: string; projectNumber: string };
UserManagement: undefined;
CreateUser: undefined;
UserDetail: { userId: string; userName: string };
```

### Entry Points

- **GMProjectsScreen** — `+` FAB → `CreateProject`; profile avatar (already added); SUPERADMIN gets additional users icon → `UserManagement`
- **ProjectOverviewScreen** — action buttons below project info card:
  - GM/SUPERADMIN: **Edit**, **Scope**, **Supervisor**, **Engineers**
  - SUPERVISOR: **Engineers** only
- **UserManagementScreen** — `+` FAB → `CreateUser`; row tap → `UserDetail`

### RootNavigator Changes

- GM/SUPERADMIN stack: add all new screens except `SupervisorHome`
- SUPERVISOR stack: add `EngineerAssignment` only
- Both stacks already include `ProjectOverview` and `Profile`

---

## 4. Screen Designs

### 4.1 `CreateProjectScreen` (GM / SUPERADMIN)

**Fields:**
- Project Number — text, required, unique enforced by DB
- Site Name — text, required
- Site Address — text, required
- Client — text, optional
- Start Date — date picker, optional
- End Date — date picker, optional

**Behaviour:**
- `INSERT INTO projects` with `company_id = my_company_id()`, `created_by = auth.uid()`, `status = 'DRAFT'`
- On success: navigate back to `GMProjects` and refetch; success toast
- On DB unique conflict (`project_number`): show inline error "Project number already exists"

---

### 4.2 `EditProjectScreen` (GM / SUPERADMIN)

**Fields:** Same as CreateProject, plus:
- Status picker: DRAFT / APPROVED / ACTIVE / CLOSED
  - Status only advances forward; UI disables backward transitions
  - Status change is a separate `UPDATE` call with optimistic-concurrency guard (`.eq('status', currentStatus)`) matching web pattern

**Additional (SUPERADMIN only):**
- Soft-delete button → confirmation alert → sets `deleted_at = NOW()`

**Behaviour:**
- Pre-fills from existing project data
- `UPDATE projects SET ... WHERE id = projectId AND company_id = my_company_id()`
- Invalidates `['gm-projects']` and `['project-overview', projectId]` on success

---

### 4.3 `ScopeManagementScreen` (GM / SUPERADMIN)

**Content:**
- List of all 8 equipment types with current quantity (0 if no scope item)
- Each row: equipment label + numeric stepper (`-` / value / `+`), range 0–500
- "Save" button at bottom

**Behaviour:**
- Loads `scope_items` for the project
- On save: upserts each changed type (`INSERT ... ON CONFLICT DO UPDATE`)
- Read-only (steppers disabled) when project status is ACTIVE or CLOSED; shows banner "Scope locked — project is {status}"
- Editable in DRAFT and APPROVED

---

### 4.4 `AssignSupervisorScreen` (GM / SUPERADMIN)

**Content:**
- Current supervisor shown at top (if any), with "Remove" button
- Searchable flat list of all SUPERVISOR-role users in the company
- Single-select; checkmark on selected row

**Data:**
- Fetches `profiles` joined with `user_roles WHERE role = 'SUPERVISOR'` and `company_id = my_company_id()`

**Behaviour:**
- On confirm: `UPDATE projects SET assigned_to = supervisorId WHERE id = projectId`
- Also upserts into `supervisor_assignments (gm_id, supervisor_id, created_by)` if not already present
- On remove: `UPDATE projects SET assigned_to = NULL`
- Invalidates `['gm-projects']` and `['project-overview', projectId]`

---

### 4.5 `EngineerAssignment Screen` (GM / SUPERADMIN / SUPERVISOR)

**Content:**
- List of `equipment_instances` for the project (label + type + current assignee name or "Unassigned")
- Tap any row → opens an in-screen picker (not a new screen) showing engineers
- Single-select per instance; confirm button per row

**Data:**
- Fetches `equipment_instances` with assigned engineer name via join on `profiles`
- Fetches `profiles` + `user_roles WHERE role = 'ENGINEER'` for the company

**Behaviour:**
- On assign: `UPDATE equipment_instances SET assigned_to = engineerId WHERE id = instanceId`
- On unassign: `UPDATE equipment_instances SET assigned_to = NULL`
- Invalidates `['project-overview', projectId]`

**Access:**
- SUPERVISOR: only sees instances in their assigned project (RLS enforces this at DB level)
- GM/SUPERADMIN: sees all instances

---

### 4.6 `UserManagementScreen` (SUPERADMIN only)

**Content:**
- Search bar
- FlatList of all users in company: name, email, role badge, active/inactive indicator
- FAB `+` → `CreateUserScreen`
- Row tap → `UserDetailScreen`

**Data:** `useCompanyUsers()` — queries `profiles LEFT JOIN user_roles` filtered by `company_id = my_company_id()`

---

### 4.7 `CreateUserScreen` (SUPERADMIN only)

**Fields:**
- Full Name — text, required
- Email — text, required, email format
- Password — text, required, 10+ chars with upper + lower + digit (same zod rule as web)
- Role — picker: ENGINEER / SUPERVISOR / GM / SUPERADMIN

**Behaviour:**
- Calls `create-user` Edge Function via `supabase.functions.invoke('create-user', { body: { name, email, password, role } })`
- Shows inline validation errors
- On success: navigate back to `UserManagement` and refetch; toast "User created"
- On rate-limit error: show "Rate limit reached — try again later"

---

### 4.8 `UserDetailScreen` (SUPERADMIN only)

**Content:**
- User info: name, email, role, active status, created date
- **Change Role** — inline role picker; on confirm → `UPDATE user_roles SET role = newRole WHERE user_id = userId`
- **Deactivate / Reactivate** — toggle `profiles.is_active`; deactivate shows confirmation alert

**Behaviour:**
- On role change: invalidates `['company-users']`
- On deactivate: invalidates `['company-users']`; toast "User deactivated"

---

## 5. Data Layer (New Hooks)

| Hook | Purpose | Used by |
|---|---|---|
| `useCreateProject()` | mutation: INSERT project | CreateProjectScreen |
| `useUpdateProject(projectId)` | mutation: UPDATE project | EditProjectScreen |
| `useScopeItems(projectId)` | query + mutation: scope upsert | ScopeManagementScreen |
| `useCompanySupervisors()` | query: SUPERVISOR profiles in company | AssignSupervisorScreen |
| `useAssignSupervisor(projectId)` | mutation: UPDATE projects.assigned_to | AssignSupervisorScreen |
| `useProjectInstances(projectId)` | query: equipment_instances with assignee names | EngineerAssignmentScreen |
| `useCompanyEngineers()` | query: ENGINEER profiles in company | EngineerAssignmentScreen |
| `useAssignEngineer()` | mutation: UPDATE equipment_instances.assigned_to | EngineerAssignmentScreen |
| `useCompanyUsers()` | query: all profiles + roles in company | UserManagementScreen |
| `useCreateUser()` | mutation: invoke create-user Edge Function | CreateUserScreen |
| `useUpdateUserRole(userId)` | mutation: UPDATE user_roles | UserDetailScreen |
| `useToggleUserActive(userId)` | mutation: UPDATE profiles.is_active | UserDetailScreen |

---

## 6. Changes to Existing Screens

### `GMProjectsScreen`
- Add `+` FAB (bottom-right) → navigate to `CreateProject`
- For SUPERADMIN: add users icon in `headerRight` alongside avatar

### `ProjectOverviewScreen`
- Add action button row below project info card, visible based on role:
  - GM / SUPERADMIN: **Edit Project**, **Manage Scope**, **Assign Supervisor**, **Assign Engineers**
  - SUPERVISOR: **Assign Engineers**
- Buttons disabled when project status prevents the action (e.g., Scope locked for ACTIVE/CLOSED)

### `RootNavigator`
- Add all new screens to GM/SUPERADMIN stack
- Add `EngineerAssignment` to SUPERVISOR stack

---

## 7. Error Handling

- All mutations: toast on error using `explainSupabaseError(error)` from `@testflow/shared`
- Network errors: show retry toast
- RLS-blocked writes: surface as generic "Permission denied" message (should not occur if role-gating is correct)
- `create-user` rate limit: specific message per CLAUDE.md pattern

---

## 8. Patterns & Conventions

- All new hooks in `src/hooks/` following existing `useGMProjects.ts` / `useSupervisor.ts` patterns
- Query keys: `['company-users']`, `['company-supervisors']`, `['company-engineers']`, `['scope-items', projectId]`, `['project-instances', projectId]`
- All screens follow `StyleSheet.create` pattern with `theme.*` tokens — no inline style objects
- Date inputs: plain `TextInput` with `YYYY-MM-DD` format + regex validation (no native date picker — keeps OTA-compatible; no new native modules needed)
- No new native modules — OTA-compatible
- Invalidation: mutations invalidate relevant query keys on success
