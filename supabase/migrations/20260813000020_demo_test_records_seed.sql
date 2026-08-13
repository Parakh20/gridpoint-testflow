-- Demo Organization: test_tasks + test_records seed for DEMO-001 ("400/220kV
-- Substation", Needli Grid Services / slug `demo`).
--
-- 20260813000017_demo_organization_seed.sql seeded the company, SUPERADMIN,
-- project and 37 equipment_instances, but deliberately left test_tasks /
-- test_records empty — generating valid records requires knowing each test
-- template's `fields` JSON Schema per equipment type, and that migration
-- didn't want to fabricate schema-invalid JSONB.
--
-- This migration closes that gap. Design:
--   1. Enable every active test_template for the project's 7 equipment
--      types via project_test_scope (mirrors what a GM does in the UI when
--      configuring project scope).
--   2. Insert one test_task per (equipment_instance x enabled template) —
--      the same join `generate_project_equipment()` uses, but done directly
--      here since that RPC no-ops once equipment_instances already exist.
--   3. Assign a realistic status distribution: exactly 6 REWORK (each with
--      a rework_reason), the remainder split APPROVED-majority /
--      SUBMITTED / IN_PROGRESS / DRAFT so the project reads as in-flight,
--      not 100% finished.
--   4. Generate one test_record per non-DRAFT task, with a payload built by
--      *walking the template's actual `fields` JSON at migration-run-time*
--      (see pg_temp.demo_gen_payload below) rather than hand-authoring
--      per-template JSON — this guarantees the payload always matches
--      whatever the live `fields` schema is, including the v2
--      section-based format (`fields`, `phase_columns`, `phase_rows`,
--      `tap_table`, `dynamic_table`, `core_table`, `core_phase_table`,
--      `phase_core_upload`, `ir_fixed`, `ir_fixed_phase` — see
--      TestFormV2.tsx) used by all 7 equipment types in this project as of
--      this migration. Templates with `fields = []` or a non-v2 payload
--      produce an empty `{}` record rather than fabricated keys.
--
-- SIMPLIFICATION (documented per task spec, not hidden): the sales-demo
-- narrative mentions "12 engineers." This migration does not create 12 real
-- auth.users rows — that's out of scope for a data seed and would require
-- fabricating fake identities. All test_tasks.assigned_to / test_records
-- .created_by reference the single existing SUPERADMIN (admin@demo.com).
-- The engineer headcount in the sales narrative is therefore not backed by
-- distinct actor rows in this seed.
--
-- Idempotent: guarded by "no test_tasks exist yet for this project" so a
-- second run is a no-op, matching the IF v_project_id IS NULL pattern in
-- 20260813000017_demo_organization_seed.sql.


-- =============================================================================
-- HELPER FUNCTIONS (session-local; pg_temp so they don't linger in `public`)
-- =============================================================================

CREATE OR REPLACE FUNCTION pg_temp.demo_field_value(_def jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  t         text := _def->>'type';
  fkey      text := COALESCE(_def->>'key', '');
  enum_vals jsonb := _def->'enum';
  n         int;
BEGIN
  IF enum_vals IS NOT NULL AND jsonb_typeof(enum_vals) = 'array' AND jsonb_array_length(enum_vals) > 0 THEN
    n := jsonb_array_length(enum_vals);
    RETURN enum_vals -> (floor(random() * n))::int;
  END IF;

  IF t = 'number' THEN
    IF fkey ILIKE '%temp%' THEN
      RETURN to_jsonb(round((22 + random() * 10)::numeric, 1));
    ELSIF fkey ILIKE '%freq%' THEN
      RETURN to_jsonb(50);
    ELSIF fkey ILIKE '%year%' THEN
      RETURN to_jsonb(2014 + floor(random() * 10)::int);
    ELSIF fkey ILIKE '%volt%' THEN
      RETURN to_jsonb(round((100 + random() * 320)::numeric, 1));
    ELSIF fkey = 'val_600s' OR fkey ILIKE '%600s%' THEN
      RETURN to_jsonb(round((600 + random() * 1400)::numeric, 1));
    ELSIF fkey ILIKE '%val_60s%' OR fkey ILIKE '%ir_%' OR fkey ILIKE '%mohm%' OR fkey ILIKE '%resistance%' THEN
      RETURN to_jsonb(round((300 + random() * 700)::numeric, 1));
    ELSIF fkey ILIKE '%burden%' OR fkey ILIKE '%_va' THEN
      RETURN to_jsonb(round((5 + random() * 25)::numeric, 1));
    ELSE
      RETURN to_jsonb(round((random() * 100)::numeric, 2));
    END IF;
  ELSIF t = 'date' THEN
    RETURN to_jsonb(to_char((NOW() - (floor(random() * 25))::int * INTERVAL '1 day')::date, 'YYYY-MM-DD'));
  ELSE
    -- string
    IF fkey ILIKE '%serial%' THEN
      RETURN to_jsonb('SN-' || floor(random() * 900000 + 100000)::text);
    ELSIF fkey ILIKE '%manufactur%' THEN
      RETURN to_jsonb((ARRAY['BHEL','ABB','Siemens Energy','Crompton Greaves','TBEA'])[floor(random() * 5 + 1)::int]);
    ELSIF fkey ILIKE '%witness%' OR fkey ILIKE '%testing_done_by%' THEN
      RETURN to_jsonb((ARRAY['R. Sharma','A. Iyer','P. Nair','S. Khan','M. Verma','V. Rao','K. Joshi','D. Patel','N. Singh','T. Gupta','J. Reddy','L. Menon'])[floor(random() * 12 + 1)::int]);
    ELSIF fkey ILIKE '%location%' OR fkey ILIKE '%bay%' THEN
      RETURN to_jsonb('Bay ' || floor(random() * 8 + 1)::text);
    ELSIF fkey ILIKE '%customer%' THEN
      RETURN to_jsonb('Needli Power Transmission'::text);
    ELSIF fkey ILIKE '%project_name%' THEN
      RETURN to_jsonb('400/220kV Substation - Pune'::text);
    ELSE
      RETURN to_jsonb('N/A'::text);
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.demo_gen_payload(_fields jsonb, _complete boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result    jsonb := '{}'::jsonb;
  sections  jsonb;
  sec       jsonb;
  fld       jsonb;
  col       jsonb;
  row_      jsonb;
  ph        text;
  core_lbl  text;
  phases    text[];
  core_arr  text[];
  sec_id    text;
  sec_type  text;
  n         int;
  i         int;
  tap_default  int;
  core_default int;
  rows_out  jsonb;
  row_obj   jsonb;
BEGIN
  IF _fields IS NULL THEN RETURN '{}'::jsonb; END IF;
  IF jsonb_typeof(_fields) = 'array' THEN RETURN '{}'::jsonb; END IF;
  IF (_fields->>'version') IS DISTINCT FROM '2' THEN
    -- Unknown/legacy schema shape — don't fabricate a payload against it.
    RETURN '{}'::jsonb;
  END IF;

  sections := _fields->'sections';
  IF sections IS NULL OR jsonb_typeof(sections) <> 'array' THEN RETURN '{}'::jsonb; END IF;

  FOR sec IN SELECT * FROM jsonb_array_elements(sections)
  LOOP
    sec_id   := sec->>'id';
    sec_type := sec->>'type';

    IF sec_type = 'fields' THEN
      FOR fld IN SELECT * FROM jsonb_array_elements(COALESCE(sec->'fields', '[]'::jsonb))
      LOOP
        IF _complete OR ((fld->>'required')::boolean IS TRUE) OR random() < 0.5 THEN
          result := jsonb_set(result, ARRAY[sec_id || '__' || (fld->>'key')], pg_temp.demo_field_value(fld), true);
        END IF;
      END LOOP;

    ELSIF sec_type = 'phase_columns' THEN
      phases := ARRAY(SELECT jsonb_array_elements_text(COALESCE(sec->'phases', '["R","Y","B"]'::jsonb)));
      FOR fld IN SELECT * FROM jsonb_array_elements(COALESCE(sec->'fields', '[]'::jsonb))
      LOOP
        FOREACH ph IN ARRAY phases LOOP
          IF _complete OR ((fld->>'required')::boolean IS TRUE) OR random() < 0.5 THEN
            result := jsonb_set(result, ARRAY[sec_id || '__' || ph || '__' || (fld->>'key')], pg_temp.demo_field_value(fld), true);
          END IF;
        END LOOP;
      END LOOP;

    ELSIF sec_type = 'phase_rows' THEN
      phases := ARRAY(SELECT jsonb_array_elements_text(COALESCE(sec->'phases', '["R","Y","B"]'::jsonb)));
      FOREACH ph IN ARRAY phases LOOP
        FOR col IN SELECT * FROM jsonb_array_elements(COALESCE(sec->'columns', '[]'::jsonb))
        LOOP
          IF NOT COALESCE((col->>'calculated')::boolean, false) AND (_complete OR random() < 0.5) THEN
            result := jsonb_set(result, ARRAY[sec_id || '__' || ph || '__' || (col->>'key')], pg_temp.demo_field_value(col), true);
          END IF;
        END LOOP;
      END LOOP;

    ELSIF sec_type = 'tap_table' THEN
      tap_default := COALESCE((sec->>'tap_count_default')::int, 17);
      FOR i IN 1..LEAST(tap_default, 3) LOOP
        FOR col IN SELECT * FROM jsonb_array_elements(COALESCE(sec->'columns', '[]'::jsonb))
        LOOP
          IF NOT COALESCE((col->>'calculated')::boolean, false) THEN
            result := jsonb_set(result, ARRAY[sec_id || '__tap' || i || '__' || (col->>'key')], pg_temp.demo_field_value(col), true);
          END IF;
        END LOOP;
      END LOOP;

    ELSIF sec_type = 'dynamic_table' THEN
      n := COALESCE((sec->>'default_rows')::int, 1);
      rows_out := '[]'::jsonb;
      FOR i IN 1..n LOOP
        row_obj := '{}'::jsonb;
        FOR col IN SELECT * FROM jsonb_array_elements(COALESCE(sec->'columns', '[]'::jsonb))
        LOOP
          IF NOT COALESCE((col->>'calculated')::boolean, false) THEN
            row_obj := jsonb_set(row_obj, ARRAY[col->>'key'], pg_temp.demo_field_value(col), true);
          END IF;
        END LOOP;
        rows_out := rows_out || jsonb_build_array(row_obj);
      END LOOP;
      result := jsonb_set(result, ARRAY[sec_id || '__rows'], rows_out, true);

    ELSIF sec_type = 'core_table' THEN
      core_default := COALESCE((sec->>'num_cores_default')::int, 4);
      FOR i IN 1..core_default LOOP
        FOR col IN SELECT * FROM jsonb_array_elements(COALESCE(sec->'columns', '[]'::jsonb))
        LOOP
          IF NOT COALESCE((col->>'calculated')::boolean, false) THEN
            result := jsonb_set(result, ARRAY[sec_id || '__core' || i || '__' || (col->>'key')], pg_temp.demo_field_value(col), true);
          END IF;
        END LOOP;
      END LOOP;

    ELSIF sec_type = 'core_phase_table' THEN
      core_arr := ARRAY(SELECT jsonb_array_elements_text(COALESCE(sec->'cores', '["1S1 - 1S2","2S1 - 2S2","3S1 - 3S2","4S1 - 4S2"]'::jsonb)));
      phases   := ARRAY(SELECT jsonb_array_elements_text(COALESCE(sec->'phases', '["R","Y","B"]'::jsonb)));
      FOR i IN 1..COALESCE(array_length(core_arr, 1), 0) LOOP
        FOREACH ph IN ARRAY phases LOOP
          FOR col IN SELECT * FROM jsonb_array_elements(COALESCE(sec->'columns', '[]'::jsonb))
          LOOP
            IF NOT COALESCE((col->>'calculated')::boolean, false) THEN
              result := jsonb_set(result, ARRAY[sec_id || '__' || (i - 1)::text || '__' || ph || '__' || (col->>'key')], pg_temp.demo_field_value(col), true);
            END IF;
          END LOOP;
        END LOOP;
      END LOOP;

    ELSIF sec_type = 'phase_core_upload' THEN
      phases   := ARRAY(SELECT jsonb_array_elements_text(COALESCE(sec->'phases', '["R","Y","B"]'::jsonb)));
      core_arr := ARRAY(SELECT jsonb_array_elements_text(COALESCE(sec->'cores', '["Core 1","Core 2","Core 3","Core 4"]'::jsonb)));
      IF _complete THEN
        FOREACH ph IN ARRAY phases LOOP
          FOREACH core_lbl IN ARRAY core_arr LOOP
            result := jsonb_set(result, ARRAY[sec_id || '__' || ph || '__' || core_lbl], to_jsonb('CT-Report-' || ph || '-' || core_lbl || '.pdf'), true);
          END LOOP;
        END LOOP;
      END IF;

    ELSIF sec_type = 'ir_fixed' THEN
      FOR row_ IN SELECT * FROM jsonb_array_elements(COALESCE(sec->'rows', '[]'::jsonb))
      LOOP
        FOR col IN SELECT * FROM jsonb_array_elements(COALESCE(sec->'columns', '[]'::jsonb))
        LOOP
          -- Skip the calculated PI column — the frontend derives it from val_60s/val_600s.
          IF NOT (COALESCE((col->>'calculated')::boolean, false) AND COALESCE(col->>'formula', '') LIKE '%val_600s%') THEN
            IF _complete OR random() < 0.6 THEN
              result := jsonb_set(result, ARRAY[sec_id || '__' || (row_->>'id') || '__' || (col->>'key')], pg_temp.demo_field_value(col), true);
            END IF;
          END IF;
        END LOOP;
      END LOOP;

    ELSIF sec_type = 'ir_fixed_phase' THEN
      phases := ARRAY(SELECT jsonb_array_elements_text(COALESCE(sec->'phases', '["R","Y","B"]'::jsonb)));
      FOR row_ IN SELECT * FROM jsonb_array_elements(COALESCE(sec->'rows', '[]'::jsonb))
      LOOP
        FOREACH ph IN ARRAY phases LOOP
          IF _complete OR random() < 0.6 THEN
            result := jsonb_set(result, ARRAY[sec_id || '__' || (row_->>'id') || '__' || ph], to_jsonb(round((100 + random() * 4900)::numeric, 1)), true);
          END IF;
        END LOOP;
      END LOOP;
    END IF;
  END LOOP;

  RETURN result;
END;
$$;


-- =============================================================================
-- SEED
-- =============================================================================

DO $$
DECLARE
  v_company_id UUID;
  v_project_id UUID;
  v_admin_id   UUID;
  v_task_count INT;
  v_rework_ids UUID[];
  v_reasons    TEXT[] := ARRAY[
    'IR values on Phase Y fall below the acceptance threshold — retest after cleaning bushings.',
    'Tan delta reading inconsistent with baseline; suspect moisture ingress, re-run after drying.',
    'Winding resistance deviation exceeds 2% between phases — verify connections and repeat.',
    'Contact resistance reading missing for open condition — engineer must complete before resubmission.',
    'Nameplate serial number does not match site register; confirm correct unit and refile.',
    'Ratio test result outside nameplate tolerance — recheck tap position and retest.'
  ];
  rec RECORD;
  v_payload JSONB;
  v_instrument TEXT;
  v_pass_fail TEXT;
  v_remarks TEXT;
BEGIN
  SELECT id INTO v_company_id FROM companies WHERE slug = 'demo';
  IF v_company_id IS NULL THEN
    RETURN; -- demo org migration hasn't run in this environment; nothing to do
  END IF;

  SELECT id INTO v_project_id FROM projects
    WHERE company_id = v_company_id AND project_number = 'DEMO-001';
  IF v_project_id IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@demo.com';
  IF v_admin_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_task_count
  FROM test_tasks tt
  JOIN equipment_instances ei ON ei.id = tt.equipment_instance_id
  WHERE ei.project_id = v_project_id;

  IF v_task_count > 0 THEN
    RETURN; -- already seeded, no-op
  END IF;

  -- Enable every active template for the 7 equipment types in this project's
  -- scope, mirroring what a GM configures via the testing-scope UI.
  INSERT INTO project_test_scope (project_id, equipment_type, test_template_id, is_enabled)
  SELECT v_project_id, tmpl.equipment_type, tmpl.id, TRUE
  FROM test_templates tmpl
  WHERE tmpl.is_active = TRUE
    AND tmpl.equipment_type IN ('POWER_TRANSFORMER','CT','CVT','LA','SF6_BREAKER','ISOLATOR','EARTH_PIT')
  ON CONFLICT (project_id, test_template_id) DO NOTHING;

  -- One test_task per (equipment_instance x enabled template) — same join
  -- generate_project_equipment() uses internally.
  INSERT INTO test_tasks (equipment_instance_id, test_template_id, status, assigned_to)
  SELECT ei.id, pts.test_template_id, 'DRAFT', v_admin_id
  FROM equipment_instances ei
  JOIN project_test_scope pts
    ON pts.project_id = v_project_id
   AND pts.equipment_type = ei.equipment_type
   AND pts.is_enabled = TRUE
  WHERE ei.project_id = v_project_id;

  -- Assign a realistic status distribution: exactly 6 REWORK (randomly
  -- selected), the rest split APPROVED-majority / SUBMITTED / IN_PROGRESS /
  -- DRAFT so the project reads as an in-flight commissioning job.
  WITH scoped AS (
    SELECT tt.id
    FROM test_tasks tt
    JOIN equipment_instances ei ON ei.id = tt.equipment_instance_id
    WHERE ei.project_id = v_project_id
  ),
  ordered AS (
    SELECT id, row_number() OVER (ORDER BY random()) AS rn, count(*) OVER () AS total
    FROM scoped
  ),
  assigned AS (
    UPDATE test_tasks t
    SET
      status = CASE
        WHEN o.rn <= 6 THEN 'REWORK'
        WHEN o.rn <= 6 + round(0.66 * (o.total - 6)) THEN 'APPROVED'
        WHEN o.rn <= 6 + round(0.80 * (o.total - 6)) THEN 'SUBMITTED'
        WHEN o.rn <= 6 + round(0.93 * (o.total - 6)) THEN 'IN_PROGRESS'
        ELSE 'DRAFT'
      END::test_status,
      version = CASE WHEN o.rn <= 6 THEN 2 ELSE 1 END
    FROM ordered o
    WHERE o.id = t.id
    RETURNING t.id, t.status, o.rn
  )
  SELECT array_agg(id ORDER BY rn) INTO v_rework_ids FROM assigned WHERE status = 'REWORK';

  -- Timestamps consistent with each task's status.
  UPDATE test_tasks t
  SET
    started_at   = CASE WHEN t.status IN ('IN_PROGRESS','SUBMITTED','APPROVED','REWORK')
                        THEN NOW() - (5 + floor(random() * 20))::int * INTERVAL '1 day' END,
    submitted_at = CASE WHEN t.status IN ('SUBMITTED','APPROVED','REWORK')
                        THEN NOW() - (2 + floor(random() * 10))::int * INTERVAL '1 day' END,
    approved_at  = CASE WHEN t.status = 'APPROVED'
                        THEN NOW() - floor(random() * 5)::int * INTERVAL '1 day' END
  FROM equipment_instances ei
  WHERE ei.id = t.equipment_instance_id AND ei.project_id = v_project_id;

  -- Attach the 6 rework reasons.
  IF v_rework_ids IS NOT NULL THEN
    FOR v_idx IN 1..array_length(v_rework_ids, 1) LOOP
      UPDATE test_tasks SET rework_reason = v_reasons[v_idx] WHERE id = v_rework_ids[v_idx];
    END LOOP;
  END IF;

  -- One test_record per non-DRAFT task, payload built by walking the
  -- template's live `fields` JSON (see pg_temp.demo_gen_payload above).
  FOR rec IN
    SELECT tt.id AS task_id, tmpl.fields, tt.status, tt.rework_reason
    FROM test_tasks tt
    JOIN equipment_instances ei ON ei.id = tt.equipment_instance_id
    JOIN test_templates tmpl ON tmpl.id = tt.test_template_id
    WHERE ei.project_id = v_project_id
      AND tt.status <> 'DRAFT'
  LOOP
    v_payload := pg_temp.demo_gen_payload(rec.fields, rec.status <> 'IN_PROGRESS');

    v_instrument := (ARRAY['Megger MIT525','Omicron CPC 100','AVO Biddle','Doble M4000','Baker DX'])[floor(random() * 5 + 1)::int];

    IF rec.status = 'REWORK' THEN
      v_pass_fail := 'FAIL';
      v_remarks   := rec.rework_reason;
    ELSIF random() < 0.08 THEN
      v_pass_fail := 'MARGINAL';
      v_remarks   := 'Within limits but close to threshold; recommend monitoring at next cycle.';
    ELSE
      v_pass_fail := 'PASS';
      v_remarks   := NULL;
    END IF;

    INSERT INTO test_records (test_task_id, payload, instrument_id, pass_fail, remarks, created_by)
    VALUES (rec.task_id, v_payload, v_instrument, v_pass_fail, v_remarks, v_admin_id)
    ON CONFLICT (test_task_id) DO NOTHING;
  END LOOP;
END $$;


-- Session-local helper functions — drop so they don't linger in pg_temp
-- beyond this migration's connection.
DROP FUNCTION IF EXISTS pg_temp.demo_gen_payload(jsonb, boolean);
DROP FUNCTION IF EXISTS pg_temp.demo_field_value(jsonb);
