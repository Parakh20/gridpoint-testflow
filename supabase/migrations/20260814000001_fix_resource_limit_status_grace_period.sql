-- =============================================================================
-- Bug fix: get_resource_limit_status() ignores past-due grace expiry
-- =============================================================================
-- Found while writing the billing QA test matrix (see docs/dev/BILLING_QA_MATRIX.md
-- scenario 5). CLAUDE.md's "Past-due grace period" section documents that once
-- `is_past_due_grace_expired()` is true, both `can_invite_user()` and
-- `can_create_project()` block new writes. `can_create_project()` is correctly
-- wired into the `projects` INSERT RLS policy (20260812000004_project_limit_rls.sql)
-- and does carry the grace check (20260813000004_past_due_grace_period.sql).
--
-- `can_invite_user()` also carries the grace check, but nothing calls it: the
-- `create-user` Edge Function (the only seat-gating gate for new users — there
-- is no RLS INSERT policy on `profiles`, since profiles are created via the
-- auth.users trigger, not a direct client INSERT) calls
-- `get_resource_limit_status('users', ...)` instead, which was written
-- (20260813000006_resource_limit_status.sql) as a parallel implementation of
-- the same seat-counting logic but never picked up the grace-period check
-- added a migration later (20260813000004 predates it chronologically, but
-- 20260813000006's author didn't mirror the check). Net effect: after a
-- company's past_due grace period expires, GM/SUPERADMIN can still invite new
-- users through create-user even though can_invite_user() — and the feature
-- as documented — says they should not be able to.
--
-- Fix: add the same `is_past_due_grace_expired()` short-circuit that
-- can_invite_user()/can_create_project() already have, before computing the
-- allowed/current/limit response. Project-resource behavior is unchanged
-- (RLS already enforces it independently); this only changes the 'users'
-- branch's outcome once grace has expired.
-- =============================================================================

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

  -- Past-due grace expired: block regardless of remaining headroom, mirroring
  -- can_invite_user()/can_create_project() (spec §19). required_plan is left
  -- NULL here (same as those two functions returning a flat FALSE) — a plan
  -- upgrade doesn't fix an unpaid invoice, so we don't suggest one.
  IF is_past_due_grace_expired(target_company) THEN
    RETURN jsonb_build_object('allowed', false, 'resource', _resource, 'current', cur, 'limit', lim, 'required_plan', NULL);
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
