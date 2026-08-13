-- =============================================================================
-- Structured billing errors — resource limit status functions
-- =============================================================================
-- find_cheapest_plan_for: given a resource ('users'|'projects') and a
-- required count, returns the slug of the cheapest public plan whose
-- limit for that resource is NULL (unlimited) or >= the required count.
-- Used to tell a blocked user which plan would unblock them.
CREATE OR REPLACE FUNCTION find_cheapest_plan_for(_resource TEXT, _required_count INT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT slug FROM plans
  WHERE is_public = TRUE AND is_active = TRUE
    AND (
      (_resource = 'users' AND (max_users IS NULL OR max_users >= _required_count))
      OR
      (_resource = 'projects' AND (max_active_projects IS NULL OR max_active_projects >= _required_count))
    )
  ORDER BY monthly_price_inr ASC NULLS LAST
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION find_cheapest_plan_for(TEXT, INT) TO authenticated;

-- get_resource_limit_status: structured status for a resource, reusing
-- get_company_entitlements + the same live-count queries can_invite_user/
-- can_create_project use, so this never drifts from the real enforcement
-- logic in those two functions.
CREATE OR REPLACE FUNCTION get_resource_limit_status(_resource TEXT, _company_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_company UUID := COALESCE(_company_id, my_company_id());
  entitlements JSONB;
  lim INT;
  cur INT;
  required_slug TEXT;
BEGIN
  IF _company_id IS NOT NULL AND _company_id != my_company_id() THEN
    RAISE EXCEPTION 'Not authorized to check limits for this company';
  END IF;

  IF target_company IS NULL OR _resource NOT IN ('users', 'projects') THEN
    RETURN jsonb_build_object('allowed', false, 'resource', _resource, 'current', 0, 'limit', 0, 'required_plan', NULL);
  END IF;

  entitlements := get_company_entitlements(target_company);

  IF _resource = 'users' THEN
    lim := (entitlements->>'max_users')::INT;
    SELECT COUNT(*) INTO cur FROM profiles WHERE company_id = target_company AND is_active = TRUE;
  ELSE
    lim := (entitlements->>'max_active_projects')::INT;
    SELECT COUNT(*) INTO cur FROM projects WHERE company_id = target_company AND status != 'CLOSED' AND deleted_at IS NULL;
  END IF;

  IF lim IS NULL THEN
    RETURN jsonb_build_object('allowed', true, 'resource', _resource, 'current', cur, 'limit', NULL, 'required_plan', NULL);
  END IF;

  IF cur < lim THEN
    RETURN jsonb_build_object('allowed', true, 'resource', _resource, 'current', cur, 'limit', lim, 'required_plan', NULL);
  END IF;

  required_slug := find_cheapest_plan_for(_resource, cur + 1);

  RETURN jsonb_build_object(
    'allowed', false,
    'resource', _resource,
    'current', cur,
    'limit', lim,
    'required_plan', required_slug
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_resource_limit_status(TEXT, UUID) TO authenticated;
