# TestFlow — CS Concepts Study Guide

This guide teaches every Systems Design, Computer Architecture, and DBMS concept
actually used in building the TestFlow platform. Each section explains the theory,
then shows exactly how and where it appears in this codebase.

---

## Table of Contents

1. [Client–Server Model](#1-clientserver-model)
2. [Single-Page Application (SPA) Architecture](#2-single-page-application-spa-architecture)
3. [REST APIs and HTTP](#3-rest-apis-and-http)
4. [Authentication and Authorization (AuthN vs AuthZ)](#4-authentication-and-authorization-authn-vs-authz)
5. [JSON Web Tokens (JWT)](#5-json-web-tokens-jwt)
6. [Role-Based Access Control (RBAC)](#6-role-based-access-control-rbac)
7. [Multi-Tenancy Architecture](#7-multi-tenancy-architecture)
8. [Serverless / Edge Computing](#8-serverless--edge-computing)
9. [Real-Time Systems and WebSockets](#9-real-time-systems-and-websockets)
10. [CI/CD Pipelines](#10-cicd-pipelines)
11. [State Management in UIs](#11-state-management-in-uis)
12. [Event-Driven Programming](#12-event-driven-programming)
13. [Concurrency — Promises and Parallel Fetches](#13-concurrency--promises-and-parallel-fetches)
14. [Relational Database Design](#14-relational-database-design)
15. [Entity–Relationship (ER) Modeling](#15-entityrelationship-er-modeling)
16. [Normalization](#16-normalization)
17. [Keys, Constraints, and Indexes](#17-keys-constraints-and-indexes)
18. [SQL Joins](#18-sql-joins)
19. [Transactions and ACID Properties](#19-transactions-and-acid-properties)
20. [Row Level Security (RLS)](#20-row-level-security-rls)
21. [Stored Functions and Triggers](#21-stored-functions-and-triggers)
22. [JSONB — Semi-Structured Data in Postgres](#22-jsonb--semi-structured-data-in-postgres)
23. [Enums in Databases](#23-enums-in-databases)
24. [UUIDs vs. Auto-Increment IDs](#24-uuids-vs-auto-increment-ids)
25. [CASCADE Operations](#25-cascade-operations)
26. [UPSERT Pattern](#26-upsert-pattern)
27. [Audit Logging and Immutable Append-Only Tables](#27-audit-logging-and-immutable-append-only-tables)
28. [Schema Migrations](#28-schema-migrations)
29. [Finite State Machines (FSM) — Project & Task Lifecycles](#29-finite-state-machines-fsm--project--task-lifecycles)
30. [Idempotency](#30-idempotency)
31. [Foreign Key Chains for Security](#31-foreign-key-chains-for-security)
32. [Security Hardening — Privilege Escalation Prevention](#32-security-hardening--privilege-escalation-prevention)
33. [AI / LLM Integration](#33-ai--llm-integration)
34. [Build Tools and Module Bundlers](#34-build-tools-and-module-bundlers)
35. [Environment Variables and Secrets Management](#35-environment-variables-and-secrets-management)

---

## 1. Client–Server Model

### Theory
The client–server model splits responsibilities into two roles:
- **Client**: requests data and renders UI (the browser in a web app)
- **Server**: stores data, enforces business rules, and serves responses

Communication happens over a **network** (usually HTTP/HTTPS). The client cannot
be trusted — any validation done only on the client can be bypassed. All security
must ultimately be enforced on the server.

Key properties:
- **Stateless protocol**: HTTP itself carries no memory of past requests. State
  must be sent with every request (cookie, Authorization header) or stored on
  the server and identified by a session key.
- **Request–response cycle**: Client sends a request → Server processes → Server
  returns response. The connection can be closed after each cycle.

### In TestFlow
- The **React SPA** (inside `frontend/`) is the client — it runs entirely in the
  user's browser.
- **Supabase** (PostgreSQL + Auth + Edge Functions) is the server — it enforces
  RLS, validates tokens, and owns all data.
- Every database query from the browser goes through the Supabase REST API over
  HTTPS. The browser never connects to the raw database port.
- The browser holds the Supabase **anon key** (safe, scoped by RLS) and a **JWT**
  (from login). Both are sent with every request in the `Authorization` header.

---

## 2. Single-Page Application (SPA) Architecture

### Theory
A traditional **Multi-Page Application (MPA)** reloads a full HTML page from the
server on every navigation. A **Single-Page Application** loads one HTML file
once, then uses JavaScript to swap content without a full reload.

How a SPA works:
1. Browser downloads `index.html` + a JavaScript bundle (the app code).
2. JavaScript takes over all routing. When the URL changes, JS renders a new
   "page" without a network round-trip for HTML.
3. Data fetching happens separately via API calls (JSON), not embedded in HTML.

Tradeoffs vs MPA:

| | SPA | MPA |
|---|---|---|
| First load | Slower (downloads full JS bundle) | Faster (small HTML page) |
| Navigation | Instant (no reload) | Reload every page |
| SEO | Harder (crawlers may not run JS) | Easy (server renders HTML) |
| Complexity | Higher | Lower |

### In TestFlow
- `frontend/index.html` is the single HTML file. It contains only a `<div id="root">`.
- `frontend/src/main.tsx` is the JS entry point — it mounts the React tree into
  that div.
- `react-router-dom` handles client-side routing. Routes are declared in
  `frontend/src/App.tsx`.
- **Why SPA here?** TestFlow is an internal B2B tool used by logged-in field teams.
  SEO doesn't matter. Instant navigation between tabs/dashboards improves UX.
- `vercel.json` contains a rewrite rule `"source": "/(.*)", "destination": "/"`.
  This ensures the server returns `index.html` for every URL so the SPA router
  can take over even on direct URL loads or refreshes.

---

## 3. REST APIs and HTTP

### Theory
**HTTP (HyperText Transfer Protocol)** defines how messages are sent between
clients and servers. Key concepts:

**HTTP Methods (Verbs):**
| Method | Purpose | Idempotent? |
|---|---|---|
| GET | Retrieve data | Yes |
| POST | Create a new resource | No |
| PUT | Replace a resource entirely | Yes |
| PATCH | Partially update a resource | No |
| DELETE | Remove a resource | Yes |

**HTTP Status Codes:**
| Code | Meaning |
|---|---|
| 200 OK | Success |
| 201 Created | Resource was created |
| 400 Bad Request | Invalid input from client |
| 401 Unauthorized | Missing or invalid auth token |
| 403 Forbidden | Authenticated but not permitted |
| 404 Not Found | Resource does not exist |
| 500 Internal Server Error | Server-side failure |

**REST (Representational State Transfer):** An architectural style for APIs:
- Resources are identified by URLs (e.g., `/projects/123`)
- Use HTTP verbs to express intent
- Responses are typically JSON
- Stateless: each request carries all context needed

### In TestFlow
- Supabase auto-generates a REST API from the database schema. Calling
  `supabase.from('projects').select(...)` compiles to a `GET /rest/v1/projects`
  HTTP request with query parameters.
- Edge Functions are custom HTTP endpoints. `generate-report/index.ts` handles
  a `POST` request and returns `401` / `403` / `200` status codes explicitly:
  ```ts
  return json({ error: 'Unauthorized' }, 401);
  return json({ error: 'Forbidden' }, 403);
  return json({ report: reportText }, 200);
  ```
- CORS headers (`supabase/functions/_shared/cors.ts`) are required because the
  browser's security policy blocks cross-origin requests unless the server
  explicitly allows them via the `Access-Control-Allow-Origin` header.

---

## 4. Authentication and Authorization (AuthN vs AuthZ)

### Theory
These two concepts are often confused but are distinct:

- **Authentication (AuthN):** "Who are you?" — verifying identity.
  Example: providing email + password, or a Google OAuth token.
- **Authorization (AuthZ):** "What are you allowed to do?" — checking permissions.
  Example: only GMs can create projects; only ENGINEERs assigned to a task can
  submit it.

**Authentication flows:**
1. **Password-based**: User submits email + password → Server checks hash → Issues
   a session token.
2. **OAuth 2.0 / Social Login**: User logs in via a third-party (Google) → Google
   confirms identity → App receives a token.
3. **Magic links**: Server emails a one-time link → Clicking it proves email
   ownership → Session is issued.

**Session vs Token-based auth:**
- **Session**: Server stores session state. Client holds a session ID cookie. Server
  looks up the session on every request. Does not scale horizontally without shared
  session store.
- **Token (JWT)**: Server issues a signed token. Client sends it with every request.
  Server validates the signature without a database lookup. Stateless and scalable.

### In TestFlow
- Supabase Auth handles password-based and Google OAuth authentication.
- `AuthContext.tsx` wraps the app. It calls `supabase.auth.onAuthStateChange`
  to listen for login/logout events and stores the current user.
- After login, `AuthContext` fetches the user's **role** from the `user_roles`
  table. This is separate from authentication — it's authorization data.
- The `setTimeout(..., 0)` trick in `AuthContext` defers the role fetch to avoid
  a Supabase internal deadlock when calling the DB inside `onAuthStateChange`.
- `ProtectedRoute.tsx` is the authorization guard — it checks the user's role
  and redirects to `/auth` if they lack permission.
- User creation is **admin-only**: `create-user` Edge Function uses
  `admin.createUser()` (service role). Public `signUp()` is disabled.

---

## 5. JSON Web Tokens (JWT)

### Theory
A **JWT** is a compact, self-contained token for transmitting claims between
parties. Format: `header.payload.signature` (three Base64URL strings joined by dots).

```
eyJhbGciOiJIUzI1NiJ9          ← header  (algorithm)
.eyJ1c2VyX2lkIjoiMTIzIn0      ← payload (claims: user_id, role, exp, iat, ...)
.SflKxwRJSMeKKF2QT4fwpMeJf36  ← signature (HMAC or RSA of header + payload)
```

**Key properties:**
- **Self-contained**: the payload carries all claims — no database lookup needed
  to validate a JWT (just verify the signature).
- **Tamper-proof**: the signature is computed with a secret key. Changing any bit
  of the payload invalidates the signature.
- **Expiry**: the `exp` claim sets an expiration time. After that, the token is
  invalid even if the signature is valid.
- **Stateless**: the server doesn't store tokens. Logout invalidates the client's
  copy but the token remains technically valid until `exp`.

**When to use JWT vs Sessions:**
- JWT: microservices, APIs, mobile apps, serverless (no shared session store)
- Sessions: traditional monoliths where server controls everything

### In TestFlow
- Supabase issues a JWT after successful login. It's stored in browser
  `localStorage` by the Supabase client.
- Every Supabase API call includes `Authorization: Bearer <JWT>` automatically.
- Supabase verifies the JWT signature on every request using its own secret key.
- The JWT payload contains `sub` (user UUID) which Postgres reads via `auth.uid()`
  inside RLS policies — without any extra database lookup.
- The anon key (VITE_SUPABASE_PUBLISHABLE_KEY) is also a JWT but with minimal
  claims — it only grants access to public data + whatever RLS allows the anon role.

---

## 6. Role-Based Access Control (RBAC)

### Theory
**RBAC** assigns permissions to roles, then assigns roles to users. Instead of
checking "can user #123 do X?", you check "does user #123 have a role that permits X?".

Structure:
```
Users → Roles → Permissions → Resources
```

Benefits:
- Easy to audit: list all permissions for a role
- Easy to change: update a role's permissions without touching every user
- Principle of Least Privilege: give users only the access they need

Common alternatives:
- **ABAC** (Attribute-Based): permissions based on attributes (location, time, data
  value). More flexible but harder to reason about.
- **ACL** (Access Control List): per-resource list of who can do what. Fine-grained
  but doesn't scale.

### In TestFlow
Four roles: `SUPERADMIN > GM > SUPERVISOR > ENGINEER`. Stored in the `user_roles`
table (separate from `profiles` for security).

```sql
CREATE TYPE app_role AS ENUM ('SUPERADMIN', 'GM', 'SUPERVISOR', 'ENGINEER');
CREATE TABLE user_roles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role    app_role NOT NULL,
  UNIQUE (user_id, role)
);
```

The `has_role()` SQL function is used inside every RLS policy:
```sql
CREATE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role);
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

Permission matrix:
| Action | ENGINEER | SUPERVISOR | GM | SUPERADMIN |
|---|---|---|---|---|
| View projects | Own company | Own company | Own company | Own company |
| Create projects | No | No | Yes | Yes |
| Generate AI report | No | No | Yes | Yes |
| Manage users | No | No | No | Yes |

---

## 7. Multi-Tenancy Architecture

### Theory
**Multi-tenancy** means one software instance serves multiple independent
customers (tenants), with strict data isolation between them.

**Three main patterns:**

1. **Separate databases per tenant**: Total isolation. Easiest to implement but
   expensive to scale (one DB server per customer).

2. **Separate schemas per tenant** (Postgres): One DB, separate schema per tenant
   (e.g., `companya.projects`, `companyb.projects`). Medium isolation, medium cost.

3. **Shared schema, row-level isolation**: One DB, one set of tables, `company_id`
   column on every table. RLS enforces that tenants can only see their own rows.
   Most cost-efficient. Harder to get right (risk of data leaks if RLS has bugs).

**Subdomain routing** is the most common way to identify the current tenant in a
SaaS app: `companya.app.io` → tenant = Company A.

### In TestFlow
Uses Pattern 3 (shared schema + RLS) with subdomain routing.

```
companya.testflow.io  →  slug = "companya"  →  companies row  →  company_id
companyb.testflow.io  →  slug = "companyb"  →  companies row  →  company_id
```

`CompanyContext.tsx` reads `window.location.hostname`, extracts the subdomain,
fetches the matching row from `companies`, and exposes `{ company, loading }`.

Every root-level table has a `company_id UUID REFERENCES companies(id)` column:
- `profiles`, `user_roles`, `projects`, `audit_logs`, `instruments`

Child tables (`scope_items`, `test_tasks`, etc.) are isolated via **FK chain** —
they don't have their own `company_id` column but are protected because they
reference `projects` which has `company_id` (see section 31).

The `my_company_id()` SQL function is the central isolation primitive:
```sql
CREATE FUNCTION my_company_id() RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```
Every RLS policy uses `company_id = my_company_id()` instead of a hardcoded
value. If a user has no company (newly created, pending setup), `my_company_id()`
returns NULL → no RLS policy matches → they see nothing. Safe by default.

---

## 8. Serverless / Edge Computing

### Theory
**Serverless computing** lets developers deploy code without managing servers.
The cloud provider (AWS Lambda, Cloudflare Workers, Supabase Edge Functions)
handles:
- Provisioning servers
- Scaling (instantly: 0 → 10,000 invocations)
- Billing (per invocation, not per server-hour)

**Key properties:**
- **Stateless**: each invocation is independent. No memory of previous calls.
- **Cold start**: first invocation spins up a container (slow). Subsequent
  invocations may reuse it (fast).
- **Short-lived**: timeouts of seconds to minutes. Not for long-running processes.

**Edge Functions** run at CDN edge nodes geographically close to users, reducing
latency. Supabase Edge Functions run on Deno (not Node.js).

**Why serverless over a traditional backend?**
- No servers to patch/manage
- Auto-scaling: handles traffic spikes without pre-provisioning
- Pay only for usage

### In TestFlow
Five Supabase Edge Functions in `supabase/functions/`:

| Function | Purpose |
|---|---|
| `create-user` | Admin-only user creation via Supabase Admin API |
| `delete-user` | Admin-only user deletion |
| `generate-report` | Calls Anthropic Claude API, returns AI report |
| `create-tenant` | Atomic company + SUPERADMIN creation (platform admin) |
| `platform-admin-data` | RLS-bypassing data proxy for platform admin panel |

Each function:
1. Receives an HTTP request
2. Validates auth (checks JWT)
3. Verifies role/permissions
4. Performs database operations using the **service role key** (bypasses RLS)
5. Returns a JSON response

The **service role key** (never exposed to browsers) lets Edge Functions bypass
RLS when they need to perform admin operations. Regular browser calls use the
anon key + JWT (subject to RLS).

---

## 9. Real-Time Systems and WebSockets

### Theory
**HTTP** is request–response: the client must ask for updates. For live-updating
UIs, two approaches exist:

1. **Polling**: client repeatedly asks "any updates?" every N seconds. Simple but
   wasteful — most requests return "nothing new".
2. **WebSockets**: persistent bidirectional connection. Server pushes updates to
   the client as soon as they happen. Efficient but requires persistent connection
   infrastructure.
3. **Server-Sent Events (SSE)**: one-way server→client stream over HTTP. Simpler
   than WebSockets for read-only live updates.

**Postgres LISTEN/NOTIFY** is Postgres's built-in pub/sub system. Supabase
Realtime uses it: when a row changes, Postgres emits a NOTIFY event, Supabase
forwards it over a WebSocket to subscribed clients.

### In TestFlow
Dashboards subscribe to live project changes:
```ts
// GMDashboard.tsx — separate subscriptions per event type
const channel = supabase.channel('projects-realtime')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'projects' },
      (payload) => { /* add to list */ })
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects' },
      (payload) => { /* update in list */ })
  .subscribe();
```

Why separate INSERT and UPDATE subscriptions instead of `event: '*'`? To handle
each case with the correct UI logic (add a new row vs. update an existing row in
state).

The `projects` table was added to the `supabase_realtime` publication in
migration 4. Without that, NOTIFY events are not emitted.

---

## 10. CI/CD Pipelines

### Theory
**CI (Continuous Integration):** Automatically build and test code whenever a
developer pushes changes. Catches bugs early, before they merge to the main branch.

**CD (Continuous Deployment):** Automatically deploy code to production (or a
staging environment) after CI passes.

Together, CI/CD replaces the manual process of "someone builds and deploys
the app once a week" with automated, consistent, repeatable deployments.

**GitHub Actions** is a CI/CD platform integrated into GitHub. Workflows are
defined as YAML files in `.github/workflows/`. Triggers include: push to a
branch, pull request opened, schedule (cron), manual dispatch.

### In TestFlow
Two workflows in `.github/workflows/`:

**`frontend.yml`** — runs on every push to `main`:
1. Checks out code
2. Installs npm dependencies
3. Runs `npm run lint` (catches TypeScript errors, style issues)
4. Runs `npm run build` (ensures the production bundle compiles)

**`supabase.yml`** — runs on every push to `main`:
1. Checks out code
2. Links to the Supabase project using `SUPABASE_PROJECT_ID` secret
3. Runs `supabase db push` — applies any new migration files to production
4. Runs `supabase functions deploy` — uploads Edge Function code to production

Secrets (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, etc.) are stored in
GitHub → Settings → Secrets. They're injected as environment variables at runtime
and never appear in code or logs.

---

## 11. State Management in UIs

### Theory
**State** is any data that can change over time and affects what the UI renders.

Types of state:
- **Local state**: belongs to one component (`useState`). e.g., "is this dialog open?"
- **Server state**: data fetched from an API. Needs caching, background re-fetching,
  invalidation when mutations happen. This is what TanStack Query solves.
- **Global/shared state**: data needed by many components. e.g., "who is logged in?"
  Solved by React Context.

**TanStack Query (React Query):**
- Caches API responses so the same query doesn't fire multiple times
- Re-fetches in the background when the user returns to the tab
- Provides `isLoading`, `isError`, `data` — eliminates boilerplate
- When a mutation succeeds, call `invalidateQueries` to tell the cache "this data
  is stale, re-fetch it"

**React Context:**
- Lets you pass data "through the tree" without prop-drilling
- Used for global singletons: auth state, company info, theme

### In TestFlow
- `AuthContext.tsx` holds the current user and role (React Context)
- `CompanyContext.tsx` holds the current tenant company (React Context)
- `SuperadminDashboard.tsx` uses **TanStack Query** for user/health data:
  ```ts
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => supabase.from('profiles').select('*'),
  });
  ```
- Other pages (`GMDashboard`, `ProjectDetail`) use the older `useEffect` +
  direct Supabase pattern. These don't get caching or background re-fetch.

---

## 12. Event-Driven Programming

### Theory
In **event-driven** systems, code executes in response to events (user actions,
network responses, timer ticks) rather than in a linear top-to-bottom flow.

JavaScript / React is inherently event-driven:
- User clicks a button → `onClick` handler fires
- API response arrives → `.then()` or `await` resumes
- Auth state changes → `onAuthStateChange` callback fires
- A database row changes → Supabase Realtime callback fires

The JavaScript runtime uses a single-threaded **event loop**: it processes one
event at a time from a queue, never blocking. I/O (network, disk) is handled
asynchronously — the event loop stays free while waiting.

### In TestFlow
- `supabase.auth.onAuthStateChange((event, session) => { ... })` — fires when
  login/logout happens
- `useEffect(() => { fetchProjects(); }, [])` — fires after component mounts
- Supabase Realtime `.on('postgres_changes', ...)` — fires when DB rows change
- `onClick={handleSubmit}` on buttons — fires on user interaction

The `setTimeout(..., 0)` in `AuthContext` is a deliberate event loop trick:
it defers the role fetch to the next event loop tick, avoiding a re-entrant
call to Supabase auth internals that would deadlock.

---

## 13. Concurrency — Promises and Parallel Fetches

### Theory
JavaScript is single-threaded but handles I/O concurrently via the event loop
and **Promises**.

A **Promise** represents a value that will be available in the future. Instead of
blocking the thread while waiting for a network request, you schedule a callback
for when it completes.

**Sequential vs. Parallel fetches:**
```js
// Sequential — total time = A + B + C
const a = await fetchA();
const b = await fetchB();
const c = await fetchC();

// Parallel — total time = max(A, B, C)
const [a, b, c] = await Promise.all([fetchA(), fetchB(), fetchC()]);
```

`Promise.all` starts all three requests simultaneously and waits for all to
complete. If any one fails, `Promise.all` rejects immediately.

### In TestFlow
`generate-report/index.ts` fetches scope, equipment, and test task data in
parallel to minimize latency:
```ts
const [scopeRes, instancesRes, tasksRes] = await Promise.all([
  supabase.from('scope_items').select(...).eq('project_id', project_id),
  supabase.from('equipment_instances').select(...).eq('project_id', project_id),
  supabase.from('test_tasks').select(...).eq('equipment_instance.project_id', project_id),
]);
```
These three queries are independent (no result depends on another), so running
them in parallel is correct and faster.

---

## 14. Relational Database Design

### Theory
A **relational database** organizes data into **tables** (also called relations).
Each table has:
- **Columns** (attributes): define the type of data stored (name TEXT, age INTEGER)
- **Rows** (tuples): one record per row
- **Schema**: the structure definition (table names, column names, types, constraints)

Core idea: data is stored once and **referenced** (linked) by other tables, rather
than duplicated. This prevents inconsistency.

**Data Types in Postgres (used in TestFlow):**
| Type | Description | Example |
|---|---|---|
| UUID | 128-bit universal unique identifier | `gen_random_uuid()` |
| TEXT | Variable-length string | `'PowerGrid Corp'` |
| INTEGER | 32-bit integer | `42` |
| BOOLEAN | true/false | `TRUE` |
| TIMESTAMPTZ | Timestamp with timezone | `NOW()` |
| DATE | Date only (no time) | `'2026-05-11'` |
| JSONB | Binary JSON (queryable) | `'{"phase": "A"}'` |
| ENUM | Named set of values | `'DRAFT'`, `'ACTIVE'` |

### In TestFlow — Key Tables

```
companies          → one row per tenant company
profiles           → one row per user (extends auth.users)
user_roles         → role assignments (user ↔ role many-to-many)
projects           → commissioning projects (belong to a company)
scope_items        → equipment types + quantities per project
equipment_instances → physical units (one row per transformer, breaker, etc.)
test_templates     → library of test definitions (JSON Schema fields)
project_test_scope → which templates are enabled per project
test_tasks         → one task per (instance × template)
test_records       → submitted test data (JSONB payload)
nameplate_records  → equipment nameplate data (JSONB payload)
audit_logs         → append-only action log
instruments        → measurement instruments belonging to a company
```

---

## 15. Entity–Relationship (ER) Modeling

### Theory
An **ER diagram** models the entities (things) in a system and the relationships
between them, before translating to SQL tables.

**Cardinality** describes "how many":
- **One-to-One (1:1)**: one user has one profile
- **One-to-Many (1:N)**: one project has many scope_items
- **Many-to-Many (M:N)**: projects have many test_templates, and test_templates
  can be used by many projects → requires a **junction table** (`project_test_scope`)

**Participation**:
- **Total** (mandatory): every equipment_instance must belong to a project
- **Partial** (optional): a test_task may or may not be assigned to an engineer

### In TestFlow — Relationships

```
companies          1 ──── N  profiles
companies          1 ──── N  projects
projects           1 ──── N  scope_items
scope_items        1 ──── N  equipment_instances
test_templates     M ──── N  projects      (via project_test_scope)
equipment_instances 1 ──── N  test_tasks
test_tasks         1 ──── 1  test_records  (UNIQUE constraint)
equipment_instances 1 ──── 1  nameplate_records (UNIQUE constraint)
```

The `project_test_scope` table is the M:N junction table:
```sql
-- Many projects can use many test_templates
project_test_scope (
  project_id        UUID REFERENCES projects(id),
  test_template_id  UUID REFERENCES test_templates(id),
  UNIQUE(project_id, test_template_id)
)
```

---

## 16. Normalization

### Theory
**Normalization** is the process of structuring a relational database to reduce
**data redundancy** (storing the same data in multiple places) and improve
**data integrity** (preventing inconsistencies).

**Normal Forms (NF):**

**1NF (First Normal Form):**
- Each column contains atomic (indivisible) values
- No repeating groups within a row
- Bad: `projects.equipment_list = "POWER_TRANSFORMER, CT, CVT"`
- Good: separate `scope_items` table, one row per equipment type

**2NF (Second Normal Form):**
- Must be in 1NF
- Every non-key attribute depends on the **whole** primary key (no partial dependency)
- Relevant for tables with composite primary keys

**3NF (Third Normal Form):**
- Must be in 2NF
- No **transitive dependencies**: non-key columns shouldn't depend on other non-key columns
- Bad: storing `company_name` in `projects` (depends on `company_id`, not `project_id`)
- Good: store only `company_id` in `projects`; join `companies` table for the name

**Denormalization:** Intentionally violating normalization for performance.
Storing computed/derived data avoids expensive JOINs but risks inconsistency.

### In TestFlow
The schema is mostly in 3NF:
- `projects` stores `company_id` (FK), not `company_name` (would be transitive)
- `equipment_instances` stores `equipment_type` directly (copied from `scope_items`)
  — a small intentional denormalization to avoid a JOIN when rendering the instance list
- `test_tasks` stores `status` inline rather than computing it from `test_records`
  — another denormalization for query performance

---

## 17. Keys, Constraints, and Indexes

### Theory

**Primary Key (PK):** uniquely identifies each row. Cannot be NULL. Every table
should have exactly one.

**Foreign Key (FK):** a column that references the PK of another table. Enforces
**referential integrity** — you cannot insert a row with a `project_id` that
doesn't exist in `projects`.

**Unique Constraint:** prevents duplicate values. Can be on one column or a
combination (composite unique).

**Check Constraint:** enforces a condition on column values.
```sql
quantity INTEGER NOT NULL CHECK (quantity >= 0)
```

**NOT NULL Constraint:** the column must have a value.

**Index:** a data structure that speeds up lookups on a column. The DB maintains
it automatically on every INSERT/UPDATE/DELETE.
- PKs are automatically indexed
- FK columns should be indexed for JOIN performance
- Any column you frequently filter by (`WHERE company_id = ...`) benefits from an index

**Trade-off:** indexes speed up reads but slow down writes (the index must be
updated on every change). Don't index everything blindly.

### In TestFlow
```sql
-- Composite unique: one row per (project, equipment type)
UNIQUE (project_id, equipment_type)  -- on scope_items

-- Composite unique: no duplicate instances per position
UNIQUE (project_id, equipment_type, seq_number)  -- on equipment_instances

-- Ensures one test result per task
UNIQUE (test_task_id)  -- on test_records
-- (added in migration 20260405000001_add_test_record_unique_constraint.sql)

-- One nameplate per instance
UNIQUE (equipment_instance_id)  -- on nameplate_records

-- One role assignment per user (a user can have only one role here)
UNIQUE (user_id, role)  -- on user_roles
```

Migration `20260430000001` adds a partial index on `profiles.company_id` to
speed up the `my_company_id()` lookup that runs on every authenticated request.

---

## 18. SQL Joins

### Theory
A **JOIN** combines rows from two or more tables based on a related column.

**Types:**
- **INNER JOIN**: returns only rows that have a match in both tables
- **LEFT JOIN**: returns all rows from the left table, and matched rows from the
  right (or NULL if no match)
- **RIGHT JOIN**: opposite of LEFT JOIN
- **FULL OUTER JOIN**: returns all rows from both tables

```sql
-- Find all test tasks with their template names and instance labels
SELECT tt.id, tt.status, tmpl.test_name, ei.label
FROM   test_tasks      tt
JOIN   test_templates  tmpl ON tmpl.id = tt.test_template_id
JOIN   equipment_instances ei  ON ei.id  = tt.equipment_instance_id
WHERE  ei.project_id = '...'
```

### In TestFlow
RLS policies for deeply nested tables use JOINs in subqueries:
```sql
-- test_records policy: must walk the FK chain up to projects.company_id
USING (
  test_task_id IN (
    SELECT tt.id FROM test_tasks tt
    JOIN equipment_instances ei ON ei.id = tt.equipment_instance_id
    JOIN projects p ON p.id = ei.project_id
    WHERE p.company_id = my_company_id()
  )
)
```

The `generate-report` Edge Function uses Supabase's PostgREST join syntax:
```ts
supabase.from('test_tasks').select(`
  id, status,
  equipment_instance:equipment_instances!inner(label, equipment_type, project_id),
  test_template:test_templates(test_name, test_code),
  test_records(payload, pass_fail, remarks, ambient)
`)
```
This generates a SQL query with multiple JOINs, returning nested JSON.

---

## 19. Transactions and ACID Properties

### Theory
A **transaction** is a sequence of database operations that executes as a single
unit. Either all operations succeed, or none do. This prevents partial updates
from corrupting data.

**ACID properties:**
- **Atomicity**: all-or-nothing. If any step fails, the entire transaction is rolled back.
- **Consistency**: the database moves from one valid state to another. Constraints
  are always satisfied.
- **Isolation**: concurrent transactions don't interfere with each other. Each sees
  a consistent snapshot.
- **Durability**: once committed, the transaction is permanent even if the server crashes.

**Use cases for transactions:**
- Transferring money: debit one account AND credit another (must both succeed)
- Creating a user: insert `auth.users` AND `profiles` AND `user_roles`
- The `project_test_scope` save: DELETE old rows AND INSERT new rows atomically

### In TestFlow
The `create-tenant` Edge Function creates a company and its SUPERADMIN
atomically. If user creation succeeds but role assignment fails, the whole
operation should roll back (the Edge Function uses the Supabase Admin API which
handles this).

The `project_test_scope` save logic in `ProjectTestingScopeTab.tsx` is
delete-then-insert — not wrapped in a DB transaction (a limitation of the
browser-side Supabase client). A failure between DELETE and INSERT could leave
the table empty. This is an acceptable risk in this context because the operation
is retried by the user.

The seed migration (`20260429000001`) uses a `DO $$ BEGIN ... END $$` block
which runs in a single transaction — if any insert fails, nothing is committed.

---

## 20. Row Level Security (RLS)

### Theory
**Row Level Security** is a Postgres feature that automatically filters table rows
based on who is executing the query. It's enforced at the database level — not in
application code — so it cannot be bypassed by a buggy or malicious app.

How it works:
1. You enable RLS on a table: `ALTER TABLE projects ENABLE ROW LEVEL SECURITY;`
2. You define policies: SQL expressions evaluated per row, per operation (SELECT,
   INSERT, UPDATE, DELETE)
3. Postgres evaluates the policy for every row — rows that don't pass are invisible
   (SELECT) or rejected (INSERT/UPDATE/DELETE)

**USING vs WITH CHECK:**
- `USING`: filters rows for SELECT, UPDATE, DELETE. Checked against existing rows.
- `WITH CHECK`: validates rows for INSERT, UPDATE. Checked against the new row values.

If you only specify `USING` on an UPDATE policy, a malicious user could set
`company_id` to a different value (passing the USING check on the old value)
and move the row to another company. Always add `WITH CHECK` for UPDATE/INSERT.

**SECURITY DEFINER functions:**
Normal SQL functions run with the caller's permissions. `SECURITY DEFINER` makes
the function run with the **owner's** permissions (bypasses RLS). Used for
`my_company_id()` and `has_role()` so they can read `profiles` and `user_roles`
even if the caller's RLS would otherwise block that read.

### In TestFlow
Every table has RLS enabled. The pattern is consistent:

```sql
-- Simple: direct company_id column
CREATE POLICY "projects_select_same_company"
  ON projects FOR SELECT TO authenticated
  USING (company_id = my_company_id());

-- Complex: walk the FK chain (no company_id column on this table)
CREATE POLICY "test_records_select_same_company"
  ON test_records FOR SELECT TO authenticated
  USING (
    test_task_id IN (
      SELECT tt.id FROM test_tasks tt
      JOIN equipment_instances ei ON ei.id = tt.equipment_instance_id
      JOIN projects p ON p.id = ei.project_id
      WHERE p.company_id = my_company_id()
    )
  );
```

The security hardening migration (`20260429000001`) fixed a critical
privilege-escalation bug: a user could previously UPDATE their own
`profiles.company_id` to another company's UUID, giving them full read access
to that company's data (since `my_company_id()` reads from `profiles`).
Fix: add a `WITH CHECK` that prevents changing `company_id`:
```sql
WITH CHECK (
  id = auth.uid()
  AND company_id IS NOT DISTINCT FROM (SELECT company_id FROM profiles WHERE id = auth.uid())
)
```

---

## 21. Stored Functions and Triggers

### Theory
**Stored Functions (Stored Procedures):** SQL or PL/pgSQL code stored inside the
database, invoked by name. Benefits:
- Logic lives close to the data (less network round-trips)
- Can be called from SQL queries, RLS policies, triggers
- `SECURITY DEFINER` lets them bypass RLS for specific operations

**Triggers:** automatic functions that the database calls before or after a row
is inserted, updated, or deleted.

```
BEFORE/AFTER  INSERT/UPDATE/DELETE  ON table  FOR EACH ROW  EXECUTE FUNCTION fn()
```

Inside a trigger function:
- `NEW`: the new row (after the change)
- `OLD`: the old row (before the change)
- Return `NEW` to allow the operation; return `NULL` to cancel it (BEFORE triggers)

Common trigger use cases:
- Auto-update `updated_at` timestamp on every UPDATE
- Auto-create a related record when a parent is inserted
- Validate data that's too complex for a CHECK constraint
- Audit logging

### In TestFlow

**`has_role()`** — used in RLS policies to check user role:
```sql
CREATE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role);
$$;
```

**`my_company_id()`** — used in RLS policies for tenant isolation:
```sql
CREATE FUNCTION my_company_id() RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid()
$$;
```

**`update_updated_at_column()`** — trigger function for auto-timestamping:
```sql
CREATE FUNCTION update_updated_at_column() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
```
Applied via triggers on every table that has `updated_at`:
```sql
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**`handle_new_user()`** — trigger on `auth.users` INSERT that auto-creates a
profile row whenever a new user signs up:
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## 22. JSONB — Semi-Structured Data in Postgres

### Theory
Most relational databases store data in fixed columns with fixed types. But
sometimes you need **flexible, variable-shape data** — different records need
different fields.

Two approaches:
1. **Add nullable columns for every possible field.** Gets unwieldy fast.
2. **Store as JSON.** One column holds an entire document. Schema is flexible.

Postgres offers two JSON types:
- **`JSON`**: stores raw text. Parsing happens at query time. No indexing.
- **`JSONB`**: stores binary (parsed) JSON. Faster to query. Supports GIN indexes.
  Operators: `->>` (get field as text), `->` (get field as JSON), `@>` (contains)

**When to use JSONB:**
- The shape of data varies per record (e.g., different test templates have different fields)
- You need flexibility to add new fields without schema migrations
- You're storing data you'll mostly read/write as a blob (not query field-by-field)

**When NOT to use JSONB:**
- You need to filter/sort by individual fields at scale (use indexed columns)
- You need foreign keys on individual values (JSONB fields can't be FK-constrained)

### In TestFlow
Two key uses of JSONB:

**`test_templates.fields`** — JSON Schema defining the form fields for each test:
```json
{
  "type": "object",
  "properties": {
    "tapPosition": {"type": "string", "title": "Tap Position"},
    "measuredRatio": {"type": "number", "title": "Measured Ratio"},
    "phase": {"type": "string", "enum": ["A", "B", "C"], "title": "Phase"}
  },
  "required": ["tapPosition", "measuredRatio"]
}
```
Different test templates need completely different fields. JSONB is the right
choice here — the schema is interpreted at runtime by `TestFormV2.tsx` to render
the form dynamically.

**`test_records.payload`** — the actual submitted test data:
```json
{"tapPosition": "3", "measuredRatio": 5.02, "phase": "A"}
```
The shape matches the template's `fields` definition. Using JSONB avoids creating
a separate column for every possible measurement across 46 templates.

---

## 23. Enums in Databases

### Theory
An **enum** (enumerated type) is a data type with a fixed set of allowed values.
Benefits:
- **Type safety**: the DB rejects any value not in the enum
- **Readability**: `status = 'ACTIVE'` is clearer than `status = 3`
- **Storage**: Postgres stores enums efficiently (as integers internally)
- **Documentation**: the allowed values are visible in the schema

Vs. a `TEXT` column with a CHECK constraint:
- Enum is stricter (adding values requires `ALTER TYPE`)
- CHECK constraint is more flexible (easy to change without a migration)
- Postgres enums cannot be reordered or have values removed

### In TestFlow
```sql
CREATE TYPE app_role       AS ENUM ('SUPERADMIN', 'GM', 'SUPERVISOR', 'ENGINEER');
CREATE TYPE project_status AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');
CREATE TYPE test_status    AS ENUM ('DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REWORK');
CREATE TYPE equipment_type AS ENUM ('POWER_TRANSFORMER', 'CT', 'CVT', 'LA',
                                     'SF6_BREAKER', 'ISOLATOR', 'VCB', 'EARTH_PIT');
```

`project_status` was later extended to include `'APPROVED'` (via an ALTER TYPE
migration) because the business added an approval step between DRAFT and ACTIVE.

The `test_templates.tab` field uses a CHECK constraint instead of an enum:
```sql
tab TEXT NOT NULL CHECK (tab IN ('NAMEPLATE', 'PARAMETERS', 'OVERVIEW'))
```
CHECK was chosen here for flexibility — adding a new tab type only requires
updating the CHECK constraint, not an ALTER TYPE migration.

---

## 24. UUIDs vs. Auto-Increment IDs

### Theory
Every row needs a unique identifier. Two common approaches:

**Auto-increment integers (SERIAL, BIGSERIAL):**
- Simple: 1, 2, 3, 4, ...
- Predictable (which is a security risk — can enumerate records by ID)
- Easy to remember and type
- Efficient storage (4–8 bytes)
- Only unique within one table — merging databases causes collisions

**UUIDs (Universally Unique Identifiers):**
- 128-bit random values: `550e8400-e29b-41d4-a716-446655440000`
- Globally unique: no collisions even across databases, servers, or time
- Cannot be enumerated (no sequential pattern)
- Safe to expose in URLs (not guessable)
- Slightly larger (16 bytes) and slower to index than integers

**UUID v4** (random) is the most common for databases.
`gen_random_uuid()` is the Postgres function.

### In TestFlow
Every table uses UUID primary keys:
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

Why UUIDs here?
1. **Multi-tenancy**: company data can be merged or migrated without ID conflicts
2. **Security**: project IDs are in browser URLs — sequential IDs would let a user
   guess other companies' project IDs
3. **Distributed creation**: the client can generate a UUID before inserting
   (optimistic UI), then confirm the insert

---

## 25. CASCADE Operations

### Theory
When you delete a parent row, what happens to child rows that reference it via
a foreign key?

Options:
- **RESTRICT / NO ACTION** (default): reject the DELETE if child rows exist
- **CASCADE**: automatically delete child rows too
- **SET NULL**: set the FK column to NULL in child rows
- **SET DEFAULT**: set the FK column to its default value

`ON DELETE CASCADE` creates a **deletion tree**: deleting a company cascades to
profiles, which cascades to user_roles, etc.

**Use with care:** accidental deletion of a parent record silently deletes all
descendants. Consider soft-deletes (an `is_deleted` flag) for important data.

### In TestFlow
The FK chain is designed so that deleting a project cascades down:
```
DELETE projects → CASCADE to scope_items
                → CASCADE to equipment_instances
                → CASCADE to test_tasks
                → CASCADE to test_records
                → CASCADE to nameplate_records
```

Defined as:
```sql
scope_items.project_id         REFERENCES projects(id)             ON DELETE CASCADE
equipment_instances.project_id REFERENCES projects(id)             ON DELETE CASCADE
equipment_instances.scope_item_id REFERENCES scope_items(id)       ON DELETE CASCADE
test_tasks.equipment_instance_id REFERENCES equipment_instances(id) ON DELETE CASCADE
test_records.test_task_id      REFERENCES test_tasks(id)           ON DELETE CASCADE
```

`profiles.id REFERENCES auth.users(id) ON DELETE CASCADE` — deleting a Supabase
auth user cascades to delete their profile. The `delete-user` Edge Function
uses this: `admin.deleteUser(user_id)` → auto-deletes profile + user_roles.

---

## 26. UPSERT Pattern

### Theory
**UPSERT** = UPDATE + INSERT. If a row with the given key exists, update it; if
not, insert a new row.

In Postgres: `INSERT ... ON CONFLICT (key_column) DO UPDATE SET ...`

Alternatives:
1. Application-side: check if row exists → branch on INSERT or UPDATE. Requires
   two round-trips. Race condition between check and write.
2. Upsert: atomic. One round-trip. No race condition.

**ON CONFLICT DO NOTHING**: if a row with the conflict key exists, silently ignore
the INSERT (don't error, don't update).

### In TestFlow
**`test_records` must use upsert** (enforced by UNIQUE constraint):
```ts
// CORRECT: upsert because UNIQUE(test_task_id)
await supabase.from('test_records').upsert({ test_task_id, payload, ... });

// WRONG: would fail with 409 Conflict if a record already exists
await supabase.from('test_records').insert({ test_task_id, payload, ... });
```
Engineers save their test forms multiple times before submitting. Upsert lets them
save progress without manually checking if a record exists.

The demo seed migration uses upsert for idempotency:
```sql
INSERT INTO companies (name, slug) VALUES ('Company A', 'companya')
ON CONFLICT (slug) DO NOTHING;
```
Running the migration twice doesn't duplicate companies.

---

## 27. Audit Logging and Immutable Append-Only Tables

### Theory
An **audit log** records every significant action performed in the system:
who did what, when, to which record, and what the data looked like before and after.

Properties of a good audit log:
- **Append-only**: rows are only ever inserted, never updated or deleted
- **Before/after snapshot**: captures the row data before and after each change
- **Actor**: who performed the action (user ID)
- **Timestamp**: when it happened
- **Entity**: which table and which row

Audit logs are used for:
- Debugging ("who changed this project status?")
- Compliance (financial/legal requirements for record keeping)
- Security investigation (detecting unauthorized actions)

Implementation note: audit logs written at the **application level** (in the app
code, before/after each operation) are easier to implement but can be skipped if
code is buggy. **Database triggers** for auditing are harder to bypass.

### In TestFlow
```sql
CREATE TABLE audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID        REFERENCES auth.users(id),  -- who
  entity_type TEXT        NOT NULL,                   -- which table (e.g. 'projects')
  entity_id   UUID        NOT NULL,                   -- which row
  action      TEXT        NOT NULL,                   -- what (e.g. 'STATUS_CHANGED')
  before_data JSONB,                                  -- row before
  after_data  JSONB,                                  -- row after
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()      -- when
);
```

RLS policy: append-only (INSERT allowed, no UPDATE or DELETE policy defined):
```sql
CREATE POLICY "audit_logs_insert"
  ON audit_logs FOR INSERT
  WITH CHECK (company_id = my_company_id());
-- No UPDATE or DELETE policy → those operations are blocked for all users
```

---

## 28. Schema Migrations

### Theory
A **schema migration** is a versioned, ordered set of SQL changes to the database
schema. Migrations allow:
- **Version control for the DB**: the schema is tracked in git alongside the code
- **Reproducibility**: any developer can recreate the exact DB state by running
  all migrations in order
- **Safe deployments**: migrations run automatically in CI/CD before deploying new code

Best practices:
- **Never edit an existing migration file** after it has been applied in production.
  Existing migrations are history. Add a new migration to make changes.
- **Timestamp-based naming**: guarantees ordering across branches/developers
- **Idempotent where possible**: `CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO NOTHING`
- **Backwards compatible**: when possible, add columns as nullable first, then
  backfill, then add NOT NULL constraint in a later migration

### In TestFlow
24 migration files in `supabase/migrations/`, timestamp-ordered.

Notable migrations:
- `20251029064345_*`: Initial schema (enums, tables, RLS, triggers, seed templates)
- `20260405000001_add_test_record_unique_constraint.sql`: Added `UNIQUE(test_task_id)`
  to `test_records` — a bug fix that required a migration
- `20260409000002_populate_template_fields.sql`: Backfilled `fields` JSON into
  existing `test_templates` rows that had been seeded with empty arrays
- `20260422000001_add_companies_and_multitenancy.sql`: Major migration —
  added the entire multi-tenancy layer (companies table, company_id columns,
  `my_company_id()` function, all new RLS policies)
- `20260429000001_security_hardening_and_demo_seed.sql`: Tightened WITH CHECK
  clauses on several policies + seeded demo tenants

GitHub Actions runs `supabase db push` on every push to `main`, which applies
any unapplied migrations to the production database.

---

## 29. Finite State Machines (FSM) — Project & Task Lifecycles

### Theory
A **Finite State Machine** is a model of a system that:
- Is in exactly one **state** at any given time
- Transitions between states based on **events/inputs**
- Has a finite, predefined set of states and valid transitions

FSMs are useful for modeling workflows where an entity progresses through stages
and not all transitions are allowed (e.g., you can't go from CLOSED back to DRAFT).

```
States: {S1, S2, S3, ...}
Transitions: {(S1, event) → S2, (S2, event) → S3, ...}
Initial state: S1
Final states: {S3, S4, ...}
```

### In TestFlow
**Project status FSM:**
```
DRAFT ──(approve)──► APPROVED ──(activate)──► ACTIVE ──(close)──► CLOSED
```
- Only GMs/SUPERADMINs can drive transitions
- Scope is editable only in DRAFT or APPROVED (`isEditable = status === 'DRAFT' || status === 'APPROVED'`)
- CLOSED is a terminal state — no transitions out

**Test task status FSM:**
```
DRAFT ──(start)──► IN_PROGRESS ──(submit)──► SUBMITTED
                                                  │
                     ◄───────────(rework)──────────┤
                                                  │
                                    ──(approve)──► APPROVED
```
- ENGINEER submits → SUPERVISOR approves or sends back for REWORK
- `rework_reason` is set by the supervisor when rejecting
- APPROVED is a terminal state

Both FSMs are enforced at the application level in `ProjectStatusActions.tsx`
and `ProjectTestsTab.tsx`. The DB stores the current state and the app controls
transitions.

---

## 30. Idempotency

### Theory
An operation is **idempotent** if performing it multiple times has the same
effect as performing it once.

- GET requests are idempotent (reading doesn't change data)
- DELETE is idempotent (deleting an already-deleted record is a no-op)
- POST is typically not idempotent (each call creates a new record)
- PUT is idempotent if it replaces the entire resource

**Why idempotency matters:**
- **Retries**: if a network request times out, you don't know if it was received.
  If the operation is idempotent, retrying is safe.
- **Distributed systems**: messages can be delivered more than once. Idempotent
  handlers process duplicates correctly.
- **Database migrations**: migrations that can safely be re-run prevent disasters
  from partial failures.

### In TestFlow
**Equipment generation is intentionally one-time and guarded by `alreadyGenerated`:**
```tsx
// ProjectTestingScopeTab.tsx
const alreadyGenerated = instances.length > 0;
// Generate button is disabled if alreadyGenerated
```
Equipment generation inserts rows with `UNIQUE(project_id, equipment_type, seq_number)`.
Running it twice would fail with a conflict error. The `alreadyGenerated` flag
is the application-level idempotency guard.

**The `project_test_scope` save is deliberately NOT idempotent:**
- DELETE all existing rows for this project
- INSERT the new selection
This "delete-then-insert" pattern allows full replacement of the selection. Each
save is the authoritative new state. Running it twice with the same selection
is safe (DELETE has nothing to delete on the second run; INSERT creates fresh rows).

**Seed migrations** use `ON CONFLICT DO NOTHING` for idempotency:
```sql
INSERT INTO companies (name, slug) VALUES ('Company A', 'companya')
ON CONFLICT (slug) DO NOTHING;
```

---

## 31. Foreign Key Chains for Security

### Theory
Not every table needs a direct `company_id` column for multi-tenant isolation.
If a child table has a FK to a parent that already has `company_id`, the child
is implicitly isolated through the FK chain — any query for a child row must
eventually join back to the parent, where the `company_id` filter applies.

This is a **normalization vs. security** design choice:
- Adding `company_id` to every table is denormalized (redundant data) but
  makes RLS policies simpler and faster.
- Using FK chains is normalized but requires JOIN-based subqueries in RLS policies.

### In TestFlow
The FK chain for `test_records`:
```
test_records.test_task_id
  → test_tasks.equipment_instance_id
    → equipment_instances.project_id
      → projects.company_id ← company isolation here
```

RLS policy for `test_records` uses this full chain:
```sql
USING (
  test_task_id IN (
    SELECT tt.id FROM test_tasks tt
    JOIN equipment_instances ei ON ei.id = tt.equipment_instance_id
    JOIN projects p ON p.id = ei.project_id
    WHERE p.company_id = my_company_id()
  )
)
```

Tables with their own `company_id` (shorter path): `profiles`, `user_roles`,
`projects`, `audit_logs`, `instruments`.

Tables isolated via FK chain: `scope_items`, `project_test_scope`,
`equipment_instances`, `test_tasks`, `test_records`, `nameplate_records`.

---

## 32. Security Hardening — Privilege Escalation Prevention

### Theory
**Privilege escalation** is when a user gains more access than they should have.
In multi-tenant systems, the most dangerous form is **cross-tenant escalation**:
a user in Company A somehow reading or modifying Company B's data.

Common attack vectors:
1. **Parameter tampering**: send a different `company_id` in the request body
2. **Self-modification**: update your own `company_id` to another company's UUID
3. **Injection**: craft a SQL payload that modifies the query's WHERE clause

**Principle of Least Privilege**: give users the minimum access needed for
their role. Default to deny; explicitly grant what's needed.

**Defense in depth**: use multiple security layers. Don't rely on a single check.
If the application-level check is buggy, the database RLS provides a second barrier.

### In TestFlow
The critical privilege escalation bug (found and fixed in migration `20260429000001`):

**Vulnerability**: A user could call `UPDATE profiles SET company_id = '<other-uuid>'`
for their own row. Since `my_company_id()` reads from `profiles`, this would
immediately grant them read access to the other company's data.

**Fix**: Add `WITH CHECK` to the `profiles_update_own` RLS policy:
```sql
WITH CHECK (
  id = auth.uid()
  AND company_id IS NOT DISTINCT FROM (SELECT company_id FROM profiles WHERE id = auth.uid())
)
```
`IS NOT DISTINCT FROM` handles NULL correctly (unlike `=`, which returns NULL
when comparing NULL to NULL, which is falsy in SQL).

The same hardening was applied to:
- `profiles_superadmin_manage` (SUPERADMIN can't move profiles to other companies)
- `user_roles_superadmin_manage` (SUPERADMIN can't assign roles in other companies)
- `projects_update_gm` (GM can't move a project to another company)

CLAUDE.md specifically calls this out:
> `profiles_update_own` RLS has WITH CHECK preventing self-change of `company_id`
> (migration `20260429000001`). Do NOT weaken this — it is the gate against
> cross-tenant escalation.

---

## 33. AI / LLM Integration

### Theory
**Large Language Models (LLMs)** are neural networks trained on large text corpora
that can generate coherent text in response to a prompt. Integration pattern:

1. Collect structured data from your system
2. Render it into a natural language **prompt** (the instruction to the model)
3. Call the LLM API (`POST /v1/messages`)
4. Parse the response (usually free-form text or JSON)
5. Return to the user

**Prompt engineering**: the art of writing prompts that reliably produce the
desired output format and content. Key techniques:
- Give the model a **role** ("You are a senior electrical engineer...")
- Provide **context** (the data it needs)
- Give explicit **instructions** (what to write, what format)
- Add constraints ("Do not fabricate specific measurement values")

**Temperature**: controls randomness. 0 = deterministic; 1 = creative.
For factual reports, use low temperature.

**Tokens**: LLMs process text in chunks called tokens (~4 chars each). APIs charge
per token. `max_tokens` limits the response length.

**Security**: LLM calls should always happen server-side (Edge Function). Never
expose API keys to the browser. The server validates permissions before calling
the API.

### In TestFlow
The `generate-report` Edge Function:
1. **Authenticates** the caller (JWT validation)
2. **Authorizes** (only GM or SUPERADMIN can generate reports)
3. **Verifies tenant isolation** (project must belong to caller's company)
4. **Fetches data** in parallel (`Promise.all` for scope, instances, tasks)
5. **Builds the prompt** with structured project data embedded as text
6. **Calls Anthropic API**:
   ```ts
   fetch('https://api.anthropic.com/v1/messages', {
     method: 'POST',
     headers: { 'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')! },
     body: JSON.stringify({
       model: 'claude-haiku-4-5-20251001',
       max_tokens: 4096,
       messages: [{ role: 'user', content: prompt }],
     }),
   })
   ```
7. Returns the generated Markdown report

The prompt explicitly prevents hallucination: "Do not fabricate specific
measurement values — work only from the data provided above."

---

## 34. Build Tools and Module Bundlers

### Theory
Modern JavaScript apps consist of hundreds of source files that must be combined
into a small number of optimized files for the browser.

**Module bundler** (Webpack, Vite, Rollup, esbuild):
- Starts from the entry point (`main.tsx`)
- Follows all `import` statements recursively
- Bundles everything into one (or a few) JavaScript files
- Applies **tree shaking**: removes exports that are never imported (dead code elimination)
- Applies **minification**: renames variables to single letters, removes whitespace

**Transpiler** (Babel, SWC, tsc):
- Converts modern JS/TS to older JS that all browsers can run
- Converts TypeScript → JavaScript (removes type annotations)
- Converts JSX (`<Component />`) → `React.createElement(Component, ...)`

**Why Vite?**
- **Development**: serves files directly via native ES Modules (no bundling needed).
  Each file is a separate HTTP request. Changes rebuild instantly.
- **Production**: uses Rollup to bundle and optimize for delivery.
- Much faster than Webpack because it only bundles what changed.

### In TestFlow
- `frontend/vite.config.ts`: configures Vite
  - `@vitejs/plugin-react-swc`: uses SWC (Rust-based) instead of Babel — faster transpilation
  - `port: 8080, host: "::"`: dev server binds to all interfaces
  - `"@/": "./src/"`: path alias so imports can be `@/components/X` instead of `../../../components/X`
- `frontend/package.json` scripts:
  - `npm run dev`: start Vite dev server (no bundling, instant HMR)
  - `npm run build`: production bundle → `frontend/dist/`
  - `npm run lint`: TypeScript + ESLint checks

---

## 35. Environment Variables and Secrets Management

### Theory
**Environment variables** are key-value pairs set outside the application code,
injected at runtime. They separate **configuration** (what changes per environment)
from **code** (what stays the same).

**Why not hardcode values?**
- Different environments (dev, staging, prod) use different API keys and URLs
- Secrets (API keys, passwords) must never appear in code (git history is permanent)
- Rotating a secret shouldn't require a code change

**Hierarchy of sensitivity:**
1. **Public config** (can be in code): feature flags, UI copy
2. **Non-secret env vars** (ok in `.env`, but gitignore it): API URLs, project IDs
3. **Secrets** (never in code, never in `.env`): API keys, DB passwords, tokens

**`VITE_` prefix**: Vite bundles only variables prefixed with `VITE_` into the
browser JavaScript. Other variables are only available during the build process.
This prevents accidentally leaking server-side secrets to the browser bundle.

**Supabase Edge Functions** automatically receive injected environment variables:
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. The service
role key is the most powerful credential — it bypasses RLS. It should only ever
exist in Edge Function environment, never in browser code.

### In TestFlow
| Variable | Where stored | Sensitivity |
|---|---|---|
| `VITE_SUPABASE_URL` | `frontend/.env` + Vercel env | Low (public) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `frontend/.env` + Vercel env | Low (anon key, safe) |
| `VITE_PLATFORM_ADMIN_TOKEN` | `frontend/.env` + Vercel env | High (must match Supabase secret) |
| `VITE_PLATFORM_ADMIN_PASSWORD` | `frontend/.env` + Vercel env | High |
| `ANTHROPIC_API_KEY` | Supabase secret only | Critical (never in .env) |
| `PLATFORM_ADMIN_TOKEN` | Supabase secret only | Critical |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected into Edge Functions | Critical |
| `SUPABASE_DB_PASSWORD` | GitHub Actions secret only | Critical |

The `.gitignore` excludes `frontend/.env` so secrets are never committed.
`frontend/.env.example` is committed — it documents which variables are needed
but contains no real values.

---

## Summary — Concept Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TestFlow Architecture                        │
├──────────────────────────┬──────────────────────────────────────────┤
│       CLIENT (Browser)   │           SERVER (Supabase)              │
│                          │                                          │
│  React SPA               │  PostgreSQL Database                     │
│  ├─ react-router-dom     │  ├─ Relational Schema (14 tables)        │
│  ├─ TanStack Query       │  ├─ Enums (4 custom types)               │
│  ├─ AuthContext (JWT)    │  ├─ Constraints (UNIQUE, FK, CHECK)      │
│  ├─ CompanyContext       │  ├─ Triggers (updated_at, handle_user)   │
│  └─ Role-based routes    │  ├─ Stored Functions (has_role, etc.)    │
│                          │  ├─ Row Level Security (20+ policies)    │
│  Vite + SWC build        │  ├─ JSONB (test fields, payloads)        │
│  TypeScript + JSX        │  └─ Migrations (24 versioned files)      │
│                          │                                          │
│  HTTP/HTTPS ─────────────┤  Supabase Auth                          │
│  JWT in every request    │  ├─ JWT issuance                         │
│                          │  ├─ OAuth (Google)                       │
│  WebSocket (Realtime) ───┤  └─ admin.createUser()                  │
│                          │                                          │
│                          │  Edge Functions (Deno/Serverless)        │
│                          │  ├─ create-user                          │
│                          │  ├─ delete-user                          │
│                          │  ├─ generate-report → Anthropic API      │
│                          │  ├─ create-tenant                        │
│                          │  └─ platform-admin-data                  │
│                          │                                          │
│  CI/CD ──────────────────┤  GitHub Actions                         │
│                          │  ├─ supabase db push (migrations)        │
│                          │  └─ supabase functions deploy            │
└──────────────────────────┴──────────────────────────────────────────┘

Systems Design Concepts Used:
  Multi-Tenancy · Client-Server · SPA · REST · RBAC · Serverless
  Real-Time · CI/CD · State Management · Idempotency · FSM · AuthN/AuthZ

DBMS Concepts Used:
  Relational Design · ER Modeling · Normalization · SQL Joins
  ACID · RLS · Triggers · Stored Functions · JSONB · Enums
  UUID · CASCADE · UPSERT · Audit Logging · Migrations
  Unique Constraints · FK Chains · Privilege Escalation Prevention
```

---

*This guide was generated from the actual codebase of TestFlow. Every concept
described here is directly observable in the SQL migrations, Edge Functions, and
React source code of this project.*
