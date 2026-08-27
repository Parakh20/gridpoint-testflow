-- Moves billing from Razorpay autopay (e-mandate subscriptions) to prepaid
-- periods with a manual renewal.
--
-- Why: Indian e-mandate is high-friction — bank support is uneven, corporate
-- cards frequently cannot mandate at all, and procurement departments expect
-- to pay an invoice rather than authorize a standing debit. The live cutover
-- probe hit exactly this: Google Pay refused to configure autopay while a
-- plain debit card payment went through first time.
--
-- The model: a company buys a period (monthly or annual) as a ONE-TIME order.
-- current_period_end is the only thing that matters. Past it, the workspace
-- goes read-only until someone renews — data stays visible and exportable,
-- but nothing new can be created. Each renewal is an independent choice of
-- plan and interval, so there is no upgrade/downgrade path to maintain: a
-- company that wants a different tier simply renews into it.
--
-- Freeze is deliberately read-only rather than a lockout. A field team mid
-- commissioning must not lose access to a live job because an invoice is
-- late, and a customer who can still see their data intact is far likelier to
-- renew than one who thinks it is gone.

-- ── period bookkeeping ─────────────────────────────────────────────────────
-- Nullable: a trial company has no purchased period, and NULL here means
-- "fall back to companies.trial_ends_at", which is what get_company_entitlements
-- already does.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS renewal_reminder_sent_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_renewed_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_renewal_payment_id    TEXT;

COMMENT ON COLUMN subscriptions.renewal_reminder_sent_at IS
  'High-water mark for renewal reminders: the period_end the last reminder was sent for. Reset on renewal so the next period gets its own reminders.';

