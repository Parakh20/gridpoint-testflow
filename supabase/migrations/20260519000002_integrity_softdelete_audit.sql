-- =============================================================================
-- Migration: Data-integrity + soft delete + audit-log triggers
-- =============================================================================


-- =============================================================================
-- 1. SCOPE QUANTITY BOUNDS
-- =============================================================================
-- Prevents an accidental "9999" typo from generating 46k test_tasks.

ALTER TABLE scope_items
  DROP CONSTRAINT IF EXISTS scope_items_quantity_bounds;

ALTER TABLE scope_items
  ADD CONSTRAINT scope_items_quantity_bounds
  CHECK (quantity > 0 AND quantity <= 500);


-- =============================================================================
-- 2. SOFT DELETE
-- =============================================================================
-- Adds deleted_at to the three tables you chose (projects, equipment_instances,
-- test_records) and rewrites RLS SELECT policies to filter them out by default.
-- SUPERADMINs can see deleted rows so they can restore.

ALTER TABLE projects            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE equipment_instances ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE test_records        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_projects_deleted_at            ON projects(deleted_at);
CREATE INDEX IF NOT EXISTS idx_equipment_instances_deleted_at ON equipment_instances(deleted_at);
CREATE INDEX IF NOT EXISTS idx_test_records_deleted_at        ON test_records(deleted_at);


-- Rewrite SELECT policies to hide soft-deleted rows from non-SUPERADMINs

DROP POLICY IF EXISTS "projects_select_same_company" ON projects;
CREATE POLICY "projects_select_same_company"
  ON projects FOR SELECT
  TO authenticated
  USING (
    company_id = my_company_id()
    AND (deleted_at IS NULL OR has_role(auth.uid(), 'SUPERADMIN'))
  );

DROP POLICY IF EXISTS "equipment_instances_select_same_company" ON equipment_instances;
CREATE POLICY "equipment_instances_select_same_company"
  ON equipment_instances FOR SELECT
  TO authenticated
  USING (
    project_id IN (SELECT id FROM projects WHERE company_id = my_company_id())
    AND (deleted_at IS NULL OR has_role(auth.uid(), 'SUPERADMIN'))
  );

DROP POLICY IF EXISTS "test_records_select_same_company" ON test_records;
CREATE POLICY "test_records_select_same_company"
  ON test_records FOR SELECT
  TO authenticated
  USING (
    test_task_id IN (
      SELECT tt.id FROM test_tasks tt
      JOIN equipment_instances ei ON ei.id = tt.equipment_instance_id
      JOIN projects p ON p.id = ei.project_id
      WHERE p.company_id = my_company_id()
    )
    AND (deleted_at IS NULL OR has_role(auth.uid(), 'SUPERADMIN'))
  );


