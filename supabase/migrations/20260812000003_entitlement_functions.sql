-- =============================================================================
-- Task 3: Entitlement Resolution Functions
-- =============================================================================
-- Adds three functions to resolve company entitlements and check capability limits:
-- - get_company_entitlements: Resolves plan from subscription or trial status
-- - can_invite_user: Checks if company can add more users
-- - can_create_project: Checks if company can create more active projects

-- =============================================================================
-- get_company_entitlements(_company_id UUID DEFAULT NULL) RETURNS JSONB
-- =============================================================================
-- Resolves the effective plan and feature flags for a company.
--
-- Logic:
-- 1. If company has a subscription with status IN ('trialing', 'active', 'past_due'),
--    use that plan's ID.
-- 2. Otherwise, check if company.trial_ends_at > NOW() (active trial):
--    - If trial active: use 'professional' plan
--    - If trial expired: use 'starter' plan
-- 3. Return JSONB with plan_slug, plan_name, max_users, max_active_projects,
--    is_custom, and features (JSONB mapping feature_key → enabled).

CREATE OR REPLACE FUNCTION get_company_entitlements(_company_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_company UUID := COALESCE(_company_id, my_company_id());
  resolved_plan_id UUID;
  trial_active BOOLEAN;
  result JSONB;
BEGIN
  IF target_company IS NULL THEN
    RETURN '{}'::JSONB;
  END IF;

  -- 1. Check for active subscription
  SELECT s.plan_id INTO resolved_plan_id
  FROM subscriptions s
  WHERE s.company_id = target_company
    AND s.status IN ('trialing', 'active', 'past_due')
  LIMIT 1;

  -- 2. If no subscription, resolve from trial status
  IF resolved_plan_id IS NULL THEN
    SELECT (trial_ends_at IS NOT NULL AND trial_ends_at > NOW())
      INTO trial_active
      FROM companies WHERE id = target_company;

    SELECT id INTO resolved_plan_id
    FROM plans
    WHERE slug = CASE WHEN trial_active THEN 'professional' ELSE 'starter' END;
  END IF;

  -- 3. Build and return JSONB with plan details + features
  SELECT jsonb_build_object(
    'plan_slug', p.slug,
    'plan_name', p.name,
    'max_users', p.max_users,
    'max_active_projects', p.max_active_projects,
    'is_custom', p.is_custom,
    'features', COALESCE(
      (SELECT jsonb_object_agg(pf.feature_key, pf.enabled)
       FROM plan_features pf WHERE pf.plan_id = p.id),
      '{}'::JSONB
    )
  ) INTO result
  FROM plans p WHERE p.id = resolved_plan_id;

  RETURN COALESCE(result, '{}'::JSONB);
END;
$$;

GRANT EXECUTE ON FUNCTION get_company_entitlements(UUID) TO authenticated;


-- =============================================================================
-- can_invite_user(_company_id UUID DEFAULT NULL) RETURNS BOOLEAN
-- =============================================================================
-- Checks if the company can invite (add) another user.
--
-- Logic:
-- 1. Get company entitlements
-- 2. If max_users is NULL: return TRUE (unlimited)
-- 3. Count active profiles in company
-- 4. Return TRUE if count < max_users

CREATE OR REPLACE FUNCTION can_invite_user(_company_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_company UUID := COALESCE(_company_id, my_company_id());
  entitlements JSONB;
  max_users INT;
  current_users INT;
BEGIN
  IF target_company IS NULL THEN RETURN FALSE; END IF;

  entitlements := get_company_entitlements(target_company);
  max_users := (entitlements->>'max_users')::INT;
  IF max_users IS NULL THEN RETURN TRUE; END IF; -- unlimited

  SELECT COUNT(*) INTO current_users
  FROM profiles
  WHERE company_id = target_company AND is_active = TRUE;

  RETURN current_users < max_users;
END;
$$;

GRANT EXECUTE ON FUNCTION can_invite_user(UUID) TO authenticated;


-- =============================================================================
-- can_create_project(_company_id UUID DEFAULT NULL) RETURNS BOOLEAN
-- =============================================================================
-- Checks if the company can create another active project.
--
-- Logic:
-- 1. Get company entitlements
-- 2. If max_active_projects is NULL: return TRUE (unlimited)
-- 3. Count non-CLOSED, non-soft-deleted projects in company
-- 4. Return TRUE if count < max_active_projects

CREATE OR REPLACE FUNCTION can_create_project(_company_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_company UUID := COALESCE(_company_id, my_company_id());
  entitlements JSONB;
  max_projects INT;
  current_projects INT;
BEGIN
  IF target_company IS NULL THEN RETURN FALSE; END IF;

  entitlements := get_company_entitlements(target_company);
  max_projects := (entitlements->>'max_active_projects')::INT;
  IF max_projects IS NULL THEN RETURN TRUE; END IF; -- unlimited

  SELECT COUNT(*) INTO current_projects
  FROM projects
  WHERE company_id = target_company
    AND status != 'CLOSED'
    AND deleted_at IS NULL;

  RETURN current_projects < max_projects;
END;
$$;

GRANT EXECUTE ON FUNCTION can_create_project(UUID) TO authenticated;
