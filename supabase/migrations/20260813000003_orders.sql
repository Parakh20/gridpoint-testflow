-- =============================================================================
-- Task 3: orders table for one-time implementation fees
-- =============================================================================
-- Tracks standalone implementation/onboarding fees, training, and custom
-- development charges. Written to by the webhook (Task 5) when a payment
-- isn't tied to a subscription cycle (identified by notes.order_type).

CREATE TABLE IF NOT EXISTS orders (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type                  TEXT        NOT NULL
    CHECK (type IN ('subscription', 'implementation', 'addon', 'custom_development', 'training')),
  amount                NUMERIC(12,2) NOT NULL,
  currency              TEXT        NOT NULL DEFAULT 'INR',
  status                TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  description            TEXT,
  provider_payment_id    TEXT UNIQUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_company ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Tenant read access: a company sees its own orders (billing settings page,
-- Plan 4, will list these). No INSERT/UPDATE/DELETE for regular users —
-- service role (webhook) only, same posture as `subscriptions`.
DROP POLICY IF EXISTS "orders_select_same_company" ON orders;
CREATE POLICY "orders_select_same_company"
  ON orders FOR SELECT
  TO authenticated
  USING (company_id = my_company_id());

-- Idempotent upsert for the webhook: a payment event may retry (see
-- billing_events for the primary dedupe), this is a secondary safety net
-- keyed on the provider's own payment id so a duplicate call updates
-- rather than duplicates the row.
CREATE OR REPLACE FUNCTION upsert_order(
  _company_id UUID,
  _type TEXT,
  _amount NUMERIC,
  _currency TEXT,
  _status TEXT,
  _description TEXT,
  _provider_payment_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_id UUID;
BEGIN
  INSERT INTO orders (company_id, type, amount, currency, status, description, provider_payment_id)
  VALUES (_company_id, _type, _amount, _currency, _status, _description, _provider_payment_id)
  ON CONFLICT (provider_payment_id) DO UPDATE
  SET status     = EXCLUDED.status,
      updated_at = NOW()
  RETURNING id INTO order_id;
  RETURN order_id;
END;
$$;

-- Only service_role (webhook) can call this function; restrict from authenticated users.
-- This prevents end users from calling upsert_order via PostgREST RPC.
REVOKE ALL ON FUNCTION upsert_order(UUID, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_order(UUID, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT) TO service_role;
