# TestFlow — SaaS Transformation Roadmap

> Turning a single-company internal tool into a multi-tenant B2B SaaS product sold to electrical substation commissioning companies.

---

## What We Are Building

A **multi-tenant SaaS platform** where:
- **You (GridPoint)** own one central deployment + database.
- Each **client company** (e.g., "Powergrid Corp", "NTPC", "Adani Electricity") gets:
  - Their own isolated workspace (all data is company-scoped).
  - A unique URL: `powergrid.testflow.io`, `ntpc.testflow.io`, etc.
  - One **Company Superadmin** you designate — they create and manage all their own users.
  - Zero ability to see or touch another company's data.
- Users **cannot self-register**. All accounts are created by admins only.

---

## Architecture Decision: Single Database, Multi-Tenant

### Option Comparison

| Approach | Isolation | Cost | Complexity | Recommended Phase |
|---|---|---|---|---|
| **Single DB + `company_id` + RLS** | Strong (DB-enforced) | Lowest | Medium | Start here (Phase 1–3) |
| Separate DB schema per company | Very strong | Medium | High | When you have 20+ clients |
| Separate Supabase project per company | Complete | Highest | Very high | Enterprise-only clients |

**We start with Option 1.** A `company_id` UUID column is added to every table. Row Level Security (RLS) policies automatically filter every query — a user from "Powergrid" literally cannot read "NTPC" rows even if they try.

---

## System Architecture After Transformation

```
                          ┌─────────────────────────────────────┐
                          │          Vercel (single deploy)      │
                          │   testflow.io / *.testflow.io        │
                          │                                      │
  powergrid.testflow.io ──►   React SPA                         │
  ntpc.testflow.io      ──►   reads window.location.hostname    │
  adani.testflow.io     ──►   → resolves company_id             │
                          └──────────────┬──────────────────────┘
                                         │
                          ┌──────────────▼──────────────────────┐
                          │       Supabase (single project)      │
                          │                                      │
                          │  companies table                     │
                          │  ┌──────────────────────────────┐   │
                          │  │ id │ slug      │ name        │   │
                          │  │ …  │ powergrid │ Powergrid   │   │
                          │  │ …  │ ntpc      │ NTPC Ltd    │   │
                          │  └──────────────────────────────┘   │
                          │                                      │
                          │  All other tables have company_id   │
                          │  RLS: WHERE company_id = my_company  │
                          │                                      │
                          │  Edge Functions (server-side)        │
                          │  - create-user (Admin API)           │
                          │  - delete-user (Admin API)           │
                          │  - generate-report (Claude API)      │
                          └─────────────────────────────────────┘
```

---

## Role Hierarchy (Updated)

```
GridPoint (You)
  └── Platform Owner (your Supabase service key + internal admin panel)
        └── Company A — SUPERADMIN (created by you when onboarding client)
              ├── GM (created by Company Superadmin)
              ├── SUPERVISOR (created by Company Superadmin)
              └── ENGINEER (created by Company Superadmin)
        └── Company B — SUPERADMIN
              └── …
```

**Critical rule:** A SUPERADMIN can only create/delete users within their own `company_id`. They cannot touch other companies.

---

## Phase 1: Remove Public Sign-Up + Admin-Only User Creation

**Goal:** No one can self-register. Only admins create accounts.

### 1.1 — Remove Sign-Up from Auth Page

**File:** `frontend/src/pages/Auth.tsx`

- Remove the `<TabsList>` and `<TabsContent value="signup">` entirely.
- Remove the `signUp` import and usage.
- Remove the `name` state variable.
- Keep: Sign In form, Google OAuth button (optional, see note), Forgot Password dialog.

**Note on Google OAuth:** Google OAuth lets anyone with a Google account create an account. You must disable it or restrict it to specific domains (e.g., only `@powergrid.com` emails). Simplest path: remove Google OAuth entirely for now.

### 1.2 — Create `create-user` Edge Function (Server-Side Admin API)

The current `InviteUserDialog` calls `supabase.auth.signUp()` from the browser — this is the **wrong approach** for admin-only creation because any browser can call the anon endpoint.

