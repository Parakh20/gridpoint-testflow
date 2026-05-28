# Migrations Playbook

How we manage schema changes in TestFlow. Read before writing a new migration.

## Conventions

- Migration files live in `supabase/migrations/` and are timestamp-ordered.
- Naming: `YYYYMMDDHHMMSS_short_description.sql`. Use UTC.
- **Never edit a migration that has been pushed to main.** Forward-only. Write a new migration to undo or amend.
- One topic per migration. A new column + the RLS rewrite that depends on it can share a file; unrelated changes should not.
- Always include `IF NOT EXISTS` / `IF EXISTS` / `OR REPLACE` so re-runs are idempotent in case of partial failures.
- New columns on existing tables: add as **nullable first**, backfill, then optionally add `NOT NULL` in a separate later migration.
- New `NOT NULL` columns with `DEFAULT` are fast in Postgres ≥11 — safe on big tables.

## Deployment

- CI auto-applies migrations on push to main via `.github/workflows/supabase.yml` (runs `supabase db push`).
- Local apply: `supabase db push` from repo root.
- To inspect SQL that will run: `supabase db diff`.

## Rollback strategy

Forward-only does **not** mean "no recovery." It means we always roll forward.

For each migration that does anything risky, write a sibling rollback SQL file in `supabase/migrations/_rollbacks/<basename>.sql` (this directory is **not** auto-applied — it's reference material). Format:

```sql
-- Rollback for 20260519000002_integrity_softdelete_audit.sql
-- WARNING: data loss possible. Run only as last resort.

DROP TRIGGER IF EXISTS trg_audit_projects ON projects;
-- ... etc
ALTER TABLE projects DROP COLUMN IF EXISTS deleted_at;
```

If you need to actually roll back in production:

1. **Don't panic.** Take a manual `pg_dump` first.
2. Open a hotfix branch, write a **new** migration that reverses the change.
3. PR, review, merge. CI deploys it.
4. Never run a rollback SQL file by hand on prod without recording it as a migration first — otherwise future environments will drift.

## Backups before risky migrations

Manually trigger a `pg_dump` before any migration that drops a column, drops a table, alters an enum, or changes RLS in a way you're not 100% sure about:

```bash
pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges \
  --format=plain | gzip -9 > backup-$(date -u +%Y%m%dT%H%M%SZ).sql.gz
```

Or trigger the `Database Backup` GitHub Action manually (`workflow_dispatch`).

## Types regeneration

After adding/changing columns, regenerate the TypeScript types so the frontend knows about them:

```bash
supabase gen types typescript --project-id <ref> > frontend/src/integrations/supabase/types.ts
```

Commit the regenerated file in the same PR as the migration.

## Testing migrations locally

1. `supabase start` (requires Docker)
2. `supabase db reset` — drops and re-applies all migrations against the local DB
3. Verify your migration applies cleanly from scratch
4. Verify it's idempotent: `supabase db push` a second time should be a no-op

## RLS migrations specifically

- Always check that the policy change doesn't accidentally allow cross-tenant reads. Mental test: imagine you're a user in Company A — can this policy ever return a row owned by Company B?
- `my_company_id()` is the standard tenant filter. Don't write raw `WHERE company_id = ...` — use the function so the auth context is captured consistently.
- Test policies via the Supabase SQL editor using `SET LOCAL ROLE authenticated;` and `SET LOCAL request.jwt.claims = '{"sub":"<user-uuid>"}';` before your SELECT.
