-- Closes IMPROVEMENTS.md "No email notification when task is assigned REWORK".
-- Outbox pattern (no pg_net extension available/used elsewhere in this repo):
-- a trigger queues a row when a task flips to REWORK, and a periodic Edge
-- Function (notify-rework, invoked by GH Actions cron — same convention as
-- reconcile-cancellations) drains the queue and sends via Resend.

CREATE TABLE rework_notifications (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  test_task_id  UUID        NOT NULL REFERENCES test_tasks(id) ON DELETE CASCADE,
  engineer_id   UUID        NOT NULL REFERENCES auth.users(id),
  company_id    UUID        NOT NULL REFERENCES companies(id),
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rework_notifications_pending
  ON rework_notifications (created_at)
  WHERE sent_at IS NULL;

ALTER TABLE rework_notifications ENABLE ROW LEVEL SECURITY;
-- No policies — service-role only, same as billing_events/orders.

CREATE OR REPLACE FUNCTION queue_rework_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'REWORK' AND OLD.status IS DISTINCT FROM 'REWORK' AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO rework_notifications (test_task_id, engineer_id, company_id)
    SELECT NEW.id, NEW.assigned_to, pr.company_id
    FROM equipment_instances ei
    JOIN projects pr ON pr.id = ei.project_id
    WHERE ei.id = NEW.equipment_instance_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_queue_rework_notification
  AFTER UPDATE ON test_tasks
  FOR EACH ROW
  EXECUTE FUNCTION queue_rework_notification();

-- Fetch + mark-sent RPCs used by the notify-rework Edge Function
CREATE OR REPLACE FUNCTION get_pending_rework_notifications(_limit INT DEFAULT 50)
RETURNS TABLE (
  notification_id UUID,
  test_task_id UUID,
  engineer_email TEXT,
  engineer_name TEXT,
  equipment_label TEXT,
  project_name TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rn.id,
    rn.test_task_id,
    u.email,
    p.name,
    ei.label,
    pr.site_name
  FROM rework_notifications rn
  JOIN test_tasks tt ON tt.id = rn.test_task_id
  JOIN equipment_instances ei ON ei.id = tt.equipment_instance_id
  JOIN projects pr ON pr.id = ei.project_id
  JOIN auth.users u ON u.id = rn.engineer_id
  LEFT JOIN profiles p ON p.id = rn.engineer_id
  WHERE rn.sent_at IS NULL
  ORDER BY rn.created_at
  LIMIT _limit;
$$;

CREATE OR REPLACE FUNCTION mark_rework_notification_sent(_notification_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE rework_notifications SET sent_at = NOW() WHERE id = _notification_id;
$$;

REVOKE ALL ON FUNCTION get_pending_rework_notifications(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION mark_rework_notification_sent(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_pending_rework_notifications(INT) TO service_role;
GRANT EXECUTE ON FUNCTION mark_rework_notification_sent(UUID) TO service_role;
