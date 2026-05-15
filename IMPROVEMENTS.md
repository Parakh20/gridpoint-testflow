# Improvements & Known Issues

Legend: 🔲 Pending | ⚠️ Partial

---

## Medium Priority

### 🔲 No server-side pagination for large datasets
`GMDashboard` uses client-side `PAGE_SIZE` slicing. Works now but will degrade when project count exceeds ~500.

**Fix:** Switch to `useInfiniteQuery` with `.range(offset, offset + PAGE_SIZE - 1)` once project count exceeds ~500.

---

## Low Priority

### 🔲 No email notification when task is assigned REWORK
Engineers currently see rework tasks only via `NotificationBell` (realtime). There is no email notification.

**Fix:** Add a Supabase DB trigger or Edge Function webhook that fires on `test_tasks.status = 'REWORK'` and sends an email to the assigned engineer via Resend/SendGrid.

---
