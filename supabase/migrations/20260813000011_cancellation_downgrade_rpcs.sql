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
  IF _company_id IS NOT NULL AND _company_id != my_company_id() THEN
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

  -- Audit logging deferred to the plan that introduces billing_audit_logs (spec §30).

  RETURN jsonb_build_object('cancelled_at_period_end', TRUE, 'cancel_at', period_end);
END;
$$;

GRANT EXECUTE ON FUNCTION request_subscription_cancellation(UUID) TO authenticated;

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

  -- Audit logging deferred to the plan that introduces billing_audit_logs (spec §30).

  RETURN jsonb_build_object('scheduled', TRUE, 'blockers', '[]'::JSONB);
END;
$$;

GRANT EXECUTE ON FUNCTION request_plan_downgrade(UUID, UUID) TO authenticated;
