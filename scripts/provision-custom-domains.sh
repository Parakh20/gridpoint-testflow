#!/usr/bin/env bash
#
# Operator script: attach verified customer domains to the Vercel project so
# TLS is issued, then mark them provisioned.
#
# This exists instead of putting a Vercel API token into Supabase secrets.
# A Vercel token is account-wide — it can manage every project on the
# account, not just this one — so the trade is deliberate: provisioning is a
# command an operator runs with their own already-authenticated CLI session,
# rather than a standing credential sitting in a server-side secret store.
# verify-custom-domain still does the DNS proof automatically on its hourly
# cron; only this last step is manual.
#
# Usage:
#   SUPABASE_SERVICE_ROLE_KEY=... ./scripts/provision-custom-domains.sh [--dry-run]
#
# Requires: vercel CLI (logged in), curl, python3.

set -euo pipefail

SUPABASE_URL="${SUPABASE_URL:-https://hxfilijpaocogsgjrjnq.supabase.co}"
VERCEL_PROJECT="${VERCEL_PROJECT:-gridpoint-testflow}"
DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "SUPABASE_SERVICE_ROLE_KEY is required (get it from: supabase projects api-keys)" >&2
  exit 1
fi

api() {
  curl -sS --max-time 30 \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" "$@"
}

# Only domains that passed DNS verification are eligible. Attaching an
# unverified hostname would point our TLS at a domain the tenant may not
# control, which is exactly what the verification step exists to prevent.
pending=$(api "${SUPABASE_URL}/rest/v1/company_domains?select=domain,verified_at,provisioned_at&verified_at=not.is.null&provisioned_at=is.null" \
  | python3 -c "import sys,json;[print(d['domain']) for d in json.load(sys.stdin)]")

if [ -z "${pending}" ]; then
  echo "No verified domains awaiting provisioning."
  exit 0
fi

echo "Verified domains awaiting provisioning:"
echo "${pending}" | sed 's/^/  /'
echo

for domain in ${pending}; do
  if [ "${DRY_RUN}" -eq 1 ]; then
    echo "[dry-run] vercel domains add ${domain} ${VERCEL_PROJECT}"
    continue
  fi

  echo "==> ${domain}"
  # Already-attached is the desired end state, so a second run is a no-op
  # rather than a failure — this script is safe to re-run.
  if vercel domains add "${domain}" "${VERCEL_PROJECT}" 2>&1 | tee /tmp/vercel-domain-add.log; then
    :
  elif grep -qiE "already (in use|assigned)|domain_already" /tmp/vercel-domain-add.log; then
    echo "    already attached — treating as success"
  else
    echo "    FAILED — leaving unprovisioned so the next run retries" >&2
    continue
  fi

  api -X POST "${SUPABASE_URL}/rest/v1/rpc/mark_custom_domain_provisioned" \
    -d "{\"_domain\":\"${domain}\"}" >/dev/null
  echo "    marked provisioned"
done

echo
echo "Done. Vercel issues TLS within a few minutes of the domain resolving."
