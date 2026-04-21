-- =============================================================================
-- Migration: Multi-Tenancy — Companies + company_id isolation
-- Description: Adds companies table, company_id to root-level tables,
--              my_company_id() helper, and rewrites all RLS policies to
--              enforce per-company data isolation.
-- =============================================================================


-- =============================================================================
-- COMPANIES TABLE
-- =============================================================================

CREATE TABLE companies (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  slug       TEXT        NOT NULL UNIQUE,  -- maps to subdomain: "powergrid" → powergrid.testflow.io
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Users can read their own company's record (needed for sign-in page company name)
CREATE POLICY "companies_public_read_by_slug"
  ON companies FOR SELECT
  USING (TRUE);

-- Only service role (Edge Functions) can insert/update companies
-- No INSERT/UPDATE/DELETE policy for regular users


-- =============================================================================
-- ADD company_id TO ROOT-LEVEL TABLES
-- =============================================================================

-- Nullable first so existing rows don't violate the constraint
ALTER TABLE profiles        ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE user_roles      ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE projects        ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE audit_logs      ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE instruments     ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Child tables (scope_items, project_test_scope, equipment_instances,
-- test_tasks, nameplate_records, test_records) are isolated via FK chain
-- to projects.company_id — no extra column needed.


-- =============================================================================
-- HELPER FUNCTION: my_company_id()
-- Returns the company_id of the currently authenticated user.
-- SECURITY DEFINER lets it bypass RLS on profiles to always succeed.
-- =============================================================================

CREATE OR REPLACE FUNCTION my_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid()
$$;


-- =============================================================================
-- DROP OLD RLS POLICIES
-- We drop by name so the new company-scoped ones can replace them cleanly.
-- =============================================================================

-- user_roles
DROP POLICY IF EXISTS "Users can view their own roles"         ON user_roles;
DROP POLICY IF EXISTS "Superadmins can manage all roles"       ON user_roles;

-- profiles
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile"           ON profiles;
DROP POLICY IF EXISTS "Superadmins can manage all profiles"          ON profiles;

-- projects
DROP POLICY IF EXISTS "Projects viewable by authenticated users" ON projects;
DROP POLICY IF EXISTS "GM can create projects"                   ON projects;
DROP POLICY IF EXISTS "GM can update their projects"             ON projects;
DROP POLICY IF EXISTS "GM can delete projects"                   ON projects;

-- scope_items
DROP POLICY IF EXISTS "Scope items viewable by authenticated users" ON scope_items;
DROP POLICY IF EXISTS "GM can manage scope items"                   ON scope_items;

-- project_test_scope
DROP POLICY IF EXISTS "Testing scope viewable by authenticated users" ON project_test_scope;
DROP POLICY IF EXISTS "GMs can manage testing scope"                  ON project_test_scope;

-- equipment_instances
DROP POLICY IF EXISTS "Equipment instances viewable by authenticated users" ON equipment_instances;
DROP POLICY IF EXISTS "Supervisors can manage equipment instances"          ON equipment_instances;

-- test_tasks
DROP POLICY IF EXISTS "Test tasks viewable by authenticated users"    ON test_tasks;
DROP POLICY IF EXISTS "Engineers can update assigned test tasks"       ON test_tasks;

-- nameplate_records
DROP POLICY IF EXISTS "Nameplate records viewable by authenticated users" ON nameplate_records;
DROP POLICY IF EXISTS "Engineers can manage nameplate records"            ON nameplate_records;

-- test_records
DROP POLICY IF EXISTS "Test records viewable by authenticated users" ON test_records;
DROP POLICY IF EXISTS "Engineers can manage test records"            ON test_records;

-- audit_logs
DROP POLICY IF EXISTS "Audit logs viewable by supervisors and above" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs"                 ON audit_logs;

-- instruments
DROP POLICY IF EXISTS "Authenticated users can view instruments"          ON instruments;
DROP POLICY IF EXISTS "Authenticated users can insert instruments"         ON instruments;
DROP POLICY IF EXISTS "Owners and superadmins can update instruments"      ON instruments;


-- =============================================================================
-- NEW COMPANY-SCOPED RLS POLICIES
-- =============================================================================

-- ── user_roles ────────────────────────────────────────────────────────────────

CREATE POLICY "user_roles_select_own"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "user_roles_superadmin_manage"
  ON user_roles FOR ALL
  USING (
    has_role(auth.uid(), 'SUPERADMIN')
    AND company_id = my_company_id()
  );


-- ── profiles ──────────────────────────────────────────────────────────────────

-- Users see only colleagues in their own company
CREATE POLICY "profiles_select_same_company"
  ON profiles FOR SELECT
  TO authenticated
  USING (company_id = my_company_id() OR id = auth.uid());

-- Users update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- SUPERADMIN manages profiles within their company only
CREATE POLICY "profiles_superadmin_manage"
  ON profiles FOR ALL
  USING (
    has_role(auth.uid(), 'SUPERADMIN')
    AND company_id = my_company_id()
  );


-- ── projects ──────────────────────────────────────────────────────────────────

CREATE POLICY "projects_select_same_company"
  ON projects FOR SELECT
  TO authenticated
  USING (company_id = my_company_id());

CREATE POLICY "projects_insert_gm"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'GM') OR has_role(auth.uid(), 'SUPERADMIN'))
    AND company_id = my_company_id()
  );

