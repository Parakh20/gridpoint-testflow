-- =============================================================================
-- Migration: Grant full CRUD on billing-internal tables to service_role
-- =============================================================================
--
-- Same root cause and precedent as 20260822000002 (companies grant):
-- service_role bypasses RLS but still needs base PostgreSQL table privileges
-- when going through the PostgREST layer (per 20260513000002's comment).
--
-- `plans`, `subscriptions`, `enterprise_contracts`, `billing_events`, and
-- `subscription_addons` are all billing-internal tables that only
-- service_role (Edge Functions) or narrowly-scoped RLS policies read/write
-- (e.g. `plans_public_read` for authenticated tenant users, `subscriptions`/
-- `enterprise_contracts` tenant-scoped SELECT policies) -- none of that
-- required an explicit service_role grant until
-- supabase/functions/_shared/test_helpers.ts (the billing/webhook Deno
-- integration test suite's fixture helper) started reading/writing these
-- tables directly via the standard service_role client, surfacing the gap
-- the first time that suite actually ran against a from-scratch database.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans                TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions        TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enterprise_contracts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_events       TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_addons  TO service_role;
