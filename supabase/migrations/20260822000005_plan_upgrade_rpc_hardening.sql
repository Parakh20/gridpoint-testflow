-- =============================================================================
-- Final whole-branch review fixes for the self-service plan upgrade feature
-- =============================================================================
-- Addresses findings raised once Tasks 1-6 were reviewed together. Per repo
-- convention (docs/dev/MIGRATIONS.md), the already-committed migration
-- 20260822000004_plan_upgrade_rpcs.sql is NOT edited — everything lands here.
--
-- C1: apply_plan_upgrade was GRANTed to `authenticated` with no
--     REVOKE ALL FROM PUBLIC and validated nothing about the target plan.
--     Any GM could call it straight from the browser console with the
--     anon-readable Enterprise plan id and grant themselves unlimited
--     access with zero charge. It is now service-role only (same posture
--     as upsert_subscription/upsert_order/flip_expired_cancellations), and
--     it re-runs the eligibility check itself as defense in depth so it is
--     not solely reliant on manage-subscription having already checked.
-- I1: check_plan_upgrade_eligibility had no REVOKE ALL FROM PUBLIC, so anon
--     could probe any company's plan/contract state via its distinct return
--     reasons. It stays authenticated-callable (the Edge Function and the
--     frontend both need it) but is no longer PUBLIC/anon-callable.
-- I2: apply_plan_upgrade's tenant guard used the NULL-unsafe predicate
--     (`_company_id != my_company_id()`). Now uses the NULL-safe shape its
--     sibling check_plan_upgrade_eligibility already uses.
-- I3: Razorpay's post-change current_period_start/end were discarded, so
--     cancel_at / grace-period math went stale after an immediate upgrade.
--     apply_plan_upgrade now accepts and writes them (COALESCE-guarded so a
--     null from the provider never clobbers a known-good value).
-- I4: apply_plan_upgrade did not advance subscriptions.last_event_at, so a
--     late-delivered but earlier-created webhook could pass
--     upsert_subscription's ordering guard (20260814000002) and silently
--     revert the plan the customer just paid for.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- I1: lock check_plan_upgrade_eligibility down to authenticated callers only.
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION check_plan_upgrade_eligibility(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_plan_upgrade_eligibility(UUID, UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- C1 + I2 + I3 + I4: re-issue apply_plan_upgrade.
-- -----------------------------------------------------------------------------
-- The 2-arg signature is DROPped rather than REPLACEd: the new signature adds
-- two defaulted parameters, which would otherwise leave an ambiguous overload
-- pair behind (and would leave the old signature's `authenticated` GRANT in
-- place — exactly the C1 exploit path). Dropping the function drops its
-- grants with it.
DROP FUNCTION IF EXISTS apply_plan_upgrade(UUID, UUID);

CREATE OR REPLACE FUNCTION apply_plan_upgrade(
  _company_id UUID DEFAULT NULL,
  _target_plan_id UUID DEFAULT NULL,
  _period_start TIMESTAMPTZ DEFAULT NULL,
  _period_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_company UUID := COALESCE(_company_id, my_company_id());
  eligibility JSONB;
  updated_id UUID;
BEGIN
  -- Defense in depth only: this function is service-role-only now, and
  -- manage-subscription performs the real authorization (it derives the
  -- caller's own company_id from the caller's authenticated session before
  -- ever reaching this RPC). Under service_role auth.uid() is NULL, so this
  -- branch is inert there — it exists so a future authenticated caller,
  -- should one ever be granted, still cannot cross tenants. NULL-safe shape
  -- (I2): a deactivated/suspended company's my_company_id() returns NULL,
  -- which must fail closed rather than fall through the `!=` comparison.
  IF _company_id IS NOT NULL AND auth.uid() IS NOT NULL
     AND (my_company_id() IS NULL OR _company_id != my_company_id()) THEN
    RAISE EXCEPTION 'Not authorized to manage subscription for this company';
  END IF;

  IF target_company IS NULL OR _target_plan_id IS NULL THEN
    RAISE EXCEPTION 'Company and target plan are required';
  END IF;

  -- Defense in depth (C1): re-run the same eligibility logic the Edge
  -- Function already ran pre-Razorpay, so this write can never apply an
  -- enterprise/custom/non-upgrade/unknown plan even if some future caller
  -- reaches it without checking first.
  eligibility := check_plan_upgrade_eligibility(target_company, _target_plan_id);
  IF NOT COALESCE((eligibility->>'eligible')::BOOLEAN, FALSE) THEN
    RAISE EXCEPTION 'Not eligible to upgrade: %', COALESCE(eligibility->>'reason', 'unknown reason');
  END IF;

  UPDATE subscriptions
    SET plan_id = _target_plan_id,
        pending_plan_id = NULL,
        pending_plan_requested_at = NULL,
        -- I3: keep provider-reported period bounds in sync. COALESCE so a
        -- null from Razorpay never overwrites a known-good local value.
        current_period_start = COALESCE(_period_start, current_period_start),
        current_period_end = COALESCE(_period_end, current_period_end),
        -- I4: advance the webhook ordering watermark so an older event
        -- delivered after this write no-ops in upsert_subscription instead
        -- of reverting the plan the customer just paid for. GREATEST guards
        -- the (pathological) case of a future-dated last_event_at already
        -- on file, which must not be walked backwards.
        last_event_at = GREATEST(COALESCE(last_event_at, NOW()), NOW()),
        updated_at = NOW()
    WHERE company_id = target_company
    RETURNING id INTO updated_id;

  IF updated_id IS NULL THEN
    RAISE EXCEPTION 'No subscription found for this company';
  END IF;

  RETURN jsonb_build_object('applied', TRUE, 'plan_id', _target_plan_id);
END;
$$;

-- C1: service-role only. manage-subscription calls this with its adminClient
-- after (and only after) Razorpay confirms the plan change.
REVOKE ALL ON FUNCTION apply_plan_upgrade(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION apply_plan_upgrade(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;
