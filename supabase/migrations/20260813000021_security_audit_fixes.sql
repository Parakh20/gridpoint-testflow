-- =============================================================================
-- Pre-launch security audit fixes
-- =============================================================================
-- Findings from an adversarial cross-tenant / RBAC audit of every RLS policy,
-- SECURITY DEFINER function and Edge Function. Each section states the exploit
-- it closes. Nothing here touches the billing functions already corrected in
-- 20260813000019 — those were re-verified and are correct.


-- =============================================================================
-- C1 (CRITICAL) — projects: legacy pre-multitenancy policies were never dropped
-- =============================================================================
-- 20260422000001 dropped the legacy policies created in 20251029064345, but the
-- two created later in 20251030062555 survived. RLS policies are OR-combined,
-- so they re-opened the tenant boundary on the root table:
--
--   "Supervisors can view assigned projects"
--     USING (assigned_to = auth.uid() OR has_role(GM) OR has_role(SUPERVISOR)
--            OR has_role(SUPERADMIN))            -- no company_id predicate
--     Exploit: any GM/SUPERVISOR/SUPERADMIN of Company A runs
--       GET /rest/v1/projects?select=*
--     and receives every project row of every tenant (project_number,
--     site_name, site_address, client, dates).
--
--   "Supervisors can update assigned projects"
--     USING (assigned_to = auth.uid() OR (created_by = auth.uid() AND GM)
--            OR has_role(SUPERADMIN))            -- no company_id predicate,
--                                                -- and no WITH CHECK
--     Exploit: a SUPERADMIN of Company A runs
--       PATCH /rest/v1/projects?id=eq.<company B project uuid>
--       {"company_id":"<company A uuid>"}
--     and steals (or soft-deletes / re-statuses) another tenant's project.
--
-- projects_select_same_company already covers every in-company reader, so the
-- SELECT policy is dropped outright. The UPDATE policy is replaced with a
-- company-scoped equivalent so assigned SUPERVISORs keep their real capability.

DROP POLICY IF EXISTS "Supervisors can view assigned projects"   ON projects;
DROP POLICY IF EXISTS "Supervisors can update assigned projects" ON projects;

DROP POLICY IF EXISTS "projects_update_assigned_supervisor" ON projects;
CREATE POLICY "projects_update_assigned_supervisor"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    company_id = my_company_id()
    AND assigned_to = auth.uid()
  )
  WITH CHECK (
    company_id = my_company_id()
    AND assigned_to = auth.uid()
  );


-- =============================================================================
-- C2 (CRITICAL) — companies: anon could INSERT and DELETE any row
-- =============================================================================
-- 20260430000002 + 20260430000003 gave the anon role blanket INSERT/DELETE on
-- companies "for the platform admin panel". The panel does not use them: both
-- create-tenant and platform-admin-data act with the service-role key, which
-- bypasses RLS entirely.
--
--   Exploit: anyone holding the public anon key (it ships in the browser
--   bundle by design) runs
--     DELETE /rest/v1/companies?id=eq.<uuid>     (FK-protected only while the
--                                                 tenant still has rows)
--     POST   /rest/v1/companies {"name":"x","slug":"x"}   -- unbounded
--   i.e. unauthenticated tenant-row creation/deletion.

DROP POLICY IF EXISTS "companies_platform_insert" ON companies;
DROP POLICY IF EXISTS "companies_platform_delete" ON companies;

REVOKE INSERT, DELETE ON public.companies FROM anon;

-- Table-wide UPDATE was also granted to `authenticated` in 20260513000002.
-- No UPDATE policy exists so RLS blocks it, but the grant is not needed.
REVOKE UPDATE ON public.companies FROM authenticated;


-- =============================================================================
-- I-A (IMPORTANT) — companies: USING (TRUE) SELECT exposed business columns
-- =============================================================================
-- The broad read is required pre-login (subdomain -> company lookup), but it
-- also handed anon `trial_ends_at` and the `features` flag map for every
-- tenant. Row-level narrowing is impossible pre-auth, so narrow by column
-- instead: anon keeps only what CompanyContext needs; authenticated keeps the
-- extra two columns TrialBanner / lib/features.ts read for their own company.

