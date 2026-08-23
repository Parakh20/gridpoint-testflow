-- Service-role write path for the custom-domain state machine. The tenant
-- can request/remove a domain (20260823000001) but must never be able to
-- mark its own domain verified — proof of DNS control is established
-- server-side by verify-custom-domain, so these setters are service-role
-- only and deliberately not granted to authenticated.

CREATE OR REPLACE FUNCTION mark_custom_domain_verified(_domain TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated company_domains;
BEGIN
  UPDATE company_domains
  SET verified_at = COALESCE(verified_at, NOW())
  WHERE domain = lower(trim(_domain))
  RETURNING * INTO updated;

  IF updated.id IS NULL THEN
    RETURN jsonb_build_object('found', FALSE);
  END IF;

  RETURN jsonb_build_object(
    'found', TRUE,
    'domain', updated.domain,
    'company_id', updated.company_id,
    'verified_at', updated.verified_at,
    'provisioned_at', updated.provisioned_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION mark_custom_domain_provisioned(_domain TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated company_domains;
BEGIN
  -- Provisioning without verification would let a tenant point our TLS at a
  -- hostname they don't control, so this refuses to run ahead of verify.
  UPDATE company_domains
  SET provisioned_at = COALESCE(provisioned_at, NOW())
  WHERE domain = lower(trim(_domain))
    AND verified_at IS NOT NULL
  RETURNING * INTO updated;

  IF updated.id IS NULL THEN
    RETURN jsonb_build_object('updated', FALSE);
  END IF;

  RETURN jsonb_build_object('updated', TRUE, 'domain', updated.domain);
END;
$$;

-- Lets the verifier find work without exposing every tenant's domain state
-- to anyone else.
CREATE OR REPLACE FUNCTION pending_custom_domains()
RETURNS TABLE (domain TEXT, verification_token TEXT, verified_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.domain, d.verification_token, d.verified_at
  FROM company_domains d
  WHERE d.provisioned_at IS NULL
  ORDER BY d.created_at
  LIMIT 50;
$$;

REVOKE ALL ON FUNCTION mark_custom_domain_verified(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION mark_custom_domain_provisioned(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION pending_custom_domains() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_custom_domain_verified(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION mark_custom_domain_provisioned(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION pending_custom_domains() TO service_role;
