-- Speed up company-scoped login check: profiles.company_id is queried on every
-- sign-in to verify the user belongs to the subdomain's company.
CREATE INDEX IF NOT EXISTS profiles_company_id_idx ON profiles (company_id);
