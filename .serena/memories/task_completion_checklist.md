# Task Completion Checklist

After completing any development task:

1. **Lint**: `npm run lint` from repo root — fix any ESLint errors
2. **Build check**: `npm run build` — ensure no TypeScript or build errors
3. **Update CLAUDE.md**: if the change affects developer reference (new files, removed deps, changed conventions, env vars, new infrastructure)
4. **Update other MD files** progressively: IMPROVEMENTS.md (bug fixes/enhancements), AI_REPORT_PLAN.md (if AI report work)
5. **Migrations**: if DB schema changed, add a new timestamped file in `supabase/migrations/` — never alter existing migration files
6. **Types regen**: if DB schema changed, regenerate types.ts via supabase CLI
7. **No test suite** — manual verification required; check browser console for errors

## CI on push to main
- GitHub Actions auto-runs: `supabase db push` + `supabase functions deploy`
- Requires secrets: SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_ID, SUPABASE_DB_PASSWORD