REVOKE SELECT ON public.companies FROM anon, authenticated;

GRANT SELECT (id, name, slug, is_active, oauth_provisioning, allowed_domains)
  ON public.companies TO anon;

GRANT SELECT (id, name, slug, is_active, oauth_provisioning, allowed_domains,
              trial_ends_at, features)
  ON public.companies TO authenticated;


-- =============================================================================
-- C3 (CRITICAL) — test_templates: any tenant SUPERADMIN could edit the global
--                 catalogue every other tenant depends on
-- =============================================================================
--   "test_templates_superadmin_manage" FOR ALL USING (has_role(SUPERADMIN))
--   Exploit: a SUPERADMIN of Company A runs
--     DELETE /rest/v1/test_templates?id=neq.<nil uuid>
--   and destroys/rewrites the shared, company-less template catalogue for all
--   tenants (test_tasks.test_template_id is a FK, so this is a platform-wide
--   data-integrity and availability event).
--
-- Templates are seeded by migration and only ever read by the apps (verified:
-- no INSERT/UPDATE/DELETE call site in frontend/ or mobile/). Management moves
-- to service-role only, which needs no policy.

DROP POLICY IF EXISTS "test_templates_superadmin_manage" ON test_templates;


-- =============================================================================
-- I-B (IMPORTANT) — deactivated users and suspended companies kept full access
-- =============================================================================
-- profiles.is_active / companies.is_active were enforced only in the React
-- clients (AuthContext, CompanyContext). A user offboarded via offboard_user(),
-- or a tenant suspended from the platform panel, kept a valid JWT for up to an
-- hour (and could keep refreshing it), and every RLS policy still resolved
-- through my_company_id(). Direct PostgREST calls therefore continued to work.
--
-- my_company_id() is the single choke point used by every tenant policy, so the
-- check goes here: an inactive profile or an inactive company now resolves to
-- NULL, which every policy already treats as "sees nothing".
--
-- Self-read of profiles is unaffected (profiles_select_same_company has the
-- `OR id = auth.uid()` branch), so the client can still detect the state and
-- show its "account disabled" / "workspace suspended" screens.

CREATE OR REPLACE FUNCTION my_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.company_id
  FROM profiles p
  JOIN companies c ON c.id = p.company_id
  WHERE p.id = auth.uid()
    AND p.is_active
    AND c.is_active
$$;


-- =============================================================================
-- I-C (IMPORTANT) — profiles_update_own let a user re-enable themselves
-- =============================================================================
-- The WITH CHECK pinned company_id (anti-escalation, gotcha 8) but not
-- is_active or oauth_pending.
--   Exploit: a user deactivated by offboard_user(), or an OAuth user parked in
--   oauth_pending, runs
--     PATCH /rest/v1/profiles?id=eq.<self> {"is_active":true}
--   and reinstates their own account without an admin. With I-B above this is
--   now a full access-restoration primitive, so it must close in the same
--   migration.

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND company_id IS NOT DISTINCT FROM
        (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND is_active IS NOT DISTINCT FROM
        (SELECT is_active FROM profiles WHERE id = auth.uid())
    AND oauth_pending IS NOT DISTINCT FROM
        (SELECT oauth_pending FROM profiles WHERE id = auth.uid())
  );


-- =============================================================================
-- I-D (IMPORTANT) — ENGINEERs could approve their own work
-- =============================================================================
-- test_tasks_update_assigned lets `assigned_to = auth.uid()` update the row,
-- and RLS cannot restrict which columns change.
--   Exploit: an ENGINEER runs
--     PATCH /rest/v1/test_tasks?id=eq.<own task>
--     {"status":"APPROVED","approved_at":"..."}
--   and signs off their own commissioning test, bypassing the SUPERVISOR/GM
--   approval gate entirely (there is no status-transition trigger).
--
-- The USING clause is carried over verbatim from 20260528000001; the new part
-- is the WITH CHECK, which pins the APPROVED/REWORK terminal states to the
-- reviewing roles. Engineers keep DRAFT / IN_PROGRESS / SUBMITTED.

