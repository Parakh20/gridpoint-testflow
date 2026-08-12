-- Enforce active-project plan limit at the RLS layer on projects INSERT.
--
-- The existing "projects_insert_gm" policy (created in
-- 20260422000001_add_companies_and_multitenancy.sql) is the currently
-- effective INSERT policy on `projects`. This migration replaces it with
-- an identical tenant/role check ANDed with can_create_project() (added in
-- 20260812000003_entitlement_functions.sql), which blocks INSERT once the
-- company's plan-defined active-project limit is reached.

DROP POLICY IF EXISTS "projects_insert_gm" ON projects;

CREATE POLICY "projects_insert_gm"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'GM') OR has_role(auth.uid(), 'SUPERADMIN'))
    AND company_id = my_company_id()
    AND can_create_project()
  );
