-- =============================================================================
-- Migration: Grant UPDATE on companies + helper RPC for platform admin
-- =============================================================================

-- Missing from the original grants migration — required for service_role
-- to update via PostgREST (service_role bypasses RLS but still needs table privs
-- at the PostgreSQL level when going through the PostgREST layer).
GRANT UPDATE ON public.companies TO service_role, authenticated;

-- Dedicated SECURITY DEFINER function so the edge function can toggle
-- is_active without worrying about PostgREST schema-cache staleness.
-- Runs as the function owner (postgres / superuser), always has full access.
CREATE OR REPLACE FUNCTION set_company_active(p_company_id UUID, p_is_active BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE companies SET is_active = p_is_active WHERE id = p_company_id;
END;
$$;

-- Only service_role (edge functions) should call this.
REVOKE ALL ON FUNCTION set_company_active(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_company_active(UUID, BOOLEAN) TO service_role;

-- Ensure service_role can also update is_active (added for idempotency)
GRANT UPDATE (is_active) ON public.companies TO service_role;
