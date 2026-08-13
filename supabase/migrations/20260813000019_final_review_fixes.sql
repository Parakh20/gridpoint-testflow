-- =============================================================================
-- Final whole-branch review fixes (8-plan billing series)
-- =============================================================================
-- Addresses issues found in a post-merge review across Plans 1-8 together.

-- -----------------------------------------------------------------------------
-- Fix 6 (CRITICAL for writes, leak for reads): the cross-tenant guard
-- `_company_id IS NOT NULL AND _company_id != my_company_id()` evaluates to
-- NULL (not TRUE) whenever my_company_id() is NULL, so it never fires —
-- not only for the intended service-role path (auth.uid() NULL, safe to
-- trust the caller-supplied _company_id) but ALSO for an authenticated user
-- whose own profiles.company_id happens to be NULL (CLAUDE.md gotcha 5: a
-- brief window between the auth trigger and create-user; permanent for any
-- user whose company assignment failed). Such a caller could pass an
-- arbitrary other company's UUID and read/mutate that company's data.
--
-- Fix: only trust a NULL my_company_id() when the caller is NOT an
-- authenticated user (auth.uid() IS NULL — service-role/no-session). For a
-- real authenticated session, NULL my_company_id() must be treated as a
-- mismatch, not a pass-through.
-- =============================================================================

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
  IF _company_id IS NOT NULL AND auth.uid() IS NOT NULL
     AND (my_company_id() IS NULL OR _company_id != my_company_id()) THEN
    RAISE EXCEPTION 'Not authorized to view entitlements for this company';
  END IF;

  IF target_company IS NULL THEN
    RETURN '{}'::JSONB;
  END IF;

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
      WHEN company_trial_ends_at > NOW() THEN 'trial'
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
  IF _company_id IS NOT NULL AND auth.uid() IS NOT NULL
     AND (my_company_id() IS NULL OR _company_id != my_company_id()) THEN
    RAISE EXCEPTION 'Not authorized to check entitlements for this company';
  END IF;

  IF target_company IS NULL THEN RETURN FALSE; END IF;

  IF is_past_due_grace_expired(target_company) THEN RETURN FALSE; END IF;

  entitlements := get_company_entitlements(target_company);
  max_users := (entitlements->>'max_users')::INT;
  IF max_users IS NULL THEN RETURN TRUE; END IF;

  SELECT COUNT(*) INTO current_users
  FROM profiles
  WHERE company_id = target_company AND is_active = TRUE;

  RETURN current_users < max_users;
END;
$$;

GRANT EXECUTE ON FUNCTION can_invite_user(UUID) TO authenticated;

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
  IF _company_id IS NOT NULL AND auth.uid() IS NOT NULL
     AND (my_company_id() IS NULL OR _company_id != my_company_id()) THEN
    RAISE EXCEPTION 'Not authorized to check entitlements for this company';
  END IF;

  IF target_company IS NULL THEN RETURN FALSE; END IF;

  IF is_past_due_grace_expired(target_company) THEN RETURN FALSE; END IF;

  entitlements := get_company_entitlements(target_company);
  max_projects := (entitlements->>'max_active_projects')::INT;
  IF max_projects IS NULL THEN RETURN TRUE; END IF;

  SELECT COUNT(*) INTO current_projects
  FROM projects
  WHERE company_id = target_company
    AND status != 'CLOSED'
    AND deleted_at IS NULL;

  RETURN current_projects < max_projects;
END;
$$;

GRANT EXECUTE ON FUNCTION can_create_project(UUID) TO authenticated;

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
  IF _company_id IS NOT NULL AND auth.uid() IS NOT NULL
     AND (my_company_id() IS NULL OR _company_id != my_company_id()) THEN
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
  IF _company_id IS NOT NULL AND auth.uid() IS NOT NULL
     AND (my_company_id() IS NULL OR _company_id != my_company_id()) THEN
    RAISE EXCEPTION 'Not authorized to view usage for this company';
  END IF;

  IF target_company IS NULL THEN
    RETURN '{}'::JSONB;
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

-- -----------------------------------------------------------------------------
-- Fix 7 (minor, layered into this rewrite anyway): check_plan_downgrade_
-- feasibility read raw plans.max_users/max_active_projects, bypassing the
-- enterprise-contract/addon layering get_company_entitlements applies. A
-- company with addons could be told a downgrade is infeasible when their
-- real effective post-downgrade limit (base target plan + their own addons,
-- or their contract if they have one) would actually fit. Mirror the same
-- contract-override / addon-delta layering as get_company_entitlements,
-- applied to the TARGET plan's base numbers instead of the current plan's.
-- -----------------------------------------------------------------------------

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
  contract RECORD;
  addon_extra_users INT;
  addon_extra_projects INT;
  current_users INT;
  current_projects INT;
  blockers JSONB := '[]'::JSONB;
