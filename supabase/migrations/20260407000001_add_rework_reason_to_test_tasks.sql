-- Add rework_reason column to test_tasks so supervisors can explain why a test was sent back
ALTER TABLE test_tasks ADD COLUMN IF NOT EXISTS rework_reason text;
