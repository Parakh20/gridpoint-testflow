-- Closes IMPROVEMENTS.md "No GDPR/data-export flow for individual users".
-- Two RPCs, both SUPERADMIN + same-company gated (mirrors offboard_user's
-- auth pattern in 20260519000004_user_offboarding.sql):
--   request_data_export(_user_id)  -> JSONB snapshot of everything tied to
--                                      that user (no storage/email infra in
--                                      this repo yet, so this returns the
--                                      payload directly rather than a signed
--                                      URL — the admin panel can offer it as
--                                      a JSON download).
--   erase_user_data(_user_id)      -> anonymizes PII in place. Full row
--                                      deletion isn't possible without
--                                      breaking NOT NULL created_by/actor_id
--                                      FKs on test_records/nameplate_records/
--                                      audit_logs (by design — those rows are
--                                      the compliance/audit trail), so this
--                                      is erasure-by-anonymization: profile
--                                      name/email scrubbed, account
--                                      deactivated. Requires the user already
--                                      offboarded (no open assigned work) —
--                                      same precondition offboard_user exists
--                                      to satisfy.

CREATE OR REPLACE FUNCTION request_data_export(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  caller_company UUID;
  target_company UUID;
  result JSONB;
BEGIN
  IF NOT has_role(auth.uid(), 'SUPERADMIN') THEN
    RAISE EXCEPTION 'Only SUPERADMIN can export user data';
  END IF;

  caller_company := my_company_id();
  SELECT company_id INTO target_company FROM profiles WHERE id = _user_id;

  IF target_company IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  IF target_company != caller_company THEN
    RAISE EXCEPTION 'User must belong to your company';
  END IF;

  SELECT jsonb_build_object(
    'profile', (SELECT to_jsonb(p) FROM profiles p WHERE p.id = _user_id),
    'roles', (SELECT jsonb_agg(role) FROM user_roles WHERE user_id = _user_id),
    'projects_created', (SELECT jsonb_agg(to_jsonb(pr)) FROM projects pr WHERE pr.created_by = _user_id AND pr.deleted_at IS NULL),
    'projects_assigned', (SELECT jsonb_agg(to_jsonb(pr)) FROM projects pr WHERE pr.assigned_to = _user_id AND pr.deleted_at IS NULL),
    'equipment_assigned', (SELECT jsonb_agg(to_jsonb(ei)) FROM equipment_instances ei WHERE ei.assigned_to = _user_id AND ei.deleted_at IS NULL),
    'test_tasks_assigned', (SELECT jsonb_agg(to_jsonb(tt)) FROM test_tasks tt WHERE tt.assigned_to = _user_id),
    'test_records_submitted', (SELECT jsonb_agg(to_jsonb(tr)) FROM test_records tr WHERE tr.created_by = _user_id AND tr.deleted_at IS NULL),
    'nameplate_records_submitted', (SELECT jsonb_agg(to_jsonb(nr)) FROM nameplate_records nr WHERE nr.created_by = _user_id),
    'audit_log_actions', (SELECT jsonb_agg(to_jsonb(al)) FROM audit_logs al WHERE al.actor_id = _user_id)
  ) INTO result;

  INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, after_data)
  VALUES (auth.uid(), 'profiles', _user_id, 'DATA_EXPORT_REQUESTED', jsonb_build_object('requested_for', _user_id));

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION erase_user_data(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  caller_company UUID;
  target_company UUID;
  open_work_count INT;
BEGIN
  IF NOT has_role(auth.uid(), 'SUPERADMIN') THEN
    RAISE EXCEPTION 'Only SUPERADMIN can erase user data';
  END IF;
  IF auth.uid() = _user_id THEN
    RAISE EXCEPTION 'Cannot erase your own account';
  END IF;

  caller_company := my_company_id();
  SELECT company_id INTO target_company FROM profiles WHERE id = _user_id;

  IF target_company IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  IF target_company != caller_company THEN
    RAISE EXCEPTION 'User must belong to your company';
  END IF;

  SELECT
    (SELECT COUNT(*) FROM projects WHERE assigned_to = _user_id AND deleted_at IS NULL) +
    (SELECT COUNT(*) FROM equipment_instances WHERE assigned_to = _user_id AND deleted_at IS NULL) +
    (SELECT COUNT(*) FROM test_tasks WHERE assigned_to = _user_id AND status NOT IN ('SUBMITTED', 'APPROVED'))
  INTO open_work_count;

  IF open_work_count > 0 THEN
    RAISE EXCEPTION 'User still has % open assignment(s) — offboard_user() first', open_work_count;
  END IF;

  UPDATE profiles
  SET name = 'Deleted User',
      email = 'deleted-' || _user_id || '@erased.invalid',
      is_active = FALSE
  WHERE id = _user_id;

  INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, after_data)
  VALUES (auth.uid(), 'profiles', _user_id, 'DATA_ERASED', jsonb_build_object('erased_user', _user_id));

  RETURN jsonb_build_object('erased', TRUE, 'user_id', _user_id);
END;
$$;

REVOKE ALL ON FUNCTION request_data_export(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION erase_user_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION request_data_export(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION erase_user_data(UUID) TO authenticated;
