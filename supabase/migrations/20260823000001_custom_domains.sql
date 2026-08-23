-- Customer-owned domains (testing.acme.com) pointing at a company's
-- workspace, gated as a premium plan feature.
--
-- Host resolution after this migration has three cases:
--   app.optimustesting.com        canonical app host (any company)
--   <slug>.optimustesting.com     company subdomain alias
--   <custom domain>               premium, mapped through this table
-- In all three the company a user actually operates as still comes from
-- their own profile + RLS; the host only ever narrows/brands, it never
-- grants access to a company the user isn't a member of.

-- 1. The feature flag itself -------------------------------------------------
INSERT INTO plan_features (plan_id, feature_key, enabled)
SELECT p.id, 'custom_domain', p.slug IN ('business', 'enterprise')
FROM plans p
ON CONFLICT (plan_id, feature_key) DO UPDATE
  SET enabled = EXCLUDED.enabled;

-- 2. The domain mapping ------------------------------------------------------
CREATE TABLE company_domains (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  domain             TEXT        NOT NULL UNIQUE,
  -- Random per-domain token the customer publishes as a DNS TXT record so we
  -- can prove they control the domain before routing any traffic to it.
  -- Two v4 UUIDs (256 bits) rather than pgcrypto's gen_random_bytes: pgcrypto
  -- is installed in the extensions schema here, which the SECURITY DEFINER
  -- functions below can't see under SET search_path = public. gen_random_uuid
  -- is core (pg_catalog) so it always resolves.
  verification_token TEXT        NOT NULL DEFAULT replace(gen_random_uuid()::TEXT, '-', '') || replace(gen_random_uuid()::TEXT, '-', ''),
  verified_at        TIMESTAMPTZ,
  -- Set once the domain has been registered with the hosting provider and TLS
  -- has been issued; until then the domain resolves but can't serve HTTPS.
  provisioned_at     TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Hostnames are case-insensitive and must not carry a scheme or path.
  CONSTRAINT company_domains_domain_format
    CHECK (domain = lower(domain) AND domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'),
  -- One custom domain per company for now; lifting this later is additive.
  CONSTRAINT company_domains_one_per_company UNIQUE (company_id)
);

CREATE INDEX idx_company_domains_verified
  ON company_domains (domain)
  WHERE verified_at IS NOT NULL;

ALTER TABLE company_domains ENABLE ROW LEVEL SECURITY;

-- A company may read its own domain row (to see status + the TXT value to
-- publish). Writes go through the RPCs below so the feature gate and the
-- verification state machine can't be bypassed by a direct PostgREST call.
CREATE POLICY company_domains_select_own
  ON company_domains FOR SELECT
  TO authenticated
  USING (company_id = my_company_id());

-- 3. Claim a domain ----------------------------------------------------------
CREATE OR REPLACE FUNCTION request_custom_domain(_domain TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_company UUID := my_company_id();
  normalized TEXT := lower(trim(_domain));
  entitlements JSONB;
  existing_owner UUID;
  row_out company_domains;
BEGIN
  IF NOT has_role(auth.uid(), 'SUPERADMIN') THEN
    RAISE EXCEPTION 'Only SUPERADMIN can configure a custom domain';
  END IF;
  IF target_company IS NULL THEN
    RAISE EXCEPTION 'No company on file for this user';
  END IF;

  -- Premium gate. get_company_entitlements already folds in plan, trial,
  -- enterprise contract and add-on state, so this stays consistent with every
  -- other feature check rather than reading plan_features directly.
  entitlements := get_company_entitlements(target_company);
  IF COALESCE((entitlements -> 'features' ->> 'custom_domain')::BOOLEAN, FALSE) IS NOT TRUE THEN
    RAISE EXCEPTION 'custom_domain_not_in_plan';
  END IF;

  -- Never let a tenant claim the platform's own hostnames.
  IF normalized = 'optimustesting.com' OR normalized LIKE '%.optimustesting.com' THEN
    RAISE EXCEPTION 'Cannot claim a platform-owned domain';
  END IF;

  SELECT company_id INTO existing_owner FROM company_domains WHERE domain = normalized;
  IF existing_owner IS NOT NULL AND existing_owner != target_company THEN
    RAISE EXCEPTION 'domain_taken';
  END IF;

  INSERT INTO company_domains (company_id, domain)
  VALUES (target_company, normalized)
  ON CONFLICT (company_id) DO UPDATE
    -- Changing the domain invalidates any prior proof of control.
    SET domain = EXCLUDED.domain,
        verification_token = replace(gen_random_uuid()::TEXT, '-', '') || replace(gen_random_uuid()::TEXT, '-', ''),
        verified_at = NULL,
        provisioned_at = NULL
  RETURNING * INTO row_out;

  INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, after_data)
  VALUES (auth.uid(), 'companies', target_company, 'CUSTOM_DOMAIN_REQUESTED',
          jsonb_build_object('domain', normalized));

  RETURN jsonb_build_object(
    'domain', row_out.domain,
    'verification_token', row_out.verification_token,
    'txt_record_name', '_testflow-verify.' || row_out.domain,
    'cname_target', 'app.optimustesting.com',
    'verified', FALSE
  );
END;
$$;

-- 4. Remove a domain ---------------------------------------------------------
CREATE OR REPLACE FUNCTION remove_custom_domain()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_company UUID := my_company_id();
  removed TEXT;
BEGIN
  IF NOT has_role(auth.uid(), 'SUPERADMIN') THEN
    RAISE EXCEPTION 'Only SUPERADMIN can configure a custom domain';
  END IF;

  DELETE FROM company_domains WHERE company_id = target_company RETURNING domain INTO removed;

  IF removed IS NOT NULL THEN
    INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, after_data)
    VALUES (auth.uid(), 'companies', target_company, 'CUSTOM_DOMAIN_REMOVED',
            jsonb_build_object('domain', removed));
  END IF;

  RETURN jsonb_build_object('removed', removed);
END;
$$;

-- 5. Public host lookup ------------------------------------------------------
-- The app calls this pre-login to brand the sign-in page for a custom host.
-- Deliberately returns ONLY id/name/slug — never the private company detail
-- columns — and only for domains that have actually been verified.
CREATE OR REPLACE FUNCTION company_for_domain(_domain TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug)
  FROM company_domains d
  JOIN companies c ON c.id = d.company_id
  WHERE d.domain = lower(trim(_domain))
    AND d.verified_at IS NOT NULL
    AND c.is_active;
$$;

REVOKE ALL ON FUNCTION request_custom_domain(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION remove_custom_domain() FROM PUBLIC;
REVOKE ALL ON FUNCTION company_for_domain(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION request_custom_domain(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_custom_domain() TO authenticated;
-- anon needs this one: it runs on the sign-in page before a session exists.
GRANT EXECUTE ON FUNCTION company_for_domain(TEXT) TO anon, authenticated;
