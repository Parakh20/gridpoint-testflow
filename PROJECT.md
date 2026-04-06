# TestFlow — Project Description

## Overview

**TestFlow** is a web-based electrical substation commissioning management system built for grid testing teams. It digitizes the end-to-end workflow of planning, executing, and approving field tests on high-voltage substation equipment — replacing paper-based test sheets and manual tracking.

The application is branded **TestFlow** (app name in the UI) under the **Gridpoint** organization.

---

## Problem It Solves

Commissioning a substation involves testing tens to hundreds of individual pieces of electrical equipment (transformers, circuit breakers, current transformers, surge arresters, etc.) against specific test standards. Each piece of equipment must pass multiple tests before the substation can be energized. This process has traditionally been:

- Tracked on paper or in spreadsheets
- Prone to missed tests, lost data, and unclear approval chains
- Difficult to audit or export cleanly for client handover

TestFlow replaces this with a structured, role-gated digital workflow with full audit trails and PDF export.

---

## User Roles

### SUPERADMIN
Platform administrator. Manages users, assigns roles, and has read/write access to all data. Does not participate in field work directly.

### GM (General Manager)
Creates and owns test projects. Responsible for defining scope (which equipment will be tested), selecting applicable tests, assigning a supervisor to each project, and driving projects through the approval lifecycle.

### SUPERVISOR
Manages day-to-day execution on assigned projects. Assigns individual equipment units to engineers, monitors test task progress, and reviews submitted test results.

### ENGINEER
Field technician. Executes test tasks assigned to them — records measurements into dynamic test forms and submits for supervisor review.

---

## Application Workflow

```
1. GM creates a project
   └── Fills in: project number, site name, address, client, dates

2. GM defines equipment scope
   └── Selects equipment types (e.g. POWER_TRANSFORMER × 3, CT × 6)

3. GM configures testing scope
   └── For each equipment type, selects which test templates to apply
   └── System shows: "N equipment × M tests = X total test tasks"

4. GM generates equipment instances
   └── System creates equipment_instances (e.g. PTR-001, PTR-002, CT-001 … CT-006)
   └── System creates test_tasks for each (instance × enabled template)
   └── Generation is one-time and irreversible per project

5. GM assigns a supervisor to the project

6. GM submits for approval → APPROVED → activates → ACTIVE

7. SUPERVISOR assigns equipment instances to engineers

8. ENGINEERs execute test tasks
   └── Fill in dynamic test forms (fields defined by test_template.fields JSON Schema)
   └── Record ambient conditions, instrument ID, pass/fail, remarks
   └── Submit for review

9. SUPERVISOR reviews → approves (APPROVED) or sends back (REWORK)

10. GM closes the project (CLOSED) → exports PDF report or generates AI report
```

---

## Data Model

### Core Entities

**`projects`**
The top-level entity. Tracks site details, client, dates, and lifecycle status.
- Status lifecycle: `DRAFT → APPROVED → ACTIVE → CLOSED`
- Has `assigned_to` (supervisor), `created_by` (GM), `approved_by`, `approved_at`

**`scope_items`**
Declares which equipment types and quantities a project involves.
- One row per `(project_id, equipment_type)` combination (UNIQUE constraint)
- Drives equipment generation

**`project_test_scope`**
Records which test templates are enabled for each equipment type in a project.
- UNIQUE on `(project_id, test_template_id)`
- Saved as delete-then-insert when the GM saves testing scope configuration

**`equipment_instances`**
Physical equipment units to be tested. Auto-generated from scope.
- Auto-labeled: `{TYPE_PREFIX}-{SEQ}` (e.g. `PTR-001`, `SF6-003`)
- UNIQUE on `(project_id, equipment_type, seq_number)`
- Status: `UNASSIGNED → ASSIGNED → IN_PROGRESS → SUBMITTED → APPROVED` (also: `REWORK`, `CANCELLED`, `DEFERRED`)

**`test_templates`**
Library of 46 test definitions. Each template defines:
- `equipment_type` — which class of equipment it applies to
- `test_code` / `test_name` — identifier and display name
- `fields` — JSON Schema object describing the form fields for data entry
- `tab` — grouping category (`NAMEPLATE`, `PARAMETERS`, `OVERVIEW`)
- `is_active` — whether the template is available for new projects

**`test_tasks`**
One task per `(equipment_instance × test_template)`. Tracks assignment and lifecycle.
- Status: `DRAFT → IN_PROGRESS → SUBMITTED → APPROVED` (also: `REWORK`)
- Has `started_at`, `submitted_at`, `approved_at` timestamps

**`test_records`**
The actual measurement data submitted by an engineer.
- `payload: JSONB` — free-form data matching the template's field schema
- `ambient: JSONB` — ambient conditions (temperature, humidity, etc.)
- `instrument_id` — reference to the instrument used
- `pass_fail` — test result classification
- `remarks` — free text notes
- UNIQUE on `test_task_id` — always upsert, never insert

**`nameplate_records`**
Equipment nameplate information captured for each instance. One-to-one with `equipment_instances` (UNIQUE on `equipment_instance_id`).

**`audit_logs`**
Append-only log of all significant mutations. Stores `before_data` and `after_data` as JSONB alongside `actor_id`, `entity_type`, `entity_id`, and `action`. Written at the application level (not via DB triggers, except project assignment which has a dedicated trigger).

**`profiles`**
Auto-created from `auth.users` on signup via a Postgres trigger. Stores `name`, `email`, `is_active`.

