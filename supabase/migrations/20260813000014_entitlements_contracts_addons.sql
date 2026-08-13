-- Extends get_company_entitlements() to layer enterprise contract overrides
-- and subscription add-on deltas on top of the base plan resolution. The
-- cross-tenant guard and trial-fallback logic are unchanged from
-- 20260812000003_entitlement_functions.sql — only the JSONB-building tail
-- is replaced. can_invite_user()/can_create_project() need no changes:
-- they already call this function and read max_users/max_active_projects
-- from its result.

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
  company_trial_ends_at TIMESTAMPTZ;
  fallback_slug TEXT;
  base_slug TEXT;
  base_name TEXT;
  base_max_users INT;
  base_max_active_projects INT;
  base_is_custom BOOLEAN;
  base_features JSONB;
  contract RECORD;
  addon_extra_users INT;
  addon_extra_projects INT;
  effective_max_users INT;
  effective_max_active_projects INT;
  effective_is_custom BOOLEAN;
  effective_features JSONB;
BEGIN
  -- Cross-tenant guard — unchanged from 20260812000003.
  IF _company_id IS NOT NULL AND _company_id != my_company_id() THEN
    RAISE EXCEPTION 'Not authorized to view entitlements for this company';
  END IF;

  IF target_company IS NULL THEN
    RETURN '{}'::JSONB;
  END IF;

  -- 1. Resolve base plan (subscription -> plan, else trial fallback) —
  -- unchanged from 20260812000003.
  SELECT s.plan_id INTO resolved_plan_id
  FROM subscriptions s
  WHERE s.company_id = target_company
    AND s.status IN ('trialing', 'active', 'past_due')
  LIMIT 1;

  IF resolved_plan_id IS NULL THEN
    SELECT trial_ends_at INTO company_trial_ends_at
      FROM companies WHERE id = target_company;

    fallback_slug := CASE
      WHEN company_trial_ends_at IS NULL THEN 'enterprise'
      WHEN company_trial_ends_at > NOW() THEN 'professional'
      ELSE 'starter'
    END;

    SELECT id INTO resolved_plan_id
    FROM plans
    WHERE slug = fallback_slug;
  END IF;

  SELECT p.slug, p.name, p.max_users, p.max_active_projects, p.is_custom,
         COALESCE(
           (SELECT jsonb_object_agg(pf.feature_key, pf.enabled)
            FROM plan_features pf WHERE pf.plan_id = p.id),
           '{}'::JSONB
         )
    INTO base_slug, base_name, base_max_users, base_max_active_projects, base_is_custom, base_features
  FROM plans p WHERE p.id = resolved_plan_id;

  IF base_slug IS NULL THEN
    RETURN '{}'::JSONB;
  END IF;

  effective_max_users := base_max_users;
  effective_max_active_projects := base_max_active_projects;
  effective_is_custom := base_is_custom;
  effective_features := base_features;

  -- 2. Enterprise contract override: an active contract fully replaces the
  -- plan's numeric limits (its own NULL still means unlimited) and merges
  -- its custom_features on top (contract keys win on conflict).
  SELECT * INTO contract
  FROM enterprise_contracts
  WHERE company_id = target_company
    AND contract_start <= NOW()
    AND (contract_end IS NULL OR contract_end >= NOW())
  ORDER BY contract_start DESC
  LIMIT 1;

  IF FOUND THEN
    effective_max_users := contract.max_users;
    effective_max_active_projects := contract.max_active_projects;
    effective_is_custom := TRUE;
    effective_features := effective_features || contract.custom_features;
  END IF;

  -- 3. Add-on deltas: sum active numeric addons, add via plain SQL '+' so
  -- NULL (unlimited, from either the base plan or an enterprise contract
  -- override above) stays NULL — Postgres NULL-arithmetic does this for
  -- free, do not COALESCE the *limit* to a large number here, only
  -- COALESCE the SUM() itself (an empty SUM() is NULL, not 0).
  SELECT COALESCE(SUM(sa.quantity), 0) INTO addon_extra_users
  FROM subscription_addons sa
  JOIN subscriptions s ON s.id = sa.subscription_id
  WHERE s.company_id = target_company
    AND sa.addon_key = 'extra_users'
    AND sa.status = 'active';

  SELECT COALESCE(SUM(sa.quantity), 0) INTO addon_extra_projects
  FROM subscription_addons sa
  JOIN subscriptions s ON s.id = sa.subscription_id
  WHERE s.company_id = target_company
    AND sa.addon_key = 'extra_projects'
    AND sa.status = 'active';

  effective_max_users := effective_max_users + addon_extra_users;
  effective_max_active_projects := effective_max_active_projects + addon_extra_projects;

  -- Feature-flag addons: presence of an active row grants the feature,
  -- regardless of what the plan/contract said.
  SELECT effective_features || COALESCE(
    (SELECT jsonb_object_agg(sa.addon_key, TRUE)
     FROM subscription_addons sa
     JOIN subscriptions s ON s.id = sa.subscription_id
     WHERE s.company_id = target_company
       AND sa.status = 'active'
       AND sa.addon_key IN ('api_access', 'sso', 'dedicated_environment', 'priority_sla', 'custom_integration')),
    '{}'::JSONB
  ) INTO effective_features;

  RETURN jsonb_build_object(
    'plan_slug', base_slug,
    'plan_name', base_name,
    'max_users', effective_max_users,
    'max_active_projects', effective_max_active_projects,
    'is_custom', effective_is_custom,
    'features', effective_features
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_company_entitlements(UUID) TO authenticated;
