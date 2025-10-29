-- Create project_test_scope table to store which tests are enabled for each project
CREATE TABLE project_test_scope (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  equipment_type equipment_type NOT NULL,
  test_template_id uuid REFERENCES test_templates(id) ON DELETE CASCADE NOT NULL,
  is_enabled boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(project_id, test_template_id)
);

-- Enable RLS
ALTER TABLE project_test_scope ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view testing scope
CREATE POLICY "Testing scope viewable by authenticated users"
  ON project_test_scope
  FOR SELECT
  USING (true);

-- Allow GMs and above to manage testing scope
CREATE POLICY "GMs can manage testing scope"
  ON project_test_scope
  FOR ALL
  USING (
    has_role(auth.uid(), 'GM'::app_role) OR 
    has_role(auth.uid(), 'SUPERADMIN'::app_role)
  );

-- Create index for faster queries
CREATE INDEX idx_project_test_scope_project_id ON project_test_scope(project_id);
CREATE INDEX idx_project_test_scope_equipment_type ON project_test_scope(project_id, equipment_type);