#!/usr/bin/env bash
#
# Operator script: apply Zoho Mail's DNS records to optimustesting.com via the
# already-authenticated Vercel CLI. Same posture as provision-custom-domains.sh
# — uses the operator's own CLI session rather than parking an account-wide
# Vercel API token anywhere.
#
# Runs in two stages, deliberately separated:
#
#   verify   additive only. Domain-ownership TXT, apex SPF, apex DKIM. Nothing
#            about mail delivery changes, so this is safe to run before Zoho
#            has confirmed anything.
#
#   mx       DESTRUCTIVE. Replaces the Resend/SES inbound MX with Zoho's. After
#            this, `resend-inbound` receives nothing, `inbound_emails` stops
#            filling, and MailTab's inbox pane goes empty. Run it only once the
#            Zoho console reports the domain verified — an unverified domain
#            with Zoho MX means mail to @optimustesting.com bounces outright.
#
# Usage:
#   scripts/setup-zoho-dns.sh verify <verification-token> <dkim-selector> <dkim-value>
#   scripts/setup-zoho-dns.sh mx
#   scripts/setup-zoho-dns.sh rollback-mx
#   scripts/setup-zoho-dns.sh show
#
# Values come from the Zoho setup wizard, not from this file. Zoho's hostnames
# differ per data centre (zoho.in for India-billed accounts, zoho.com for US),
# so DC is read from ZOHO_DC and defaults to India.

set -euo pipefail

DOMAIN="${DOMAIN:-optimustesting.com}"
ZOHO_DC="${ZOHO_DC:-in}"

# The MX set Resend inbound needs, restored verbatim by rollback-mx.
RESEND_MX_PRIORITY=10
RESEND_MX_HOST="inbound-smtp.ap-northeast-1.amazonaws.com."

die() { echo "error: $*" >&2; exit 1; }

require_vercel() {
  command -v vercel >/dev/null 2>&1 || die "vercel CLI not on PATH"
  vercel whoami >/dev/null 2>&1 || die "vercel CLI not authenticated — run 'vercel login'"
}

# Vercel DNS has no upsert; adding a duplicate name/type silently stacks a
# second record, and two SPF TXT records on one name is an SPF permerror that
# fails every message. So removing the old one first is required, not tidy.
remove_records() {
  local name="$1" type="$2"
  vercel dns ls "$DOMAIN" 2>/dev/null \
    | awk -v n="$name" -v t="$type" '$1 ~ /^rec_/ && $2 == n && $3 == t { print $1 }' \
    | while read -r id; do
        echo "  removing existing $type record $name ($id)"
        vercel dns rm "$id" --yes >/dev/null
      done
}

# The apex record prints with an empty name column, so it needs its own matcher.
remove_apex_records() {
  local type="$1"
  vercel dns ls "$DOMAIN" 2>/dev/null \
    | awk -v t="$type" '$1 ~ /^rec_/ && $2 == t { print $1 }' \
    | while read -r id; do
        echo "  removing existing apex $type record ($id)"
        vercel dns rm "$id" --yes >/dev/null
      done
}

cmd_verify() {
  local token="${1:-}" dkim_selector="${2:-}" dkim_value="${3:-}"
  [ -n "$token" ]         || die "missing verification token (arg 1)"
  [ -n "$dkim_selector" ] || die "missing DKIM selector (arg 2), e.g. zmail"
  [ -n "$dkim_value" ]    || die "missing DKIM value (arg 3), the full v=DKIM1;... string"

  require_vercel
  echo "Applying additive Zoho records to $DOMAIN (data centre: $ZOHO_DC)"

  echo "- domain ownership TXT"
  vercel dns add "$DOMAIN" @ TXT "zoho-verification=${token}" >/dev/null
  echo "  added"

  # Only Zoho sends from the apex; Resend sends from send.optimustesting.com,
  # which carries its own SPF and must not be touched.
  # Deliberately no removal pass here: the apex carries no TXT records today,
  # and a blanket apex-TXT wipe would delete the ownership token added two
  # lines above. If an apex SPF ever exists, delete it by id by hand first —
  # two SPF records on one name is a permerror that fails every message.
  echo "- apex SPF"
  vercel dns add "$DOMAIN" @ TXT "v=spf1 include:zohomail.${ZOHO_DC} ~all" >/dev/null
  echo "  added"

  echo "- apex DKIM (${dkim_selector}._domainkey)"
  remove_records "${dkim_selector}._domainkey" TXT
  vercel dns add "$DOMAIN" "${dkim_selector}._domainkey" TXT "$dkim_value" >/dev/null
  echo "  added"

  echo
  echo "Done. Nothing about mail delivery changed yet."
  echo "Next: click Verify in the Zoho console, then run: $0 mx"
}

cmd_mx() {
  require_vercel

  cat <<WARN

This replaces the inbound MX for $DOMAIN.

  Mail to @$DOMAIN stops going to Resend and starts going to Zoho.
  - resend-inbound receives nothing (leave it deployed; it is harmless idle)
  - inbound_emails stops filling; existing rows are untouched
  - MailTab's inbox pane returns empty
  - support@$DOMAIN becomes a real Zoho inbox

  Outbound transactional mail is UNAFFECTED — it sends from
  send.$DOMAIN, which has its own SPF and DKIM.

  Only proceed if the Zoho console already shows the domain VERIFIED.
  Reversible with: $0 rollback-mx

WARN
  read -r -p "Type 'swap mx' to proceed: " confirm
  [ "$confirm" = "swap mx" ] || die "aborted"

  echo "- removing Resend inbound MX"
  remove_apex_records MX

  echo "- adding Zoho MX"
  vercel dns add "$DOMAIN" @ MX "mx.zoho.${ZOHO_DC}"  10 >/dev/null
  vercel dns add "$DOMAIN" @ MX "mx2.zoho.${ZOHO_DC}" 20 >/dev/null
  vercel dns add "$DOMAIN" @ MX "mx3.zoho.${ZOHO_DC}" 50 >/dev/null
  echo "  added 3 records"

  echo
  echo "Done. Allow up to an hour for propagation, then send a test message"
  echo "to support@$DOMAIN from an outside address and confirm it lands in Zoho."
}

cmd_rollback_mx() {
  require_vercel
  echo "- removing current MX"
  remove_apex_records MX
  echo "- restoring Resend inbound MX"
  vercel dns add "$DOMAIN" @ MX "$RESEND_MX_HOST" "$RESEND_MX_PRIORITY" >/dev/null
  echo "  restored"
  echo
  echo "resend-inbound will start receiving again once DNS propagates."
}

cmd_show() {
  require_vercel
  vercel dns ls "$DOMAIN"
}

case "${1:-}" in
  verify)      shift; cmd_verify "$@" ;;
  mx)          cmd_mx ;;
  rollback-mx) cmd_rollback_mx ;;
  show)        cmd_show ;;
  *)
    sed -n '2,30p' "$0" | sed 's|^# \{0,1\}||'
    exit 1
    ;;
esac
