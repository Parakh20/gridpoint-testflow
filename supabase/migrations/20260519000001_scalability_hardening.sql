-- =============================================================================
-- Migration: Scalability hardening
-- - AI report concurrency lock (column + helper)
-- - Equipment generation RPC (race-safe, idempotent server-side)
-- - Performance indexes for RLS-heavy tenant queries
-- =============================================================================


-- =============================================================================
-- 1. AI REPORT CONCURRENCY
-- =============================================================================
-- Prevents two GMs hitting "Generate AI Report" simultaneously on the same
-- project — second caller gets a clear 409, doesn't burn Anthropic tokens.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS ai_report_generating_at TIMESTAMPTZ;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS ai_report_generated_at  TIMESTAMPTZ;


-- Try to claim the AI-report lock. Returns TRUE if claimed (caller may proceed),
-- FALSE if another worker is already generating (or the lock is younger than
-- the stale-timeout window of 5 minutes). Service role only — called from the
-- generate-report Edge Function.
CREATE OR REPLACE FUNCTION claim_ai_report_lock(_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_updated INT;
BEGIN
  UPDATE projects
  SET ai_report_generating_at = NOW()
  WHERE id = _project_id
    AND (
      ai_report_generating_at IS NULL
      OR ai_report_generating_at < NOW() - INTERVAL '5 minutes'
    );

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;

CREATE OR REPLACE FUNCTION release_ai_report_lock(_project_id UUID, _success BOOLEAN)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE projects
  SET ai_report_generating_at = NULL,
      ai_report_generated_at  = CASE WHEN _success THEN NOW() ELSE ai_report_generated_at END
  WHERE id = _project_id;
$$;


-- =============================================================================
-- 2. EQUIPMENT GENERATION — SERVER-SIDE, RACE-SAFE
-- =============================================================================
-- Replaces the client-side "alreadyGenerated" flag with a real DB-enforced
-- guarantee. Two simultaneous clicks → one succeeds, the other gets a clean
-- "already generated" result instead of a cryptic unique-constraint error.
--
-- Returns: { generated_instances INT, generated_tasks INT, already_existed BOOL }

CREATE OR REPLACE FUNCTION generate_project_equipment(_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER  -- RLS still applies to caller
SET search_path = public
AS $$
DECLARE
  existing_count   INT;
  instances_count  INT := 0;
  tasks_count      INT := 0;
BEGIN
  -- Lock the project row so two concurrent calls serialize
  PERFORM 1 FROM projects WHERE id = _project_id FOR UPDATE;

  SELECT COUNT(*) INTO existing_count
  FROM equipment_instances
  WHERE project_id = _project_id;

  IF existing_count > 0 THEN
    RETURN jsonb_build_object(
      'generated_instances', 0,
      'generated_tasks',     0,
      'already_existed',     TRUE
    );
  END IF;

  -- Insert one equipment_instance per (scope_item, seq) using deterministic
  -- short labels. ON CONFLICT DO NOTHING is belt-and-suspenders — the FOR
  -- UPDATE above already guarantees serialization, but this prevents
  -- partial-state weirdness if something slips through.
  WITH inserted AS (
    INSERT INTO equipment_instances
      (project_id, scope_item_id, equipment_type, seq_number, label, status)
    SELECT
      si.project_id,
      si.id,
      si.equipment_type,
      seq.n,
      CASE si.equipment_type::TEXT
        WHEN 'POWER_TRANSFORMER' THEN 'PTR'
        WHEN 'CT'                THEN 'CT'
        WHEN 'CVT'               THEN 'CVT'
        WHEN 'LA'                THEN 'LA'
        WHEN 'SF6_BREAKER'       THEN 'SF6'
        WHEN 'ISOLATOR'          THEN 'ISO'
        WHEN 'VCB'               THEN 'VCB'
        WHEN 'EARTH_PIT'         THEN 'EP'
        WHEN 'VT'                THEN 'VT'
        ELSE UPPER(SUBSTRING(si.equipment_type::TEXT, 1, 3))
      END || '-' || LPAD(seq.n::TEXT, 3, '0'),
      'UNASSIGNED'
    FROM scope_items si
    CROSS JOIN LATERAL generate_series(1, si.quantity) AS seq(n)
    WHERE si.project_id = _project_id
    ON CONFLICT (project_id, equipment_type, seq_number) DO NOTHING
    RETURNING id, equipment_type
  )
  SELECT COUNT(*) INTO instances_count FROM inserted;

  -- Insert one test_task per (instance × enabled template)
  WITH new_tasks AS (
    INSERT INTO test_tasks (equipment_instance_id, test_template_id, status)
    SELECT ei.id, pts.test_template_id, 'DRAFT'
    FROM equipment_instances ei
    JOIN project_test_scope pts
      ON pts.project_id = _project_id
     AND pts.equipment_type = ei.equipment_type
     AND pts.is_enabled = TRUE
    WHERE ei.project_id = _project_id
    RETURNING id
  )
  SELECT COUNT(*) INTO tasks_count FROM new_tasks;

  RETURN jsonb_build_object(
    'generated_instances', instances_count,
    'generated_tasks',     tasks_count,
    'already_existed',     FALSE
  );
END;
$$;

GRANT EXECUTE ON FUNCTION generate_project_equipment(UUID) TO authenticated;


-- =============================================================================
-- 3. PERFORMANCE INDEXES FOR TENANT-SCOPED QUERIES
-- =============================================================================
-- Every RLS check pivots on company_id (directly or via FK chain). Without
-- these indexes, tenant lookups do sequential scans once we cross ~10k rows.

CREATE INDEX IF NOT EXISTS idx_profiles_company_id        ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_company_id      ON user_roles(company_id);

-- Composite: dashboard queries filter projects by (company, status)
CREATE INDEX IF NOT EXISTS idx_projects_company_status    ON projects(company_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_assigned_to       ON projects(assigned_to);

-- Audit log lookups are always (company, recent first)
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created ON audit_logs(company_id, created_at DESC);

-- equipment_instances FK lookup is the hottest path for child-table RLS
CREATE INDEX IF NOT EXISTS idx_equipment_instances_project ON equipment_instances(project_id);
CREATE INDEX IF NOT EXISTS idx_equipment_instances_assigned_to ON equipment_instances(assigned_to);

-- test_tasks dashboard queries filter by (instance, status)
CREATE INDEX IF NOT EXISTS idx_test_tasks_instance_status  ON test_tasks(equipment_instance_id, status);
CREATE INDEX IF NOT EXISTS idx_test_tasks_assigned_to      ON test_tasks(assigned_to);

-- test_records / nameplate_records are joined back to their parent task/instance
CREATE INDEX IF NOT EXISTS idx_test_records_task          ON test_records(test_task_id);
CREATE INDEX IF NOT EXISTS idx_nameplate_records_instance ON nameplate_records(equipment_instance_id);

-- project_test_scope: composite covers both tenant lookup and the type filter
CREATE INDEX IF NOT EXISTS idx_project_test_scope_project  ON project_test_scope(project_id, equipment_type);
CREATE INDEX IF NOT EXISTS idx_scope_items_project         ON scope_items(project_id);

-- instruments: tenant lookup
CREATE INDEX IF NOT EXISTS idx_instruments_company        ON instruments(company_id);
