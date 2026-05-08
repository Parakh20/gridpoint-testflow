# Development Guide

---

## Project Layout

```
gridpoint-testflow/
├── frontend/                  ← React Vite SPA — work here for UI changes
│   ├── src/
│   │   ├── App.tsx            ← Routes + providers + QueryClient + ErrorBoundary
│   │   ├── main.tsx           ← React entry point
│   │   ├── contexts/          ← AuthContext (auth state + Google OAuth)
│   │   ├── lib/               ← routes.ts, format.ts, utils.ts
│   │   ├── hooks/             ← use-toast.ts, use-mobile.tsx
│   │   ├── components/        ← Business logic components
│   │   │   └── ui/            ← shadcn/ui primitives (do not edit)
│   │   ├── pages/             ← Route pages and dashboards
│   │   └── integrations/
│   │       └── supabase/      ← client.ts + auto-generated types.ts
│   ├── public/                ← Static assets
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts         ← @/ alias, port 8080, host "::"
│   ├── tailwind.config.ts     ← darkMode: 'class', custom status colors
│   ├── tsconfig.json
│   └── components.json        ← shadcn/ui config
│
├── supabase/                  ← Supabase project (CLI must run from repo root)
│   ├── config.toml            ← Supabase project config
│   ├── migrations/            ← SQL migration files (9 total, applied in timestamp order)
│   └── functions/
│       └── generate-report/   ← Edge function: AI report generation
│           └── index.ts       ← Deno — calls Anthropic Claude API
│
├── .github/
│   └── workflows/
│       ├── supabase.yml       ← Auto: db push + functions deploy on push to main
│       └── frontend.yml       ← Auto: lint + build check on push to main
│
├── skills/
│   └── gridpoint-testflow/
│       └── SKILL.md           ← Claude project skill file
│
├── .env.example               ← Full reference for ALL variables across all layers
├── .gitignore
└── [*.md documentation files]
```

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20+ | [nvm](https://github.com/nvm-sh/nvm) recommended |
| npm | 10+ | Bundled with Node 20 |
| Supabase CLI | latest | `npm install -g supabase` |
| Git | any | |

Docker Desktop is only needed for local Supabase (`supabase start`).

---

## Initial Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd gridpoint-testflow
cd frontend && npm install
```

### 2. Configure environment

```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env` and fill in:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_PROJECT_ID=<your-project-ref>
```

Find these in **Supabase Dashboard → your project → Settings → API**.

### 3. Apply database migrations

```bash
# From the repo root (not frontend/)
supabase login                             # one-time — opens browser
supabase link --project-ref <project-ref>  # link to your hosted project
supabase db push                           # apply all 9 migrations
```

---

## Running the Development Server

```bash
# From repo root
npm run dev

# Or from frontend/
cd frontend && npm run dev
```

App starts at **http://localhost:8080**. Hot module replacement is enabled.

> Dev server binds to `host: "::"` (all interfaces). This is intentional for Docker/WSL usage. Change to `host: "localhost"` in `vite.config.ts` for pure local development.

---

## Available Scripts

Run from **repo root** (delegates to `frontend/`):

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server on port 8080 |
| `npm run build` | Production build → `frontend/dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

Or run directly from `frontend/` with the same names.

---

## Environment Variables

### Layer 1 — Frontend (`frontend/.env`)

Loaded by Vite, inlined into the browser bundle. **MUST start with `VITE_`.**

| Variable | Required | How to get |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase Dashboard → Settings → API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase Dashboard → Settings → API → anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | No (convenience) | Supabase Dashboard → Settings → General → Reference ID |

### Layer 2 — GitHub Actions Secrets

Add at: **GitHub repo → Settings → Secrets and variables → Actions**

| Secret | Purpose | How to get |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI auth in CI | supabase.com → Account → Access Tokens |
| `SUPABASE_PROJECT_ID` | `supabase link` in CI | Supabase Dashboard → Settings → General → Reference ID |
| `SUPABASE_DB_PASSWORD` | `supabase db push` in CI | Supabase Dashboard → Settings → Database → password |
| `VITE_SUPABASE_URL` | Frontend build in CI | Same as `VITE_SUPABASE_URL` above |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend build in CI | Same as `VITE_SUPABASE_PUBLISHABLE_KEY` above |

### Layer 3 — Supabase Edge Function Secrets (server-side only)

**Never add these to `.env` — they run inside Deno on Supabase's servers.**

| Secret | Purpose | How to set |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude AI for report generation | `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` |

Get your key at **console.anthropic.com → API Keys → Create Key**.

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-...
# Verify:
supabase secrets list
```

---

## Automatic CI/CD (Zero Human Involvement)

### Database + Edge Functions (`supabase.yml`)
Triggers on push to `main` when `supabase/migrations/**` or `supabase/functions/**` change:
- `supabase db push` — applies any new migrations
- `supabase functions deploy` — redeploys all edge functions

### Frontend (`frontend.yml`)
Triggers on push to `main` when `frontend/src/**` changes:
- `npm ci && npm run lint` — lint check
- `npm run build` — validates the production build compiles

**One-time setup:** Add the 5 GitHub Actions secrets listed above.

---

## Running Supabase Locally (Optional)

Requires Docker Desktop running.

```bash
# Start local Supabase stack
supabase start
# Outputs: local URL, anon key, service role key, Studio URL

# Update frontend/.env with local values:
# VITE_SUPABASE_URL=http://127.0.0.1:54321
# VITE_SUPABASE_PUBLISHABLE_KEY=<anon key from output>

# Apply migrations locally
supabase db reset   # fresh reset with all migrations

# Access local Studio
# http://localhost:54323

# Stop
supabase stop
```

---

## First Login Bootstrap

After applying migrations, create a SUPERADMIN user:

**Option A — Supabase Dashboard:**
1. Dashboard → Authentication → Users → Add user
2. Create with email + password
3. Table Editor → `user_roles` → Insert row: `user_id` = UUID, `role` = `SUPERADMIN`

**Option B — SQL:**
```sql
-- Run after creating user via auth
INSERT INTO user_roles (user_id, role)
VALUES ('<user-uuid-from-auth>', 'SUPERADMIN');
```

The SUPERADMIN can then invite and assign roles to all other users via the app.

---

## Setting Up Google OAuth

Google OAuth is already implemented in the frontend code. You only need to configure credentials:

1. **Google Cloud Console** (`console.cloud.google.com`):
   - APIs & Services → OAuth consent screen → Internal → Save
   - Credentials → Create OAuth 2.0 Client ID → Web application
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
   - Copy Client ID + Client Secret

2. **Supabase Dashboard**:
   - Authentication → Providers → Google → Enable → paste credentials → Save

3. **Local dev**: also add `http://localhost:8080` as an authorized redirect URI in Google Cloud Console.

See `EMAIL_RATE_LIMIT.md` for the full step-by-step guide.

---

## Adding a New Test Template

1. Create a migration file:
   ```bash
   # From repo root
   supabase migration new add_<equipment>_<test>_template
   ```

2. Write the SQL:
   ```sql
   INSERT INTO test_templates (equipment_type, test_code, test_name, fields, tab, is_active)
   VALUES (
     'POWER_TRANSFORMER',
     'PT_NEW',
     'New Test Name',
     '[{"type": "object", "properties": {...}, "required": [...]}]'::jsonb,
     'PARAMETERS',
     true
   );
   ```

3. Apply:
   ```bash
   supabase db push
   ```

4. Regenerate types:
   ```bash
   supabase gen types typescript --project-id <project-ref> \
     > frontend/src/integrations/supabase/types.ts
   ```

Never alter existing migration files — always add new ones.

---

## Adding a New Equipment Type

1. Write a migration to add the new value to the `equipment_type` enum
2. Add the label prefix to `EQUIPMENT_LABEL` map in `frontend/src/components/ProjectTestingScopeTab.tsx`
3. Add test templates for the new type (separate migration)
4. Regenerate types

---

## Regenerating Supabase Types

After any schema change (new migration applied):

```bash
# Run from repo root
supabase gen types typescript --project-id <project-ref> \
  > frontend/src/integrations/supabase/types.ts
```

Never edit `frontend/src/integrations/supabase/types.ts` manually — it will be overwritten.

---

## Adding shadcn/ui Components

```bash
# Must run from frontend/ directory
cd frontend && npx shadcn-ui@latest add <component>
```

Never edit files in `frontend/src/components/ui/` manually.

---

## Building for Production

```bash
cd frontend && npm run build
# Output: frontend/dist/
```

Serve `frontend/dist/` with any static host (Nginx, Vercel, Netlify, etc.).

---

## Code Style Guidelines

```bash
cd frontend && npm run lint
```

- **Path alias** `@/` → `frontend/src/` (configured in `tsconfig.app.json` and `vite.config.ts`)
- **All dates** via `formatDate()` / `formatDateTime()` from `@/lib/format` — never `toLocaleDateString()`
- **All navigation** via `dashboardPath(userRole)` from `@/lib/routes` — never hardcode `/gm`
- **Supabase client** — always import from `@/integrations/supabase/client`, never instantiate directly
- **Types** — use `Tables<'table'>` and `Enums<'enum'>` from `@/integrations/supabase/types`
- **test_records** — always `.upsert()`, never `.insert()`
- **Toast feedback** — use `useToast` from `@/hooks/use-toast`
- **Error handling** — all Supabase calls in try/catch; toast on error + console.error

---

## Common Issues

### Blank screen / auth errors
- Check `frontend/.env` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
- Confirm migrations have been applied (`supabase db push`)

### Role not detected after login
- Check `user_roles` table has a row for your user
- The `has_role()` Postgres function must exist (created in initial migration)
- New OAuth users have no role until SUPERADMIN assigns one (this is expected)

### Google OAuth redirect error
- Check that `https://<project-ref>.supabase.co/auth/v1/callback` is in Google Cloud Console → Authorized Redirect URIs
- Check that Google credentials are pasted in Supabase → Auth → Providers → Google

### `supabase db push` fails in CI
- Verify `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD` are all set in GitHub Secrets

### Port 8080 already in use
Edit `frontend/vite.config.ts`:
```ts
server: { host: "::", port: 3000 }
```

### RLS blocking data
- Check policies for the relevant table in Supabase Dashboard → Authentication → Policies
- Confirm user has the correct role in `user_roles` table
- The `has_role()` function signature is `has_role(_user_id UUID, _role app_role)` — argument order matters

### shadcn/ui component generation
Run from `frontend/` directory:
```bash
cd frontend && npx shadcn-ui@latest add <component>
```
