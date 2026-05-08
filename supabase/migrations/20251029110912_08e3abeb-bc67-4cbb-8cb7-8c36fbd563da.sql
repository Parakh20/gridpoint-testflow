-- =============================================================================
-- Migration: Enable Realtime for Projects
-- Description: Subscribes the projects table to the Supabase Realtime
--              publication so clients receive live updates on INSERT/UPDATE.
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
