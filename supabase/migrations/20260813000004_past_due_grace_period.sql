-- =============================================================================
-- Task 6: Past-Due Grace Period
-- =============================================================================
-- Past-due grace period: a subscription in 'past_due' status keeps full
-- access for GRACE_PERIOD_DAYS after its current_period_end (the date
-- payment was due), then new user/project creation is blocked until
-- payment succeeds (status flips back to 'active') or the subscription is
-- cancelled. Existing users/projects remain fully readable — this function
-- is only called from INSERT-path checks (RLS WITH CHECK, create-user),
-- never from a SELECT policy, so read access is never touched by this change.
CREATE OR REPLACE FUNCTION is_past_due_grace_expired(_company_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  GRACE_PERIOD_DAYS CONSTANT INT := 7;
  sub_status TEXT;
  period_end TIMESTAMPTZ;
BEGIN
  SELECT status, current_period_end INTO sub_status, period_end
  FROM subscriptions WHERE company_id = _company_id;

  IF sub_status IS DISTINCT FROM 'past_due' THEN
    RETURN FALSE; -- not past_due at all, grace period is irrelevant
  END IF;

  IF period_end IS NULL THEN
    RETURN FALSE; -- no period_end on record, can't compute grace window — fail open on this specific unknown, not the whole check (see Global Constraints in the plan doc: this is a narrow, intentional exception justified by "unknown state shouldn't lock out a real customer over a data gap")
  END IF;

  RETURN NOW() > period_end + (GRACE_PERIOD_DAYS || ' days')::INTERVAL;
END;
$$;

GRANT EXECUTE ON FUNCTION is_past_due_grace_expired(UUID) TO authenticated;


-- =============================================================================
-- can_invite_user(_company_id UUID DEFAULT NULL) RETURNS BOOLEAN
-- =============================================================================
-- Re-issued (CREATE OR REPLACE) from 20260812000003_entitlement_functions.sql
-- with one added check: once the past-due grace period has expired, block
-- new invites regardless of remaining seat headroom (spec §19).

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
  -- See get_company_entitlements() above for why this is safe for the
  -- service-role call path used by the create-user Edge Function (Task 5).
  IF _company_id IS NOT NULL AND _company_id != my_company_id() THEN
    RAISE EXCEPTION 'Not authorized to check entitlements for this company';
  END IF;

  IF target_company IS NULL THEN RETURN FALSE; END IF;

  IF is_past_due_grace_expired(target_company) THEN RETURN FALSE; END IF;

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
-- Re-issued (CREATE OR REPLACE) from 20260812000003_entitlement_functions.sql
-- with one added check: once the past-due grace period has expired, block
-- new project creation regardless of remaining project headroom (spec §19).

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
  -- See get_company_entitlements() above for why this is safe for the
  -- service-role call path used by the create-user Edge Function (Task 5).
  IF _company_id IS NOT NULL AND _company_id != my_company_id() THEN
    RAISE EXCEPTION 'Not authorized to check entitlements for this company';
  END IF;

  IF target_company IS NULL THEN RETURN FALSE; END IF;

  IF is_past_due_grace_expired(target_company) THEN RETURN FALSE; END IF;

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
