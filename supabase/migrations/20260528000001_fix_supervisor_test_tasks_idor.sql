-- Fix IDOR: scope SUPERVISOR test_tasks UPDATE to their assigned projects only.
--
-- Before: has_role(auth.uid(), 'SUPERVISOR') allowed any supervisor in the
-- company to approve/rework any submitted task — including tasks on projects
-- assigned to other supervisors.
--
-- After: SUPERVISORs can only UPDATE tasks whose equipment_instance belongs to
-- a project where p.assigned_to = auth.uid(). GMs and SUPERADMINs are unchanged
-- (company-wide access). Engineers can still update their own assigned tasks.

DROP POLICY IF EXISTS "test_tasks_update_assigned" ON test_tasks;

CREATE POLICY "test_tasks_update_assigned"
  ON test_tasks FOR UPDATE
  USING (
    (
      -- Engineers: own assigned tasks only
      assigned_to = auth.uid()

      OR

      -- Supervisors: tasks in projects assigned specifically to them
      (
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

      OR

      -- GMs and SUPERADMINs: any task in their company (unchanged)
      has_role(auth.uid(), 'GM')
      OR has_role(auth.uid(), 'SUPERADMIN')
    )

    -- All roles: task must belong to the caller's company (multi-tenant guard)
    AND equipment_instance_id IN (
      SELECT ei.id
      FROM equipment_instances ei
      JOIN projects p ON p.id = ei.project_id
      WHERE p.company_id = my_company_id()
    )
  );
