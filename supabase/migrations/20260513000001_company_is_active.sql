-- =============================================================================
-- Migration: Add is_active flag to companies for suspension/payment gating
-- =============================================================================

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Index for fast lookup in CompanyContext (slug + is_active check)
CREATE INDEX IF NOT EXISTS companies_slug_active_idx ON companies (slug, is_active);
