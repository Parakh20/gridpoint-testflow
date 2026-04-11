-- Add nameplate JSONB column to equipment_instances for storing asset identification data
ALTER TABLE equipment_instances
  ADD COLUMN IF NOT EXISTS nameplate JSONB NOT NULL DEFAULT '{}';
