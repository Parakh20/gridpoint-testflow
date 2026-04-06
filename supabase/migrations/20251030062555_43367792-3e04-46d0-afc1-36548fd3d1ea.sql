-- =============================================================================
-- Migration: GM Project Assignment
-- Description: Adds assigned_to (supervisor) field to projects, creates
--              supervisor_assignments table for GM-Supervisor relationships,
--              and adds audit trigger for assignment changes.
-- =============================================================================


-- =============================================================================
-- TABLE CHANGES
-- =============================================================================

-- Allow a GM to assign a supervisor to a project
ALTER TABLE projects
  ADD COLUMN assigned_to UUID REFERENCES auth.users(id);

CREATE INDEX idx_projects_assigned_to ON projects (assigned_to);


-- =============================================================================
-- SUPERVISOR ASSIGNMENTS TABLE
-- =============================================================================

-- Tracks which supervisors are managed by which GM
CREATE TABLE supervisor_assignments (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gm_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supervisor_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by    UUID        NOT NULL REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (gm_id, supervisor_id)
);


-- =============================================================================
-- ROW LEVEL SECURITY: supervisor_assignments
-- =============================================================================

ALTER TABLE supervisor_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "GMs can manage their supervisor assignments"
  ON supervisor_assignments FOR ALL
  USING (
    gm_id = auth.uid() OR
    has_role(auth.uid(), 'SUPERADMIN'::app_role)
  );

CREATE POLICY "Supervisors can view their assignments"
  ON supervisor_assignments FOR SELECT
  USING (supervisor_id = auth.uid());


-- =============================================================================
-- RLS POLICY UPDATES: projects
-- =============================================================================

-- Supervisors and GMs need explicit SELECT access to assigned projects
CREATE POLICY "Supervisors can view assigned projects"
  ON projects FOR SELECT
  USING (
    assigned_to = auth.uid()                        OR
    has_role(auth.uid(), 'GM'::app_role)            OR
    has_role(auth.uid(), 'SUPERVISOR'::app_role)    OR
    has_role(auth.uid(), 'SUPERADMIN'::app_role)
  );

CREATE POLICY "Supervisors can update assigned projects"
  ON projects FOR UPDATE
  USING (
    assigned_to = auth.uid()                                              OR
    (created_by = auth.uid() AND has_role(auth.uid(), 'GM'::app_role))   OR
    has_role(auth.uid(), 'SUPERADMIN'::app_role)
  );


-- =============================================================================
-- AUDIT TRIGGER: project assignment changes
-- =============================================================================

CREATE OR REPLACE FUNCTION log_project_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    INSERT INTO audit_logs (
      entity_type,
      entity_id,
      action,
      actor_id,
      before_data,
      after_data
    ) VALUES (
      'project',
      NEW.id,
      'assignment_changed',
      auth.uid(),
      jsonb_build_object('assigned_to', OLD.assigned_to),
      jsonb_build_object('assigned_to', NEW.assigned_to)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_project_assignment
  AFTER UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION log_project_assignment();
