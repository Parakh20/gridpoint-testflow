CREATE OR REPLACE FUNCTION check_plan_downgrade_feasibility(
  _company_id UUID DEFAULT NULL,
  _target_plan_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_company UUID := COALESCE(_company_id, my_company_id());
  target_max_users INT;
  target_max_projects INT;
  current_users INT;
  current_projects INT;
  blockers JSONB := '[]'::JSONB;
BEGIN
  -- Same cross-tenant guard as get_company_entitlements/can_invite_user/
  -- can_create_project (Plan 1 Task 3) — my_company_id() is NULL for
  -- service-role callers, so this never fires for the Edge Function path.
  IF _company_id IS NOT NULL AND _company_id != my_company_id() THEN
    RAISE EXCEPTION 'Not authorized to check downgrade feasibility for this company';
  END IF;

  IF target_company IS NULL OR _target_plan_id IS NULL THEN
    RETURN jsonb_build_object('feasible', FALSE, 'blockers', '[]'::JSONB);
  END IF;

  SELECT max_users, max_active_projects
    INTO target_max_users, target_max_projects
    FROM plans WHERE id = _target_plan_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('feasible', FALSE, 'blockers', '[]'::JSONB);
  END IF;

  SELECT COUNT(*) INTO current_users
    FROM profiles WHERE company_id = target_company AND is_active = TRUE;

  SELECT COUNT(*) INTO current_projects
    FROM projects
    WHERE company_id = target_company AND status != 'CLOSED' AND deleted_at IS NULL;

  IF target_max_users IS NOT NULL AND current_users > target_max_users THEN
    blockers := blockers || jsonb_build_object(
      'resource', 'users', 'current', current_users, 'target_limit', target_max_users
    );
  END IF;

  IF target_max_projects IS NOT NULL AND current_projects > target_max_projects THEN
    blockers := blockers || jsonb_build_object(
      'resource', 'active_projects', 'current', current_projects, 'target_limit', target_max_projects
    );
  END IF;

  RETURN jsonb_build_object('feasible', jsonb_array_length(blockers) = 0, 'blockers', blockers);
END;
$$;

GRANT EXECUTE ON FUNCTION check_plan_downgrade_feasibility(UUID, UUID) TO authenticated;
