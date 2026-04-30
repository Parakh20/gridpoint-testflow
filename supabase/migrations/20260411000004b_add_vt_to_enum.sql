-- Pre-commit 'VT' into the equipment_type enum before migration 20260411000005
-- attempts to INSERT rows using it.
--
-- PostgreSQL does not allow using a newly-added enum value in the same
-- transaction that added it. By isolating the ALTER TYPE here (its own
-- migration = its own transaction), the value is fully committed before
-- 20260411000005 runs its INSERT statements.
ALTER TYPE equipment_type ADD VALUE IF NOT EXISTS 'VT';