CREATE POLICY "projects_update_gm"
  ON projects FOR UPDATE
  USING (
    company_id = my_company_id()
    AND (
      (created_by = auth.uid() AND has_role(auth.uid(), 'GM'))
      OR has_role(auth.uid(), 'SUPERADMIN')
    )
  );

CREATE POLICY "projects_delete_gm"
  ON projects FOR DELETE
  USING (
    company_id = my_company_id()
    AND (
      (created_by = auth.uid() AND has_role(auth.uid(), 'GM'))
      OR has_role(auth.uid(), 'SUPERADMIN')
    )
  );


-- ── scope_items ───────────────────────────────────────────────────────────────
-- Protected via FK chain: scope_items.project_id → projects.company_id

CREATE POLICY "scope_items_select_same_company"
  ON scope_items FOR SELECT
  TO authenticated
  USING (
    project_id IN (SELECT id FROM projects WHERE company_id = my_company_id())
  );

CREATE POLICY "scope_items_gm_manage"
  ON scope_items FOR ALL
  USING (
    (has_role(auth.uid(), 'GM') OR has_role(auth.uid(), 'SUPERADMIN'))
    AND project_id IN (SELECT id FROM projects WHERE company_id = my_company_id())
  );


-- ── project_test_scope ────────────────────────────────────────────────────────

CREATE POLICY "project_test_scope_select_same_company"
  ON project_test_scope FOR SELECT
  TO authenticated
  USING (
    project_id IN (SELECT id FROM projects WHERE company_id = my_company_id())
  );

CREATE POLICY "project_test_scope_gm_manage"
  ON project_test_scope FOR ALL
  USING (
    (has_role(auth.uid(), 'GM') OR has_role(auth.uid(), 'SUPERADMIN'))
    AND project_id IN (SELECT id FROM projects WHERE company_id = my_company_id())
  );


-- ── equipment_instances ───────────────────────────────────────────────────────

CREATE POLICY "equipment_instances_select_same_company"
  ON equipment_instances FOR SELECT
  TO authenticated
  USING (
    project_id IN (SELECT id FROM projects WHERE company_id = my_company_id())
  );

CREATE POLICY "equipment_instances_manage_supervisor"
  ON equipment_instances FOR ALL
  USING (
    (
      has_role(auth.uid(), 'SUPERVISOR') OR
      has_role(auth.uid(), 'GM')         OR
      has_role(auth.uid(), 'SUPERADMIN')
    )
    AND project_id IN (SELECT id FROM projects WHERE company_id = my_company_id())
  );


-- ── test_templates ────────────────────────────────────────────────────────────
-- Global library — no company isolation; shared across all tenants

CREATE POLICY "test_templates_select_authenticated"
  ON test_templates FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "test_templates_superadmin_manage"
  ON test_templates FOR ALL
  USING (has_role(auth.uid(), 'SUPERADMIN'));


-- ── test_tasks ────────────────────────────────────────────────────────────────

CREATE POLICY "test_tasks_select_same_company"
  ON test_tasks FOR SELECT
  TO authenticated
  USING (
    equipment_instance_id IN (
      SELECT ei.id FROM equipment_instances ei
      JOIN projects p ON p.id = ei.project_id
      WHERE p.company_id = my_company_id()
    )
  );

