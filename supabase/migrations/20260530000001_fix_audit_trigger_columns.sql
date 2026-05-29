-- =============================================================================
-- Fix audit trigger column names
-- =============================================================================
-- The log_audit_event() function added in 20260519000002 wrote to columns
-- table_name / record_id / before / after, but the audit_logs schema (from
-- 20251029064345) uses entity_type / entity_id / before_data / after_data.
-- Every project/equipment/task/record/role mutation that fires the trigger
-- has been failing with: column "table_name" of relation "audit_logs" does
-- not exist. This redefines the function with the correct columns.

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
      uuid_nil()
    ),
    before_v,
    after_v
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;