DROP POLICY IF EXISTS "test_tasks_update_assigned" ON test_tasks;

CREATE POLICY "test_tasks_update_assigned"
  ON test_tasks FOR UPDATE
  USING (
    (
      assigned_to = auth.uid()
      OR (
        has_role(auth.uid(), 'SUPERVISOR')
        AND EXISTS (
          SELECT 1
          FROM equipment_instances ei
          JOIN projects p ON p.id = ei.project_id
          WHERE ei.id = test_tasks.equipment_instance_id
            AND p.assigned_to = auth.uid()
            AND p.company_id = my_company_id()
        )
      )
      OR has_role(auth.uid(), 'GM')
      OR has_role(auth.uid(), 'SUPERADMIN')
    )
    AND equipment_instance_id IN (
      SELECT ei.id
      FROM equipment_instances ei
      JOIN projects p ON p.id = ei.project_id
      WHERE p.company_id = my_company_id()
    )
  )
  WITH CHECK (
    equipment_instance_id IN (
      SELECT ei.id
      FROM equipment_instances ei
      JOIN projects p ON p.id = ei.project_id
      WHERE p.company_id = my_company_id()
    )
    AND (
      status NOT IN ('APPROVED', 'REWORK')
      OR has_role(auth.uid(), 'SUPERVISOR')
      OR has_role(auth.uid(), 'GM')
      OR has_role(auth.uid(), 'SUPERADMIN')
    )
  );


-- =============================================================================
-- I-E (IMPORTANT) — any ENGINEER could write any colleague's results
-- =============================================================================
-- test_records_manage / nameplate_records_manage granted every ENGINEER in the
-- company write access to every record, not just their assigned tasks.
--   Exploit: engineer X runs
--     POST /rest/v1/test_records
--     {"test_task_id":"<task assigned to engineer Y>","payload":{...},
--      "pass_fail":"PASS"}
--     Prefer: resolution=merge-duplicates
--   overwriting (the table is UNIQUE on test_task_id, so writes are upserts)
--   another engineer's measured data on an unrelated project.
--
-- Same shape as the 20260528000001 test_tasks fix: ENGINEERs are narrowed to
-- work assigned to them; SUPERVISOR/GM/SUPERADMIN keep company-wide access.

