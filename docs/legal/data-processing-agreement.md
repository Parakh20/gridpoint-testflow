> ⚠️ **DRAFT — NOT LEGALLY REVIEWED — DO NOT PUBLISH** ⚠️
>
> Internal working draft only. Not reviewed by counsel, not legal advice, and not to be published, signed, or relied upon until reviewed and approved by a licensed attorney. `[PLACEHOLDER: ...]` marks facts the codebase cannot supply.

# Data Processing Agreement (Draft)

**Last updated:** [PLACEHOLDER: effective date]

This Data Processing Agreement ("DPA") forms part of the agreement between [PLACEHOLDER: TestFlow legal entity name] ("Processor") and the Customer ("Controller") governing Processor's processing of personal data on Controller's behalf in connection with the TestFlow Service.

## 1. Roles

Customer is the data fiduciary/controller for personal data it submits to TestFlow (e.g., names of engineers, supervisors, and any individuals referenced in test/project records). TestFlow acts as data processor / significant data fiduciary's processor [PLACEHOLDER: counsel to confirm correct DPDP Act terminology and whether Customer or TestFlow bears "Data Fiduciary" status for which categories of data].

## 2. Subject Matter and Duration

Processing occurs for the duration of Customer's subscription to the Service, plus any post-termination retention window described in `data-retention-policy.md`.

## 3. Nature and Purpose of Processing

TestFlow processes Customer Data to: authenticate users; store and serve project, equipment, and test-record data; generate PDF/Excel exports; optionally generate AI-assisted reports; process subscription billing; and maintain an audit trail of administrative and workflow actions.

## 4. Categories of Data and Data Subjects

Account holders (Customer's own employees/contractors using TestFlow: SUPERADMIN, GM, SUPERVISOR, ENGINEER) and any named individuals referenced within project/test records Customer chooses to enter. TestFlow does not require or solicit sensitive personal data (health, biometric, financial account details) as part of normal commissioning workflows; Customer should avoid entering such data into free-text fields. [PLACEHOLDER: counsel to confirm whether this needs to be a contractual restriction.]

## 5. Sub-processors

TestFlow uses the sub-processors listed in `subprocessor-list.md`, currently: Supabase (database, authentication, hosting infrastructure), Vercel (frontend hosting/CDN), Razorpay (payment processing), Anthropic (AI-assisted report generation), and Resend (transactional email for demo-request notifications only). TestFlow will [PLACEHOLDER: define sub-processor change notification mechanism and objection window — commonly 30 days' notice with a right to object, to be set by counsel].

## 6. Security Measures

TestFlow implements the technical and organizational measures described in `security-policy.md`, including: database-enforced tenant isolation via row-level security, role-based access control, append-only audit logging, rate limiting on sensitive administrative endpoints, and encryption in transit (HTTPS/TLS) for all client-server and server-to-subprocessor communication. TestFlow does **not** hold SOC 2, ISO 27001, or any other third-party security certification at this time; this DPA describes actual implemented controls, not certifications.

## 7. Data Subject Requests

TestFlow will provide reasonable assistance to Customer in responding to data subject requests (access, correction, erasure) it receives regarding Customer Data, consistent with the Service's functionality. [PLACEHOLDER: define response SLA.]

## 8. International/Cross-Border Transfers

Customer Data may be processed by TestFlow's sub-processors on infrastructure located outside India (Supabase and Vercel operate globally-distributed cloud infrastructure; the specific hosting region for this deployment is [PLACEHOLDER: confirm actual Supabase project region]). Anthropic's API is used only for the opt-in AI report feature and only processes data explicitly included in a report generation request. [PLACEHOLDER: counsel to confirm DPDP Act cross-border transfer conditions and whether any government-notified restricted-country list applies.]

## 9. Data Breach Notification

See `incident-response-policy.md`. TestFlow will notify Customer without undue delay after becoming aware of a personal data breach affecting Customer Data. [PLACEHOLDER: contractual notification SLA, e.g. 72 hours, to be set by counsel and reconciled with CERT-In's own reporting timelines for incidents meeting its criteria.]

## 10. Deletion or Return of Data on Termination

[PLACEHOLDER: contractual commitment on data return/export format and deletion timeline post-termination — align with `data-retention-policy.md`.]

## 11. Audit Rights

[PLACEHOLDER: whether Customer receives audit or documentation rights, and their scope — TestFlow does not currently undergo third-party security audits, so any audit clause must reflect that reality rather than imply certification-backed assurance.]

## 12. Liability

[PLACEHOLDER: liability allocation for DPA breaches — to be drafted by counsel.]
