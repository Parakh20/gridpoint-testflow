-- =============================================================================
-- Migration: Project Test Scope
-- Description: Adds project_test_scope table to track which test templates are
--              enabled per project, allowing per-project test customisation.
-- =============================================================================


-- =============================================================================
-- TABLE
-- =============================================================================

CREATE TABLE project_test_scope (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID           NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  equipment_type   equipment_type NOT NULL,
  test_template_id UUID           NOT NULL REFERENCES test_templates(id) ON DELETE CASCADE,
  is_enabled       BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  UNIQUE (project_id, test_template_id)
);


-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_project_test_scope_project_id
  ON project_test_scope (project_id);

CREATE INDEX idx_project_test_scope_equipment_type
  ON project_test_scope (project_id, equipment_type);


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE project_test_scope ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Testing scope viewable by authenticated users"
  ON project_test_scope FOR SELECT
  USING (TRUE);

CREATE POLICY "GMs can manage testing scope"
  ON project_test_scope FOR ALL
  USING (
    has_role(auth.uid(), 'GM'::app_role) OR
    has_role(auth.uid(), 'SUPERADMIN'::app_role)
  );
