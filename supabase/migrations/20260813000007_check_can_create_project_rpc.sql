-- Frontend-facing pre-check before the projects insert. Purely
-- informational — the projects_insert_gm RLS policy (Plan 1, Task 4)
-- is the real gate. This exists so NewProject.tsx can show the
-- UpgradeModal with real numbers *before* attempting the insert,
-- instead of parsing a generic RLS rejection message.
CREATE OR REPLACE FUNCTION check_can_create_project()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_resource_limit_status('projects', my_company_id());
$$;

GRANT EXECUTE ON FUNCTION check_can_create_project() TO authenticated;