**The fix:** A Supabase Edge Function with the **service role key** that calls `supabase.auth.admin.createUser()`. This:
- Creates users with confirmed email (no confirmation email sent).
- Cannot be called by regular users (protected by checking caller's role in the function).
- Lets you set the initial password directly.

**New file:** `supabase/functions/create-user/index.ts`

```typescript
// supabase/functions/create-user/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // 1. Verify caller is SUPERADMIN (from their JWT)
  const authHeader = req.headers.get('Authorization')
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader! } } }
  )
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  // Check SUPERADMIN role
  const { data: roleRow } = await userClient.from('user_roles').select('role').eq('user_id', user.id).single()
  if (roleRow?.role !== 'SUPERADMIN') return new Response('Forbidden', { status: 403, headers: corsHeaders })

  // Get caller's company_id
  const { data: callerProfile } = await userClient.from('profiles').select('company_id').eq('id', user.id).single()
  if (!callerProfile?.company_id) return new Response('No company', { status: 400, headers: corsHeaders })

  // 2. Use Admin client to create the new user
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { name, email, password, role } = await req.json()

  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,  // skip confirmation email
    user_metadata: { name },
  })
  if (createError) return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: corsHeaders })

  // 3. Set profile company_id
  await adminClient.from('profiles').update({ company_id: callerProfile.company_id, full_name: name }).eq('id', newUser.user.id)

  // 4. Assign role (scoped to same company)
  await adminClient.from('user_roles').insert({ user_id: newUser.user.id, role, company_id: callerProfile.company_id })

  return new Response(JSON.stringify({ user_id: newUser.user.id }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
```

### 1.3 — Update `InviteUserDialog` to Call Edge Function

Replace the `supabase.auth.signUp()` call with:
```typescript
const { data, error } = await supabase.functions.invoke('create-user', {
  body: { name, email, password, role }
})
```

### 1.4 — Create `delete-user` Edge Function

Same pattern — SUPERADMIN calls it, it uses Admin API to delete auth user + cascade cleans DB rows.

---

## Phase 2: Multi-Tenant Database Schema

### 2.1 — New Migration: `companies` Table

```sql
-- supabase/migrations/TIMESTAMP_add_companies.sql

CREATE TABLE companies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,  -- used in subdomain: "powergrid" → powergrid.testflow.io
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Only service role can insert companies (you onboard them manually or via internal tool)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_read_own" ON companies FOR SELECT
  USING (id = (SELECT company_id FROM profiles WHERE id = auth.uid()));
```

### 2.2 — Add `company_id` to All Tables

```sql
-- Add to: profiles, user_roles, projects, scope_items, equipment_instances,
--          test_tasks, test_records, nameplate_records, audit_logs, instruments

ALTER TABLE profiles ADD COLUMN company_id UUID REFERENCES companies(id);
ALTER TABLE user_roles ADD COLUMN company_id UUID REFERENCES companies(id);
ALTER TABLE projects ADD COLUMN company_id UUID REFERENCES companies(id) NOT NULL;
-- ... repeat for all tables
```

### 2.3 — Helper Function

```sql
-- Returns the company_id of the currently authenticated user
CREATE OR REPLACE FUNCTION my_company_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid()
$$;
```

### 2.4 — Update ALL RLS Policies

Every existing RLS policy gets an extra condition:

```sql
-- Example: before
CREATE POLICY "engineers_see_own_tasks" ON test_tasks FOR SELECT
  USING (assigned_to = auth.uid());

-- After (add company scope)
CREATE POLICY "engineers_see_own_tasks" ON test_tasks FOR SELECT
  USING (
    company_id = my_company_id()
    AND assigned_to = auth.uid()
  );
```

**Every table, every policy** — this is the most important security work. A full audit of all 9 existing migrations is required to rewrite policies.

### 2.5 — Update `has_role` Function

```sql
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
$$;
```

---

## Phase 3: Company Resolution from Subdomain

### 3.1 — Company Context in Frontend

**New file:** `frontend/src/contexts/CompanyContext.tsx`

```typescript
// Reads the subdomain → fetches company_id from DB → makes it available app-wide
// powergrid.testflow.io → slug = "powergrid" → company row → company_id

const getSlug = () => {
  const host = window.location.hostname  // "powergrid.testflow.io"
  const parts = host.split('.')
  // If 3+ parts and not "www", the first part is the company slug
  if (parts.length >= 3 && parts[0] !== 'www') return parts[0]
  return null  // on testflow.io itself (your admin/landing page)
}
```

The company context:
1. Reads slug from subdomain on load.
2. Fetches `companies` row where `slug = slug` (public read, no auth needed).
3. Stores `company_id` and `company_name`.
4. If slug is unknown → show "Company not found" error page.
5. Passes `company_id` into Supabase calls where needed (though RLS auto-handles most cases via `my_company_id()`).

### 3.2 — Update Sign-In Page

Show company name/logo on the sign-in page, pulled from CompanyContext:

```
"Welcome to Powergrid Corp"
Sign in with your company credentials
[Email]  [Password]  [Sign In]
```

---

## Phase 4: Deployment

### 4.1 — Domain Setup

1. Buy domain: `testflow.io` (or `gridpoint-testflow.com` etc.)
2. Add **wildcard DNS record**: `*.testflow.io → your Vercel deployment`
3. In Vercel: add `*.testflow.io` as a domain (Vercel supports wildcard domains on Pro plan).

### 4.2 — Vercel Deployment

Single deployment serves all companies:

```
testflow.io             → Landing page / login (for GridPoint internal use)
powergrid.testflow.io   → Powergrid Corp's app
ntpc.testflow.io        → NTPC's app
adani.testflow.io       → Adani's app
```

No separate deployments per company — the frontend is identical, only the subdomain changes. The React app reads `window.location.hostname` to know which company's context to load.

**Vercel config** (`vercel.json`):
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

### 4.3 — Environment Variables (No Change Needed)

`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are the same for all companies — they all connect to the same Supabase project. RLS handles isolation.

### 4.4 — Supabase Auth: Allowed Redirect URLs

In Supabase Dashboard → Auth → URL Configuration, add:
```
https://testflow.io
https://*.testflow.io
```

---

## Phase 5: Onboarding a New Client Company

This is your operational workflow when you sign a new client:

### Step 1: You (GridPoint) create the company record

Run this SQL in Supabase Dashboard or a private admin tool:

```sql
INSERT INTO companies (name, slug) VALUES ('Powergrid Corp', 'powergrid');
```

### Step 2: Create their Company Superadmin

Use your internal admin panel (or Supabase Dashboard → Auth → Users → Create):
1. Create auth user with email + temp password.
2. Insert `profiles` row with `company_id` = Powergrid's UUID.
3. Insert `user_roles` row: `role = 'SUPERADMIN', company_id = Powergrid UUID`.

### Step 3: Hand over credentials

Send the client's designated admin:
- URL: `https://powergrid.testflow.io`
- Email: `admin@powergrid-internal.com`
- Temp password: `TempPass#2024`
- Instruction: "Log in, go to User Management, and create your team."

### Step 4: Client Superadmin creates their team

From the User Management dashboard, Company Superadmin:
- Creates GM, Supervisor, Engineer accounts.
- Sets temporary passwords.
- Distributes credentials internally.
- No email confirmation required (admin-confirmed flow).

---

## Phase 6: Internal Platform Admin (GridPoint Dashboard)

You need a way to manage all companies without logging into each one. Options:

### Option A: Supabase Dashboard (Free, Immediate)
- Use Supabase Table Editor to create companies and seed superadmins.
- Works fine for < 20 clients.

### Option B: Internal Admin App (When You Have 5+ Clients)
A separate protected page at `admin.testflow.io` (or password-protected route) where you can:
- See all companies + user counts.
- Create new companies.
- Suspend companies.
- Reset any user's password.

This page uses the Supabase **service role key** (server-side only, never in browser) via an Edge Function.

---

## Security Checklist

- [ ] Public `signUp()` endpoint disabled or blocked via Supabase Dashboard → Auth → Settings → "Disable sign-ups"
- [ ] `create-user` Edge Function checks caller is SUPERADMIN before using Admin API
- [ ] `create-user` Edge Function enforces `company_id` from caller's profile (can't create users in another company)
- [ ] Every RLS policy includes `company_id = my_company_id()` check
- [ ] `has_role()` function is scoped to same company
- [ ] Service role key is NEVER in frontend code — only in Edge Function environment
- [ ] Wildcard subdomain (`*.testflow.io`) is configured in Supabase Auth allowed URLs
- [ ] `my_company_id()` helper function uses `SECURITY DEFINER` correctly

