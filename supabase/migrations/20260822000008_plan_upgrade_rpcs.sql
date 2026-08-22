-- check_plan_upgrade_eligibility: read-only pre-flight check called by
-- manage-subscription's `upgrade` action BEFORE it calls Razorpay. Unlike
-- check_plan_downgrade_feasibility (which checks whether CURRENT usage fits
-- under the TARGET plan's lower limits), an upgrade to a higher-limit plan
-- essentially never fails on usage — the two things that actually block a
-- self-service upgrade are: (1) the company is on an active enterprise
-- contract, whose limits override plan_id entirely regardless of what this
-- would set plan_id to, and (2) the target isn't a valid self-service
-- target (inactive, not public, or is_custom=TRUE i.e. 'enterprise' —
-- enterprise is sales-assisted only, same convention as the downgrade
-- action's `.eq('is_public', true)` filter in manage-subscription/index.ts).
CREATE OR REPLACE FUNCTION check_plan_upgrade_eligibility(
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
  target_plan RECORD;
  current_plan RECORD;
  has_active_contract BOOLEAN;
BEGIN
  IF _company_id IS NOT NULL AND auth.uid() IS NOT NULL
     AND (my_company_id() IS NULL OR _company_id != my_company_id()) THEN
    RAISE EXCEPTION 'Not authorized to check upgrade eligibility for this company';
  END IF;

  IF target_company IS NULL OR _target_plan_id IS NULL THEN
    RETURN jsonb_build_object('eligible', FALSE, 'reason', 'Company and target plan are required');
  END IF;

  SELECT id, slug, is_active, is_public, is_custom, monthly_price_inr
    INTO target_plan
    FROM plans WHERE id = _target_plan_id;

  IF NOT FOUND OR NOT target_plan.is_active OR NOT target_plan.is_public THEN
    RETURN jsonb_build_object('eligible', FALSE, 'reason', 'Unknown or unavailable plan');
  END IF;

  IF target_plan.is_custom THEN
    RETURN jsonb_build_object('eligible', FALSE, 'reason', 'This plan requires sales assistance — contact your account manager');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM enterprise_contracts
    WHERE company_id = target_company
      AND contract_start <= NOW()
      AND (contract_end IS NULL OR contract_end >= NOW())
  ) INTO has_active_contract;

  IF has_active_contract THEN
    RETURN jsonb_build_object('eligible', FALSE, 'reason', 'Your company is on a custom enterprise contract — contact your account manager to change plans');
  END IF;

  SELECT p.id, p.slug, p.monthly_price_inr
    INTO current_plan
    FROM subscriptions s
    JOIN plans p ON p.id = s.plan_id
    WHERE s.company_id = target_company;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', FALSE, 'reason', 'No active subscription found for this company');
  END IF;

  IF current_plan.id = target_plan.id THEN
    RETURN jsonb_build_object('eligible', FALSE, 'reason', 'Already on this plan');
  END IF;

  -- Strictly an upgrade: target must be priced higher than current. NULL
  -- monthly_price_inr only occurs on is_custom plans, already excluded above,
  -- so both sides are non-NULL here — no COALESCE needed.
  IF target_plan.monthly_price_inr <= current_plan.monthly_price_inr THEN
    RETURN jsonb_build_object('eligible', FALSE, 'reason', 'Target plan is not an upgrade from the current plan — use Change Plan to downgrade instead');
  END IF;

  RETURN jsonb_build_object('eligible', TRUE, 'reason', NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION check_plan_upgrade_eligibility(UUID, UUID) TO authenticated;

-- apply_plan_upgrade: the LOCAL write, called only after manage-subscription
-- confirms Razorpay accepted the plan change. Unlike request_plan_downgrade
-- (which sets pending_plan_id for a later, webhook-driven rollover), this
-- writes plan_id directly and immediately — the upgrade has already been
-- charged for by the time this runs, access must reflect that now, not at
-- the next webhook delivery. If this call fails after Razorpay already
-- confirmed the change (network drop, Edge Function crash), the existing
-- razorpay-webhook -> upsert_subscription path reconciles plan_id from
-- Razorpay's own subsequent webhook event via plan_provider_mapping — no
-- new reconciliation code needed, same backstop philosophy as
-- flip_expired_cancellations() for cancellations.
CREATE OR REPLACE FUNCTION apply_plan_upgrade(
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
  updated_id UUID;
BEGIN
  IF _company_id IS NOT NULL AND _company_id != my_company_id() THEN
    RAISE EXCEPTION 'Not authorized to manage subscription for this company';
  END IF;

  IF target_company IS NULL OR _target_plan_id IS NULL THEN
    RAISE EXCEPTION 'Company and target plan are required';
  END IF;

  IF NOT (has_role(caller, 'GM') OR has_role(caller, 'SUPERADMIN')) THEN
    RAISE EXCEPTION 'Only GM or SUPERADMIN can change the subscription plan';
  END IF;

  UPDATE subscriptions
    SET plan_id = _target_plan_id,
        pending_plan_id = NULL,
        pending_plan_requested_at = NULL,
        updated_at = NOW()
    WHERE company_id = target_company
    RETURNING id INTO updated_id;

  IF updated_id IS NULL THEN
    RAISE EXCEPTION 'No subscription found for this company';
  END IF;

  RETURN jsonb_build_object('applied', TRUE, 'plan_id', _target_plan_id);
END;
$$;

GRANT EXECUTE ON FUNCTION apply_plan_upgrade(UUID, UUID) TO authenticated;