BEGIN
  IF _company_id IS NOT NULL AND auth.uid() IS NOT NULL
     AND (my_company_id() IS NULL OR _company_id != my_company_id()) THEN
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

  -- An active enterprise contract overrides ANY plan's limits (post-
  -- downgrade too — the contract doesn't care what plan_id sits under it).
  SELECT * INTO contract
  FROM enterprise_contracts
  WHERE company_id = target_company
    AND contract_start <= NOW()
    AND (contract_end IS NULL OR contract_end >= NOW())
  ORDER BY contract_start DESC
  LIMIT 1;

  IF FOUND THEN
    target_max_users := contract.max_users;
    target_max_projects := contract.max_active_projects;
  END IF;

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

  target_max_users := target_max_users + addon_extra_users;
  target_max_projects := target_max_projects + addon_extra_projects;

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

CREATE OR REPLACE FUNCTION request_subscription_cancellation(_company_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_company UUID := COALESCE(_company_id, my_company_id());
  caller UUID := auth.uid();
  period_end TIMESTAMPTZ;
BEGIN
  IF _company_id IS NOT NULL AND auth.uid() IS NOT NULL
     AND (my_company_id() IS NULL OR _company_id != my_company_id()) THEN
    RAISE EXCEPTION 'Not authorized to manage subscription for this company';
  END IF;

  IF target_company IS NULL THEN
    RAISE EXCEPTION 'No company context';
  END IF;

  IF NOT (has_role(caller, 'GM') OR has_role(caller, 'SUPERADMIN')) THEN
    RAISE EXCEPTION 'Only GM or SUPERADMIN can cancel the subscription';
  END IF;

  SELECT current_period_end INTO period_end
    FROM subscriptions WHERE company_id = target_company;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No subscription found for this company';
  END IF;

  UPDATE subscriptions
    SET cancel_at = COALESCE(cancel_at, period_end),
        updated_at = NOW()
    WHERE company_id = target_company;

  RETURN jsonb_build_object('cancelled_at_period_end', TRUE, 'cancel_at', period_end);
END;
$$;

GRANT EXECUTE ON FUNCTION request_subscription_cancellation(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- Fix 1 (CRITICAL): request_plan_downgrade never checked that the target
-- plan is actually cheaper than the current one — check_plan_downgrade_
-- feasibility only checks that current USAGE fits the target's limits,
-- which an unlimited/custom plan (e.g. enterprise) always satisfies. A
-- caller with the RPC's authenticated GRANT could self-service upgrade to
-- Enterprise for free by calling this "downgrade" RPC with an Enterprise
-- plan id (readable via the public plans_public_read policy).
--
-- Fix: require the target plan to be is_public (excludes internal-only
-- 'trial') and priced strictly lower than the company's current plan. A
-- current plan with NULL (custom) pricing may downgrade to any public
-- priced plan; a target with NULL (custom) pricing can never be reached
-- through this self-service RPC — custom/enterprise plans are assigned via
-- enterprise_contracts or platform-admin action, not this RPC.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION request_plan_downgrade(
  _company_id UUID DEFAULT NULL,
  _target_plan_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_company UUID := COALESCE(_company_id, my_company_id());
  caller UUID := auth.uid();
  feasibility JSONB;
  current_price NUMERIC(12,2);
  target_price NUMERIC(12,2);
  target_is_public BOOLEAN;
BEGIN
  IF _company_id IS NOT NULL AND auth.uid() IS NOT NULL
     AND (my_company_id() IS NULL OR _company_id != my_company_id()) THEN
    RAISE EXCEPTION 'Not authorized to manage subscription for this company';
  END IF;

  IF target_company IS NULL OR _target_plan_id IS NULL THEN
    RAISE EXCEPTION 'Company and target plan are required';
  END IF;

  IF NOT (has_role(caller, 'GM') OR has_role(caller, 'SUPERADMIN')) THEN
    RAISE EXCEPTION 'Only GM or SUPERADMIN can change the subscription plan';
  END IF;

  SELECT p.monthly_price_inr INTO current_price
  FROM subscriptions s
  JOIN plans p ON p.id = s.plan_id
  WHERE s.company_id = target_company;

  SELECT monthly_price_inr, is_public INTO target_price, target_is_public
  FROM plans WHERE id = _target_plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown target plan';
  END IF;

  IF NOT target_is_public THEN
    RAISE EXCEPTION 'Target plan is not available for self-service plan changes';
  END IF;

  IF target_price IS NULL THEN
    RAISE EXCEPTION 'Target plan requires custom pricing — contact sales instead of self-service downgrade';
  END IF;

  IF current_price IS NOT NULL AND target_price >= current_price THEN
    RAISE EXCEPTION 'Target plan must be a lower-priced plan than the current plan';
  END IF;

  feasibility := check_plan_downgrade_feasibility(target_company, _target_plan_id);

  IF NOT (feasibility->>'feasible')::BOOLEAN THEN
    RETURN jsonb_build_object('scheduled', FALSE, 'blockers', feasibility->'blockers');
  END IF;

  UPDATE subscriptions
    SET pending_plan_id = _target_plan_id,
        pending_plan_requested_at = NOW(),
        updated_at = NOW()
    WHERE company_id = target_company;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No subscription found for this company';
  END IF;

  RETURN jsonb_build_object('scheduled', TRUE, 'blockers', '[]'::JSONB);
END;
$$;

GRANT EXECUTE ON FUNCTION request_plan_downgrade(UUID, UUID) TO authenticated;
