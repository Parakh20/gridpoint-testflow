# Supervisor Mobile Actions Design

**Date:** 2026-05-27
**Phase:** A of 3 (Supervisor → GM → SuperAdmin)
**Scope:** Add stats strip and bulk approve to the existing `SupervisorHomeScreen`

## Summary

The current mobile Supervisor screen already has individual approve, rework with reason, and project/review tabs. Two features are missing vs the web: a stats row and bulk approve. Both additions are confined to one existing file with no new screens or navigation changes.

## Current State

`mobile/src/screens/SupervisorHomeScreen.tsx` — two-tab layout (Pending Reviews + My Projects). Already fetches `projects` (assigned to user) and `pendingTests` (SUBMITTED tasks). Both queries are in `mobile/src/hooks/useSupervisor.ts`.

## Changes

### 1. Stats Strip

A horizontal `ScrollView` row inserted above the tab bar — same pattern as the existing GM screen (`GMProjectsScreen` stats row).

Four stat chips derived from already-fetched data (no new query):

| Label | Value |
|---|---|
| Assigned Projects | `projects.length` |
| Active | `projects.filter(p => p.status === 'ACTIVE').length` |
| Pending Start | `projects.filter(p => p.status === 'APPROVED').length` |
| Pending Review | `pendingTests.length` |

Colours mirror the web: foreground / cyan / amber / orange.

### 2. Bulk Approve

In the Reviews tab, each `ReviewCard` gains a checkbox on the left. A selection state `Set<string>` lives in `SupervisorHomeScreen`. When ≥1 task is selected, a header row above the list shows:

```
[Select All checkbox]  "N selected"   [Approve All button]
```

Approve All calls:
```ts
supabase
  .from('test_tasks')
  .update({ status: 'APPROVED', approved_at: new Date().toISOString(), rework_reason: null })
  .in('id', ids)
  .eq('status', 'SUBMITTED') // concurrency guard
```

Then syncs each touched `equipment_instance.status` using the same logic as individual approve (if remaining pending tasks for that instance → SUBMITTED, else APPROVED). Haptic success fires on completion. Selection clears. Query invalidated.

## Files Changed

| File | Change |
|---|---|
| `mobile/src/screens/SupervisorHomeScreen.tsx` | Add stats strip above tab bar; add checkbox + selection state to ReviewCard and Reviews tab |

No new hooks, screens, or navigation entries needed.

## Data Flow

Both `useSupProjects` and `usePendingReviews` hooks are unchanged. Stats are computed from their return values via `useMemo`. Bulk approve uses the same Supabase update pattern as the existing `handleTaskReview`, extracted into a `handleBulkApprove` function.

## Error Handling

- Bulk approve failure: toast error, selection preserved so user can retry
- Partial failure (concurrency guard skips already-moved tasks): acceptable — toast shows count approved, not expected to fail in normal operation
