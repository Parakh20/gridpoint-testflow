-- Basic company details captured at self-serve trial signup (start-trial),
-- used for sales qualification and billing/timezone context.
--
-- Deliberately NOT added to the anon/authenticated column grants from
-- 20260813000021: the `companies` SELECT policy is USING (TRUE) (anon needs
-- to resolve a slug pre-login), so row-level narrowing is impossible and
-- column grants are the only boundary. Granting these to `authenticated`
-- would let any signed-in user of any tenant read every other company's
-- phone number, size, and industry. These stay service-role only, which is
-- how they're consumed (platform-admin-data / the Sales tab).
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS phone        TEXT,
  ADD COLUMN IF NOT EXISTS company_size TEXT,
  ADD COLUMN IF NOT EXISTS industry     TEXT,
  ADD COLUMN IF NOT EXISTS country      TEXT;

COMMENT ON COLUMN companies.phone IS 'Contact phone captured at signup. Service-role readable only — see migration header.';
COMMENT ON COLUMN companies.company_size IS 'Self-reported employee band (e.g. 1-10, 11-50). Service-role readable only.';
COMMENT ON COLUMN companies.industry IS 'Self-reported industry/role (e.g. EPC, utility, testing contractor). Service-role readable only.';
COMMENT ON COLUMN companies.country IS 'Self-reported country/region. Service-role readable only.';
