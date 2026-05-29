-- =============================================================================
-- Fix audit trigger: replace uuid_nil() with literal nil UUID
-- =============================================================================
-- log_audit_event() (last redefined in 20260530000001) calls uuid_nil() as the
-- COALESCE fallback for entity_id. uuid_nil() ships with the uuid-ossp
-- extension, which is NOT installed in this project (only pgcrypto is — see
-- 20260429000000). Postgres resolves the function at plan time for the INSERT,
-- so every project/equipment/task/record/role mutation that fires the trigger
-- fails with: function uuid_nil() does not exist. This was surfacing as an
-- error on editing a project.
--
-- Fix: use the literal nil UUID instead. The fallback is effectively dead code
-- anyway (all audited tables have a non-null id), but the reference must still
-- resolve at plan time.

CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id  UUID := auth.uid();
  comp_id   UUID;
  before_v  JSONB;
  after_v   JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    comp_id := COALESCE(
      (to_jsonb(OLD)->>'company_id')::UUID,
      (SELECT p.company_id FROM projects p
       WHERE p.id = COALESCE((to_jsonb(OLD)->>'project_id')::UUID, NULL)),
      (SELECT company_id FROM profiles WHERE id = actor_id)
    );
    before_v := to_jsonb(OLD);
    after_v  := NULL;
  ELSE
    comp_id := COALESCE(
      (to_jsonb(NEW)->>'company_id')::UUID,
      (SELECT p.company_id FROM projects p
       WHERE p.id = COALESCE((to_jsonb(NEW)->>'project_id')::UUID, NULL)),
      (SELECT company_id FROM profiles WHERE id = actor_id)
    );
    before_v := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END;
    after_v  := to_jsonb(NEW);
  END IF;

  IF comp_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO audit_logs (company_id, actor_id, action, entity_type, entity_id, before_data, after_data)
  VALUES (
    comp_id,
    actor_id,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(
      (to_jsonb(COALESCE(NEW, OLD))->>'id')::UUID,
      '00000000-0000-0000-0000-000000000000'::UUID
    ),
    before_v,
    after_v
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;
