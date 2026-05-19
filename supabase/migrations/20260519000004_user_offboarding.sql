-- =============================================================================
-- Migration: User offboarding — safe deactivation with ownership transfer
-- =============================================================================
-- When a SUPERADMIN deactivates or deletes a user, their owned projects and
-- assigned equipment instances are at risk of becoming orphaned. This RPC
-- transfers ownership BEFORE deactivation so no work is lost.


-- Find work owned by a user — call this from the UI to show what will be
-- transferred before the SUPERADMIN confirms.
CREATE OR REPLACE FUNCTION user_workload_summary(_user_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'projects_created', (
      SELECT COUNT(*) FROM projects
      WHERE created_by = _user_id
        AND deleted_at IS NULL
        AND company_id = my_company_id()
    ),
    'projects_assigned', (
      SELECT COUNT(*) FROM projects
      WHERE assigned_to = _user_id
        AND deleted_at IS NULL
        AND company_id = my_company_id()
    ),
    'equipment_assigned', (
      SELECT COUNT(*) FROM equipment_instances ei
      JOIN projects p ON p.id = ei.project_id
      WHERE ei.assigned_to = _user_id
        AND ei.deleted_at IS NULL
        AND p.company_id = my_company_id()
    ),
    'test_tasks_assigned', (
      SELECT COUNT(*) FROM test_tasks tt
      JOIN equipment_instances ei ON ei.id = tt.equipment_instance_id
      JOIN projects p ON p.id = ei.project_id
      WHERE tt.assigned_to = _user_id
        AND p.company_id = my_company_id()
    )
  );
$$;

GRANT EXECUTE ON FUNCTION user_workload_summary(UUID) TO authenticated;


-- Transfer all work owned by _from_user to _to_user, then deactivate _from_user.
-- Atomic — if any step fails, nothing changes.
CREATE OR REPLACE FUNCTION offboard_user(
  _from_user UUID,
  _to_user UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  caller_company UUID;
  from_company UUID;
  to_company UUID;
  transferred_projects INT := 0;
  transferred_assignments INT := 0;
  transferred_equipment INT := 0;
  transferred_tasks INT := 0;
BEGIN
  -- Auth: only SUPERADMIN can offboard
  IF NOT has_role(auth.uid(), 'SUPERADMIN') THEN
    RAISE EXCEPTION 'Only SUPERADMIN can offboard users';
  END IF;

  IF _from_user = _to_user THEN
    RAISE EXCEPTION 'Cannot transfer ownership to the same user';
  END IF;

  caller_company := my_company_id();
  SELECT company_id INTO from_company FROM profiles WHERE id = _from_user;
  SELECT company_id INTO to_company   FROM profiles WHERE id = _to_user;

  IF from_company IS NULL OR to_company IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  IF from_company != caller_company OR to_company != caller_company THEN
    RAISE EXCEPTION 'Both users must belong to your company';
  END IF;

  -- Transfer ownership
  WITH upd AS (
    UPDATE projects SET created_by = _to_user
    WHERE created_by = _from_user AND company_id = caller_company AND deleted_at IS NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO transferred_projects FROM upd;

  WITH upd AS (
    UPDATE projects SET assigned_to = _to_user
    WHERE assigned_to = _from_user AND company_id = caller_company AND deleted_at IS NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO transferred_assignments FROM upd;

  WITH upd AS (
    UPDATE equipment_instances ei SET assigned_to = _to_user
    FROM projects p
    WHERE ei.project_id = p.id
      AND p.company_id = caller_company
      AND ei.assigned_to = _from_user
      AND ei.deleted_at IS NULL
    RETURNING 1
  )
  SELECT COUNT(*) INTO transferred_equipment FROM upd;

  WITH upd AS (
    UPDATE test_tasks tt SET assigned_to = _to_user
    FROM equipment_instances ei, projects p
    WHERE tt.equipment_instance_id = ei.id
      AND ei.project_id = p.id
      AND p.company_id = caller_company
      AND tt.assigned_to = _from_user
    RETURNING 1
  )
  SELECT COUNT(*) INTO transferred_tasks FROM upd;

  -- Deactivate the offboarded user (keeps audit trail intact; better than DELETE)
  UPDATE profiles SET is_active = FALSE WHERE id = _from_user;

  RETURN jsonb_build_object(
    'transferred_projects',    transferred_projects,
    'transferred_assignments', transferred_assignments,
    'transferred_equipment',   transferred_equipment,
    'transferred_tasks',       transferred_tasks,
    'deactivated_user',        _from_user
  );
END;
$$;

GRANT EXECUTE ON FUNCTION offboard_user(UUID, UUID) TO authenticated;
