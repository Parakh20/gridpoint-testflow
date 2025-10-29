-- Add APPROVED status to project_status enum
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'APPROVED' AFTER 'DRAFT';

-- Add approval tracking fields to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id);

-- Add comment for clarity
COMMENT ON COLUMN projects.approved_at IS 'Timestamp when the project was approved';
COMMENT ON COLUMN projects.approved_by IS 'User who approved the project';