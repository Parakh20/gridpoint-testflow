-- Strengthen audit_logs INSERT policy to also enforce actor_id = auth.uid().
-- Previously only company_id was checked, allowing any company member to
-- fabricate entries with another user's actor_id.
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = my_company_id()
    AND actor_id = auth.uid()
  );
