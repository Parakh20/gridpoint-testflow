# TestFlow — Electrical Testing Management

TestFlow is an internal web application for managing electrical substation commissioning projects. It digitizes test planning, field execution, review/approval workflows, and report generation.

**4 roles** · **8 equipment types** · **46 test templates** · **4 dashboards** 

---

## Project Structure

```
gridpoint-testflow/
├── frontend/          ← React 18 + Vite + TypeScript SPA
│   ├── src/           ← Application source code
│   ├── public/        ← Static assets
│   └── package.json   ← Frontend dependencies
├── supabase/          ← Supabase project (database + backend)
│   ├── migrations/    ← 27 PostgreSQL schema migrations
│   └── functions/     ← Edge functions (Deno — server-side)
│       ├── create-user/        ← Admin user creation (Admin API)
│       ├── delete-user/        ← Admin user deletion (Admin API)
│       ├── generate-report/    ← AI report via Claude API
│       ├── create-tenant/      ← Platform: atomic company + SUPERADMIN creation
│       └── platform-admin-data/ ← Platform: RLS-bypassing data proxy
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

**Developer reference**
| File | Contents |
|---|---|
| [CLAUDE.md](./CLAUDE.md) | Stack, conventions, schema, gotchas (Claude Code project memory) |
| [docs/dev/MIGRATIONS.md](./docs/dev/MIGRATIONS.md) | Migration playbook |
| [docs/dev/IMPROVEMENTS.md](./docs/dev/IMPROVEMENTS.md) | Bug + enhancement tracker |
| [skills/gridpoint-testflow/SKILL.md](./skills/gridpoint-testflow/SKILL.md) | Claude project skill — quick reference |

**Business / go-to-market**
| File | Contents |
|---|---|
| [docs/business/PRICING.md](./docs/business/PRICING.md) | Tier structure, INR pricing, payment terms |
| [docs/business/SALES_TARGETS.md](./docs/business/SALES_TARGETS.md) | Tiered buyer list and outreach approach |
| [docs/business/SEO_PLAN.md](./docs/business/SEO_PLAN.md) | Top-of-funnel SEO + content strategy |

**Design specs and plans** live under [docs/superpowers/](./docs/superpowers/).
