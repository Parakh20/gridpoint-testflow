-- =============================================================================
-- Migration: Project Approval Status
-- Description: Adds APPROVED to project_status enum and approval tracking
--              columns to the projects table.
-- =============================================================================


-- =============================================================================
-- ENUM UPDATE
-- =============================================================================

ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'APPROVED' AFTER 'DRAFT';


-- =============================================================================
-- TABLE CHANGES
-- =============================================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS approved_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by  UUID REFERENCES profiles(id);

COMMENT ON COLUMN projects.approved_at IS 'Timestamp when the project was approved';
COMMENT ON COLUMN projects.approved_by IS 'User who approved the project';
