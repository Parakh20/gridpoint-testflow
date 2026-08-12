CREATE TABLE IF NOT EXISTS billing_events (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider           TEXT        NOT NULL DEFAULT 'razorpay',
  provider_event_id  TEXT        NOT NULL,
  event_type         TEXT        NOT NULL,
  company_id         UUID        REFERENCES companies(id) ON DELETE CASCADE,
  processed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_payload        JSONB,
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_events_company ON billing_events(company_id);

ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
-- No policies — service-role only (webhook handler), same posture as `leads`.

-- Atomic check-and-record: returns TRUE the first time an event id is seen
-- (caller should process it), FALSE on a duplicate (caller should skip).
-- Uses ON CONFLICT DO NOTHING + checking row count rather than a
-- SELECT-then-INSERT to avoid a race between concurrent webhook retries.
CREATE OR REPLACE FUNCTION record_billing_event(
  _provider TEXT,
  _provider_event_id TEXT,
  _event_type TEXT,
  _company_id UUID,
  _raw JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted INT;
BEGIN
  INSERT INTO billing_events (provider, provider_event_id, event_type, company_id, raw_payload)
  VALUES (_provider, _provider_event_id, _event_type, _company_id, _raw)
  ON CONFLICT (provider, provider_event_id) DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted > 0;
END;
$$;
