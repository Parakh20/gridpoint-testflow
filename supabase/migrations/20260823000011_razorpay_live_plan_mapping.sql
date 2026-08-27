-- Razorpay TEST -> LIVE cutover (2026-08-27).
--
-- Test-mode plan ids do not exist in Razorpay's live environment, so once
-- RAZORPAY_KEY_ID is an rzp_live_ key every checkout against the old mapping
-- would fail with "plan does not exist". These ids were created against the
-- LIVE keys at the prices already in `plans` (charm pricing, 20260822000015),
-- verified amount-for-amount against the Razorpay API before this migration
-- was written.
--
-- The superseded test plans (20260822000014 / 20260822000015) stay at Razorpay
-- in test mode. Razorpay plans cannot be deleted, only orphaned — that is the
-- normal end state for a remapped plan and needs no cleanup.
--
-- provider_mode is set to 'live' so get_plan_catalog stops raising
-- mode_mismatch now that the mapping and the configured key agree.

UPDATE plan_provider_mapping m
SET razorpay_plan_id_monthly = v.monthly,
    razorpay_plan_id_annual  = v.annual,
    monthly_price_inr_at_mapping = p.monthly_price_inr,
    annual_price_inr_at_mapping  = p.annual_price_inr,
    provider_mode = 'live',
    updated_at = NOW()
FROM (
  VALUES
    ('starter',      'plan_TUqqLpNojaeTTm', 'plan_TUqqM0eS0XQTe7'),
    ('professional', 'plan_TUqqMC1tszFrn5', 'plan_TUqqMOIZ1d2cPc'),
    ('business',     'plan_TUqqMZUtnPwGdb', 'plan_TUqqMlT7AVpnGl')
) AS v(slug, monthly, annual)
JOIN plans p ON p.slug = v.slug
WHERE m.plan_id = p.id;
