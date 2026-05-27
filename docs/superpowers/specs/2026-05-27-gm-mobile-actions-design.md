# GM Mobile Actions Design

**Date:** 2026-05-27
**Phase:** B of 3 (Supervisor → GM → SuperAdmin)
**Scope:** Add assign-supervisor, create-project, and assignment filter to the existing GM mobile screen

## Summary

The current `GMProjectsScreen` is view-only: stats row, search, status filter chips, project list. This phase adds the three actions the web version supports: assigning a supervisor to a project, creating a new project, and filtering by assignment status.

## Current State

`mobile/src/screens/GMProjectsScreen.tsx` — fetches all projects via `useGMProjects` hook (returns `GMProject[]` with `assigned_supervisor_name`). Already has stats row, search, and status filter chips.

## Changes

### 1. Assign Supervisor

Each `ProjectCard` gets an "Assign" button below the supervisor line (or tapping "No supervisor assigned" text). Tapping opens a bottom sheet modal.

The modal shows a searchable list of active supervisors. Data from a new `useSupervisors()` hook:
```ts
// Step 1: get SUPERVISOR user IDs
const { data: roleRows } = await supabase
  .from('user_roles').select('user_id').eq('role', 'SUPERVISOR');
const ids = (roleRows ?? []).map(r => r.user_id);
// Step 2: fetch their profiles
const { data, error } = await supabase
  .from('profiles')
  .select('id, name, email')
  .in('id', ids)
  .eq('is_active', true)
  .order('name');
```

On selecting a supervisor:
```ts
supabase
  .from('projects')
  .update({ assigned_to: supervisorId })
  .eq('id', projectId)
```

On success: invalidate `['gm-projects']`, dismiss modal, toast success. The `ProjectCard` re-renders showing the supervisor name.

### 2. Create Project

A "+" `TouchableOpacity` in the screen header (via `navigation.setOptions` in a `useEffect`). Tapping navigates to a new `CreateProjectScreen`.

**`CreateProjectScreen` fields** (matching web `NewProject` form):
- Project Number (required, text)
- Site Name (required, text)
- Site Address (optional, text)
- Client (optional, text)
- Start Date (optional, date picker — `TextInput` with `YYYY-MM-DD` format; use native `DateTimePickerAndroid`/`@react-native-community/datetimepicker` or a plain text input for v1)
- End Date (optional, date picker, same approach)

On submit:
```ts
supabase
  .from('projects')
  .insert({
    project_number: data.projectNumber,
    site_name: data.siteName,
    site_address: data.siteAddress || null,
    client: data.client || null,
    start_date: data.startDate || null,
    end_date: data.endDate || null,
    status: 'DRAFT',
  })
```

On success: `navigation.goBack()`, invalidate `['gm-projects']`, toast success.

**Validation (client-side):** project number non-empty, site name non-empty, end date ≥ start date if both provided.

**Date input approach (v1):** Plain text `TextInput` with `YYYY-MM-DD` placeholder. Simple, no native dependency. Can be upgraded to a date picker in a later iteration.

### 3. Assignment Filter

Add a second chip row below the status filter row with three options: All / Assigned / Unassigned.

Filter logic (combined with existing status filter):
```ts
const visible = projects.filter(p => {
  const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
  const matchAssignment =
    assignmentFilter === 'All' ||
    (assignmentFilter === 'Assigned' && !!p.assigned_supervisor_name) ||
    (assignmentFilter === 'Unassigned' && !p.assigned_supervisor_name);
  return matchStatus && matchAssignment && matchSearch;
});
```

## Files Changed

| File | Change |
|---|---|
| `mobile/src/screens/GMProjectsScreen.tsx` | Add assign button to ProjectCard, assignment filter chips, "+" header button |
| `mobile/src/screens/CreateProjectScreen.tsx` | New — project creation form |
| `mobile/src/hooks/useGMProjects.ts` | No change to query; `GMProject` type already has `assigned_supervisor_name` |
| `mobile/src/hooks/useSupervisors.ts` | New — fetches active supervisors for picker |
| `mobile/src/navigation/types.ts` | Add `CreateProject: undefined` route |
| `mobile/src/navigation/RootNavigator.tsx` | Add `CreateProject` screen to GM branch |

## Data Flow

1. `GMProjectsScreen` renders project list from `useGMProjects`
2. Tap "Assign" → bottom sheet pulls `useSupervisors()` (cached, staleTime 5 min)
3. Select supervisor → UPDATE projects → invalidate `['gm-projects']` → list refreshes
4. Tap "+" → navigate to `CreateProjectScreen`
5. Submit form → INSERT project → navigate back → invalidate `['gm-projects']`

## Error Handling

- Assign supervisor failure: toast error, modal stays open for retry
- Create project: validation errors shown inline below each field; Supabase error shown as toast
- Duplicate `project_number`: Supabase unique constraint error surfaced via `explainSupabaseError()`
