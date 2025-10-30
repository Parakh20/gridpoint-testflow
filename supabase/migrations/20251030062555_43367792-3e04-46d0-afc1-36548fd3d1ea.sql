-- Add assigned_to column to projects table
ALTER TABLE projects 
ADD COLUMN assigned_to uuid REFERENCES auth.users(id);

-- Create index for performance
CREATE INDEX idx_projects_assigned_to ON projects(assigned_to);

-- Create supervisor_assignments table for GM-Supervisor relationships
CREATE TABLE supervisor_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gm_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supervisor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  UNIQUE(gm_id, supervisor_id)
);

-- Enable RLS on supervisor_assignments
ALTER TABLE supervisor_assignments ENABLE ROW LEVEL SECURITY;

-- GMs can manage their supervisor assignments
CREATE POLICY "GMs can manage their supervisor assignments"
ON supervisor_assignments FOR ALL
USING (gm_id = auth.uid() OR has_role(auth.uid(), 'SUPERADMIN'::app_role));

-- Supervisors can view their assignments
CREATE POLICY "Supervisors can view their assignments"
ON supervisor_assignments FOR SELECT
USING (supervisor_id = auth.uid());

-- Update RLS policies for projects - Supervisors can view assigned projects
CREATE POLICY "Supervisors can view assigned projects"
ON projects FOR SELECT
USING (
  assigned_to = auth.uid() 
  OR has_role(auth.uid(), 'GM'::app_role) 
  OR has_role(auth.uid(), 'SUPERVISOR'::app_role)
  OR has_role(auth.uid(), 'SUPERADMIN'::app_role)
);

-- Supervisors can update assigned projects (limited fields)
CREATE POLICY "Supervisors can update assigned projects"
ON projects FOR UPDATE
USING (
  assigned_to = auth.uid() 
  OR ((created_by = auth.uid()) AND has_role(auth.uid(), 'GM'::app_role))
  OR has_role(auth.uid(), 'SUPERADMIN'::app_role)
);

-- Function to log project assignments
CREATE OR REPLACE FUNCTION log_project_assignment()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for project assignment logging
CREATE TRIGGER trigger_log_project_assignment
AFTER UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION log_project_assignment();