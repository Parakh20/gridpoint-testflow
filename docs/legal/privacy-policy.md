> ⚠️ **DRAFT — NOT LEGALLY REVIEWED — DO NOT PUBLISH** ⚠️
>
> This document is an internal working draft prepared to accelerate legal review. It has **not** been reviewed by qualified counsel, does not constitute legal advice, and must not be published, sent to customers, linked from the marketing site, or otherwise relied upon until a licensed attorney familiar with Indian data protection law (the Digital Personal Data Protection Act, 2023 and the Digital Personal Data Protection Rules, 2025) and applicable sectoral regulation has reviewed and approved it. Every bracketed `[PLACEHOLDER: ...]` marks a fact this document cannot supply from the codebase — a human must fill it in.

# Privacy Policy (Draft)

**Last updated:** [PLACEHOLDER: effective date]

## 1. Who We Are

TestFlow is a multi-tenant SaaS platform for electrical substation commissioning and test-record management, operated by [PLACEHOLDER: registered legal entity name, e.g. "Optimus Testing Pvt. Ltd."], having its registered office at [PLACEHOLDER: registered address, India]. Each customer organization ("Company") is provisioned a dedicated subdomain (`company.testflow.io`).

For questions about this policy or your personal data, contact our Data Protection Officer / Grievance Officer at [PLACEHOLDER: DPO/grievance officer name and email — required under the DPDP Rules, 2025].

## 2. Scope

This policy covers personal data processed through the TestFlow web application, the TestFlow mobile app (Expo/React Native, used by field ENGINEER users), and the platform admin panel. It applies to account holders (SUPERADMIN, GM, SUPERVISOR, ENGINEER roles) and to any individual whose data is entered into the system by a customer (e.g., named contacts on a test record).

## 3. What We Collect

Based on TestFlow's actual data model:

- **Account data:** name, email, role, company affiliation (`profiles`, `user_roles` tables). Accounts are created only by a company's SUPERADMIN via an internal admin API (`create-user` Edge Function) — there is no public self-service sign-up.
- **Operational data:** project records, equipment instances, test records and measurements (`projects`, `equipment_instances`, `test_records`, `nameplate_records`) entered by field engineers and supervisors in the course of commissioning work.
- **Audit data:** an append-only log of administrative and workflow actions (`audit_logs`), written automatically by database triggers — not user-editable.
- **Billing data:** subscription and one-time order records tied to your company (`subscriptions`, `orders`, `billing_events`), populated via our payments processor Razorpay. We do not store card numbers or full payment instrument details — those are handled by Razorpay directly.
- **Sales/CRM data (prospects only):** for organizations we are prospecting as customers, we may hold contact and outreach data in an internal, service-role-only CRM (`leads`, `lead_activities`) used solely by our internal sales team.
- **Technical data:** IP address (used transiently for API rate limiting — see Security Policy), error/monitoring data if Sentry is configured (`VITE_SENTRY_DSN`).

We do **not** operate a public marketing-site contact form beyond a demo request, which triggers an internal email notification (see Section 6).

## 4. How We Use Personal Data

- To provide and operate the TestFlow service for your organization (contract performance).
- To authenticate and authorize users, and to enforce that each organization only ever sees its own data (see Section 5).
- To generate AI-assisted commissioning reports at your organization's request (see Section 6 — Anthropic).
- To process subscription billing (see Section 6 — Razorpay).
- To detect abuse and enforce rate limits on sensitive operations (user creation, deletion, report generation).
- To respond to support requests and, for prospective customers, to conduct sales outreach.

## 5. How Your Data Is Isolated

TestFlow is a single shared Postgres database (via Supabase) with **row-level security (RLS)** enforcing tenant isolation: every root table carries a `company_id` column, and a `my_company_id()` database function gates every policy — a user whose company cannot be resolved sees no rows. This is an architectural isolation control, not a claim of any third-party certification (see Security Policy for what we do and do not hold).

## 6. Third Parties We Share Data With

See `subprocessor-list.md` for the current, itemized list. In summary: our database/auth/hosting provider (Supabase), our frontend hosting provider (Vercel), our payments processor (Razorpay), our AI provider for report generation (Anthropic), and, only for demo-request notification emails, Resend. We do not sell personal data, and we do not share personal data with any party not listed there, except as required by law or as described in Section 9.

## 7. Data Retention

See `data-retention-policy.md`. In short: operational records are retained for the life of your subscription and are soft-deleted (not immediately purged) when removed, to support recovery; a defined post-termination purge schedule is [PLACEHOLDER: retention period — not yet defined in the codebase or product policy].

## 8. Your Rights (DPDP Act, 2023)

Subject to the Digital Personal Data Protection Act, 2023 and its Rules, 2025, data principals may have rights to access, correct, and erase their personal data, to nominate another individual to exercise these rights on their behalf, and to withdraw consent (where consent is the basis of processing) and file grievances. [PLACEHOLDER: legal counsel to confirm the specific rights mechanism, consent-vs-legitimate-use basis for each processing activity, and the grievance redressal timeline/process required under the Rules.] Requests can be directed to [PLACEHOLDER: privacy contact email].

## 9. Legal Basis and Disclosures

We may disclose personal data where required by applicable law, in response to valid legal process, or to protect the rights, property, or safety of TestFlow, our customers, or others. [PLACEHOLDER: legal counsel to specify the legal bases relied upon under the DPDP Act and any cross-border transfer conditions, since Supabase, Vercel, Razorpay, and Anthropic infrastructure may process data outside India.]

## 10. Children's Data

TestFlow is a business tool for commissioning engineers and is not directed at children. [PLACEHOLDER: confirm minimum-age representation required by counsel.]

## 11. Changes to This Policy

[PLACEHOLDER: notice mechanism and lead time for material changes.]

## 12. Contact

[PLACEHOLDER: support email, DPO/grievance officer email, postal address.]
