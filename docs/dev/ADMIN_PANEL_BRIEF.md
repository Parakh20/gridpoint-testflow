# Brief: make the platform admin panel fully self-service

Paste everything below the line into a fresh Claude Code session in this repo.

---

## Task

Extend the platform admin panel at `admin.optimustesting.com` so an operator can
run the commercial side of the business without writing a migration or touching
the database by hand.

## What already works — do not rebuild it

`supabase/functions/platform-admin-data/index.ts` already implements these
actions, all gated by the `X-Platform-Token` header:

```
get_stats                  get_all_companies         get_company_detail
get_all_users              get_all_subscriptions     get_subscription_detail
get_billing_overview       get_billing_extras        get_company_magic_link
create_user_for_company    reset_user_password       delete_company
toggle_company_status      set_company_oauth_config
admin_change_plan          admin_extend_trial        admin_grant_trial
admin_add_credits          admin_apply_discount      admin_suspend_account
admin_reactivate_account   admin_create_addon        admin_cancel_addon
admin_create_enterprise_contract
get_all_leads  get_lead_detail  create_lead  update_lead
add_lead_activity  upsert_lead_contact  delete_lead_contact
```

UI lives in `frontend/src/pages/PlatformAdmin/`. Tabs today: companies, users,
billing, sales. `PlatformDashboard.tsx` is already 1332 lines — put new work in
new components, not in that file.

## The actual gap

`plans` and `plan_features` are **read-only everywhere except migrations**.
Verified: no INSERT/UPDATE/DELETE against either table exists in any Edge
Function or frontend file. Their RLS grants public SELECT only and explicitly
comment "service role only" for writes.

So today, changing a price, a seat cap, or a feature flag means writing and
pushing a migration. That is the thing to fix.

Schema you're working with (`20260812000001_plans_and_plan_features.sql`):

```
plans          id, slug, name, description, monthly_price_inr, annual_price_inr,
               max_users (NULL = unlimited), max_active_projects (NULL = unlimited),
               is_custom, is_active, is_public, created_at, updated_at
plan_features  id, plan_id, feature_key, enabled, config JSONB,
               UNIQUE (plan_id, feature_key)
```

Current feature keys: `offline_mobile`, `audit_trail`, `api_access`, `sso`,
`multiple_sites`, `custom_workflows`, `advanced_reports`, `advanced_approvals`,
`custom_domain`. Mirrored in `packages/shared/src/billing.ts` as `FEATURES` —
keep the two in sync or `useFeatureEntitlement` silently returns false.

## Build

1. **Plan management tab.** List/create/edit plans: name, description, monthly
   and annual price, max users, max active projects, `is_active`, `is_public`,
   `is_custom`. Toggle each feature flag per plan.

2. **New `platform-admin-data` actions** for the above — follow the existing
   action shape and token gate exactly. Every write must go through the Edge
   Function; do not add client-writable RLS policies to `plans`, because the
   pricing page reads those tables anonymously.

3. **Per-company overrides.** An operator should be able to grant one company a
   feature or a raised cap without inventing a bespoke plan. Check whether
   `companies.features` JSONB + `has_feature()` already covers this before
   adding a mechanism — it may already exist and just need UI.

4. **Razorpay plan mapping.** `plan_provider_mapping` (service-role only) maps
   plan → `razorpay_plan_id_monthly` / `_annual`. Editing a price in the admin
   panel does NOT change the Razorpay plan — Razorpay plan amounts are
   immutable, so a price change needs a new Razorpay plan and a remapping.
   Surface this in the UI rather than letting an operator create a silent
   mismatch between what the pricing page advertises and what actually gets
   charged. This is the highest-risk part of the task.

## Constraints

- Read `CLAUDE.md` first. Note gotcha 17: the platform admin token bypasses RLS
  and must never be exposed in a `VITE_*` var — it is typed at login and held in
  sessionStorage (`platformToken.ts`).
- `get_company_magic_link` mints a session for any tenant SUPERADMIN. That is
  real blast radius attached to `PLATFORM_ADMIN_TOKEN`; do not widen it.
- Migrations are forward-only and timestamp-ordered. **Check the highest
  existing number before choosing one** — three separate collisions happened in
  this repo on 2026-08-23 alone.
- Other Claude sessions may be working in this same checkout. Run
  `git branch --show-current` before committing, and announce branch switches.
- Verify with `npx tsc --noEmit -p tsconfig.app.json` and `npm run lint` from
  `frontend/`, and deploy Edge Functions with
  `supabase functions deploy <name> --project-ref hxfilijpaocogsgjrjnq`.

## Current state of the data

The database was reset on 2026-08-23. **`slpl-power` is the only company** (15
users, 1 project) — treat it as real and do not delete or mutate it while
testing. Create your own throwaway tenant via the `start-trial` function and
clean it up afterwards.

Razorpay is still in **test mode**; live keys are pending KYC and website
approval. Plans currently mapped to test-mode Razorpay plan ids, which will all
need replacing at the live cutover.

Two orphaned auth users may still exist (`admin@demo.com`,
`sharmaparakh05@gmail.com`) — auth rows whose company and profile were deleted.
Leave them alone unless asked; the second is the owner's personal account.
