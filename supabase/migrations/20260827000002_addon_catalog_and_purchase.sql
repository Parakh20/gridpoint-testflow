-- Makes add-ons sellable instead of operator-grant-only.
--
-- Until now `subscription_addons` could only be created by hand from the admin
-- panel: unit_price_inr was recorded and never read by any billing code, and
-- nothing ever created the Razorpay order that razorpay-webhook has always been
-- ready to receive (it already routes payment.captured with
-- notes.order_type='addon' into `orders`). This adds the two missing halves —
-- a price list, and an idempotent way to turn a captured payment into an
-- entitlement.
--
-- One-time orders, not recurring. A recurring add-on at Razorpay is a
-- different API (subscription addons billed on the next invoice) and a much
-- larger change; the existing `orders` table and webhook path are shaped for
-- one-time charges, so that is what this uses.

-- ── addon_catalog ──────────────────────────────────────────────────────────
-- The price list a tenant sees. Deliberately separate from
-- subscription_addons.unit_price_inr, which stays the price actually paid at
-- purchase time: changing the catalogue price must never rewrite what an
-- existing customer was charged.
CREATE TABLE IF NOT EXISTS addon_catalog (
  addon_key      TEXT        PRIMARY KEY
    CHECK (addon_key IN ('extra_users', 'extra_projects', 'api_access', 'sso', 'dedicated_environment', 'priority_sla', 'custom_integration')),
  name           TEXT        NOT NULL,
  description    TEXT,
  unit_price_inr NUMERIC(12,2) NOT NULL CHECK (unit_price_inr > 0),
  -- 'quantity' add-ons are bought in multiples and their quantities sum into
  -- the entitlement caps; 'flag' add-ons are a single on/off grant.
  kind           TEXT        NOT NULL DEFAULT 'flag' CHECK (kind IN ('quantity', 'flag')),
  max_quantity   INT         NOT NULL DEFAULT 1 CHECK (max_quantity > 0),
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order     INT         NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE addon_catalog ENABLE ROW LEVEL SECURITY;

-- Readable by any signed-in user so the billing page can render prices; the
-- catalogue is public commercial information, not tenant data. Writes are
-- service-role only (no INSERT/UPDATE/DELETE policy exists), same shape as
-- `plans`.
DROP POLICY IF EXISTS "addon_catalog_select_authenticated" ON addon_catalog;
CREATE POLICY "addon_catalog_select_authenticated"
  ON addon_catalog FOR SELECT
  TO authenticated
  USING (is_active);

INSERT INTO addon_catalog (addon_key, name, description, unit_price_inr, kind, max_quantity, sort_order)
VALUES
  ('extra_users',    'Additional users',    'Raises your user limit. Billed once per seat.',            2499,  'quantity', 100, 1),
  ('extra_projects', 'Additional projects', 'Raises your active project limit. Billed once per project.', 4999,  'quantity', 100, 2),
  ('api_access',     'API access',          'REST access to your projects and test records.',            24999, 'flag',     1,   3),
  ('sso',            'SSO',                 'SAML/OIDC single sign-on for your workspace.',              34999, 'flag',     1,   4),
  ('priority_sla',   'Priority SLA',        'Four-hour response target during business hours.',          49999, 'flag',     1,   5)
ON CONFLICT (addon_key) DO NOTHING;

COMMENT ON TABLE addon_catalog IS
  'Self-service add-on price list. dedicated_environment and custom_integration are deliberately absent — they are sales-assisted, not self-serve, and stay operator-granted via admin_create_addon.';

-- ── purchase provenance on subscription_addons ─────────────────────────────
-- Nullable because an operator grant (admin_create_addon) has no payment
-- behind it. UNIQUE is what makes fulfilment idempotent under Razorpay's
-- at-least-once webhook delivery.
ALTER TABLE subscription_addons
  ADD COLUMN IF NOT EXISTS provider_payment_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_addons_provider_payment
  ON subscription_addons(provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

-- ── record_addon_purchase ──────────────────────────────────────────────────
-- Called by razorpay-webhook once a payment is captured. Everything it needs
-- travelled in the order's notes, which only this server sets.
CREATE OR REPLACE FUNCTION record_addon_purchase(
  _company_id UUID,
  _addon_key TEXT,
  _quantity INT,
  _provider_payment_id TEXT,
  _amount_paid_inr NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_subscription UUID;
  catalog_row addon_catalog%ROWTYPE;
  existing_id UUID;
  expected_amount NUMERIC(12,2);
  new_id UUID;
BEGIN
  IF _company_id IS NULL OR _addon_key IS NULL OR _provider_payment_id IS NULL THEN
    RAISE EXCEPTION 'company, addon key and provider payment id are required';
  END IF;

  -- Idempotency first: a redelivered webhook must be a no-op, not a second
  -- entitlement. billing_events already dedupes by event id, but a genuine
  -- retry after a mid-transaction failure can reach here twice.
  SELECT id INTO existing_id
  FROM subscription_addons WHERE provider_payment_id = _provider_payment_id;
  IF existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('addon_id', existing_id, 'created', FALSE, 'reason', 'already_recorded');
  END IF;

  SELECT * INTO catalog_row FROM addon_catalog WHERE addon_key = _addon_key;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown add-on key %', _addon_key;
  END IF;

  SELECT id INTO target_subscription
  FROM subscriptions WHERE company_id = _company_id;
  IF target_subscription IS NULL THEN
    -- Payment captured for a company with no subscription row. Refusing here
    -- would swallow money silently, so raise: the webhook logs it and the
    -- operator refunds or attaches it by hand.
    RAISE EXCEPTION 'No subscription row for company % — cannot attach add-on %', _company_id, _addon_key;
  END IF;

  -- Guard against a mismatch between what was charged and what the catalogue
  -- says the add-on costs. A price edited between order creation and capture
  -- is the realistic cause; granting the entitlement anyway is correct (the
  -- customer paid) but it must not pass unnoticed.
  expected_amount := catalog_row.unit_price_inr * GREATEST(COALESCE(_quantity, 1), 1);
  IF _amount_paid_inr IS NOT NULL AND _amount_paid_inr <> expected_amount THEN
    RAISE WARNING 'record_addon_purchase: paid % for % x % but catalogue says %',
      _amount_paid_inr, _quantity, _addon_key, expected_amount;
  END IF;

  -- A flag add-on already active is not bought twice — return the existing
  -- row so the caller can refund rather than stacking a duplicate grant.
  IF catalog_row.kind = 'flag' THEN
    SELECT id INTO existing_id
    FROM subscription_addons
    WHERE subscription_id = target_subscription
      AND addon_key = _addon_key
      AND status = 'active';
    IF existing_id IS NOT NULL THEN
      RETURN jsonb_build_object('addon_id', existing_id, 'created', FALSE, 'reason', 'already_active');
    END IF;
  END IF;

  INSERT INTO subscription_addons (subscription_id, addon_key, quantity, unit_price_inr, status, provider_payment_id)
  VALUES (
    target_subscription,
    _addon_key,
    CASE WHEN catalog_row.kind = 'quantity' THEN GREATEST(COALESCE(_quantity, 1), 1) ELSE 1 END,
    catalog_row.unit_price_inr,
    'active',
    _provider_payment_id
  )
  RETURNING id INTO new_id;

  RETURN jsonb_build_object('addon_id', new_id, 'created', TRUE);
END;
$$;

-- Webhook-only: a tenant must never be able to grant itself an entitlement by
-- calling this over PostgREST.
REVOKE ALL ON FUNCTION record_addon_purchase(UUID, TEXT, INT, TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_addon_purchase(UUID, TEXT, INT, TEXT, NUMERIC) TO service_role;

GRANT SELECT ON addon_catalog TO authenticated;
GRANT ALL ON addon_catalog TO service_role;
