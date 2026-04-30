-- =============================================================================
-- Migration: Security hardening + demo tenant seed
-- Date: 2026-04-29
-- =============================================================================
-- This migration does two things:
--
-- 1. SECURITY HARDENING — tightens RLS policies that previously had no
--    WITH CHECK clause, blocking these privilege-escalation paths:
--    a) A user could update their own profiles.company_id to another
--       company's UUID. Since my_company_id() reads from profiles, this
--       would have given full read access to that other company's data.
--       (Critical cross-tenant data breach.)
--    b) A SUPERADMIN could move profiles to another company via UPDATE.
--    c) Stricter user_roles, projects update checks.
--
-- 2. DEMO TENANT SEED — provisions companyA / companyB / companyC plus
--    one SUPERADMIN per company so the app can be demoed end-to-end with
--    real tenant isolation. Idempotent: re-running does nothing on rows
--    that already exist.
--
-- WARNING: the demo passwords below are intentionally simple and live in
-- a git-tracked migration. Rotate them via the User Management dashboard
-- BEFORE handing the URL to a real prospect.
-- =============================================================================


-- =============================================================================
-- PART 1 — RLS HARDENING
-- =============================================================================

-- ── profiles: prevent self-escalation by changing own company_id ──────────────
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND (
      -- new company_id must equal the existing company_id (no cross-tenant move)
      company_id IS NOT DISTINCT FROM (SELECT company_id FROM profiles WHERE id = auth.uid())
    )
  );

-- ── profiles: SUPERADMIN must keep rows inside their own company ──────────────
DROP POLICY IF EXISTS "profiles_superadmin_manage" ON profiles;
CREATE POLICY "profiles_superadmin_manage"
  ON profiles FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'SUPERADMIN')
    AND company_id = my_company_id()
  )
  WITH CHECK (
    has_role(auth.uid(), 'SUPERADMIN')
    AND company_id = my_company_id()
  );

-- ── user_roles: SUPERADMIN cannot assign roles in another company ─────────────
DROP POLICY IF EXISTS "user_roles_superadmin_manage" ON user_roles;
CREATE POLICY "user_roles_superadmin_manage"
  ON user_roles FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'SUPERADMIN')
    AND company_id = my_company_id()
  )
  WITH CHECK (
    has_role(auth.uid(), 'SUPERADMIN')
    AND company_id = my_company_id()
  );

-- ── projects: tighten UPDATE WITH CHECK so company_id can't be moved ──────────
DROP POLICY IF EXISTS "projects_update_gm" ON projects;
CREATE POLICY "projects_update_gm"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    company_id = my_company_id()
    AND (
      (created_by = auth.uid() AND has_role(auth.uid(), 'GM'))
      OR has_role(auth.uid(), 'SUPERADMIN')
    )
  )
  WITH CHECK (
    company_id = my_company_id()
    AND (
      (created_by = auth.uid() AND has_role(auth.uid(), 'GM'))
      OR has_role(auth.uid(), 'SUPERADMIN')
    )
  );

-- ── audit_logs: never visible across companies ────────────────────────────────
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (company_id = my_company_id());


-- =============================================================================
-- PART 2 — SEED COMPANIES + SUPERADMINS
-- =============================================================================

INSERT INTO companies (name, slug) VALUES
  ('Company A', 'companya'),
  ('Company B', 'companyb'),
  ('Company C', 'companyc')
ON CONFLICT (slug) DO NOTHING;


-- Helper: create or upgrade a SUPERADMIN for a given company.
DO $$
DECLARE
  v_company RECORD;
  v_email   TEXT;
  v_pass    TEXT;
  v_user_id UUID;
BEGIN
  FOR v_company IN
    SELECT id, slug, name FROM companies WHERE slug IN ('companya', 'companyb', 'companyc')
  LOOP
    v_email := 'admin@' || v_company.slug || '.com';
    -- Demo password pattern: rotate after sales handover.
    v_pass  := 'Demo' || INITCAP(v_company.slug) || '2026!';

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
        jsonb_build_object('name', v_company.name || ' Admin'),
        '', '', '', '', ''
      );

      -- auth.identities: required for sign-in in newer Supabase auth versions.
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

      RAISE NOTICE 'Created SUPERADMIN % for %', v_email, v_company.name;
    ELSE
      RAISE NOTICE 'SUPERADMIN % already exists, ensuring company linkage', v_email;
    END IF;

    -- Ensure profile exists and is linked to the right company.
    -- handle_new_user trigger creates the profile on auth.users insert; we
    -- update it here to attach company_id and a friendly name.
    INSERT INTO profiles (id, name, email, company_id)
    VALUES (v_user_id, v_company.name || ' Admin', v_email, v_company.id)
    ON CONFLICT (id) DO UPDATE
      SET company_id = EXCLUDED.company_id,
          name       = EXCLUDED.name,
          email      = EXCLUDED.email;

    -- Ensure SUPERADMIN role is assigned in the right company.
    INSERT INTO user_roles (user_id, role, company_id)
    VALUES (v_user_id, 'SUPERADMIN', v_company.id)
    ON CONFLICT (user_id, role) DO UPDATE
      SET company_id = EXCLUDED.company_id;
  END LOOP;
END $$;


-- =============================================================================
-- DEMO LOGIN CREDENTIALS (rotate after first use)
-- =============================================================================
-- Company A:  admin@companya.com  /  DemoCompanya2026!
-- Company B:  admin@companyb.com  /  DemoCompanyb2026!
-- Company C:  admin@companyc.com  /  DemoCompanyc2026!
-- =============================================================================