---

## Pricing / Licensing Model Suggestions

Since this is B2B SaaS for industrial use, consider:

| Model | How It Works |
|---|---|
| **Per-user/month** | ₹X per active user/month. Superadmin dashboard shows their user count. |
| **Per-project/month** | ₹X per active project. Works well for seasonal teams. |
| **Annual flat fee** | Simpler for Indian government/PSU clients who need POs and annual budgets. |
| **Tiered** | Starter (up to 5 users), Professional (up to 25), Enterprise (unlimited). |

Recommendation for early stage: **Annual flat fee per company** (e.g. ₹2–5L/year). Easier to sell to PSUs, avoids usage metering complexity.

---

## Implementation Roadmap

### Week 1 — Auth Lockdown (Immediate Win)
- [ ] Remove Sign Up tab from `Auth.tsx`
- [ ] Disable sign-ups in Supabase Dashboard (Auth → Settings)
- [ ] Create `create-user` Edge Function with Admin API
- [ ] Update `InviteUserDialog` to call Edge Function instead of `signUp()`
- [ ] Create `delete-user` Edge Function
- [ ] Remove Google OAuth (or restrict to company domains)

### Week 2 — Multi-Tenant Schema
- [ ] Write migration: `companies` table
- [ ] Write migration: `company_id` column on all tables
- [ ] Write migration: `my_company_id()` helper function
- [ ] Rewrite all RLS policies with company scope
- [ ] Update `has_role()` function

