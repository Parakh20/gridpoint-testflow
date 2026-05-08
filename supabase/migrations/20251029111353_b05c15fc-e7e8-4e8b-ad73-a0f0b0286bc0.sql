-- =============================================================================
-- Migration: Project Delete Policy
-- Description: Allows GMs to delete their own projects, and SUPERADMIN to
--              delete any project.
-- =============================================================================

CREATE POLICY "GM can delete projects"
  ON public.projects FOR DELETE
  USING (
    (created_by = auth.uid() AND has_role(auth.uid(), 'GM'::app_role)) OR
    has_role(auth.uid(), 'SUPERADMIN'::app_role)
  );
