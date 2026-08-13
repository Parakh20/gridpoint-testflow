-- Append-only event log for metrics with no live "current state" to count.
-- Do NOT add rows here for active_users/active_projects — those are
-- computed live in get_company_usage() below, same pattern as Plan 1's
-- can_invite_user()/can_create_project().
CREATE TABLE IF NOT EXISTS usage_records (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  metric      TEXT        NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata    JSONB       NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_usage_records_company_metric_time
  ON usage_records(company_id, metric, occurred_at);

ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;

-- Tenant read access: a company sees only its own usage events.
DROP POLICY IF EXISTS "usage_records_select_same_company" ON usage_records;
CREATE POLICY "usage_records_select_same_company"
  ON usage_records FOR SELECT
  TO authenticated
  USING (company_id = my_company_id());

-- No INSERT/UPDATE/DELETE policy for authenticated/anon — service role only
-- (the generate-report Edge Function writes via service-role client, Task 3).

-- Aggregates live counts (users/projects) with the one tracked event metric
-- (AI report generations this calendar month) into one JSONB payload.
CREATE OR REPLACE FUNCTION get_company_usage(_company_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_company UUID := COALESCE(_company_id, my_company_id());
  active_users INT;
  active_projects INT;
  ai_reports_this_month INT;
BEGIN
  IF target_company IS NULL THEN
    RETURN '{}'::JSONB;
  END IF;

  -- Reject cross-tenant reads, same guard shape as Plan 1's
  -- get_company_entitlements (20260812000003, fixed post-review).
  IF _company_id IS NOT NULL AND _company_id != my_company_id() THEN
    RAISE EXCEPTION 'Not authorized to view usage for this company';
  END IF;

  SELECT COUNT(*) INTO active_users
  FROM profiles
  WHERE company_id = target_company AND is_active = TRUE;

  SELECT COUNT(*) INTO active_projects
  FROM projects
  WHERE company_id = target_company
    AND status != 'CLOSED'
    AND deleted_at IS NULL;

  SELECT COUNT(*) INTO ai_reports_this_month
  FROM usage_records
  WHERE company_id = target_company
    AND metric = 'ai_report_generated'
    AND occurred_at >= date_trunc('month', NOW());

  RETURN jsonb_build_object(
    'active_users', active_users,
    'active_projects', active_projects,
    'ai_reports_this_month', ai_reports_this_month
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_company_usage(UUID) TO authenticated;
