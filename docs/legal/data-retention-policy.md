> ⚠️ **DRAFT — NOT LEGALLY REVIEWED — DO NOT PUBLISH** ⚠️
>
> Internal working draft only. Not reviewed by counsel, not legal advice, and not to be published or relied upon until reviewed and approved by a licensed attorney. `[PLACEHOLDER: ...]` marks facts the codebase cannot supply — in particular, this document describes the *mechanisms* that exist in code today; it does not yet state a finalized, legally-approved retention *period*, which is a product/legal decision, not a fact this codebase can supply.

# Data Retention Policy (Draft)

**Last updated:** [PLACEHOLDER: effective date]

## 1. What Actually Happens Today (Mechanism, Not Policy)

TestFlow's codebase implements the following retention-relevant mechanisms; none of them currently enforces an automatic purge after a fixed period:

- **Soft-delete, not hard-delete:** Projects, equipment instances, and test records are "deleted" by setting a `deleted_at` timestamp, not by removing the row (`CLAUDE.md` convention; enforced by RLS/app logic). SUPERADMIN users can still see soft-deleted rows, and a `restore_project(id)` RPC can undo a deletion. This means deleted data is recoverable, not immediately purged — good for accident recovery, but it means "deleted" data persists in the database indefinitely absent a separate purge job. **No scheduled purge job for soft-deleted rows currently exists in this repository.** [PLACEHOLDER: decide and implement an actual purge schedule if one is required for compliance.]
- **Audit logs are append-only and permanent by design:** `audit_logs` is populated by database triggers and is not user-editable or deletable through the application. There is currently no automatic expiry/purge of audit log rows. [PLACEHOLDER: decide a retention period consistent with CERT-In's log-retention expectations (a rolling 180-day window is the general baseline referenced in Indian cybersecurity directions) and any DPDP-driven minimization requirement, and implement it if a shorter/defined period is required.]
- **Billing records** (`subscriptions`, `orders`, `billing_events`) are retained indefinitely in the current schema — no purge logic exists. [PLACEHOLDER: financial/tax record retention requirements under Indian law typically require multi-year retention; confirm with counsel/accounting and document the required period.]
- **Nightly database backups** are retained for 30 days as GitHub Actions artifacts (see `backup-recovery-policy.md`), independent of any in-application soft-delete state — meaning a record purged from the live database may still exist in a backup for up to 30 days after backup rotation catches up.

## 2. What Is Not Yet Defined

The following are genuine open questions this codebase cannot answer and require a product/legal decision, not an engineering one:

- [PLACEHOLDER: How long is Customer Data retained after subscription termination before deletion?]
- [PLACEHOLDER: Does Customer have a self-service data export/deletion request path, or is it handled manually by support?]
- [PLACEHOLDER: What is the retention period for prospect/CRM data (`leads`, `lead_activities`) for organizations that never become customers?]
- [PLACEHOLDER: Is there a legal/regulatory minimum retention period specific to electrical substation commissioning records that TestFlow's customers (as data controllers of their own compliance obligations) need TestFlow to support — e.g., do commissioning records need to be retrievable for N years for regulatory audits? This is a domain question for TestFlow's customers' compliance teams, not something inferable from the code.]

## 3. Interim Statement

Until a finalized retention schedule is approved, TestFlow retains Customer Data for the duration of an active subscription plus the backup retention window described in `backup-recovery-policy.md`, and does not currently auto-purge soft-deleted records or audit logs. [PLACEHOLDER: this interim statement itself needs legal sign-off before being published as policy.]
