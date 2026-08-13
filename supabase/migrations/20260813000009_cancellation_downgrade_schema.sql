-- Tracks a scheduled-but-not-yet-applied plan downgrade. Applied by
-- upsert_subscription() at the next period rollover (Task 4), never
-- immediately — access at the current plan's limits continues until
-- the paid period actually ends.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS pending_plan_id UUID REFERENCES plans(id),
  ADD COLUMN IF NOT EXISTS pending_plan_requested_at TIMESTAMPTZ;
