# Deployment Guide

TestFlow has two independently deployable pieces:

| Piece | What it is | Where it runs |
|---|---|---|
| **Frontend** | React Vite SPA → static files | Vercel / Netlify / Cloudflare Pages |
| **Backend** | Supabase (Postgres + Auth + Edge Functions) | Supabase Cloud (already hosted) |

The database and edge functions are deployed automatically by the `supabase.yml` GitHub Actions workflow whenever you push to `main`. **You only need to deploy the frontend manually.**

---

## Secret Safety — Never Commit Credentials

### What is already protected

| File | Protected by |
|---|---|
| `frontend/.env` | `.gitignore` — `frontend/.env`, `frontend/.env.*` |
| `.env` (root) | `.gitignore` — `.env`, `.env.*` |
| `admin.env` | `.gitignore` — `admin.env` |

### Pre-push checklist (run before every `git push`)

```bash
# Verify no .env files are staged
git diff --cached --name-only | grep -E '\.env$'

# Should return nothing. If it returns any file, unstage it:
git restore --staged <filename>
```

### What was previously committed

The original `.env` committed to this repo contained only `VITE_SUPABASE_*` variables — the anon/publishable key and project URL. These are **intentionally public** (the browser bundle includes them). No service role key or private secret was ever committed.

The file has been deleted from disk. After your next commit it will be removed from the tracked files list going forward.

### If a real secret is ever accidentally committed

```bash
# Immediately rotate the key in the provider dashboard (Supabase, Anthropic, etc.)
# Then remove from git history:
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

git push origin --force --all
```

**Rotating the key is the critical step** — assume it is already compromised once it touches git history.

---

## Frontend Deployment

### Option A — Vercel (recommended)

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Select the `gridpoint-testflow` repository
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variables (Settings → Environment Variables):

   | Variable | Value | Source |
   |---|---|---|
   | `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` | Supabase → Settings → API |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJ...` (anon key) | Supabase → Settings → API |

5. Click **Deploy**

Every future push to `main` will auto-deploy.

### Option B — Netlify

1. Go to [app.netlify.com](https://app.netlify.com) → Add new site → Import from Git
2. Connect GitHub → select `gridpoint-testflow`
3. Configure:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
4. Add environment variables (Site configuration → Environment variables):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
5. Click **Deploy site**

Create `frontend/netlify.toml` if you need SPA redirect rules:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Option C — Cloudflare Pages

1. Cloudflare Dashboard → Pages → Create a project → Connect to Git
2. Select repository
3. Configure:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `frontend`
4. Add environment variables
5. Deploy

### Option D — Self-hosted (Nginx / Apache)

```bash
# Build
cd frontend && npm run build

# Copy dist/ to your server
scp -r dist/ user@your-server:/var/www/testflow/

# Nginx config snippet (SPA routing)
location / {
  root   /var/www/testflow;
  index  index.html;
  try_files $uri $uri/ /index.html;
}
```

---

## Backend Deployment (Supabase)

Supabase is already hosted. The GitHub Actions workflow handles all backend deploys automatically.

### What auto-deploys on push to main

| Changed path | What happens |
|---|---|
| `supabase/migrations/**` | `supabase db push` applies new migrations |
| `supabase/functions/**` | `supabase functions deploy` redeploys edge functions |

### Required GitHub Actions secrets

Add these once in **GitHub repo → Settings → Secrets and variables → Actions**:

| Secret | Value | How to get |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | Personal access token | supabase.com → Account → Access Tokens |
| `SUPABASE_PROJECT_ID` | Your project reference ID | Supabase → Settings → General |
| `SUPABASE_DB_PASSWORD` | Database password | Supabase → Settings → Database |
| `VITE_SUPABASE_URL` | Project URL | Supabase → Settings → API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key | Supabase → Settings → API |

### AI Report Generation — Anthropic key (server-side only)

This key is **never** in `.env`. It lives inside Supabase as an edge function secret:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-...
supabase secrets list  # verify
```

---

## First-Time Production Setup Sequence

Follow these steps in order when setting up a fresh environment:

```
1. [ ] Create Supabase project at supabase.com
2. [ ] Add the 5 GitHub Actions secrets (table above)
3. [ ] Set ANTHROPIC_API_KEY as Supabase secret
4. [ ] Push to main → GitHub Actions applies migrations + deploys functions
5. [ ] Run: bash scripts/create-admin.sh   (after filling in admin.env)
6. [ ] Deploy frontend to Vercel/Netlify with VITE_ env vars
7. [ ] Test login with admin credentials
8. [ ] Delete or clear admin.env after confirming access
```

---

## Custom Domain

### Vercel
Settings → Domains → Add → enter your domain → follow DNS instructions.

### Netlify
Site configuration → Domain management → Add custom domain.

### Supabase custom domain (optional)
Supabase Pro plan required. Dashboard → Settings → Custom domains.

---

## Post-Deployment Checks

```bash
# 1. App loads and login works
# 2. Auth redirects to correct dashboard per role
# 3. AI report generation button works on a project
# 4. Supabase Realtime updates show without page refresh
# 5. GitHub Actions shows green on latest push
```