-- Restore RPC — SUPERADMIN-only, undeletes a project and cascades to its
-- equipment instances. Test records stay deleted unless explicitly restored.
CREATE OR REPLACE FUNCTION restore_project(_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
  proj_company UUID;
BEGIN
  SELECT has_role(auth.uid(), 'SUPERADMIN') INTO is_admin;
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only SUPERADMIN can restore projects';
  END IF;

  SELECT company_id INTO proj_company FROM projects WHERE id = _project_id;
  IF proj_company IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;
  IF proj_company != my_company_id() THEN
    RAISE EXCEPTION 'Cannot restore project from another company';
  END IF;

  UPDATE projects SET deleted_at = NULL WHERE id = _project_id;
  UPDATE equipment_instances SET deleted_at = NULL WHERE project_id = _project_id;

  RETURN jsonb_build_object('restored', TRUE);
END;
$$;

GRANT EXECUTE ON FUNCTION restore_project(UUID) TO authenticated;


-- =============================================================================
-- 3. AUDIT LOG TRIGGERS
-- =============================================================================
-- App-level audit calls can be skipped on crash. DB triggers can't. Triggers
-- run AFTER the mutation in the same transaction, so audit + change atomic.

CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id  UUID := auth.uid();
  comp_id   UUID;
  before_v  JSONB;
  after_v   JSONB;
BEGIN
  -- Resolve company_id from the row (or from the actor's profile as fallback)
  IF TG_OP = 'DELETE' THEN
    comp_id := COALESCE(
      (to_jsonb(OLD)->>'company_id')::UUID,
      (SELECT p.company_id FROM projects p
       WHERE p.id = COALESCE((to_jsonb(OLD)->>'project_id')::UUID, NULL)),
      (SELECT company_id FROM profiles WHERE id = actor_id)
    );
    before_v := to_jsonb(OLD);
    after_v  := NULL;
  ELSE
    comp_id := COALESCE(
      (to_jsonb(NEW)->>'company_id')::UUID,
      (SELECT p.company_id FROM projects p
       WHERE p.id = COALESCE((to_jsonb(NEW)->>'project_id')::UUID, NULL)),
      (SELECT company_id FROM profiles WHERE id = actor_id)
    );
    before_v := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END;
    after_v  := to_jsonb(NEW);
  END IF;

  -- Skip audit rows whose company can't be resolved (e.g. system seed inserts)
  IF comp_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO audit_logs (company_id, actor_id, action, table_name, record_id, before, after)
  VALUES (
    comp_id,
    actor_id,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(
      (to_jsonb(COALESCE(NEW, OLD))->>'id')::UUID,
      uuid_nil()
    ),
    before_v,
    after_v
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;


-- Attach triggers to the 5 most important tables
DROP TRIGGER IF EXISTS trg_audit_projects            ON projects;
CREATE TRIGGER trg_audit_projects
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_equipment_instances ON equipment_instances;
CREATE TRIGGER trg_audit_equipment_instances
  AFTER INSERT OR UPDATE OR DELETE ON equipment_instances
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_test_tasks          ON test_tasks;
CREATE TRIGGER trg_audit_test_tasks
  AFTER UPDATE OR DELETE ON test_tasks
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_test_records        ON test_records;
CREATE TRIGGER trg_audit_test_records
  AFTER INSERT OR UPDATE OR DELETE ON test_records
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS trg_audit_user_roles          ON user_roles;
CREATE TRIGGER trg_audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION log_audit_event();


-- =============================================================================
-- 4. PROJECT CLONE RPC
-- =============================================================================
-- Lets a GM duplicate a project's scope + test selections into a new DRAFT
-- project. Equipment instances and test records are NOT cloned — that's the
-- whole point of templates: re-use the structure, do the work fresh.

CREATE OR REPLACE FUNCTION clone_project(
  _source_project_id UUID,
  _new_project_number TEXT,
  _new_site_name TEXT,
  _new_site_address TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  source RECORD;
  new_id UUID;
BEGIN
  -- Auth: GM or SUPERADMIN
  IF NOT (has_role(auth.uid(), 'GM') OR has_role(auth.uid(), 'SUPERADMIN')) THEN
    RAISE EXCEPTION 'Only GM or SUPERADMIN can clone projects';
  END IF;

  -- Tenant isolation: source must be in caller's company
  SELECT * INTO source FROM projects
    WHERE id = _source_project_id AND company_id = my_company_id();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source project not found or not in your company';
  END IF;

  INSERT INTO projects (
    project_number, site_name, site_address, client,
    status, created_by, company_id
  )
  VALUES (
    _new_project_number,
    _new_site_name,
    _new_site_address,
    source.client,
    'DRAFT',
    auth.uid(),
    source.company_id
  )
  RETURNING id INTO new_id;

  -- Copy scope_items
  INSERT INTO scope_items (project_id, equipment_type, quantity)
  SELECT new_id, equipment_type, quantity
  FROM scope_items WHERE project_id = _source_project_id;

  -- Copy project_test_scope selections
  INSERT INTO project_test_scope (project_id, equipment_type, test_template_id, is_enabled)
  SELECT new_id, equipment_type, test_template_id, is_enabled
  FROM project_test_scope WHERE project_id = _source_project_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION clone_project(UUID, TEXT, TEXT, TEXT) TO authenticated;