CREATE POLICY "test_tasks_insert_gm_supervisor"
  ON test_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      has_role(auth.uid(), 'GM')         OR
      has_role(auth.uid(), 'SUPERVISOR') OR
      has_role(auth.uid(), 'SUPERADMIN')
    )
    AND equipment_instance_id IN (
      SELECT ei.id FROM equipment_instances ei
      JOIN projects p ON p.id = ei.project_id
      WHERE p.company_id = my_company_id()
    )
  );

CREATE POLICY "test_tasks_update_assigned"
  ON test_tasks FOR UPDATE
  USING (
    (
      assigned_to = auth.uid()           OR
      has_role(auth.uid(), 'SUPERVISOR') OR
      has_role(auth.uid(), 'GM')         OR
      has_role(auth.uid(), 'SUPERADMIN')
    )
    AND equipment_instance_id IN (
      SELECT ei.id FROM equipment_instances ei
      JOIN projects p ON p.id = ei.project_id
      WHERE p.company_id = my_company_id()
    )
  );


-- ── nameplate_records ─────────────────────────────────────────────────────────

CREATE POLICY "nameplate_records_select_same_company"
  ON nameplate_records FOR SELECT
  TO authenticated
  USING (
    equipment_instance_id IN (
      SELECT ei.id FROM equipment_instances ei
      JOIN projects p ON p.id = ei.project_id
      WHERE p.company_id = my_company_id()
    )
  );

CREATE POLICY "nameplate_records_manage"
  ON nameplate_records FOR ALL
  USING (
    (
      has_role(auth.uid(), 'ENGINEER')   OR
      has_role(auth.uid(), 'SUPERVISOR') OR
      has_role(auth.uid(), 'GM')         OR
      has_role(auth.uid(), 'SUPERADMIN')
    )
    AND equipment_instance_id IN (
      SELECT ei.id FROM equipment_instances ei
      JOIN projects p ON p.id = ei.project_id
      WHERE p.company_id = my_company_id()
    )
  );


-- ── test_records ──────────────────────────────────────────────────────────────

CREATE POLICY "test_records_select_same_company"
  ON test_records FOR SELECT
  TO authenticated
  USING (
    test_task_id IN (
      SELECT tt.id FROM test_tasks tt
      JOIN equipment_instances ei ON ei.id = tt.equipment_instance_id
      JOIN projects p ON p.id = ei.project_id
      WHERE p.company_id = my_company_id()
    )
  );

CREATE POLICY "test_records_manage"
  ON test_records FOR ALL
  USING (
    (
      has_role(auth.uid(), 'ENGINEER')   OR
      has_role(auth.uid(), 'SUPERVISOR') OR
      has_role(auth.uid(), 'GM')         OR
      has_role(auth.uid(), 'SUPERADMIN')
    )
    AND test_task_id IN (
      SELECT tt.id FROM test_tasks tt
      JOIN equipment_instances ei ON ei.id = tt.equipment_instance_id
      JOIN projects p ON p.id = ei.project_id
      WHERE p.company_id = my_company_id()
    )
  );


-- ── audit_logs ────────────────────────────────────────────────────────────────

CREATE POLICY "audit_logs_select_supervisors"
  ON audit_logs FOR SELECT
  USING (
    company_id = my_company_id()
    AND (
      has_role(auth.uid(), 'SUPERVISOR') OR
      has_role(auth.uid(), 'GM')         OR
      has_role(auth.uid(), 'SUPERADMIN')
    )
  );

CREATE POLICY "audit_logs_insert"
  ON audit_logs FOR INSERT
  WITH CHECK (company_id = my_company_id());


-- ── instruments ───────────────────────────────────────────────────────────────

CREATE POLICY "instruments_select_same_company"
  ON instruments FOR SELECT
  TO authenticated
  USING (company_id = my_company_id());

CREATE POLICY "instruments_insert_same_company"
  ON instruments FOR INSERT
  TO authenticated
  WITH CHECK (company_id = my_company_id());

CREATE POLICY "instruments_update_owner_or_superadmin"
  ON instruments FOR UPDATE
  TO authenticated
  USING (
    company_id = my_company_id()
    AND (owned_by = auth.uid() OR has_role(auth.uid(), 'SUPERADMIN'))
  );


-- =============================================================================
-- UPDATE handle_new_user TRIGGER
-- company_id stays NULL until the Edge Function sets it after admin creation.
-- This is safe: NULL company means no RLS policies match, so the user sees
-- nothing until they are assigned to a company.
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, name, email, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email,
    NULL  -- set by create-user Edge Function immediately after
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