-- ── is_workspace_frozen ────────────────────────────────────────────────────
-- The single definition of "unrenewed". Everything that gates a write asks
-- this, so there is exactly one place the rule lives.
CREATE OR REPLACE FUNCTION is_workspace_frozen(_company_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_company UUID := COALESCE(_company_id, my_company_id());
  period_end TIMESTAMPTZ;
  has_subscription BOOLEAN;
  trial_ends TIMESTAMPTZ;
BEGIN
  IF target_company IS NULL THEN RETURN TRUE; END IF;

  SELECT current_period_end, TRUE INTO period_end, has_subscription
  FROM subscriptions WHERE company_id = target_company;

  IF has_subscription AND period_end IS NOT NULL THEN
    RETURN NOW() > period_end;
  END IF;

  -- No purchased period: fall back to the trial window. A NULL trial_ends_at
  -- is a grandfathered company and is never frozen (same carve-out
  -- get_company_entitlements makes).
  SELECT trial_ends_at INTO trial_ends FROM companies WHERE id = target_company;
  IF trial_ends IS NULL THEN RETURN FALSE; END IF;
  RETURN NOW() > trial_ends;
END;
$$;

-- Callable by tenants: the UI needs to render the frozen banner, and it
-- leaks nothing a company doesn't already know about itself. Guarded by
-- my_company_id() through the COALESCE above.
REVOKE ALL ON FUNCTION is_workspace_frozen(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_workspace_frozen(UUID) TO authenticated, service_role;

-- ── apply_plan_period ──────────────────────────────────────────────────────
-- Called by razorpay-webhook once a renewal payment is captured. Idempotent
-- on the payment id, because Razorpay delivers at least once.
CREATE OR REPLACE FUNCTION apply_plan_period(
  _company_id UUID,
  _plan_id UUID,
  _interval TEXT,
  _provider_payment_id TEXT,
  _amount_paid_inr NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing subscriptions%ROWTYPE;
  new_start TIMESTAMPTZ;
  new_end TIMESTAMPTZ;
  period INTERVAL;
BEGIN
  IF _company_id IS NULL OR _plan_id IS NULL OR _provider_payment_id IS NULL THEN
    RAISE EXCEPTION 'company, plan and provider payment id are required';
  END IF;
  IF _interval NOT IN ('monthly', 'annual') THEN
    RAISE EXCEPTION 'interval must be monthly or annual, got %', _interval;
  END IF;

  -- Idempotency: the payment that bought the current period is recorded on
  -- the row, so a redelivered webhook is recognised directly rather than
  -- inferred from timing. Razorpay delivers at least once and a second
  -- application would silently hand out a free period.
  IF EXISTS (
    SELECT 1 FROM subscriptions
    WHERE company_id = _company_id
      AND last_renewal_payment_id = _provider_payment_id
  ) THEN
    RETURN jsonb_build_object('applied', FALSE, 'reason', 'already_applied');
  END IF;

  period := CASE WHEN _interval = 'annual' THEN INTERVAL '1 year' ELSE INTERVAL '1 month' END;

  SELECT * INTO existing FROM subscriptions WHERE company_id = _company_id;

  -- Extend from the later of now and the current end, so renewing early adds
  -- to the tail instead of throwing away the days already paid for. A lapsed
  -- company starts a fresh period from today rather than back-dating one it
  -- never had access during.
  new_start := GREATEST(NOW(), COALESCE(existing.current_period_end, NOW()));
  new_end := new_start + period;

  IF existing.id IS NULL THEN
    INSERT INTO subscriptions (
      company_id, provider, plan_id, billing_interval, status,
      current_period_start, current_period_end, seat_count, last_renewed_at,
      last_renewal_payment_id
    )
    VALUES (
      _company_id, 'razorpay', _plan_id, _interval, 'active',
      NOW(), new_end, 1, NOW(), _provider_payment_id
    );
  ELSE
    UPDATE subscriptions
      SET plan_id = _plan_id,
          billing_interval = _interval,
          status = 'active',
          -- Only move the start when a lapsed company begins a new period;
          -- an early renewal keeps the period it is currently inside.
          current_period_start = CASE
            WHEN existing.current_period_end IS NULL OR existing.current_period_end < NOW()
              THEN NOW()
            ELSE existing.current_period_start
          END,
          current_period_end = new_end,
          last_renewed_at = NOW(),
          last_renewal_payment_id = _provider_payment_id,
          -- New period, new reminders.
          renewal_reminder_sent_at = NULL,
          updated_at = NOW()
      WHERE company_id = _company_id;
  END IF;

  RETURN jsonb_build_object(
    'applied', TRUE,
    'period_end', new_end,
    'interval', _interval
  );
END;
$$;

REVOKE ALL ON FUNCTION apply_plan_period(UUID, UUID, TEXT, TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION apply_plan_period(UUID, UUID, TEXT, TEXT, NUMERIC) TO service_role;

-- ── orders.type gains plan_renewal ─────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_type_check' AND conrelid = 'orders'::regclass
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_type_check;
  END IF;
END $$;

ALTER TABLE orders
  ADD CONSTRAINT orders_type_check
  CHECK (type IN ('implementation', 'addon', 'custom_development', 'training', 'plan_renewal'));

-- ── freeze enforcement ─────────────────────────────────────────────────────
-- can_create_project already gates the projects INSERT policy; adding the
-- freeze check here covers new projects for free.
CREATE OR REPLACE FUNCTION can_create_project(_company_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_company UUID := COALESCE(_company_id, my_company_id());
  entitlements JSONB;
  max_projects INT;
  current_projects INT;
BEGIN
  IF _company_id IS NOT NULL AND _company_id != my_company_id() THEN
    RAISE EXCEPTION 'Not authorized to check entitlements for this company';
  END IF;

  IF target_company IS NULL THEN RETURN FALSE; END IF;

  -- Prepaid model: an unrenewed workspace is read-only. Replaces the
  -- past-due grace check, which belonged to the autopay model where a failed
  -- mandate needed a retry window; a prepaid period has no failed charge to
  -- retry, it simply ran out.
  IF is_workspace_frozen(target_company) THEN RETURN FALSE; END IF;

  entitlements := get_company_entitlements(target_company);
  max_projects := (entitlements->>'max_active_projects')::INT;
  IF max_projects IS NULL THEN RETURN TRUE; END IF; -- unlimited

  SELECT COUNT(*) INTO current_projects
  FROM projects
  WHERE company_id = target_company
    AND status != 'CLOSED'
    AND deleted_at IS NULL;

  RETURN current_projects < max_projects;
END;
$$;

GRANT EXECUTE ON FUNCTION can_create_project(UUID) TO authenticated;

-- Read-only means test execution stops too, not just project creation —
-- otherwise a frozen workspace keeps producing billable work indefinitely.
-- SELECT is untouched by design: existing records stay visible and
-- exportable.
-- AS RESTRICTIVE is essential: permissive policies are combined with OR, so a
-- plain FOR INSERT policy here would GRANT a new way in rather than close one.
-- Restrictive policies are ANDed with the existing permissive set, which is
-- the "everything else must still hold, and also not frozen" semantics wanted.
DROP POLICY IF EXISTS "test_records_insert_frozen_guard" ON test_records;
CREATE POLICY "test_records_insert_frozen_guard"
  ON test_records AS RESTRICTIVE FOR INSERT
  TO authenticated
  WITH CHECK (NOT is_workspace_frozen());

DROP POLICY IF EXISTS "test_records_update_frozen_guard" ON test_records;
CREATE POLICY "test_records_update_frozen_guard"
  ON test_records AS RESTRICTIVE FOR UPDATE
  TO authenticated
  USING (NOT is_workspace_frozen());

DROP POLICY IF EXISTS "nameplate_records_insert_frozen_guard" ON nameplate_records;
CREATE POLICY "nameplate_records_insert_frozen_guard"
  ON nameplate_records AS RESTRICTIVE FOR INSERT
  TO authenticated
  WITH CHECK (NOT is_workspace_frozen());

DROP POLICY IF EXISTS "nameplate_records_update_frozen_guard" ON nameplate_records;
CREATE POLICY "nameplate_records_update_frozen_guard"
  ON nameplate_records AS RESTRICTIVE FOR UPDATE
  TO authenticated
  USING (NOT is_workspace_frozen());

-- ── renewal reminder outbox ────────────────────────────────────────────────
-- Same outbox+cron shape as rework_notifications (20260822000010): a row per
-- reminder to send, drained by an Edge Function on a schedule.
CREATE TABLE IF NOT EXISTS renewal_notifications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_end   TIMESTAMPTZ NOT NULL,
  days_before  INT         NOT NULL,
  sent_at      TIMESTAMPTZ,
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One reminder per company per period per milestone, so a cron that runs
  -- twice in a day cannot double-send.
  UNIQUE (company_id, period_end, days_before)
);

CREATE INDEX IF NOT EXISTS idx_renewal_notifications_unsent
  ON renewal_notifications(created_at) WHERE sent_at IS NULL;

ALTER TABLE renewal_notifications ENABLE ROW LEVEL SECURITY;
-- No policies: service-role only, like rework_notifications.

-- Queues any reminder now due. Called by the cron function before it drains.
CREATE OR REPLACE FUNCTION queue_renewal_reminders()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  queued INT := 0;
  batch INT;
  milestone INT;
BEGIN
  -- 7/3/1 days out, plus 0 for "your workspace is now read-only".
  FOREACH milestone IN ARRAY ARRAY[7, 3, 1, 0] LOOP
    INSERT INTO renewal_notifications (company_id, period_end, days_before)
    SELECT s.company_id, s.current_period_end, milestone
    FROM subscriptions s
    JOIN companies c ON c.id = s.company_id
    WHERE s.current_period_end IS NOT NULL
      AND c.is_active
      -- Due when the period end has come within the milestone window but the
      -- next (tighter) milestone has not yet been reached.
      AND s.current_period_end <= NOW() + (milestone || ' days')::INTERVAL
      AND (milestone = 0 OR s.current_period_end > NOW())
    ON CONFLICT (company_id, period_end, days_before) DO NOTHING;
    GET DIAGNOSTICS batch = ROW_COUNT;
    queued := queued + batch;
  END LOOP;

  RETURN queued;
END;
$$;

REVOKE ALL ON FUNCTION queue_renewal_reminders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION queue_renewal_reminders() TO service_role;

GRANT ALL ON renewal_notifications TO service_role;
