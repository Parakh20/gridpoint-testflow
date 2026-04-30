-- pgcrypto is required by migration 20260429000001 for gen_salt('bf') / crypt().
CREATE EXTENSION IF NOT EXISTS pgcrypto;
