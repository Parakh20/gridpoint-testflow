-- =============================================================================
-- Migration: Initial Schema
-- Description: Core enums, tables, RLS policies, triggers, and seed data
--              for Power Transformer test templates.
-- =============================================================================


-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE app_role       AS ENUM ('SUPERADMIN', 'GM', 'SUPERVISOR', 'ENGINEER');
CREATE TYPE project_status AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');
CREATE TYPE instance_status AS ENUM (
  'UNASSIGNED', 'ASSIGNED', 'IN_PROGRESS',
  'SUBMITTED', 'APPROVED', 'REWORK', 'CANCELLED', 'DEFERRED'
);
CREATE TYPE test_status    AS ENUM ('DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REWORK');
CREATE TYPE equipment_type AS ENUM (
  'POWER_TRANSFORMER', 'CT', 'CVT', 'LA',
  'SF6_BREAKER', 'ISOLATOR', 'VCB', 'EARTH_PIT'
);


-- =============================================================================
-- TABLES
-- =============================================================================

-- User roles (separate from profiles for security)
CREATE TABLE user_roles (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       app_role    NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, role)
);

-- User profiles (auto-created on signup via trigger)
CREATE TABLE profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  project_number TEXT           NOT NULL UNIQUE,
  site_name      TEXT           NOT NULL,
  site_address   TEXT           NOT NULL,
  client         TEXT,
  status         project_status NOT NULL DEFAULT 'DRAFT',
  start_date     DATE,
  end_date       DATE,
  created_by     UUID           NOT NULL REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Equipment scope per project (one row per equipment type)
CREATE TABLE scope_items (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID           NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  equipment_type equipment_type NOT NULL,
  quantity       INTEGER        NOT NULL CHECK (quantity >= 0),
  version        INTEGER        NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  UNIQUE (project_id, equipment_type)
);

-- Individual equipment instances generated from scope
CREATE TABLE equipment_instances (
  id             UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID            NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scope_item_id  UUID            NOT NULL REFERENCES scope_items(id) ON DELETE CASCADE,
  equipment_type equipment_type  NOT NULL,
  seq_number     INTEGER         NOT NULL,
  label          TEXT            NOT NULL,
  status         instance_status NOT NULL DEFAULT 'UNASSIGNED',
  assigned_to    UUID            REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  UNIQUE (project_id, equipment_type, seq_number)
);

-- Test templates: define which tests apply to each equipment type
CREATE TABLE test_templates (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_type equipment_type NOT NULL,
  test_code      TEXT           NOT NULL,
  test_name      TEXT           NOT NULL,
  fields         JSONB          NOT NULL,
  tab            TEXT           NOT NULL CHECK (tab IN ('NAMEPLATE', 'PARAMETERS', 'OVERVIEW')),
  is_active      BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  UNIQUE (equipment_type, test_code)
);

-- Test tasks: one task per (equipment instance × test template)
CREATE TABLE test_tasks (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_instance_id UUID        NOT NULL REFERENCES equipment_instances(id) ON DELETE CASCADE,
  test_template_id      UUID        NOT NULL REFERENCES test_templates(id),
  assigned_to           UUID        REFERENCES auth.users(id),
  status                test_status NOT NULL DEFAULT 'DRAFT',
  started_at            TIMESTAMPTZ,
  submitted_at          TIMESTAMPTZ,
  approved_at           TIMESTAMPTZ,
  version               INTEGER     NOT NULL DEFAULT 1,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Nameplate data captured for each equipment instance
CREATE TABLE nameplate_records (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_instance_id UUID        NOT NULL REFERENCES equipment_instances(id) ON DELETE CASCADE,
  payload               JSONB       NOT NULL,
  instrument_id         TEXT,
  created_by            UUID        NOT NULL REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (equipment_instance_id)
);

-- Test results submitted for each test task
CREATE TABLE test_records (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  test_task_id  UUID        NOT NULL REFERENCES test_tasks(id) ON DELETE CASCADE,
  payload       JSONB       NOT NULL,
  ambient       JSONB,
  instrument_id TEXT,
  pass_fail     TEXT,
  remarks       TEXT,
  created_by    UUID        NOT NULL REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Immutable audit trail for all significant actions
CREATE TABLE audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID        REFERENCES auth.users(id),
  entity_type TEXT        NOT NULL,
  entity_id   UUID        NOT NULL,
  action      TEXT        NOT NULL,
  before_data JSONB,
  after_data  JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Check if a user has a specific role (used in RLS policies)
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   user_roles
    WHERE  user_id = _user_id
    AND    role    = _role
  );
$$;

-- Automatically update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create a profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email
  );
  RETURN NEW;
END;
$$;


-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_instances_updated_at
  BEFORE UPDATE ON equipment_instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_tasks_updated_at
  BEFORE UPDATE ON test_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nameplate_records_updated_at
  BEFORE UPDATE ON nameplate_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_records_updated_at
  BEFORE UPDATE ON test_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE user_roles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE nameplate_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_records        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs          ENABLE ROW LEVEL SECURITY;

-- user_roles
CREATE POLICY "Users can view their own roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can manage all roles"
  ON user_roles FOR ALL
  USING (has_role(auth.uid(), 'SUPERADMIN'));

-- profiles
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Superadmins can manage all profiles"
  ON profiles FOR ALL
  USING (has_role(auth.uid(), 'SUPERADMIN'));

-- projects
CREATE POLICY "Projects viewable by authenticated users"
  ON projects FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "GM can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'GM') OR
    has_role(auth.uid(), 'SUPERADMIN')
  );

CREATE POLICY "GM can update their projects"
  ON projects FOR UPDATE
  USING (
    (created_by = auth.uid() AND has_role(auth.uid(), 'GM')) OR
    has_role(auth.uid(), 'SUPERADMIN')
  );

