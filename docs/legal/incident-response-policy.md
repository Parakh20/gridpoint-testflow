> ⚠️ **DRAFT — NOT LEGALLY REVIEWED — DO NOT PUBLISH** ⚠️
>
> Internal working draft only. Not reviewed by counsel, not legal advice, and not to be published or relied upon until reviewed and approved by a licensed attorney. `[PLACEHOLDER: ...]` marks facts the codebase cannot supply — this document describes intended process at a policy level; it is not yet an operationally tested runbook.

# Incident Response Policy (Draft)

**Last updated:** [PLACEHOLDER: effective date]

## 1. Purpose and Scope

This policy describes how TestFlow intends to detect, respond to, and report security incidents affecting the TestFlow Service (web app, mobile app, Supabase backend, Edge Functions) and Customer Data. It is written at a policy-intent level; [PLACEHOLDER: an operational runbook with named responders, escalation paths, and tested procedures still needs to be built and is out of scope for this document].

## 2. What Counts as an Incident

Includes, without limitation: unauthorized access to Customer Data (e.g., an RLS/tenant-isolation bypass), exposure of credentials or API keys (e.g., `ANTHROPIC_API_KEY`, `RAZORPAY_KEY_SECRET`, `PLATFORM_ADMIN_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`), a compromised subprocessor (Supabase, Vercel, Razorpay, Anthropic, Resend — see `subprocessor-list.md`) affecting TestFlow data, denial-of-service against the Service, or discovery of a vulnerability that could lead to any of the above.

## 3. Detection

Current detection surface, grounded in what actually exists:

- The append-only `audit_logs` table provides a forensic trail of administrative and workflow actions.
- Rate limiting (`enforceRateLimit`) on sensitive Edge Functions provides a signal (and a block) for abusive request patterns against `create-user`, `delete-user`, `generate-report`, `create-tenant`, and `platform-admin-data`.
- Optional error/crash monitoring via Sentry, if `VITE_SENTRY_DSN` is configured for a given deployment.
- [PLACEHOLDER: no dedicated security alerting/SIEM currently exists. Document what, if anything, is monitored on Supabase/Vercel dashboards, and by whom.]

## 4. Response Process (Intent-Level)

1. **Identify and contain** — assess scope (which company/companies affected, which data categories), and where necessary, revoke/rotate the specific credential(s) involved (Supabase service-role key, `PLATFORM_ADMIN_TOKEN`, Razorpay/Anthropic API keys) and disable affected accounts.
2. **Investigate** — use `audit_logs`, Supabase logs, and Vercel deployment/runtime logs to reconstruct the timeline.
3. **Remediate** — patch the underlying vulnerability (e.g., an RLS policy gap, a missing rate limit) and verify the fix before restoring full access.
4. **Notify** — see Section 5 (customers) and Section 6 (regulators).
5. **Review** — post-incident review and update to this policy or to `security-policy.md` as appropriate.

[PLACEHOLDER: assign named roles/owners for each step — incident commander, comms owner, technical lead — this document currently describes process, not people.]

## 5. Customer Notification

TestFlow intends to notify affected Customers without undue delay after confirming an incident involving their data. [PLACEHOLDER: counsel to set the contractual notification SLA (commonly referenced as 72 hours in many DPAs) and the required notification channel/content, and to reconcile it with Section 6.]

## 6. Regulatory Notification (India)

- **CERT-In:** Under India's CERT-In directions, certain categories of cybersecurity incidents must be reported to CERT-In within **6 hours** of noticing or being notified of the incident. [PLACEHOLDER: counsel/security lead to confirm which of TestFlow's possible incident types fall within CERT-In's notifiable-incident categories, and to build the actual reporting procedure — this document only states the policy-intent to comply, it is not itself a CERT-In-compliant runbook.]
- **CERT-In log retention:** TestFlow's posture targets a rolling 180-day retention window for relevant ICT system logs, consistent with CERT-In's general log-retention direction, as referenced in `security-policy.md`. [PLACEHOLDER: confirm actual configured log retention on Supabase/Vercel platform logs meets or exceeds 180 days, since defaults on managed platforms are often shorter.]
- **DPDP Act, 2023 / Rules, 2025:** the Act contemplates notifying the Data Protection Board and affected data principals of certain personal data breaches. [PLACEHOLDER: counsel to define TestFlow's specific breach-notification obligations once the Board's procedural rules are finalized/in force, including timelines and content requirements.]

## 7. Post-Incident

[PLACEHOLDER: commitment to a post-incident report, root-cause analysis, and any customer-facing incident summary process.]

## 8. Contact

[PLACEHOLDER: security incident reporting email/contact, both internal and for customers/researchers to report suspected issues.]
