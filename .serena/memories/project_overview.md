# Project Overview

**TestFlow** is an electrical substation commissioning management system. Field teams use it to manage test projects, record measurements on electrical equipment (power transformers, CTs, breakers, etc.), and generate PDF/AI reports. Internal operations tool — not public-facing.

## Tech Stack
- **Frontend**: React 18 + Vite + TypeScript (SPA — no SSR, no Next.js)
- **UI**: shadcn/ui (Radix UI primitives) + Tailwind CSS v3
- **Backend/DB**: Supabase (Postgres + Auth + RLS + Realtime + Edge Functions)
- **Server State**: TanStack Query v5 (SuperadminDashboard); other pages use useEffect + direct Supabase
- **Forms**: react-hook-form + zod
- **Routing**: react-router-dom v6
- **Build**: Vite with SWC
- **Package Manager**: npm (primary)
- **AI Reports**: Anthropic Claude API — called from Supabase Edge Function (Deno runtime), never from browser

## Role System
- `SUPERADMIN`: manage users, assign roles, full visibility
- `GM`: create/edit projects, define scope, assign supervisors, drive lifecycle
- `SUPERVISOR`: manage assigned projects, assign engineers
- `ENGINEER`: execute test tasks, submit records

## Key Domain Concepts
- Projects lifecycle: DRAFT → APPROVED → ACTIVE → CLOSED
- Equipment types: POWER_TRANSFORMER, CT, CVT, LA, SF6_BREAKER, ISOLATOR, VCB, EARTH_PIT
- Test tasks: one per (equipment_instance × test_template), status DRAFT → IN_PROGRESS → SUBMITTED → APPROVED | REWORK
- test_records: JSONB test data, UNIQUE(test_task_id) — always upsert, never insert