**`user_roles`**
Role assignments. Separate from `profiles` to allow SUPERADMIN to change roles independently of auth credentials. UNIQUE on `(user_id, role)`.

**`supervisor_assignments`**
Tracks which supervisors are accessible to which GMs. UNIQUE on `(gm_id, supervisor_id)`.

---

## Equipment Types

| Enum Value | Full Name | Label Prefix | Test Count |
|---|---|---|---|
| `POWER_TRANSFORMER` | Power Transformer | `PTR` | 13 |
| `CT` | Current Transformer | `CT` | 6 |
| `CVT` | Capacitor Voltage Transformer | `CVT` | 6 |
| `LA` | Lightning Arrester | `LA` | 4 |
| `SF6_BREAKER` | SF6 Circuit Breaker | `SF6` | 7 |
| `ISOLATOR` | Isolator / Disconnector | `ISO` | 3 |
| `VCB` | Vacuum Circuit Breaker | `VCB` | 6 |
| `EARTH_PIT` | Earth Pit | `EP` | 1 |

---

## Dynamic Test Forms

Test templates use a JSON Schema (`type: object`) in their `fields` column to define form structure. This means new test types can be added to the database without code changes.

**Field property types:**
- `string` — text input
- `number` — numeric input (with optional `minimum`)
- `string` with `enum` — dropdown select (e.g. phase: `["A", "B", "C"]`)

The `required` array in the schema indicates mandatory fields.

**Note:** Most templates currently have `fields: []` (empty). Field schemas need to be defined per template — see `IMPROVEMENTS.md` item 10.

**Example (Insulation Resistance test):**
```json
{
  "type": "object",
  "properties": {
    "testVoltage": { "type": "number", "title": "Test Voltage (kV)" },
    "oneMin":      { "type": "number", "title": "1 Min (MΩ)" },
    "tenMin":      { "type": "number", "title": "10 Min (MΩ)" },
    "pi":          { "type": "number", "title": "Polarization Index" }
  },
  "required": ["testVoltage", "oneMin"]
}
```

---

## Security Model

All tables have **Row Level Security (RLS)** enabled in Postgres. Access is controlled by the `has_role(user_id, role)` function.

Key rules:
- All authenticated users can **read** projects, scope, equipment, templates, and test data
- Only GMs (or SUPERADMINs) can **create/edit** projects and scope items
- Only SUPERVISORs+ can **manage** equipment instances
- Only ENGINEERs+ can **create** test records and nameplate records
- Only SUPERADMINs can **manage** test templates and user roles
- Audit logs are readable by SUPERVISORs and above

---

## Authentication

Supabase Auth with two sign-in methods:
1. **Email/Password** — standard credentials
2. **Google OAuth** — "Continue with Google" button; redirects to Google consent then back to app

New users (especially OAuth) land on a "role being configured" screen until a SUPERADMIN assigns their role.

---

## PDF Export

`ProjectPDFExport` generates a printable summary of a project including overview details, equipment list, and test results. Triggered from the Project Detail page by the GM. Currently uses browser print dialog — proper PDF renderer is planned.

---

## AI Report Generation

GM clicks "Generate AI Report" (when project is CLOSED). The frontend calls the `generate-report` Supabase Edge Function which:
1. Fetches all project data (scope, instances, tasks, records)
2. Calculates completion stats and identifies failures
3. Builds a structured prompt
4. Calls Anthropic Claude API (`claude-haiku-4-5-20251001`)
5. Returns a 5-section formal commissioning report in Markdown

See `AI_REPORT_PLAN.md` for architecture and frontend integration checklist.

---

## Realtime

GM and Supervisor dashboards subscribe to Postgres changes on the `projects` table via Supabase Realtime. Project lists auto-refresh when any project is created or updated.

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript (SPA only — no SSR) |
| Build | Vite + SWC |
| UI | Tailwind CSS v3 + shadcn/ui (Radix UI) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Database | Supabase Postgres + RLS |
| Realtime | Supabase Realtime (projects table) |
| Server State | TanStack Query v5 (partial adoption) |
| Routing | react-router-dom v6 |
| Forms | react-hook-form + zod |
| Icons | lucide-react |
| Dates | date-fns |
| AI | Anthropic Claude API (edge function, server-side only) |
| Package Manager | npm |
| CI/CD | GitHub Actions |

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public API key |
| `ANTHROPIC_API_KEY` | Claude API key (Supabase secret — never in `.env`) |

---

## Key Design Decisions

1. **Equipment generation is one-time and irreversible** per project. Once instances are created, the Equipment and Tests tabs appear permanently. The scope tabs remain editable only in `DRAFT` or `APPROVED` status.

2. **Test forms are data-driven**, not hardcoded. This allows the test library (`test_templates`) to be maintained by admins in the database without frontend deployments.

3. **Delete-then-insert for test scope saves** ensures clean removal of deselected templates without complex upsert logic.

4. **Role is stored separately from auth** — `user_roles` is a standalone table, not metadata on `auth.users`. This enables clean RBAC auditing and allows a user's role to be changed independently of their auth credentials.

5. **Audit logs are append-only** and written at the application level, giving flexibility in what gets logged and how. Project assignment has a dedicated DB trigger.

6. **`test_records` uses upsert** — `UNIQUE(test_task_id)` is enforced in the DB. Engineers can re-submit without creating duplicates.

7. **Supabase is the only backend** — no separate API server. All server-side logic lives in Edge Functions (Deno runtime).
