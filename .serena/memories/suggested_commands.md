# Suggested Commands

## Development (run from repo root OR frontend/)
```bash
npm run dev          # Start Vite dev server (port 8080)
npm run build        # Production build
npm run lint         # ESLint check
npm run preview      # Preview production build
```

## Supabase CLI (MUST run from repo root)
```bash
supabase start                          # Start local Supabase
supabase db push                        # Apply migrations to remote
supabase functions deploy generate-report  # Deploy edge function
supabase gen types typescript --project-id <ref> > frontend/src/integrations/supabase/types.ts
```

## Git
```bash
git status / git log / git diff
git add <files> && git commit -m "..."
git push origin main                    # Triggers CI: db push + functions deploy
```

## Notes
- `frontend/.env` holds VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
- ANTHROPIC_API_KEY is a Supabase secret (never in .env): `supabase secrets set ANTHROPIC_API_KEY=...`
- No test runner configured (no jest/vitest)
