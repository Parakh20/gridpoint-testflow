-- Migration: Add instruments table for trackable test equipment
-- Enables reuse of instrument IDs across test records with calibration tracking

CREATE TABLE instruments (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number       TEXT        NOT NULL,
  type                TEXT        NOT NULL,
  make                TEXT,
  model               TEXT,
  last_calibrated_at  DATE,
  calibration_due_at  DATE,
  owned_by            UUID        REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all instruments (shared resource)
CREATE POLICY "Authenticated users can view instruments"
  ON instruments FOR SELECT
  TO authenticated
  USING (TRUE);

-- Any authenticated user can insert instruments
CREATE POLICY "Authenticated users can insert instruments"
  ON instruments FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- Owners can update their own instruments; superadmins can update all
CREATE POLICY "Owners and superadmins can update instruments"
  ON instruments FOR UPDATE
  TO authenticated
  USING (owned_by = auth.uid() OR has_role(auth.uid(), 'SUPERADMIN'));
