-- PostgREST requires explicit GRANT for a role to see a table in the schema cache,
-- separate from RLS policies. Without this, the client gets
-- "Could not find the table 'public.companies' in the schema cache".

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.companies TO anon, authenticated;
GRANT INSERT ON public.companies TO anon;
GRANT DELETE ON public.companies TO anon;
