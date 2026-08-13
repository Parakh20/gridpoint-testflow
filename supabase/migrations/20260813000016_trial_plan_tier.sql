-- Guided-trial tier: 5 users / 1 active project, per spec §27. Not public —
-- this is an internal resolution target for get_company_entitlements(),
-- never shown on the pricing page or purchasable directly.
INSERT INTO plans (slug, name, description, monthly_price_inr, annual_price_inr, max_users, max_active_projects, is_custom, is_public)
VALUES
  ('trial', 'Guided Trial', '14-day guided trial — limited scope to help you evaluate TestFlow.', NULL, NULL, 5, 1, FALSE, FALSE)
ON CONFLICT (slug) DO NOTHING;

-- Trial gets the same core feature access as Starter (offline mobile, audit
-- trail) but not the paid-tier extras — mirrors Starter's feature grid from
-- 20260812000001_plans_and_plan_features.sql exactly, so a trial user's
-- feature set matches what they'd get on Starter (the plan they're most
-- likely to convert to).
INSERT INTO plan_features (plan_id, feature_key, enabled)
SELECT p.id, f.feature_key, f.enabled
FROM plans p
CROSS JOIN LATERAL (
  VALUES
    ('offline_mobile', TRUE),
    ('audit_trail', TRUE),
    ('api_access', FALSE),
    ('sso', FALSE),
    ('multiple_sites', FALSE),
    ('custom_workflows', FALSE),
    ('advanced_reports', FALSE),
    ('advanced_approvals', FALSE)
) AS f(feature_key, enabled)
WHERE p.slug = 'trial'
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- Change only the active-trial branch of get_company_entitlements() to
-- resolve to the new 'trial' tier instead of 'professional'. The
-- trial-expired branch (-> starter) and the no-trial-data grandfathered
-- branch (-> enterprise, from Plan 1's fix wave) are unchanged.
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
  result JSONB;
BEGIN
  IF _company_id IS NOT NULL AND _company_id != my_company_id() THEN
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
      WHEN company_trial_ends_at IS NULL THEN 'enterprise'       -- grandfathered, unlimited (unchanged)
      WHEN company_trial_ends_at > NOW() THEN 'trial'            -- active trial -> new restrictive tier (CHANGED from 'professional')
      ELSE 'starter'                                             -- trial expired (unchanged)
    END;

    SELECT id INTO resolved_plan_id
    FROM plans
    WHERE slug = fallback_slug;
  END IF;

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
