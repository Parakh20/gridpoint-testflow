// Re-exports ADDON_KEYS (and its AddonKey type) from the shared package so
// deployed Edge Functions never need an import path that escapes the
// `supabase/` directory tree. `_shared/` is excluded from the CI deploy
// loop's per-function deploy step (see `.github/workflows/supabase.yml`,
// `[ "$name" = "_shared" ] && continue`), so this file is safe to be the
// single place that reaches outside `supabase/` — it is never itself
// deployed as a function. Source of truth stays in
// `packages/shared/src/billing.ts`; do not duplicate the values here.
export { ADDON_KEYS } from '../../../packages/shared/src/billing.ts';
export type { AddonKey } from '../../../packages/shared/src/billing.ts';
