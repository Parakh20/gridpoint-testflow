# TestFlow — Electrical Testing Management

TestFlow is an internal web application for managing electrical substation commissioning projects. It digitizes test planning, field execution, review/approval workflows, and AI-powered report generation.

**4 roles** · **8 equipment types** · **46 test templates** · **4 dashboards** · **AI reports via Claude API**

---

## Project Structure

```
gridpoint-testflow/
├── frontend/          ← React 18 + Vite + TypeScript SPA
│   ├── src/           ← Application source code
│   ├── public/        ← Static assets
│   └── package.json   ← Frontend dependencies
├── supabase/          ← Supabase project (database + backend)
│   ├── migrations/    ← 9 PostgreSQL schema migrations
│   └── functions/     ← Edge functions (Deno — server-side)
│       └── generate-report/  ← AI report via Claude API
├── skills/
│   └── gridpoint-testflow/SKILL.md  ← Claude project skill
└── .github/workflows/ ← CI/CD (auto-migrate, auto-deploy, lint+build)
```

---

## Quick Start

```bash
# 1. Install frontend dependencies
cd frontend && npm install

# 2. Set up environment
cp frontend/.env.example frontend/.env
# → fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY

# 3. Apply DB migrations (from repo root)
supabase link --project-ref <project-ref>
supabase db push

# 4. Start development server
npm run dev   # from root → http://localhost:8080
```

---

## Available Scripts (run from root)

| Command | Description |
|---|---|
| `npm run dev` | Start frontend dev server (port 8080) |
| `npm run build` | Production build → `frontend/dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## Auth Options & Email Rate Limit

Supabase's shared SMTP has a hard rate limit (~2–4 emails/hour on free plan). Google OAuth is already implemented as the primary fix.

| Solution | Cost/month | Status |
|---|---|---|
| Google OAuth | $0 | ✅ Implemented — needs Supabase Dashboard config |
| Resend custom SMTP (free tier) | $0 | 🔲 3,000 emails/month free |
| Brevo custom SMTP (free tier) | $0 | 🔲 9,000 emails/month free |
| AWS SES | ~$0.01 | 🔲 $0.10/1k emails |

See [EMAIL_RATE_LIMIT.md](./EMAIL_RATE_LIMIT.md) for setup guides and full provider comparison.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| UI | Tailwind CSS v3 + shadcn/ui |
| Database | Supabase Postgres + RLS |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Realtime | Supabase Realtime (project list updates) |
| Backend | Supabase Edge Functions (Deno) |
| AI | Anthropic Claude API (`claude-haiku-4-5-20251001`) |
| CI/CD | GitHub Actions |

---

## Environment Variables

| Layer | File | Variables |
|---|---|---|
| Frontend | `frontend/.env` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |
| GitHub Actions | repo → Settings → Secrets | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` |
| Edge Functions | `supabase secrets set` | `ANTHROPIC_API_KEY` |

See `.env.example` for full details and where to get each key.

---

## Documentation

| File | Contents |
|---|---|
| [CLAUDE.md](./CLAUDE.md) | Developer reference — stack, conventions, schema, gotchas |
| [PROJECT.md](./PROJECT.md) | Domain description — roles, workflows, data model |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Full setup guide, env vars, CI secrets, local Supabase |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deployment guide — Vercel/Netlify, secrets, first-run checklist |
| [IMPROVEMENTS.md](./IMPROVEMENTS.md) | Bug tracker and enhancement backlog (✅ fixed / 🔲 pending) |
| [AI_REPORT_PLAN.md](./AI_REPORT_PLAN.md) | AI report generation plan — architecture, checklist, cost |
| [FRONTEND_REVAMP.md](./FRONTEND_REVAMP.md) | Frontend design revamp — dark theme, 3D design, framer-motion, phased roadmap |
| [EMAIL_RATE_LIMIT.md](./EMAIL_RATE_LIMIT.md) | Email rate limit solutions — OAuth (✅ done), custom SMTP, pricing |
| [skills/gridpoint-testflow/SKILL.md](./skills/gridpoint-testflow/SKILL.md) | Claude project skill — critical rules, quick reference |
