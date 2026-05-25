-- OAuth provisioning: allow employees to sign in with Google.
-- Companies configure allowed domains and provisioning mode.

-- Add OAuth config columns to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS allowed_domains text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS oauth_provisioning text NOT NULL DEFAULT 'off';

ALTER TABLE public.companies
  ADD CONSTRAINT companies_oauth_provisioning_check
  CHECK (oauth_provisioning IN ('off', 'auto', 'pending'));

-- Flag for OAuth users awaiting SUPERADMIN approval
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS oauth_pending boolean NOT NULL DEFAULT false;

-- ── RPC: set_company_oauth_config ──────────────────────────────────────────
-- Called by platform admin (service role) or company SUPERADMIN.
CREATE OR REPLACE FUNCTION public.set_company_oauth_config(
  _company_id      uuid,
  _allowed_domains text[],
  _oauth_provisioning text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _oauth_provisioning NOT IN ('off', 'auto', 'pending') THEN
    RAISE EXCEPTION 'Invalid oauth_provisioning value: %', _oauth_provisioning;
  END IF;

  -- Platform admin calls via service role (bypasses RLS).
  -- Company SUPERADMIN must own the company.
  IF current_user != 'service_role' AND auth.role() != 'service_role' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN profiles p ON p.id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'SUPERADMIN'
        AND p.company_id = _company_id
    ) THEN
      RAISE EXCEPTION 'Forbidden: SUPERADMIN of this company required';
    END IF;
  END IF;

  UPDATE public.companies
  SET allowed_domains    = _allowed_domains,
      oauth_provisioning = _oauth_provisioning
  WHERE id = _company_id;
END;
$$;

-- ── RPC: approve_oauth_user ─────────────────────────────────────────────────
-- SUPERADMIN approves a pending OAuth user and assigns them a role.
CREATE OR REPLACE FUNCTION public.approve_oauth_user(
  _user_id uuid,
  _role    text DEFAULT 'ENGINEER'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_company uuid;
  _user_company   uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'SUPERADMIN'
  ) THEN
    RAISE EXCEPTION 'Forbidden: SUPERADMIN role required';
  END IF;

  IF _role NOT IN ('ENGINEER', 'SUPERVISOR', 'GM', 'SUPERADMIN') THEN
    RAISE EXCEPTION 'Invalid role: %', _role;
  END IF;

  SELECT company_id INTO _caller_company FROM profiles WHERE id = auth.uid();
  SELECT company_id INTO _user_company   FROM profiles WHERE id = _user_id;

  IF _caller_company IS NULL OR _caller_company != _user_company THEN
    RAISE EXCEPTION 'Forbidden: user not in your company';
  END IF;

  UPDATE public.profiles
  SET oauth_pending = false,
      is_active     = true
  WHERE id = _user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- ── RPC: reject_oauth_user ──────────────────────────────────────────────────
-- SUPERADMIN rejects a pending OAuth user (deactivates their account).
CREATE OR REPLACE FUNCTION public.reject_oauth_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_company uuid;
  _user_company   uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'SUPERADMIN'
  ) THEN
    RAISE EXCEPTION 'Forbidden: SUPERADMIN role required';
  END IF;

  SELECT company_id INTO _caller_company FROM profiles WHERE id = auth.uid();
  SELECT company_id INTO _user_company   FROM profiles WHERE id = _user_id;

  IF _caller_company IS NULL OR _caller_company != _user_company THEN
    RAISE EXCEPTION 'Forbidden: user not in your company';
  END IF;

  UPDATE public.profiles
  SET oauth_pending = false,
      is_active     = false
  WHERE id = _user_id;
END;
$$;