### Week 3 — Frontend Company Context
- [ ] Create `CompanyContext.tsx`
- [ ] Update `Auth.tsx` to show company name from context
- [ ] Add "Company not found" page for unknown slugs
- [ ] Test isolation: create 2 test companies, confirm data separation

### Week 4 — Deployment
- [ ] Buy domain (testflow.io or similar)
- [ ] Configure wildcard DNS + Vercel wildcard domain
- [ ] Update Supabase Auth allowed redirect URLs
- [ ] Seed first real client company + superadmin
- [ ] End-to-end test: client logs in, creates users, creates project

### Month 2 — Polish
- [ ] User management: SUPERADMIN can reset a user's password (Edge Function)
- [ ] User management: SUPERADMIN can deactivate users (not delete, just revoke role)
- [ ] Sign-in page: show company logo/branding per subdomain
- [ ] Internal GridPoint admin panel to manage all companies

---

## Files to Create / Modify (Summary)

| Action | File / Location |
|---|---|
| **Remove** Sign Up tab | `frontend/src/pages/Auth.tsx` |
| **Create** Edge Function | `supabase/functions/create-user/index.ts` |
| **Create** Edge Function | `supabase/functions/delete-user/index.ts` |
| **Update** InviteUserDialog | `frontend/src/components/InviteUserDialog.tsx` |
| **Create** CompanyContext | `frontend/src/contexts/CompanyContext.tsx` |
| **Create** Migration | `supabase/migrations/TIMESTAMP_add_companies.sql` |
| **Create** Migration | `supabase/migrations/TIMESTAMP_add_company_id_columns.sql` |
| **Create** Migration | `supabase/migrations/TIMESTAMP_rewrite_rls_policies.sql` |
| **Update** App.tsx | Wrap app in `CompanyProvider` |
| **Update** Auth.tsx | Show company name from context |
| **Update** CLAUDE.md | Document multi-tenant architecture |

---

## What NOT to Do

- **Do not** create separate Supabase projects per company right now — massive operational overhead.
- **Do not** use the service role key in the frontend — it bypasses all RLS and is a critical security hole.
- **Do not** rely on `email_confirm: false` in `supabase.auth.signUp()` as your user creation method — use the Admin API in an Edge Function.
- **Do not** hardcode `company_id` UUIDs in the frontend — always resolve from subdomain at runtime.

---

*Last updated: 2026-04-22*
*Document owner: GridPoint Engineering*
