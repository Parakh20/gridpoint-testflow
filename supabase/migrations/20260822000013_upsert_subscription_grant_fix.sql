-- Security fix found while wiring the Razorpay checkout flow: migration
-- 20260814000002 added a 10th parameter (_event_created_at) to
-- upsert_subscription via CREATE OR REPLACE FUNCTION. Postgres treats a
-- changed parameter list as a NEW overloaded function, not a true replace —
-- so the REVOKE ALL FROM PUBLIC / GRANT TO service_role done for the old
-- 9-arg signature in 20260813000005_final_review_fixes.sql never applied to
-- this one. The 10-arg overload (the one actually called by
-- razorpay-webhook and manage-subscription today) has carried Postgres's
-- default PUBLIC EXECUTE grant since 20260814000002 shipped — any
-- authenticated (or even anon, depending on role config) caller could spoof
-- subscription state for an arbitrary company_id.
REVOKE ALL ON FUNCTION upsert_subscription(UUID,TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ,TIMESTAMPTZ,INT,JSONB,TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_subscription(UUID,TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ,TIMESTAMPTZ,INT,JSONB,TIMESTAMPTZ) TO service_role;
