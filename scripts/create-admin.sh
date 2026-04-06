#!/usr/bin/env bash
# ============================================================
# TestFlow — Bootstrap System Administrator
# ============================================================
# Creates the first SUPERADMIN user from admin.env credentials.
# Run from the repo root:
#
#   bash scripts/create-admin.sh
#
# Prerequisites:
#   - supabase CLI installed and linked  (supabase link --project-ref <id>)
#   - admin.env filled in with real email + password
#   - Supabase project has migrations applied  (supabase db push)
# ============================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ADMIN_ENV="$REPO_ROOT/admin.env"

# ── Load credentials ──────────────────────────────────────
if [[ ! -f "$ADMIN_ENV" ]]; then
  echo "ERROR: admin.env not found."
  echo "       Copy the template: cp admin.env.example admin.env"
  exit 1
fi

# shellcheck source=/dev/null
source "$ADMIN_ENV"

if [[ -z "${ADMIN_EMAIL:-}" || "$ADMIN_EMAIL" == "your-email@example.com" ]]; then
  echo "ERROR: Set ADMIN_EMAIL in admin.env before running this script."
  exit 1
fi

if [[ -z "${ADMIN_PASSWORD:-}" || "$ADMIN_PASSWORD" == "your-secure-password-here" ]]; then
  echo "ERROR: Set ADMIN_PASSWORD in admin.env before running this script."
  exit 1
fi

echo "Creating SUPERADMIN: $ADMIN_EMAIL"

# ── Build and execute SQL ─────────────────────────────────
SQL=$(cat <<ENDSQL
DO \$\$
DECLARE
  _user_id UUID;
  _existing_id UUID;
BEGIN
  -- Check if user already exists
  SELECT id INTO _existing_id
  FROM auth.users
  WHERE email = '${ADMIN_EMAIL}';

  IF _existing_id IS NOT NULL THEN
    -- User already exists — just ensure SUPERADMIN role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_existing_id, 'SUPERADMIN')
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE 'User % already exists (id: %). Ensured SUPERADMIN role.', '${ADMIN_EMAIL}', _existing_id;
    RETURN;
  END IF;

  -- Create auth user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    '${ADMIN_EMAIL}',
    crypt('${ADMIN_PASSWORD}', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "System Administrator"}',
    '',
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO _user_id;

  -- Grant SUPERADMIN role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'SUPERADMIN');

  RAISE NOTICE 'SUPERADMIN created: % (id: %)', '${ADMIN_EMAIL}', _user_id;
END \$\$;
ENDSQL
)

if command -v psql &>/dev/null && [[ -n "${DATABASE_URL:-}" ]]; then
  psql "$DATABASE_URL" <<< "$SQL"
else
  echo "ERROR: Cannot execute SQL automatically."
  echo "  Either set DATABASE_URL env var and ensure psql is installed,"
  echo "  or paste the following SQL into the Supabase Dashboard SQL Editor:"
  echo ""
  echo "$SQL"
  exit 1
fi

echo ""
echo "Done. You can now log in at the app with:"
echo "  Email:    $ADMIN_EMAIL"
echo "  Password: (as set in admin.env)"
echo ""
echo "Security: clear admin.env after first login or rotate the password."
