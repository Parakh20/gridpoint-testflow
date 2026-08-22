-- Test-mode Razorpay plan ids, created via the Razorpay API against the
-- account's Test Mode keys (2026-08-22). These must be replaced with Live
-- Mode plan ids (re-create the same 6 plans with Live keys, then
-- UPDATE plan_provider_mapping) before accepting real payments — test-mode
-- plan ids do not exist in Razorpay's live environment.
INSERT INTO plan_provider_mapping (plan_id, razorpay_plan_id_monthly, razorpay_plan_id_annual)
SELECT id,
  CASE slug
    WHEN 'starter' THEN 'plan_TSsumXZNokRCwa'
    WHEN 'professional' THEN 'plan_TSsun2GeFpERiy'
    WHEN 'business' THEN 'plan_TSsunWNWZtuD8j'
  END,
  CASE slug
    WHEN 'starter' THEN 'plan_TSsummmnOGahxg'
    WHEN 'professional' THEN 'plan_TSsunHoUCNt6Cm'
    WHEN 'business' THEN 'plan_TSsunjvuPBj9Lb'
  END
FROM plans
WHERE slug IN ('starter', 'professional', 'business')
ON CONFLICT (plan_id) DO UPDATE
  SET razorpay_plan_id_monthly = EXCLUDED.razorpay_plan_id_monthly,
      razorpay_plan_id_annual = EXCLUDED.razorpay_plan_id_annual;
