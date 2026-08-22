-- Lets a SUPERADMIN customize their own company's sign-in identifier
-- (companies.slug — used both as the subdomain and as the /sign-in lookup
-- key). Same format/uniqueness rules as start-trial's auto-derived slug.
-- Changing this immediately changes the tenant's subdomain — any other
-- users mid-session on the old subdomain will hit AuthContext's company-
-- mismatch guard until they reload on the new one. That's surfaced as a
-- confirmation in the frontend, not enforced here.
CREATE OR REPLACE FUNCTION update_company_slug(_new_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_company UUID := my_company_id();
  normalized TEXT := lower(trim(_new_slug));
  existing_id UUID;
BEGIN
  IF NOT has_role(auth.uid(), 'SUPERADMIN') THEN
    RAISE EXCEPTION 'Only SUPERADMIN can change the workspace name';
  END IF;
  IF target_company IS NULL THEN
    RAISE EXCEPTION 'No company on file for this user';
  END IF;
  IF NOT (normalized ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' OR normalized ~ '^[a-z0-9]$') THEN
    RAISE EXCEPTION 'Workspace name must be lowercase alphanumeric with hyphens only';
  END IF;
  IF length(normalized) < 3 OR length(normalized) > 40 THEN
    RAISE EXCEPTION 'Workspace name must be between 3 and 40 characters';
  END IF;

  SELECT id INTO existing_id FROM companies WHERE slug = normalized;
  IF existing_id IS NOT NULL AND existing_id != target_company THEN
    RAISE EXCEPTION 'slug_taken';
  END IF;

  UPDATE companies SET slug = normalized WHERE id = target_company;

  INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, after_data)
  VALUES (auth.uid(), 'companies', target_company, 'SLUG_CHANGED', jsonb_build_object('new_slug', normalized));

  RETURN jsonb_build_object('slug', normalized, 'workspace_url', 'https://' || normalized || '.optimustesting.com');
END;
$$;

REVOKE ALL ON FUNCTION update_company_slug(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_company_slug(TEXT) TO authenticated;
