-- Platform admin panel needs INSERT and DELETE on the companies table.
--
-- SELECT is already covered by "companies_public_read_by_slug" (USING TRUE)
-- added in migration 20260422000001 — no duplicate needed.
--
-- INSERT: platform admin creates new tenant companies via the root-domain panel.
-- DELETE: platform admin removes companies (FK constraints prevent deletion if
--         associated profiles/projects still exist — safe default behaviour).

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'companies' AND policyname = 'companies_platform_insert'
  ) THEN
    CREATE POLICY "companies_platform_insert"
      ON companies FOR INSERT
      TO anon
      WITH CHECK (TRUE);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'companies' AND policyname = 'companies_platform_delete'
  ) THEN
    CREATE POLICY "companies_platform_delete"
      ON companies FOR DELETE
      TO anon
      USING (TRUE);
  END IF;
END $$;