-- scope_items
CREATE POLICY "Scope items viewable by authenticated users"
  ON scope_items FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "GM can manage scope items"
  ON scope_items FOR ALL
  USING (
    has_role(auth.uid(), 'GM') OR
    has_role(auth.uid(), 'SUPERADMIN')
  );

-- equipment_instances
CREATE POLICY "Equipment instances viewable by authenticated users"
  ON equipment_instances FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Supervisors can manage equipment instances"
  ON equipment_instances FOR ALL
  USING (
    has_role(auth.uid(), 'SUPERVISOR') OR
    has_role(auth.uid(), 'GM')         OR
    has_role(auth.uid(), 'SUPERADMIN')
  );

-- test_templates
CREATE POLICY "Test templates viewable by all authenticated users"
  ON test_templates FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Superadmins can manage test templates"
  ON test_templates FOR ALL
  USING (has_role(auth.uid(), 'SUPERADMIN'));

-- test_tasks
CREATE POLICY "Test tasks viewable by authenticated users"
  ON test_tasks FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Engineers can update assigned test tasks"
  ON test_tasks FOR UPDATE
  USING (
    assigned_to = auth.uid()           OR
    has_role(auth.uid(), 'SUPERVISOR') OR
    has_role(auth.uid(), 'GM')         OR
    has_role(auth.uid(), 'SUPERADMIN')
  );

-- nameplate_records
CREATE POLICY "Nameplate records viewable by authenticated users"
  ON nameplate_records FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Engineers can manage nameplate records"
  ON nameplate_records FOR ALL
  USING (
    has_role(auth.uid(), 'ENGINEER')   OR
    has_role(auth.uid(), 'SUPERVISOR') OR
    has_role(auth.uid(), 'GM')         OR
    has_role(auth.uid(), 'SUPERADMIN')
  );

-- test_records
CREATE POLICY "Test records viewable by authenticated users"
  ON test_records FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Engineers can manage test records"
  ON test_records FOR ALL
  USING (
    has_role(auth.uid(), 'ENGINEER')   OR
    has_role(auth.uid(), 'SUPERVISOR') OR
    has_role(auth.uid(), 'GM')         OR
    has_role(auth.uid(), 'SUPERADMIN')
  );

-- audit_logs
CREATE POLICY "Audit logs viewable by supervisors and above"
  ON audit_logs FOR SELECT
  USING (
    has_role(auth.uid(), 'SUPERVISOR') OR
    has_role(auth.uid(), 'GM')         OR
    has_role(auth.uid(), 'SUPERADMIN')
  );

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (TRUE);


-- =============================================================================
-- SEED DATA: Power Transformer test templates (initial set)
-- Note: Superseded by migration 20251029122853 which replaces all templates.
-- =============================================================================

INSERT INTO test_templates (equipment_type, test_code, test_name, fields, tab) VALUES

('POWER_TRANSFORMER', 'VOLTAGE_RATIO', 'Voltage Ratio Test', '{
  "type": "object",
  "properties": {
    "tapPosition":     {"type": "string", "title": "Tap Position"},
    "nominalHV":       {"type": "number", "title": "Nominal HV (kV)",    "minimum": 0},
    "nominalLV":       {"type": "number", "title": "Nominal LV (kV)",    "minimum": 0},
    "measuredRatio":   {"type": "number", "title": "Measured Ratio"},
    "calculatedRatio": {"type": "number", "title": "Calculated Ratio"},
    "error":           {"type": "number", "title": "Error (%)"},
    "limit":           {"type": "number", "title": "Limit (%)"}
  },
  "required": ["tapPosition", "measuredRatio"]
}', 'PARAMETERS'),

('POWER_TRANSFORMER', 'HV_MAGNETIZING', 'HV Magnetizing Current', '{
  "type": "object",
  "properties": {
    "phase":           {"type": "string", "enum": ["A", "B", "C"], "title": "Phase"},
    "voltageApplied":  {"type": "number", "title": "Voltage Applied (V)"},
    "current":         {"type": "number", "title": "Current (mA)"},
    "limit":           {"type": "number", "title": "Limit (mA)"}
  },
  "required": ["phase", "current"]
}', 'PARAMETERS'),

('POWER_TRANSFORMER', 'WINDING_RESISTANCE', 'Winding Resistance', '{
  "type": "object",
  "properties": {
    "winding":         {"type": "string", "enum": ["HV", "LV"], "title": "Winding"},
    "tap":             {"type": "string", "title": "Tap"},
    "phase":           {"type": "string", "enum": ["A", "B", "C"], "title": "Phase"},
    "testCurrent":     {"type": "number", "title": "Test Current (A)"},
    "temperature":     {"type": "number", "title": "Temperature (°C)"},
    "resistance":      {"type": "number", "title": "Resistance (mΩ)"},
    "correctedTo75C":  {"type": "number", "title": "Corrected to 75°C (mΩ)"},
    "limit":           {"type": "number", "title": "Limit (mΩ)"}
  },
  "required": ["winding", "phase", "resistance"]
}', 'PARAMETERS'),

('POWER_TRANSFORMER', 'INSULATION_RESISTANCE', 'Insulation Resistance', '{
  "type": "object",
  "properties": {
    "testVoltage": {"type": "number", "title": "Test Voltage (kV)"},
    "oneMin":      {"type": "number", "title": "1 Min (MΩ)"},
    "tenMin":      {"type": "number", "title": "10 Min (MΩ)"},
    "pi":          {"type": "number", "title": "Polarization Index"},
    "limit":       {"type": "number", "title": "Limit"}
  },
  "required": ["testVoltage", "oneMin"]
}', 'PARAMETERS');
