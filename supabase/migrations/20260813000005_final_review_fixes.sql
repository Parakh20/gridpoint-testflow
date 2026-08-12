-- =============================================================================
-- Final whole-branch review fixes (billing-service-webhooks)
-- =============================================================================
-- Addresses issues found once Tasks 1-6 were viewed together:
--
-- C1: upsert_subscription was SECURITY DEFINER with no REVOKE/GRANT, making
--     it PostgREST-callable by any authenticated/anon user with an arbitrary
--     _company_id — a live privilege-escalation path once Task 1 made it
--     resolve and write a real plan_id.
-- C2: the webhook's dedup key relied on event.id, which does not exist in
--     Razorpay's payload; the Date.now() fallback made idempotency a no-op.
--     (Fixed in supabase/functions/razorpay-webhook/index.ts, not here.)
-- I1: is_past_due_grace_expired was GRANTed to `authenticated` without the
--     cross-tenant guard its siblings have, and doesn't need direct-callable
--     access at all — its only callers are SECURITY DEFINER functions in the
--     same schema.
-- I2: plans.razorpay_plan_id_monthly/_annual sat on the anon-readable `plans`
--     table (plans_public_read: FOR SELECT USING (is_public AND is_active),
--     no column restriction) — leaking operator-configured Razorpay plan ids
--     to anyone. Moved to a new service-role-only plan_provider_mapping
--     table, matching the billing_events/orders posture.
-- I3: upsert_subscription now RAISE WARNINGs when no plan mapping is found,
--     instead of silently capping a paying customer at trial-tier limits.
--
-- Per repo convention (docs/dev/MIGRATIONS.md), none of the four already-
-- reviewed migrations from this plan are edited — everything lands here.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- I2: move Razorpay plan-id mapping off the anon-readable `plans` table.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plan_provider_mapping (
  plan_id                    UUID PRIMARY KEY REFERENCES plans(id) ON DELETE CASCADE,
  razorpay_plan_id_monthly   TEXT UNIQUE,
  razorpay_plan_id_annual    TEXT UNIQUE
);

ALTER TABLE plan_provider_mapping ENABLE ROW LEVEL SECURITY;
-- No policies — service-role only (webhook + upsert_subscription), same
-- posture as billing_events/orders.

-- Migrate any already-configured mappings (none expected pre-release, but
-- safe either way).
INSERT INTO plan_provider_mapping (plan_id, razorpay_plan_id_monthly, razorpay_plan_id_annual)
SELECT id, razorpay_plan_id_monthly, razorpay_plan_id_annual FROM plans
WHERE razorpay_plan_id_monthly IS NOT NULL OR razorpay_plan_id_annual IS NOT NULL
ON CONFLICT (plan_id) DO NOTHING;

ALTER TABLE plans DROP COLUMN IF EXISTS razorpay_plan_id_monthly;
ALTER TABLE plans DROP COLUMN IF EXISTS razorpay_plan_id_annual;

-- -----------------------------------------------------------------------------
-- C1 + I2 + I3: re-issue upsert_subscription resolving against
-- plan_provider_mapping instead of plans, and warn on unresolved mappings.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION upsert_subscription(
  _company_id UUID,
  _provider_sub_id TEXT,
  _provider_cust_id TEXT,
  _provider_plan_id TEXT,
  _status TEXT,
  _period_start TIMESTAMPTZ,
  _period_end TIMESTAMPTZ,
  _seat_count INT,
  _raw JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_id UUID;
  resolved_plan_id UUID;
  resolved_interval TEXT;
BEGIN
  SELECT plan_id, 'monthly' INTO resolved_plan_id, resolved_interval
  FROM plan_provider_mapping WHERE razorpay_plan_id_monthly = _provider_plan_id;

  IF resolved_plan_id IS NULL THEN
    SELECT plan_id, 'annual' INTO resolved_plan_id, resolved_interval
    FROM plan_provider_mapping WHERE razorpay_plan_id_annual = _provider_plan_id;
  END IF;

  IF resolved_plan_id IS NULL THEN
    RAISE WARNING 'upsert_subscription: no plan_provider_mapping found for razorpay plan id %', _provider_plan_id;
  END IF;

  INSERT INTO subscriptions (
    company_id, provider, provider_subscription_id, provider_customer_id,
    provider_plan_id, plan_id, billing_interval, status,
    current_period_start, current_period_end, seat_count, raw_provider_payload
  )
  VALUES (
    _company_id, 'razorpay', _provider_sub_id, _provider_cust_id,
    _provider_plan_id, resolved_plan_id, resolved_interval, _status,
    _period_start, _period_end, _seat_count, _raw
  )
  ON CONFLICT (company_id) DO UPDATE
  SET provider_subscription_id = EXCLUDED.provider_subscription_id,
      provider_customer_id     = EXCLUDED.provider_customer_id,
      provider_plan_id         = EXCLUDED.provider_plan_id,
      plan_id                  = EXCLUDED.plan_id,
      billing_interval         = EXCLUDED.billing_interval,
      status                   = EXCLUDED.status,
      current_period_start     = EXCLUDED.current_period_start,
      current_period_end       = EXCLUDED.current_period_end,
      seat_count               = EXCLUDED.seat_count,
      raw_provider_payload     = EXCLUDED.raw_provider_payload,
      updated_at               = NOW()
  RETURNING id INTO sub_id;
  RETURN sub_id;
END;
$$;

-- C1: upsert_subscription is SECURITY DEFINER with an arbitrary _company_id
-- and no authorization guard — restrict PostgREST callability to service_role
-- only (webhook handler uses the service-role key).
REVOKE ALL ON FUNCTION upsert_subscription(UUID,TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ,TIMESTAMPTZ,INT,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_subscription(UUID,TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ,TIMESTAMPTZ,INT,JSONB) TO service_role;

-- -----------------------------------------------------------------------------
-- I1: is_past_due_grace_expired doesn't need to be authenticated-callable —
-- its only callers (can_invite_user / can_create_project) are SECURITY
-- DEFINER in the same schema and reach it via function ownership regardless
-- of REVOKE FROM PUBLIC. Direct authenticated access is a small information
-- leak (any authenticated user could probe any company UUID's grace state).
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION is_past_due_grace_expired(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION is_past_due_grace_expired(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION is_past_due_grace_expired(UUID) TO service_role;
