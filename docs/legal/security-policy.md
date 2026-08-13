> ⚠️ **DRAFT — NOT LEGALLY REVIEWED — DO NOT PUBLISH** ⚠️
>
> Internal working draft only. Not reviewed by counsel, not legal advice, and not to be published or relied upon until reviewed and approved by a licensed attorney. `[PLACEHOLDER: ...]` marks facts the codebase cannot supply. This document describes actual, currently-implemented controls — it deliberately does **not** claim any certification (SOC 2, ISO 27001, or otherwise) that TestFlow does not hold.

# Security Policy (Draft)

**Last updated:** [PLACEHOLDER: effective date]

## 1. Posture Statement

TestFlow's security model is built on architectural controls enforced by our infrastructure providers and our own application logic — it is **not** currently backed by a third-party security certification. If asked "are you SOC 2 / ISO 27001 certified," the honest answer today is **no**; state posture and controls instead, per Section 2–7 below. [PLACEHOLDER: update this document if/when a certification is obtained, with the certificate's actual scope and issuer.]

## 2. Tenant Isolation

TestFlow is a single shared Postgres database (Supabase) serving all customer organizations. Isolation is enforced at the database layer:

- Every root table (`projects`, `equipment_instances`, `test_tasks`, `test_records`, etc.) carries a `company_id` column.
- Row-Level Security (RLS) policies gate every read and write, using a `my_company_id()` `SECURITY DEFINER` function; if a user's company cannot be resolved, RLS returns zero rows — fail-closed, not fail-open.
- A small number of platform-internal tables (`leads`, `lead_activities`, `billing_events`, `orders`, `plan_provider_mapping`) have RLS **enabled with no policies at all**, meaning they are accessible only via the service-role key from trusted Edge Functions — never directly from the browser.

## 3. Authentication and Authorization

- No public self-service sign-up. Every account is created by an existing SUPERADMIN through an internal admin API (`create-user` Edge Function), which is rate-limited (30 requests/hour/SUPERADMIN).
- Role-based access control with four roles (SUPERADMIN, GM, SUPERVISOR, ENGINEER), enforced both in application logic and in RLS policies via a `has_role()` database function.
- Password policy: minimum 10 characters, requiring upper case, lower case, and a digit, enforced both client-side (zod schema) and server-side (Edge Functions) — not just in the browser.
- Sessions expire after 30 minutes of inactivity.
- Company-scoped login: a user's profile `company_id` must match the subdomain's resolved company; mismatches force sign-out.
- The Supabase anonymous ("anon") API key is present in the browser bundle by design — this is standard Supabase architecture; the anon key alone grants no data access without RLS policy evaluation. It is not a leaked secret.

## 4. Encryption

- All traffic between browsers, the TestFlow frontend (Vercel), and backend (Supabase) is encrypted in transit via HTTPS/TLS.
- Data at rest is encrypted by our underlying infrastructure providers (Supabase's managed Postgres, Vercel's hosting) using their standard infrastructure-level encryption; TestFlow does not implement additional application-level encryption-at-rest beyond what these providers supply. [PLACEHOLDER: if any field-level encryption is added later, document it here.]
- `vercel.json` enforces a Content-Security-Policy, `Strict-Transport-Security` (HSTS, 2-year max-age with `includeSubDomains; preload`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and a restrictive `Permissions-Policy`.

## 5. Audit Logging

Administrative and workflow actions on `projects`, `equipment_instances`, `test_tasks`, `test_records`, and `user_roles` are recorded in an append-only `audit_logs` table, populated exclusively by Postgres triggers — not by application code — so the application layer cannot silently skip or falsify an audit entry.

## 6. Rate Limiting

Sensitive Edge Function endpoints (user creation, user deletion, AI report generation, tenant creation, platform-admin data access) are protected by a shared, Postgres-backed sliding-window rate limiter (`enforceRateLimit` / `rate_limit_check`), keyed per caller or per IP for unauthenticated callers.

## 7. Concurrency and Data Integrity Controls

- Equipment generation and AI report generation use explicit locking (`FOR UPDATE` row locks; a time-boxed AI-report lock with 5-minute expiry) to prevent duplicate/concurrent writes.
- Status transitions (e.g., project status changes, bulk approvals) use optimistic-concurrency guards (`.eq('status', current)`) to prevent lost updates.
- Soft-delete (a `deleted_at` timestamp, not physical row deletion) is used for projects, equipment instances, and test records, allowing recovery and preserving audit history.

## 8. Vulnerability and Incident Handling

See `incident-response-policy.md`. In line with CERT-In's log-retention expectation for organizations operating in India, TestFlow aims to retain relevant ICT system logs for a rolling 180-day window [PLACEHOLDER: confirm this is actually implemented for infrastructure/application logs, not just `audit_logs` — Supabase/Vercel platform log retention windows should be checked against this target, and configured explicitly if shorter by default].

## 9. Third-Party Processors

See `subprocessor-list.md`. Each subprocessor is selected for the minimum data necessary to perform its function (e.g., Anthropic only receives data explicitly included in an AI report generation request; Resend only receives demo-request contact details).

## 10. Backups

See `backup-recovery-policy.md` for actual configured cadence and retention.

## 11. Known Limitations / Not Yet Implemented

For an honest posture statement, this section should be kept current:

- No independent third-party penetration test or security audit has been performed. [PLACEHOLDER: update if/when one is commissioned.]
- No SOC 2, ISO 27001, or DPDP-specific certification is held.
- [PLACEHOLDER: add any other known gaps counsel or engineering wants disclosed/tracked, e.g. formal vulnerability disclosure program, bug bounty, MFA availability.]

## 12. Reporting a Security Issue

[PLACEHOLDER: security contact email / responsible disclosure process.]
