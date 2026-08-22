-- =============================================================================
-- Migration: request_subscription_cancellation returns the real persisted
-- cancel_at, not a fresh read of current_period_end
-- =============================================================================
--
-- 20260813000011_cancellation_downgrade_rpcs.sql's original body reads
-- `current_period_end` into `period_end` and returns THAT value as the
-- response's `cancel_at`, even though the column it actually writes uses
-- `COALESCE(cancel_at, period_end)` (an existing cancel_at is preserved,
-- not overwritten). On a retried cancellation call where some other event
-- has since nulled `current_period_end` (e.g. a webhook), the RPC becomes a
-- correct no-op on the column (cancel_at was already set and stays set) but
-- its JSON response wrongly echoes `cancel_at: null` -- indistinguishable
-- from "no local cancellation was ever recorded". manage-subscription's
-- caller-side guard (added in the razorpay-cancellation-fix plan) trusts
-- this field to decide whether to contact Razorpay at all; a false null
-- here makes it skip the Razorpay call entirely, silently defeating the
-- exact bug that plan exists to fix. Return the actual persisted column
-- value instead of the pre-write local variable.

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
  persisted_cancel_at TIMESTAMPTZ;
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
    WHERE company_id = target_company
    RETURNING cancel_at INTO persisted_cancel_at;

  -- Audit logging deferred to the plan that introduces billing_audit_logs (spec §30).

  RETURN jsonb_build_object('cancelled_at_period_end', TRUE, 'cancel_at', persisted_cancel_at);
END;
$$;
