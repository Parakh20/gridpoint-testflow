# Supervisor Mobile Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a stats strip and bulk approve to `SupervisorHomeScreen.tsx`, matching the web Supervisor dashboard features that are currently missing on mobile.

**Architecture:** Both features are confined to a single file (`SupervisorHomeScreen.tsx`). The stats strip reads from already-fetched query data via `useMemo` — no new queries. Bulk approve adds a `Set<string>` selection state, checkboxes on each `ReviewCard`, and a header action row that fires a single multi-row Supabase UPDATE guarded by `.eq('status', 'SUBMITTED')`.

**Tech Stack:** React Native, Expo, TanStack Query v5, Supabase JS client, expo-haptics

---

## File Map

| File | Change |
|---|---|
| `mobile/src/screens/SupervisorHomeScreen.tsx` | Add stats strip above tab bar; add selection state + checkboxes + bulk header to reviews tab |

No new files, hooks, or navigation entries needed.

---

### Task 1: Stats Strip

**Files:**
- Modify: `mobile/src/screens/SupervisorHomeScreen.tsx`

The stats strip is a horizontal `ScrollView` row inserted between the root `<View>` opening tag and the tab bar `<View>`. It mirrors the pattern in `GMProjectsScreen.tsx` exactly. Stats are derived from `projectsQ.data` and `reviewsQ.data` via `useMemo` — no new queries.

**Four chips:**

