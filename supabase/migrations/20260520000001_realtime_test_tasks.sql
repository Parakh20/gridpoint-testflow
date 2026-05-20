-- =============================================================================
-- 20260520000001 — Add test_tasks to the realtime publication
-- =============================================================================
-- Why: SupervisorDashboard (web) and TaskListScreen (mobile) both subscribe to
--      postgres_changes on test_tasks so engineers see rework / approval events
--      live, and supervisors see new submissions live. Without the table in
--      `supabase_realtime`, those subscriptions silently no-op. The 30s polling
--      fallback masks this when VITE_REALTIME_ENABLED=false, but as soon as the
--      flag is flipped on (paid tier, etc.) we want both clients to receive
--      events from the same source. CLAUDE.md gotcha #22.
-- =============================================================================

-- ── 1. Add table to publication ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'test_tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.test_tasks;
  END IF;
END$$;

-- ── 2. REPLICA IDENTITY FULL so OLD row is available in DELETE/UPDATE events ─
-- Without this, postgres_changes can't deliver filtered DELETE events (the
-- filter has nothing to match against since OLD isn't replicated). FULL costs
-- a bit more WAL volume but the table is low-churn.
ALTER TABLE public.test_tasks REPLICA IDENTITY FULL;

-- Also backfill REPLICA IDENTITY FULL on projects — the original migration
-- added it to the publication but never set replica identity, so filtered
-- UPDATE/DELETE events were unreliable.
ALTER TABLE public.projects REPLICA IDENTITY FULL;
