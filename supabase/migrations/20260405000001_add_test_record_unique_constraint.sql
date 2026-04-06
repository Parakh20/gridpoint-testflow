-- =============================================================================
-- Migration: Unique Constraint on test_records.test_task_id
-- Description: Enforces one test_record per test_task (upsert pattern).
--              Deduplicates any existing rows first by keeping only the most
--              recently updated record per task.
-- =============================================================================


-- =============================================================================
-- DEDUPLICATION
-- =============================================================================

-- If multiple records exist for the same task (pre-constraint data),
-- delete all but the most recently updated one.
DELETE FROM test_records
WHERE id NOT IN (
  SELECT DISTINCT ON (test_task_id) id
  FROM   test_records
  ORDER  BY test_task_id, updated_at DESC
);


-- =============================================================================
-- CONSTRAINT
-- =============================================================================

ALTER TABLE test_records
  ADD CONSTRAINT test_records_test_task_id_key UNIQUE (test_task_id);