DROP POLICY IF EXISTS "test_records_manage" ON test_records;
CREATE POLICY "test_records_manage"
  ON test_records FOR ALL
  TO authenticated
  USING (
    test_task_id IN (
      SELECT tt.id FROM test_tasks tt
      JOIN equipment_instances ei ON ei.id = tt.equipment_instance_id
      JOIN projects p ON p.id = ei.project_id
      WHERE p.company_id = my_company_id()
    )
    AND (
      has_role(auth.uid(), 'SUPERVISOR')
      OR has_role(auth.uid(), 'GM')
      OR has_role(auth.uid(), 'SUPERADMIN')
      OR EXISTS (
        SELECT 1 FROM test_tasks tt
        WHERE tt.id = test_records.test_task_id
          AND tt.assigned_to = auth.uid()
      )
    )
  )
  WITH CHECK (
    test_task_id IN (
      SELECT tt.id FROM test_tasks tt
      JOIN equipment_instances ei ON ei.id = tt.equipment_instance_id
      JOIN projects p ON p.id = ei.project_id
      WHERE p.company_id = my_company_id()
    )
    AND (
      has_role(auth.uid(), 'SUPERVISOR')
      OR has_role(auth.uid(), 'GM')
      OR has_role(auth.uid(), 'SUPERADMIN')
      OR EXISTS (
        SELECT 1 FROM test_tasks tt
        WHERE tt.id = test_records.test_task_id
          AND tt.assigned_to = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "nameplate_records_manage" ON nameplate_records;
CREATE POLICY "nameplate_records_manage"
  ON nameplate_records FOR ALL
  TO authenticated
  USING (
    equipment_instance_id IN (
      SELECT ei.id FROM equipment_instances ei
      JOIN projects p ON p.id = ei.project_id
      WHERE p.company_id = my_company_id()
    )
    AND (
      has_role(auth.uid(), 'SUPERVISOR')
      OR has_role(auth.uid(), 'GM')
      OR has_role(auth.uid(), 'SUPERADMIN')
      OR EXISTS (
        SELECT 1 FROM test_tasks tt
        WHERE tt.equipment_instance_id = nameplate_records.equipment_instance_id
          AND tt.assigned_to = auth.uid()
      )
    )
  )
  WITH CHECK (
    equipment_instance_id IN (
      SELECT ei.id FROM equipment_instances ei
      JOIN projects p ON p.id = ei.project_id
      WHERE p.company_id = my_company_id()
    )
    AND (
      has_role(auth.uid(), 'SUPERVISOR')
      OR has_role(auth.uid(), 'GM')
      OR has_role(auth.uid(), 'SUPERADMIN')
      OR EXISTS (
        SELECT 1 FROM test_tasks tt
        WHERE tt.equipment_instance_id = nameplate_records.equipment_instance_id
          AND tt.assigned_to = auth.uid()
      )
    )
  );


-- =============================================================================
-- I-F (IMPORTANT) — supervisor_assignments was not tenant-scoped
-- =============================================================================
-- The table has no company_id and its policies were
--   FOR ALL   USING (gm_id = auth.uid() OR has_role(SUPERADMIN))
--   FOR SELECT USING (supervisor_id = auth.uid())
--   Exploit: a SUPERADMIN of Company A runs
--     GET    /rest/v1/supervisor_assignments?select=*      -- every tenant's
--                                                          -- GM/supervisor graph
--     DELETE /rest/v1/supervisor_assignments?id=eq.<other tenant's row>
--
-- Scope every branch through profiles.company_id.

DROP POLICY IF EXISTS "GMs can manage their supervisor assignments" ON supervisor_assignments;
DROP POLICY IF EXISTS "Supervisors can view their assignments"      ON supervisor_assignments;

DROP POLICY IF EXISTS "supervisor_assignments_select_same_company" ON supervisor_assignments;
CREATE POLICY "supervisor_assignments_select_same_company"
  ON supervisor_assignments FOR SELECT
  TO authenticated
  USING (
    supervisor_id = auth.uid()
    OR gm_id = auth.uid()
    OR (
      has_role(auth.uid(), 'SUPERADMIN')
      AND gm_id IN (SELECT id FROM profiles WHERE company_id = my_company_id())
    )
  );

DROP POLICY IF EXISTS "supervisor_assignments_manage_same_company" ON supervisor_assignments;
CREATE POLICY "supervisor_assignments_manage_same_company"
  ON supervisor_assignments FOR ALL
  TO authenticated
  USING (
    (gm_id = auth.uid() OR has_role(auth.uid(), 'SUPERADMIN'))
    AND gm_id         IN (SELECT id FROM profiles WHERE company_id = my_company_id())
    AND supervisor_id IN (SELECT id FROM profiles WHERE company_id = my_company_id())
  )
  WITH CHECK (
    (gm_id = auth.uid() OR has_role(auth.uid(), 'SUPERADMIN'))
    AND gm_id         IN (SELECT id FROM profiles WHERE company_id = my_company_id())
    AND supervisor_id IN (SELECT id FROM profiles WHERE company_id = my_company_id())
  );


-- =============================================================================
-- I-G (IMPORTANT) — SECURITY DEFINER RPCs left executable by PUBLIC
-- =============================================================================
-- Postgres grants EXECUTE to PUBLIC on every new function. The billing series
-- handled this (20260813000005 / ...019); these four were missed and are the
-- same vulnerable shape: SECURITY DEFINER, an id parameter, no tenant guard.
--
--   claim_ai_report_lock / release_ai_report_lock (20260519000001)
--     Exploit: any authenticated user (any tenant) runs
--       POST /rest/v1/rpc/claim_ai_report_lock {"_project_id":"<any project>"}
--     to write ai_report_generating_at on another tenant's project — a rolling
--     denial of AI-report generation — or release_ai_report_lock(..., true) to
--     stamp a false ai_report_generated_at.
--
--   rate_limit_check / rate_limit_gc (20260519000003)
--     Exploit: any caller runs
--       POST /rest/v1/rpc/rate_limit_check
--            {"_key":"create-user:<victim uuid>|ip:<victim ip>",
--             "_limit":1,"_window_minutes":60}
--     in a loop to exhaust another user's create-user / generate-report budget,
--     or rate_limit_gc() to wipe the table and defeat every limit.
--
-- All four are only ever called by Edge Functions holding the service-role key.

REVOKE ALL ON FUNCTION claim_ai_report_lock(UUID)            FROM PUBLIC;
REVOKE ALL ON FUNCTION release_ai_report_lock(UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION rate_limit_check(TEXT, INT, INT)      FROM PUBLIC;
REVOKE ALL ON FUNCTION rate_limit_gc()                       FROM PUBLIC;

GRANT EXECUTE ON FUNCTION claim_ai_report_lock(UUID)            TO service_role;
GRANT EXECUTE ON FUNCTION release_ai_report_lock(UUID, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION rate_limit_check(TEXT, INT, INT)      TO service_role;
GRANT EXECUTE ON FUNCTION rate_limit_gc()                       TO service_role;


-- =============================================================================
-- I-H (IMPORTANT) — approve_oauth_user wrote role rows with a NULL company_id
-- =============================================================================
-- user_roles.company_id is nullable and is what user_roles_superadmin_manage
-- filters on. A role granted through approve_oauth_user therefore landed
-- outside every RLS policy: has_role() still honoured it (it only matches
-- user_id + role), but no SUPERADMIN could ever list or revoke it through the
-- API — an un-removable grant, including an un-removable SUPERADMIN grant.
-- Stamp the approving admin's company on the row.

CREATE OR REPLACE FUNCTION public.approve_oauth_user(
  _user_id uuid,
  _role    text DEFAULT 'ENGINEER'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_company uuid;
  _user_company   uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'SUPERADMIN'
  ) THEN
    RAISE EXCEPTION 'Forbidden: SUPERADMIN role required';
  END IF;

  IF _role NOT IN ('ENGINEER', 'SUPERVISOR', 'GM', 'SUPERADMIN') THEN
    RAISE EXCEPTION 'Invalid role: %', _role;
  END IF;

  SELECT company_id INTO _caller_company FROM profiles WHERE id = auth.uid();
  SELECT company_id INTO _user_company   FROM profiles WHERE id = _user_id;

  IF _caller_company IS NULL OR _caller_company != _user_company THEN
    RAISE EXCEPTION 'Forbidden: user not in your company';
  END IF;

  UPDATE public.profiles
  SET oauth_pending = false,
      is_active     = true
  WHERE id = _user_id;

  INSERT INTO public.user_roles (user_id, role, company_id)
  VALUES (_user_id, _role, _caller_company)
  ON CONFLICT (user_id, role) DO UPDATE SET company_id = EXCLUDED.company_id;
END;
$$;

-- Backfill any role rows already orphaned by the old function or by
-- provision-oauth-user (fixed in the same commit).
UPDATE user_roles ur
SET company_id = p.company_id
FROM profiles p
WHERE p.id = ur.user_id
  AND ur.company_id IS NULL
  AND p.company_id IS NOT NULL;
