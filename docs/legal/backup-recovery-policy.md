> ⚠️ **DRAFT — NOT LEGALLY REVIEWED — DO NOT PUBLISH** ⚠️
>
> Internal working draft only. Not reviewed by counsel, not legal advice, and not to be published or relied upon until reviewed and approved by a licensed attorney. `[PLACEHOLDER: ...]` marks facts the codebase cannot supply. Every operational number below is taken directly from `.github/workflows/backup.yml` as it exists in this repository today — do not inflate these into a stronger guarantee (e.g. do not say "daily backups" as an unconditional promise; the job can silently skip, see Section 3).

# Backup and Recovery Policy (Draft)

**Last updated:** [PLACEHOLDER: effective date]

## 1. What Is Actually Configured

TestFlow's database backups run via the GitHub Actions workflow `.github/workflows/backup.yml`:

- **Schedule:** nightly, at 03:00 UTC (`cron: '0 3 * * *'`), plus on-demand via manual `workflow_dispatch`.
- **Method:** `supabase db dump --linked` (Supabase CLI), producing a `.sql` file, compressed with `gzip -9`.
- **Primary storage:** the compressed dump is uploaded as a **GitHub Actions artifact** with a **30-day retention period** (`actions/upload-artifact@v4`, `retention-days: 30`). This is the primary and, unless the optional step below is configured, the *only* backup destination.
- **Optional secondary storage:** an additional step can upload the same dump to an S3-compatible bucket (e.g., Cloudflare R2) if the secrets `BACKUP_S3_ENDPOINT`, `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY`, and `BACKUP_S3_REGION` are all configured. **Whether these secrets are actually set for this deployment is not something the codebase can confirm** — the workflow explicitly checks for them and silently skips this step (logging "S3 secrets not set — skipping S3 upload") if they are absent. [PLACEHOLDER: confirm with whoever manages GitHub Actions secrets for this repo whether the S3/R2 secondary backup is actually active; do not publish a claim of off-platform/long-lived backup storage unless this is confirmed.]

## 2. What This Means in Practice

- **Backup frequency:** once nightly (not continuous, not point-in-time — a single daily snapshot). [PLACEHOLDER: confirm whether Supabase's own platform-level point-in-time recovery (PITR) is enabled on the project plan in use; PITR is a Supabase-tier feature independent of this workflow and this document should not assume it without confirmation, since it materially changes the actual recovery point objective.]
- **Retention:** 30 days on the primary (GitHub Actions artifact) path, unless the optional S3/R2 path is active, in which case retention there depends on the bucket's own lifecycle configuration [PLACEHOLDER: not visible in this codebase — confirm with infra owner].
- **Backup can silently no-op:** if any of `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, or `SUPABASE_DB_PASSWORD` secrets are missing, the entire job logs "Missing secrets... skipping backup" and exits without producing a backup, without failing the workflow run loudly. [PLACEHOLDER: confirm there is separate alerting on backup-skip/failure — none is evident in this workflow file today; a silent skip could go unnoticed.]
- **Job timeout:** the workflow is capped at 30 minutes (`timeout-minutes: 30`).

## 3. Recovery

Recovery from a backup is a manual process today: download the relevant `.sql.gz` artifact (from the GitHub Actions run, within its 30-day window, or from S3/R2 if configured), decompress, and restore via the Supabase CLI/Postgres tooling against a project. [PLACEHOLDER: no automated or tested restore procedure/runbook currently exists in this repository — write and periodically test one; document actual Recovery Time Objective (RTO) and Recovery Point Objective (RPO) once a restore has been exercised, rather than asserting untested numbers.]

## 4. What We Do Not Currently Guarantee

To avoid overstating this control on the marketing site or in customer-facing material:

- We do not currently claim point-in-time recovery to any specific window smaller than 24 hours, since backups run once nightly. [PLACEHOLDER: revise if Supabase PITR is confirmed enabled.]
- We do not currently claim geographically redundant backup storage unless the optional S3/R2 step is confirmed active for this deployment.
- We do not currently publish a tested RTO/RPO.

## 5. Ownership

[PLACEHOLDER: name the individual/team responsible for monitoring backup job success, rotating the GitHub Actions secrets involved, and periodically test-restoring a backup.]
