# @testflow/shared

Source-only TypeScript package shared between `frontend/` (Vite web app) and `mobile/` (Expo React Native app). No build step — both apps import the `.ts` files directly via path aliases.

## Contents

| File | Purpose |
|---|---|
| `equipment.ts` | `EquipmentType` enum + `EQUIPMENT_LABEL` map (PTR/CT/CVT/…) |
| `roles.ts` | `AppRole`, `ROLE_RANK`, `highestRole()` |
| `status.ts` | Project + test status types, transition guards |
| `forms.ts` | `normalizeFields()` — translates legacy/JSON-schema field arrays |
| `errors.ts` | `explainSupabaseError()` |

## How each app consumes it

**Mobile (`mobile/`)** — TypeScript path + Babel alias + Metro `watchFolders`:
- `tsconfig.json` → `paths: { "@testflow/shared": ["../packages/shared/src"] }`
- `babel.config.js` → `module-resolver` alias `@testflow/shared` → `../packages/shared/src`
- `metro.config.js` → `watchFolders` includes `packages/shared`

**Frontend (`frontend/`)** — TypeScript path + Vite alias:
- `tsconfig.app.json` → `paths: { "@testflow/shared": ["../packages/shared/src"] }`
- `vite.config.ts` → `resolve.alias['@testflow/shared']`

## When adding new shared code

1. Add the file under `src/`.
2. Re-export from `src/index.ts` if it should be part of the public surface.
3. Run `npx tsc --noEmit` from both `frontend/` and `mobile/`.
4. For mobile, also run `npx expo export --platform android` to verify Metro resolves it.
