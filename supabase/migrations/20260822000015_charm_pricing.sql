-- Switch to charm pricing (x,999 instead of round x,000) and repoint
-- plan_provider_mapping at freshly-created Razorpay test plans — Razorpay
-- plan amounts are immutable once created, so the old 20260822000014 plan
-- ids stay valid at Razorpay but are orphaned here rather than mutated.
UPDATE plans SET monthly_price_inr = 24999, annual_price_inr = 249999 WHERE slug = 'starter';
UPDATE plans SET monthly_price_inr = 59999, annual_price_inr = 599999 WHERE slug = 'professional';
UPDATE plans SET monthly_price_inr = 149999, annual_price_inr = 1499999 WHERE slug = 'business';

UPDATE plan_provider_mapping m
SET razorpay_plan_id_monthly = v.monthly, razorpay_plan_id_annual = v.annual
FROM (
  VALUES
    ('starter', 'plan_TSsy0xL7atn6np', 'plan_TSsy1BsCyNOTCb'),
    ('professional', 'plan_TSsy1UbKjPH9vy', 'plan_TSsy1ooQaphJXq'),
    ('business', 'plan_TSsy23Byg7KVam', 'plan_TSsy2JtKlZaPRq')
) AS v(slug, monthly, annual)
JOIN plans p ON p.slug = v.slug
WHERE m.plan_id = p.id;