| Label | Value | Color |
|---|---|---|
| Assigned | `projects.length` | `theme.text` (foreground) |
| Active | `projects.filter(p => p.status === 'ACTIVE').length` | `theme.accent` (#06b6d4, cyan) |
| Pending Start | `projects.filter(p => p.status === 'APPROVED').length` | `theme.warn` (#ec9d2a, amber) |
| Pending Review | `pendingTests.length` | `'#f97316'` (orange) |

- [ ] **Step 1: Add `useMemo` import and stats computation**

In `SupervisorHomeScreen.tsx`, `useMemo` is not yet imported. Add it to the React import, and add the stats computation after the existing query declarations:

```tsx
// Change line 1 from:
import React, { memo, useState } from 'react';
// To:
import React, { memo, useMemo, useState } from 'react';
```

Then add directly after line 37 (`const reviewMutation = useReviewTask(userId);`):

```tsx
  const projects = projectsQ.data ?? [];
  const pendingTests = reviewsQ.data ?? [];

  const stats = useMemo(() => ({
    assigned: projects.length,
    active: projects.filter((p) => p.status === 'ACTIVE').length,
    pendingStart: projects.filter((p) => p.status === 'APPROVED').length,
    pendingReview: pendingTests.length,
  }), [projects, pendingTests]);
```

- [ ] **Step 2: Replace raw array accesses below with the new variables**

The existing code at lines 82-84 references `reviewsQ.data?.length` and `projectsQ.data?.length` for tab badges. Update those to use the new variables — avoids double computation:

```tsx
  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'reviews', label: 'Pending Reviews', badge: pendingTests.length || undefined },
    { id: 'projects', label: 'My Projects', badge: projects.length || undefined },
  ];
```

(The `|| undefined` prevents showing a `0` badge, matching the original intent of the conditional render.)

- [ ] **Step 3: Insert the stats strip JSX above the tab bar**

In the `return` block, after `<View style={s.root}>` (line 87) and before `{/* Tab bar */}` (line 89), insert:

```tsx
      {/* Stats strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.statsScroll}
        contentContainerStyle={s.statsRow}
      >
        {[
          { label: 'Assigned', value: stats.assigned, color: theme.text },
          { label: 'Active', value: stats.active, color: theme.accent },
          { label: 'Pending Start', value: stats.pendingStart, color: theme.warn },
          { label: 'Pending Review', value: stats.pendingReview, color: '#f97316' },
        ].map((stat) => (
          <View key={stat.label} style={s.statCard}>
            <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </ScrollView>
```

- [ ] **Step 4: Add stats StyleSheet entries**

In the `StyleSheet.create({...})` block at the bottom, add these entries (copy the exact values from `GMProjectsScreen` for visual consistency):

```tsx
  statsScroll: { flexGrow: 0 },
  statsRow: { padding: theme.pad, gap: 10, paddingBottom: 8 },
  statCard: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center' as const,
    minWidth: 90,
  },
  statValue: { fontSize: 22, fontWeight: '700' as const },
  statLabel: { color: theme.textDim, fontSize: 11, marginTop: 2 },
```

- [ ] **Step 5: Type-check**

```bash
cd /home/parakh/Desktop/gridpoint-testflow/mobile
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/screens/SupervisorHomeScreen.tsx
git commit -m "feat(supervisor-mobile): add stats strip above tab bar"
```

---

### Task 2: Bulk Approve — Selection State + Checkboxes

**Files:**
- Modify: `mobile/src/screens/SupervisorHomeScreen.tsx`

Add a `Set<string>` selection state to `SupervisorHomeScreen` and pass `selected`/`onToggle` props to `ReviewCard`. The card renders a checkbox on the left.

- [ ] **Step 1: Add selection state**

After the existing state declarations (`reworkTask`, `reworkReason`, `submittingRework`), add:

```tsx
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(pendingTests.map((t) => t.id)));
  const clearSelection = () => setSelectedIds(new Set());
  const allSelected = pendingTests.length > 0 && selectedIds.size === pendingTests.length;
```

- [ ] **Step 2: Update `ReviewCard` props to accept selection**

Change the `ReviewCard` component signature and add a checkbox on the left:

```tsx
const ReviewCard = memo(function ReviewCard({
  task,
  onApprove,
  onRework,
  loading,
  selected,
  onToggle,
}: {
  task: PendingReview;
  onApprove: () => void;
  onRework: () => void;
  loading: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={s.reviewCard}>
      <View style={s.reviewCardTop}>
        <TouchableOpacity style={s.checkbox} onPress={onToggle} hitSlop={8}>
          <View style={[s.checkboxInner, selected && s.checkboxChecked]}>
            {selected && <Text style={s.checkmark}>✓</Text>}
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.reviewProject}>{task.projectNumber}</Text>
          <Text style={s.reviewTest}>{task.testName}</Text>
          <Text style={s.reviewInstance}>
            {task.instanceLabel} · {task.testCode}
          </Text>
        </View>
      </View>
      <View style={s.reviewActions}>
        <TouchableOpacity
          style={[s.actionBtn, s.actionBtnRework, loading && s.btnDisabled]}
          disabled={loading}
          onPress={onRework}
        >
          <Text style={s.actionBtnReworkText}>Rework</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, s.actionBtnApprove, loading && s.btnDisabled]}
          disabled={loading}
          onPress={onApprove}
        >
          {loading ? (
            <ActivityIndicator color={theme.primaryText} />
          ) : (
            <Text style={s.actionBtnApproveText}>Approve</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});
```

- [ ] **Step 3: Add checkbox StyleSheet entries**

```tsx
  reviewCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  checkbox: { paddingTop: 2 },
  checkboxInner: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: theme.primary, borderColor: theme.primary },
  checkmark: { color: theme.primaryText, fontSize: 12, fontWeight: '700' as const },
```

- [ ] **Step 4: Pass `selected` and `onToggle` to `ReviewCard` in the FlatList**

Find the `renderItem` in the reviews `FlatList` and update it:

```tsx
          renderItem={({ item }) => (
            <ReviewCard
              task={item}
              onApprove={() => handleApprove(item)}
              onRework={() => { setReworkTask(item); setReworkReason(''); }}
              loading={reviewMutation.isPending && reviewMutation.variables?.taskId === item.id}
              selected={selectedIds.has(item.id)}
              onToggle={() => toggleSelect(item.id)}
            />
          )}
```

- [ ] **Step 5: Clear selection when reviews data refreshes**

Add a `useEffect` after the state declarations that clears selection when the query data changes (prevents stale IDs after approve/rework):

```tsx
  // Clear stale selections when the pending review list refreshes
  React.useEffect(() => {
    setSelectedIds(new Set());
  }, [reviewsQ.dataUpdatedAt]);
```

- [ ] **Step 6: Type-check**

```bash
cd /home/parakh/Desktop/gridpoint-testflow/mobile
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add mobile/src/screens/SupervisorHomeScreen.tsx
git commit -m "feat(supervisor-mobile): add selection checkboxes to ReviewCard"
```

---

### Task 3: Bulk Approve — Header Bar and Mutation

**Files:**
- Modify: `mobile/src/screens/SupervisorHomeScreen.tsx`

When `selectedIds.size >= 1`, show a header row above the review list with a Select All checkbox, count label, and Approve All button. The button fires a single Supabase `UPDATE ... IN (ids) WHERE status = 'SUBMITTED'`, then invalidates both query keys.

- [ ] **Step 1: Add `handleBulkApprove` function**

Add after `handleSendRework` (around line 80):

```tsx
  const [bulkApproving, setBulkApproving] = useState(false);

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setBulkApproving(true);
    try {
      const { error } = await supabase
        .from('test_tasks')
        .update({ status: 'APPROVED', approved_at: new Date().toISOString(), rework_reason: null })
        .in('id', ids)
        .eq('status', 'SUBMITTED');
      if (error) throw error;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast.success(`${ids.length} task${ids.length > 1 ? 's' : ''} approved`);
      clearSelection();
      reviewMutation.reset(); // clear any stale mutation state
    } catch (e) {
      toast.error(explainSupabaseError(e));
    } finally {
      setBulkApproving(false);
    }
  };
```

Note: `supabase` needs to be imported. Check the existing imports — if not present, add:
```tsx
import { supabase } from '@/lib/supabase';
```
(Already imported via `useSupervisor.ts` hook internally, but the screen file itself needs to import it for the direct call here.)

- [ ] **Step 2: Add bulk action header JSX**

In the reviews `FlatList`, add a `ListHeaderComponent` that shows the bulk header when there are selected items. The existing `ListHeaderComponent` only shows an `ActivityIndicator` during loading. Extend it to also show the bulk header:

```tsx
          ListHeaderComponent={
            <>
              {reviewsQ.isLoading && (
                <View style={s.center}><ActivityIndicator color={theme.primary} /></View>
              )}
              {!reviewsQ.isLoading && selectedIds.size > 0 && (
                <View style={s.bulkHeader}>
                  <TouchableOpacity style={s.checkbox} onPress={allSelected ? clearSelection : selectAll} hitSlop={8}>
                    <View style={[s.checkboxInner, allSelected && s.checkboxChecked]}>
                      {allSelected && <Text style={s.checkmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                  <Text style={s.bulkCount}>{selectedIds.size} selected</Text>
                  <TouchableOpacity
                    style={[s.bulkApproveBtn, bulkApproving && s.btnDisabled]}
                    disabled={bulkApproving}
                    onPress={handleBulkApprove}
                  >
                    {bulkApproving ? (
                      <ActivityIndicator color={theme.primaryText} size="small" />
                    ) : (
                      <Text style={s.bulkApproveBtnText}>Approve All</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          }
```

- [ ] **Step 3: Add bulk header StyleSheet entries**

```tsx
  bulkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.cardAlt,
    borderRadius: theme.radius,
    paddingHorizontal: theme.pad,
    paddingVertical: 10,
    marginBottom: 8,
  },
  bulkCount: { flex: 1, color: theme.text, fontWeight: '600', fontSize: 13 },
  bulkApproveBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bulkApproveBtnText: { color: theme.primaryText, fontWeight: '700', fontSize: 13 },
```

- [ ] **Step 4: Ensure `supabase` is imported in the screen file**

Check the top of `SupervisorHomeScreen.tsx`. If there is no `import { supabase } from '@/lib/supabase';`, add it after the other imports.

- [ ] **Step 5: Invalidate queries after bulk approve**

The `handleBulkApprove` currently relies on the `useEffect` clearing selection when `reviewsQ.dataUpdatedAt` changes, but the query needs to actually refetch. Import `useQueryClient` and add invalidation inside `handleBulkApprove`:

In the imports block, ensure `useQueryClient` is imported (it comes from `@tanstack/react-query`). Add at the top of `SupervisorHomeScreen`:

```tsx
import { useQueryClient } from '@tanstack/react-query';
```

Then in `SupervisorHomeScreen` body add:
```tsx
  const qc = useQueryClient();
```

Update `handleBulkApprove`'s success block:
```tsx
      clearSelection();
      qc.invalidateQueries({ queryKey: ['pending-reviews', userId] });
      qc.invalidateQueries({ queryKey: ['sup-projects', userId] });
      reviewMutation.reset();
```

- [ ] **Step 6: Type-check**

```bash
cd /home/parakh/Desktop/gridpoint-testflow/mobile
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 7: Manual smoke test checklist**

Start the Expo dev server (`npx expo start`) and verify on a device or emulator:

- [ ] Stats strip visible above the tab bar on both Reviews and Projects tabs
- [ ] All four chips show correct values (matches count in the lists)
- [ ] Each ReviewCard shows a checkbox on the left
- [ ] Tapping a checkbox selects it (fills blue)
- [ ] When ≥1 card selected, bulk header appears at top of list
- [ ] Bulk header shows correct count ("N selected")
- [ ] Select All checkbox in bulk header selects all cards
- [ ] Tapping Select All again (when all selected) deselects all
- [ ] Approve All: haptic fires, toast shows "N task(s) approved", header disappears, list updates
- [ ] Error path: if Supabase fails, toast shows error, selection preserved
- [ ] Individual Approve still works as before
- [ ] Individual Rework still works as before

- [ ] **Step 8: Commit**

```bash
git add mobile/src/screens/SupervisorHomeScreen.tsx
git commit -m "feat(supervisor-mobile): bulk approve with selection header"
```
