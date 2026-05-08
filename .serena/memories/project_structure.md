# Project Structure

```
gridpoint-testflow/                  ← repo root (run supabase CLI from here)
├── frontend/                        ← React Vite SPA (all UI work here)
│   ├── src/
│   │   ├── App.tsx                  # Routes + providers + ErrorBoundary
│   │   ├── contexts/AuthContext.tsx # Auth state + role fetch
│   │   ├── lib/
│   │   │   ├── routes.ts            # dashboardPath(role)
│   │   │   ├── format.ts            # formatDate / formatDateTime
│   │   │   └── utils.ts             # cn() Tailwind helper
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui primitives — DO NOT edit
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── ProjectTestingScopeTab.tsx  # Scope config + equipment gen
│   │   │   ├── ProjectStatusActions.tsx    # Status transitions
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── Auth.tsx
│   │   │   ├── Index.tsx            # Role-based redirect
│   │   │   ├── dashboards/          # SuperadminDashboard, GMDashboard, etc.
│   │   │   └── projects/            # NewProject, ProjectDetail, EditProject
│   │   └── integrations/supabase/
│   │       ├── client.ts            # Supabase singleton — always import from here
│   │       └── types.ts             # Auto-generated — DO NOT edit manually
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts               # @/ alias, port 8080
│   └── .env                         # GITIGNORED — copy from frontend/.env.example
│
├── supabase/
│   ├── config.toml
│   ├── migrations/                  ← SQL migration files (timestamp-ordered)
│   └── functions/generate-report/  ← Deno edge function (AI report)
│
├── .github/workflows/               ← CI: supabase.yml + frontend.yml
├── package.json                     # Root convenience scripts (delegates to frontend/)
└── CLAUDE.md                        # Primary developer reference — keep updated
```
