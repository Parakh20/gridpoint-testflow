-- Closes IMPROVEMENTS.md "Soft-deleted projects never hard-deleted" and
-- "Audit log retention policy". No pg_cron extension available in this repo
-- (confirmed: not enabled anywhere in supabase/migrations) — same
-- GH Actions-cron pattern as reconcile-cancellations/notify-rework, service
-- role only.

CREATE OR REPLACE FUNCTION purge_old_soft_deleted()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_test_records INT;
  deleted_equipment INT;
  deleted_projects INT;
BEGIN
  WITH del AS (
    DELETE FROM test_records WHERE deleted_at < NOW() - INTERVAL '90 days' RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_test_records FROM del;

  WITH del AS (
    DELETE FROM equipment_instances WHERE deleted_at < NOW() - INTERVAL '90 days' RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_equipment FROM del;

  WITH del AS (
    DELETE FROM projects WHERE deleted_at < NOW() - INTERVAL '90 days' RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_projects FROM del;

  RETURN jsonb_build_object(
    'test_records', deleted_test_records,
    'equipment_instances', deleted_equipment,
    'projects', deleted_projects
  );
END;
$$;

CREATE TABLE IF NOT EXISTS audit_logs_archive (LIKE audit_logs INCLUDING ALL);
ALTER TABLE audit_logs_archive ENABLE ROW LEVEL SECURITY;
-- No policies — service-role only, same as billing_events/orders.

CREATE OR REPLACE FUNCTION archive_old_audit_logs()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  archived_count INT;
BEGIN
  WITH moved AS (
    DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '180 days' RETURNING *
  ),
  ins AS (
    INSERT INTO audit_logs_archive SELECT * FROM moved RETURNING 1
  )
  SELECT COUNT(*) INTO archived_count FROM ins;

  RETURN jsonb_build_object('archived', archived_count);
END;
$$;

REVOKE ALL ON FUNCTION purge_old_soft_deleted() FROM PUBLIC;
REVOKE ALL ON FUNCTION archive_old_audit_logs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_old_soft_deleted() TO service_role;
GRANT EXECUTE ON FUNCTION archive_old_audit_logs() TO service_role;
