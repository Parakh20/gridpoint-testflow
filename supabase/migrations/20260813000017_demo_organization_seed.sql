-- Demo Organization: realistic-looking tenant for sales screenshots/demos
-- (spec §28). Mirrors the companya/companyb/companyc seeding pattern from
-- 20260429000001_security_hardening_and_demo_seed.sql exactly.

INSERT INTO companies (name, slug) VALUES
  ('Needli Grid Services', 'demo')
ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE
  v_company_id UUID;
  v_user_id    UUID;
  v_project_id UUID;
  v_email      TEXT := 'admin@demo.com';
  v_pass       TEXT := 'DemoNeedli2026!';
BEGIN
  SELECT id INTO v_company_id FROM companies WHERE slug = 'demo';

  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token,
      email_change_token_new, email_change, email_change_token_current
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated', 'authenticated',
      v_email,
      extensions.crypt(v_pass, extensions.gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', 'Demo Admin'),
      '', '', '', '', ''
    );

    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_user_id::text,
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
      'email',
      NOW(), NOW(), NOW()
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created SUPERADMIN % for Demo Organization', v_email;
  END IF;

  INSERT INTO profiles (id, name, email, company_id)
  VALUES (v_user_id, 'Demo Admin', v_email, v_company_id)
  ON CONFLICT (id) DO UPDATE
    SET company_id = EXCLUDED.company_id,
        name       = EXCLUDED.name,
        email      = EXCLUDED.email;

  INSERT INTO user_roles (user_id, role, company_id)
  VALUES (v_user_id, 'SUPERADMIN', v_company_id)
  ON CONFLICT (user_id, role) DO UPDATE
    SET company_id = EXCLUDED.company_id;

  -- One flagship project: "400/220kV Substation" per spec §28's screenshot narrative.
  SELECT id INTO v_project_id FROM projects
    WHERE company_id = v_company_id AND project_number = 'DEMO-001';

  IF v_project_id IS NULL THEN
    -- site_address is NOT NULL with no default (see
    -- 20251029064345_c6b443b9-e03a-4f74-b71e-ba24db8ca5bb.sql) and was never
    -- relaxed by a later migration — must be supplied here even though the
    -- plan's Task 2 SQL omitted it.
    INSERT INTO projects (company_id, project_number, site_name, site_address, client, status, created_by)
    VALUES (v_company_id, 'DEMO-001', '400/220kV Substation', 'Plot 14, MIDC Industrial Area, Pune, Maharashtra 411019', 'Needli Power Transmission', 'ACTIVE', v_user_id)
    RETURNING id INTO v_project_id;

    -- Scope sized to land at 37 equipment instances total, matching the
    -- spec's "37 Equipment" screenshot narrative: 8 PTR + 6 CT + 6 CVT +
    -- 4 LA + 5 SF6 + 4 ISO + 4 EP = 37.
    INSERT INTO scope_items (project_id, equipment_type, quantity) VALUES
      (v_project_id, 'POWER_TRANSFORMER', 8),
      (v_project_id, 'CT', 6),
      (v_project_id, 'CVT', 6),
      (v_project_id, 'LA', 4),
      (v_project_id, 'SF6_BREAKER', 5),
      (v_project_id, 'ISOLATOR', 4),
      (v_project_id, 'EARTH_PIT', 4)
    ON CONFLICT (project_id, equipment_type) DO NOTHING;

    -- Reuse the existing idempotent RPC rather than hand-inserting
    -- equipment_instances rows — it already handles auto-labeling
    -- (PTR-001 etc.) and the FOR UPDATE lock correctly.
    PERFORM generate_project_equipment(v_project_id);
  END IF;
END $$;
