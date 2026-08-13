# Billing QA Test Matrix

Hand-traced verification notes for billing/subscription scenarios that cannot
be exercised against a live database in this environment (no Docker/local
Supabase instance available here). Each entry quotes the actual function body
being traced (file + line reference, current as of the migrations listed) and
walks the logic by hand against concrete inputs. **None of these were run
against a live Postgres instance — this is static analysis / code-reading,
not an executed test.** Where a scenario has a real, runnable counterpart,
it's implemented as a Vitest test instead and cross-referenced here.

Ground truth used throughout: `plans` seed data from
`supabase/migrations/20260812000001_plans_and_plan_features.sql`:

| slug | max_users | max_active_projects | monthly_price_inr | is_public |
|---|---|---|---|---|
| starter | 10 | 3 | 25000 | true |
| professional | 30 | NULL (unlimited) | 60000 | true |
| business | 100 | NULL (unlimited) | 150000 | true |
| enterprise | NULL | NULL | NULL (custom) | true |
| trial (internal, `20260813000016`) | 5 | 1 | NULL | **false** — not self-service-purchasable |

The final, currently-shipped version of every RPC quoted below is the last
`CREATE OR REPLACE` in migration order. For `get_company_entitlements`,
`can_invite_user`, `can_create_project`, `check_plan_downgrade_feasibility`,
`request_subscription_cancellation`, `request_plan_downgrade` that's
`supabase/migrations/20260813000019_final_review_fixes.sql`. For
`get_resource_limit_status` it's the new fix in this same session,
`supabase/migrations/20260814000001_fix_resource_limit_status_grace_period.sql`
(see scenario 5 — a real bug was found and fixed there).

---

## 1. Trial → upgrade → payment succeeds

**Question:** once a `subscriptions` row appears with `status = 'active'`,
does `get_company_entitlements()` correctly stop resolving from
`trial_ends_at` and instead resolve the paid plan?

**Code traced:** `get_company_entitlements()`,
`20260813000019_final_review_fixes.sql` lines 58–77:

```sql
SELECT s.plan_id INTO resolved_plan_id
FROM subscriptions s
WHERE s.company_id = target_company
  AND s.status IN ('trialing', 'active', 'past_due')
LIMIT 1;

IF resolved_plan_id IS NULL THEN
  -- ...fall back to trial_ends_at resolution...
END IF;
```

**Trace:**
- Company `C1` has `companies.trial_ends_at = NOW() + 3 days` (still trialing)
  and no `subscriptions` row yet. `resolved_plan_id` stays NULL after the
  subscription lookup → falls into the `trial_ends_at > NOW()` branch →
  resolves to the `trial` plan (5 users / 1 project). This is the pre-upgrade
  state.
- Razorpay checkout completes; the `subscription.activated` (or
  `subscription.charged`) webhook fires. `razorpay-webhook/index.ts` calls
  `upsert_subscription(...)` with `_status = mapRazorpayStatus('active') = 'active'`.
  `upsert_subscription` does `INSERT ... ON CONFLICT (company_id) DO UPDATE`
  (subscriptions.company_id has a UNIQUE constraint —
  `20260519000003_ratelimit_trial_billing.sql` line 120), so a row now exists
  for `C1` with `status = 'active'` and `plan_id` resolved from
  `plan_provider_mapping` (e.g. Professional).
- Next call to `get_company_entitlements(C1)`: the subscription lookup now
  finds `status = 'active' IN ('trialing','active','past_due')` → TRUE →
  `resolved_plan_id` = the paid plan's id. The `trial_ends_at` fallback branch
  is never reached (short-circuited by `resolved_plan_id IS NULL` guard).
  Company sees Professional's limits (30 users / unlimited projects) even
  though `companies.trial_ends_at` is untouched and still in the future.

**Result: PASS (by trace).** The subscription lookup takes priority
unconditionally over the trial fallback, so trial→paid transition is correct
as soon as the webhook lands a row with `status='active'`. No code change
needed.

**Caveat found while tracing:** if the webhook is delayed or fails silently
(see scenario 8's dedupe-gate compensating-delete path), the company stays on
`trial` entitlements despite having paid — there's no user-facing "payment
succeeded, provisioning your plan" polling/retry UI. Out of scope to fix here
(no evidence this is broken, just an observation that success depends on
webhook delivery, which has no fallback reconciliation job).

---

## 2. Trial expires → Starter-equivalent limits (not read-only)

**Question:** does `can_invite_user`/`can_create_project` correctly drop to
Starter limits per the trial-expired branch? ("Read-only-ish" was the
plan's word choice — confirm what actually happens, since the real behavior
is "capped at Starter's write limits", not "read-only".)

**Code traced:** same `get_company_entitlements()` fallback CASE (line 68–71):

```sql
fallback_slug := CASE
  WHEN company_trial_ends_at IS NULL THEN 'enterprise'
  WHEN company_trial_ends_at > NOW() THEN 'trial'
  ELSE 'starter'
END;
```

plus `can_invite_user()` / `can_create_project()` (same migration, lines
152–224), both of which call `get_company_entitlements()` and compare a live
`COUNT(*)` against `max_users` / `max_active_projects`.

**Trace:**
- Company `C2`: `trial_ends_at = NOW() - 1 hour` (expired), no `subscriptions`
  row → `fallback_slug = 'starter'` → entitlements resolve to
  `max_users = 10, max_active_projects = 3`.
- If `C2` currently has 12 active users and 4 active projects (accumulated
  during the trial, which was uncapped at `trial` tier's 5/1 — actually
  bounded to 5 users/1 project per the `trial` plan itself, so this exact
  overshoot can't happen from trial usage alone, but could happen if the
  company was previously on a higher paid plan that lapsed): `can_invite_user()`
  → `current_users(12) < max_users(10)` → FALSE → invite blocked.
  `can_create_project()` → `current_projects(4) < max_active_projects(3)` →
  FALSE → new project blocked.
- Existing 12 users can still log in, existing 4 projects are still fully
  readable/writable for test data entry — nothing in `can_invite_user`/
  `can_create_project` touches SELECT policies, and no other RLS policy in
  the migrations references either function outside the `projects` INSERT
  policy (`20260812000004_project_limit_rls.sql`). So "read-only" is the
  wrong mental model — it's "no new users, no new projects, everything else
  works," matching the CLAUDE.md description exactly.

**Result: PASS (by trace)** for the SQL-level resolution. See scenario 5 for
a real bug found in the *enforcement* of the equivalent past-due case (the
seat-limit enforcement path for `create-user` doesn't share code with
`can_invite_user`, and had drifted).

---

## 3. Professional → Business upgrade — proration

**Question:** does upgrade proration logic exist anywhere?

**Investigated:**
- `supabase/functions/manage-subscription/index.ts` (110 lines, full file
  read): only handles `action === 'cancel'` and `action === 'downgrade'`.
  There is no `action === 'upgrade'` branch at all.
- `supabase/functions/_shared/billing_provider.ts`: the `BillingProvider`
  interface declares `changeSubscription(providerSubscriptionId, newProviderPlanId)`,
  and `RazorpayBillingProvider.changeSubscription` is implemented (calls
  Razorpay's `PATCH /subscriptions/:id` with `schedule_change_at: 'cycle_end'`)
  — but grep across `supabase/functions/**` shows the only reference to
  `changeSubscription` besides its own definition is a `TODO(Plan 2)` comment
  in `manage-subscription/index.ts` line 92-99, describing it as **not yet
  wired up even for downgrades**, let alone upgrades.
- `frontend/src/components/UpgradeModal.tsx`: the "Upgrade to <plan>" CTA is
  a plain `<a href="/?marketing#pricing">` link to the marketing pricing
  section. There is no Razorpay Checkout invocation, no `createSubscription`
  call, nothing in `frontend/src` matches `/razorpay/i` at all (checked via
  `grep -rl Razorpay frontend/src` — zero hits).
- No `admin_upgrade` / `request_plan_upgrade` / `upgrade_subscription` RPC
  exists in any migration (checked via grep across `supabase/migrations`).

**Result: CONFIRMED GAP, not a missing test.** There is no upgrade codepath
at all today — self-service upgrade is not implemented client-side (the modal
just points at the pricing page), and even the one primitive that *would*
carry proration (`BillingProvider.changeSubscription`) is unused. The only
way a company's plan actually changes today is:
1. A brand-new Razorpay subscription created entirely outside this codebase
   (e.g. manually, or via a not-yet-built checkout flow) whose webhook then
   calls `upsert_subscription`, which just overwrites `plan_id`/`status`/
   `current_period_start`/`current_period_end` with whatever Razorpay reports
   — no proration math of any kind, TestFlow just mirrors what Razorpay
   already decided and billed.
2. Platform-admin's `admin_change_plan` action in
   `supabase/functions/platform-admin-data/index.ts` (lines 624-665), which
   is an operator-driven, immediate, unprorated plan swap with an audit log
   entry — explicitly an admin override tool, not a proration engine.

**Launch-readiness gap:** self-service upgrade (with or without proration) is
not built. Writing a test for proration logic would be testing something
that doesn't exist. This should be tracked as a product gap, not a bug —
recommend adding to `docs/dev/IMPROVEMENTS.md` if self-service upgrade is
expected before GA.

---

## 4. Business → Professional downgrade blocked by seat count

**Question:** exact case-count math in `check_plan_downgrade_feasibility`.

**Code traced:** `check_plan_downgrade_feasibility()`,
`20260813000019_final_review_fixes.sql` lines 340–433 (the fixed version —
layers enterprise-contract overrides and addon deltas onto the *target*
plan's raw limits before comparing):

```sql
SELECT max_users, max_active_projects
  INTO target_max_users, target_max_projects
  FROM plans WHERE id = _target_plan_id;
-- ...contract override + addon deltas applied to target_max_users/target_max_projects...
SELECT COUNT(*) INTO current_users
  FROM profiles WHERE company_id = target_company AND is_active = TRUE;
...
IF target_max_users IS NOT NULL AND current_users > target_max_users THEN
  blockers := blockers || jsonb_build_object('resource','users','current',current_users,'target_limit',target_max_users);
END IF;
```

**Trace, exact plan numbers (Business → Professional, no contract, no addons):**
- `target_max_users` (Professional) = 30. `target_max_projects` = NULL
  (unlimited).
- Company `C3` on Business (cap 100) with 31 active users, 5 active projects.
- `current_users (31) > target_max_users (30)` → TRUE → blocker
  `{"resource":"users","current":31,"target_limit":30}` appended.
- `target_max_projects IS NOT NULL` → FALSE (NULL) → project check
  short-circuited, no project blocker regardless of `current_projects`.
- `feasible := jsonb_array_length(blockers) = 0` → `jsonb_array_length(['...'])
  = 1` → `feasible = FALSE`.
- `request_plan_downgrade()` (same migration, lines 494–568) calls this,
  gets `feasible = FALSE`, returns `{"scheduled": false, "blockers": [...]}`
  **without** touching `subscriptions.pending_plan_id` — `UPDATE subscriptions
  SET pending_plan_id = ...` is only reached after the feasibility check
  passes. Confirmed no partial-write side effect on a blocked downgrade.
- Boundary check: at exactly 30 active users, `current_users(30) >
  target_max_users(30)` is FALSE → no blocker → downgrade allowed. The cap is
  inclusive (`<=`), matching `max_users` semantics used everywhere else
  (`can_invite_user` allows `current_users < max_users`, i.e. it blocks the
  *next* invite once you're AT the cap, but a downgrade *to* that same cap
  with exactly that many users is allowed).

**Result: PASS (by trace) — AND runnable.** The exact 31-vs-30 case above is
also exercised as a real Vitest test:
`frontend/src/components/SubscriptionActions.test.tsx` →
`"blocks a Business -> Professional downgrade when active users exceed the
target plan cap (real plan numbers)"`. It mocks the `manage-subscription`
Edge Function response with the same `{current: 31, target_limit: 30}` shape
this trace derives, and asserts the UI surfaces it. Ran via
`npx vitest run src/components/SubscriptionActions.test.tsx` — **7/7 passed**
across the file (see Vitest section below for full output).

---

## 5. Payment fails → grace period → past_due blocks new resources after grace, not before

**Question:** exact `GRACE_PERIOD_DAYS = 7` boundary behavior.

**Code traced:** `is_past_due_grace_expired()`,
`20260813000004_past_due_grace_period.sql` lines 11–36:

```sql
GRACE_PERIOD_DAYS CONSTANT INT := 7;
...
IF sub_status IS DISTINCT FROM 'past_due' THEN RETURN FALSE; END IF;
IF period_end IS NULL THEN RETURN FALSE; END IF;
RETURN NOW() > period_end + (GRACE_PERIOD_DAYS || ' days')::INTERVAL;
```

**Trace:**
- Company `C4`, subscription `status = 'past_due'`,
  `current_period_end = 2026-08-01T00:00:00Z` (payment was due then).
- At `2026-08-07T23:59:59Z` (6 days 23:59:59 after due date):
  `NOW() > period_end + 7 days` → `NOW() > 2026-08-08T00:00:00Z` → FALSE →
  **not expired** → full access continues. Matches "not before" requirement.
- At `2026-08-08T00:00:01Z` (7 days + 1 second after due date):
  `NOW() > 2026-08-08T00:00:00Z` → TRUE → **expired** → blocks new writes.
  Matches "after grace expires" requirement.
- At exactly `2026-08-08T00:00:00Z` (exactly 7 days later): `NOW() >
  period_end` uses strict `>`, so `NOW() = period_end` → FALSE → **not yet
  expired**, grace extends through the full 7th day and flips only once
  strictly past it. This is a reasonable, intentional boundary (errs toward
  not locking out a paying-in-good-faith customer at the exact millisecond).
- `can_invite_user()` / `can_create_project()` both call
  `is_past_due_grace_expired(target_company)` and `RETURN FALSE` immediately
  if TRUE, before even checking seat/project headroom — confirmed via the
  code quoted in scenario 2 above (lines 69/114 of `20260813000004...sql`,
  carried unchanged into the final `20260813000019` version).

**BUG FOUND AND FIXED:** `create-user`'s seat-gating call
(`supabase/functions/create-user/index.ts` line 69) calls
`get_resource_limit_status('users', ...)`, **not** `can_invite_user()`.
Before this session, `get_resource_limit_status()`
(`20260813000006_resource_limit_status.sql`, and unchanged through
`20260813000019_final_review_fixes.sql` lines 226–277) never called
`is_past_due_grace_expired()` at all — it only compared live counts against
`max_users`/`max_active_projects`. Net effect: **after a company's past-due
grace period expired, a GM/SUPERADMIN could still successfully invite new
users** through the real `create-user` flow, directly contradicting the
documented behavior in `CLAUDE.md` ("Past-due grace period... blocks new
writes") and the correctly-implemented-but-unused `can_invite_user()`.
`can_invite_user()` itself, it turns out, is **never called from any
application code path** — grep across `supabase/functions/**` and
`supabase/migrations/**` (excluding its own definitions/comments) returns
zero call sites. It's the intended enforcement point but nothing invokes it;
`get_resource_limit_status()` is a parallel, independently-written
implementation that just didn't get the grace-period check ported over when
it was added a migration later.

Project creation (`can_create_project()`) was **not** affected — it's wired
directly into the `projects` INSERT RLS policy
(`20260812000004_project_limit_rls.sql`: `WITH CHECK (... AND
can_create_project())`), which does carry the grace check and cannot be
bypassed by any client code path (RLS is enforced at the database, not the
Edge Function).

**Fix applied:** `supabase/migrations/20260814000001_fix_resource_limit_status_grace_period.sql`
adds the same `IF is_past_due_grace_expired(target_company) THEN RETURN
jsonb_build_object('allowed', false, ...) END IF;` short-circuit to
`get_resource_limit_status()`, mirroring `can_invite_user()`/
`can_create_project()`. `required_plan` is returned as `NULL` in this branch
(a plan upgrade doesn't fix an unpaid invoice, so no plan is suggested).
`frontend/src/components/UpgradeModal.tsx` already handles a `null`
`required_plan` gracefully (the `enabled: !!reason?.required_plan` query
guard skips the plan lookup, and the JSX conditionally omits the "Upgrade
to..." sentence) — confirmed via the new Vitest test
`"renders without a suggested plan when required_plan is null"` in
`frontend/src/components/UpgradeModal.test.tsx`, which passes.

**Result: BUG FOUND, FIXED, migration + CLAUDE.md updated.** Re-traced
post-fix: `get_resource_limit_status('users', C4)` with `C4`'s grace expired
now returns `{"allowed": false, "resource":"users", "current": <n>, "limit":
<n>, "required_plan": null}` before reaching the headroom comparison,
matching `can_invite_user()`'s behavior exactly.

---

## 6. Cancel → access continues until `cancel_at` → then flips

**Question:** does `request_subscription_cancellation` set `cancel_at =
current_period_end` (never earlier)? Does anything flip status to
`'cancelled'` automatically once `NOW() >= cancel_at`?

**Code traced:** `request_subscription_cancellation()`,
`20260813000019_final_review_fixes.sql` lines 435–475:

```sql
SELECT current_period_end INTO period_end
  FROM subscriptions WHERE company_id = target_company;
IF NOT FOUND THEN RAISE EXCEPTION 'No subscription found for this company'; END IF;

UPDATE subscriptions
  SET cancel_at = COALESCE(cancel_at, period_end),
      updated_at = NOW()
  WHERE company_id = target_company;

RETURN jsonb_build_object('cancelled_at_period_end', TRUE, 'cancel_at', period_end);
```

**Trace:**
- `cancel_at = COALESCE(cancel_at, period_end)` — if `cancel_at` is already
  set (a prior cancellation request), it's left untouched; only a first-time
  cancel sets it, and always to `current_period_end`, never to `NOW()` or any
  earlier value. Calling this RPC twice is idempotent and can't move
  `cancel_at` earlier on a second call. **Confirmed: never earlier than
  period end.**
- Authorization: only `GM`/`SUPERADMIN` (checked via `has_role`), and the
  cross-tenant guard from Fix 6 (`auth.uid() IS NOT NULL AND
  (my_company_id() IS NULL OR _company_id != my_company_id())`) blocks an
  authenticated user from cancelling another company's subscription.
  `status` itself is **never modified** by this RPC — it stays whatever it
  was (`active`, `trialing`, etc.) up through `cancel_at`.
- `get_company_entitlements()`'s subscription lookup is
  `WHERE s.status IN ('trialing', 'active', 'past_due')` — it does not look
  at `cancel_at` at all. So a company with `cancel_at` set but `status`
  still `'active'` continues to resolve full entitlements right up to (and
  including, since nothing flips it) past `cancel_at`. This matches "access
  continues until cancel_at" for the resolution side.

**GAP FOUND (not fixed — real missing subsystem, not a contained bug):**
grepped every migration for `cancel_at`, `pg_cron`, and `cron.schedule`
(see the commands below) — `cancel_at` is only ever written (by
`request_subscription_cancellation`) and read (by the frontend display in
`SubscriptionActions.tsx`'s cancellation-confirmation toast). **Nothing in
this codebase ever compares `NOW()` to `cancel_at` and flips `status` to
`'cancelled'`.** No pg_cron job, no scheduled Edge Function, no check in
`get_company_entitlements()` itself.

```
$ grep -rln "cancel_at\|pg_cron\|cron\.schedule" supabase/migrations
20260813000011_cancellation_downgrade_rpcs.sql   # defines/sets cancel_at
20260519000003_ratelimit_trial_billing.sql       # column definition
20260813000019_final_review_fixes.sql            # re-declares the RPC above
```
None of the three matches contain a cron job or a status-flip.

In production, the actual flip to `'cancelled'` will happen via Razorpay:
once Razorpay's own `cancel_at_cycle_end` takes effect (note: the
`BillingProvider.cancelSubscription` call that would tell Razorpay about
this is itself a `TODO(Plan 2)` in `manage-subscription/index.ts` — see the
comment block at lines 58-66, meaning **today, cancellation is DB-only and
Razorpay is never told to stop billing**), Razorpay would fire a
`subscription.cancelled` (or `.completed`) webhook, which
`mapRazorpayStatus('cancelled') = 'cancelled'` maps correctly, and
`upsert_subscription` would then write `status = 'cancelled'`. So the
mechanism *would* work once (a) the provider-side cancel call is wired up
and (b) Razorpay actually delivers that webhook — but there is currently no
DB-side safety net if the webhook is missed, delayed, or (per the
not-yet-implemented case) never triggered because Razorpay was never told to
cancel in the first place.

**Result: PARTIAL PASS + LAUNCH-READINESS GAP.** `cancel_at` semantics
(never earlier than period end, idempotent) are correct. The two real gaps:
1. `manage-subscription`'s cancel action never calls
   `billingProvider.cancelSubscription(...)` — Razorpay isn't actually told
   to stop billing (explicitly flagged as a TODO in the code itself).
2. No scheduled job/reconciliation flips `status` to `'cancelled'` in the DB
   independent of a Razorpay webhook arriving. If Razorpay is told to cancel
   (once gap 1 is fixed) and its webhook is delivered, this resolves itself
   via the normal webhook path — but there's no backstop.

---

## 7. Duplicate webhook delivery — same `X-Razorpay-Event-Id` twice

**Question:** must be a no-op the second time.

**Code traced:** `record_billing_event()`,
`20260813000002_billing_events.sql` lines 21–43:

```sql
INSERT INTO billing_events (provider, provider_event_id, event_type, company_id, raw_payload)
VALUES (_provider, _provider_event_id, _event_type, _company_id, _raw)
ON CONFLICT (provider, provider_event_id) DO NOTHING;

GET DIAGNOSTICS inserted = ROW_COUNT;
RETURN inserted > 0;
```

with `UNIQUE (provider, provider_event_id)` on the table (line 9), and the
webhook handler (`razorpay-webhook/index.ts` lines 84–98):

```ts
const { data: isNew, error: dedupeError } = await supabase.rpc('record_billing_event', { ... });
...
if (!isNew) {
  return json({ ok: true, deduped: true, event: eventType });
}
```

**Trace:**
- First delivery of event id `evt_abc123` for `subscription.charged`:
  `record_billing_event` attempts INSERT, no conflict, `ROW_COUNT = 1` →
  returns `TRUE` → `isNew = true` → handler proceeds to
  `upsert_subscription(...)`, writes the new period/status.
- Razorpay retries the same delivery (same `X-Razorpay-Event-Id: evt_abc123`,
  e.g. because the first response was slow and Razorpay's timeout fired):
  `record_billing_event` attempts INSERT, `ON CONFLICT (provider,
  provider_event_id) DO NOTHING` — the UNIQUE constraint on
  `(provider, provider_event_id)` catches the collision, `ROW_COUNT = 0` →
  returns `FALSE` → `isNew = false` → handler returns immediately with
  `{ ok: true, deduped: true, ... }` **without calling `upsert_subscription`
  a second time.** Confirmed no-op on the exact-duplicate-event-id path.
- The compensating-delete path (`await supabase.from('billing_events').delete()...`
  after an `upsert_subscription` error) only fires when the RPC that mutates
  state *fails* — it deliberately un-marks the event as processed so a
  legitimate retry (with a genuinely fixed underlying issue) isn't
  permanently swallowed as "already handled." This is a correct, intentional
  exception to "duplicate = no-op": a duplicate of an event that never
  actually completed successfully the first time is allowed to retry, which
  is the right behavior (that's not really "the same event twice," it's
  "the same event, first attempt still pending").
- Eventid derivation fallback (no `X-Razorpay-Event-Id` header — shouldn't
  happen per Razorpay's docs, but defensively handled):
  `` `${eventType}:${event.created_at ?? ''}:${sub?.id ?? payment?.id ?? ''}` ``
  — deterministic from the payload, so a genuine retry of the same payload
  produces the same fallback key and still dedupes correctly. (Confirmed this
  isn't `Date.now()`-based, which the code comment explicitly calls out as
  the bug it's avoiding — C2 in `20260813000005_final_review_fixes.sql`.)

**Result: PASS (by trace).** Idempotency is correctly implemented via a
DB-level UNIQUE constraint + `ON CONFLICT DO NOTHING`, which is race-safe
under concurrent retries (no SELECT-then-INSERT TOCTOU window) — this is the
right pattern and I did not find a hole in it.

---

## 8. Delayed / out-of-order webhook delivery

**Question:** does `upsert_subscription` have any ordering protection, or
could a stale webhook overwrite newer state?

**Code traced:** `upsert_subscription()`,
`20260813000012_apply_pending_downgrade.sql` (final version — the last
`CREATE OR REPLACE` for this function), full body reviewed:

```sql
INSERT INTO subscriptions (..., status, current_period_start, current_period_end, seat_count, ...)
VALUES (..., _status, _period_start, _period_end, _seat_count, ...)
ON CONFLICT (company_id) DO UPDATE
SET provider_subscription_id = EXCLUDED.provider_subscription_id,
    ...
    status                   = EXCLUDED.status,
    current_period_start     = EXCLUDED.current_period_start,
    current_period_end       = EXCLUDED.current_period_end,
    seat_count               = EXCLUDED.seat_count,
    raw_provider_payload     = EXCLUDED.raw_provider_payload,
    updated_at               = NOW()
RETURNING id INTO sub_id;
```

**Trace — this is a real gap, carefully checked (not assumed):**
- There is **no comparison of the incoming event's timestamp (or any
  ordering token) against what's already on file** before the
  `ON CONFLICT ... DO UPDATE` runs. The `UPDATE` unconditionally overwrites
  `status`, `current_period_start`, `current_period_end`, `seat_count`, and
  `raw_provider_payload` with whatever the *current call's* parameters say,
  regardless of whether this call represents an older or newer provider-side
  event than what's already stored.
- Concretely: suppose Razorpay fires `subscription.charged` (event A,
  `current_end = 2026-09-01`, `status = active`) followed shortly after by
  `payment.failed` → `subscription.updated`-style event (event B,
  `status = past_due`, but if B's HTTP delivery to the webhook is delayed
  and arrives *after* a later, legitimate `subscription.charged` (event C,
  `current_end = 2026-10-01`, `status = active`) that already updated the
  row — B's arrival after C would incorrectly flip the row back to
  `past_due` with C's newer period data left alone in the columns B doesn't
  touch, but **B's own `_status` parameter overwrites `status` unconditionally**,
  producing an inconsistent row: `current_period_end = 2026-10-01` (from C)
  but `status = 'past_due'` (from stale B). This is a real, plausible
  webhook-reordering bug class — Razorpay (like most providers) does not
  guarantee webhook delivery order, only at-least-once delivery.
- `record_billing_event`'s dedup key is `(provider, provider_event_id)` —
  it prevents the *same* event id from being processed twice, but it does
  **not** prevent a *different*, older event id from being processed after a
  newer one. Dedup and ordering are orthogonal problems, and only the first
  is solved here.
- The one place ordering *is* checked is the pending-downgrade application
  logic layered onto the end of the same function (added by
  `20260813000012_apply_pending_downgrade.sql`):

  ```sql
  IF prior_pending_plan_id IS NOT NULL
     AND prior_period_end IS NOT NULL
     AND _period_start >= prior_period_end THEN
    UPDATE subscriptions SET plan_id = prior_pending_plan_id, pending_plan_id = NULL, ... ;
  END IF;
  ```

  This only guards *when the scheduled downgrade is applied* (see scenario 9
  below) — it does not protect the surrounding unconditional column
  overwrite that happens immediately above it in the same function.

**Result: GENUINE GAP, FLAGGED, NOT FIXED.** This is exactly the common
webhook-ordering bug class the task asked me to check carefully for, and it
is real: `upsert_subscription` has no defense against processing a
delayed/out-of-order webhook event after a newer one has already been
applied. A correct fix needs either (a) a per-subscription "last processed
provider event timestamp" column compared against the incoming event's own
`created_at` before allowing the `UPDATE` to proceed (reject/no-op if
stale), or (b) trusting the provider's own current-state-fetch API
(`BillingProvider.getSubscription`) as the source of truth on every webhook
instead of trusting each event's embedded payload. Either requires a real
schema/behavior change and a decision about which ordering signal to trust
(Razorpay's webhook payload doesn't guarantee a monotonically increasing
sequence number across event types) — this is a genuine design task, not a
one-line patch, so it's documented here rather than attempted as a
speculative fix under this QA pass. Recommend tracking in
`docs/dev/IMPROVEMENTS.md` before this is relied on at higher webhook
volume/latency variance than has been seen so far.

---

## 9. Scheduled downgrade must not apply mid-period on an unrelated webhook event

**Question:** a `payment.failed` event for the *same* period must not
trigger the pending downgrade early — only a genuine period rollover should.

**Code traced:** same `upsert_subscription()` tail, `20260813000012_apply_pending_downgrade.sql`
lines 30–34 and 72–88:

```sql
-- captured BEFORE the upsert:
SELECT current_period_end, pending_plan_id
  INTO prior_period_end, prior_pending_plan_id
  FROM subscriptions WHERE company_id = _company_id;
...
-- AFTER the upsert:
IF prior_pending_plan_id IS NOT NULL
   AND prior_period_end IS NOT NULL
   AND _period_start >= prior_period_end THEN
  UPDATE subscriptions
    SET plan_id = prior_pending_plan_id, pending_plan_id = NULL, pending_plan_requested_at = NULL
    WHERE company_id = _company_id;
END IF;
```

**Trace — the exact negative case from the task:**
- Company `C5` on Business, `pending_plan_id = <Professional's id>` (set by
  a prior `request_plan_downgrade` call), current period
  `[2026-08-01, 2026-09-01)` i.e. `current_period_end = 2026-09-01`.
- A `payment.failed` webhook arrives mid-period (Razorpay retries the
  charge, e.g. `2026-08-15`). The webhook handler builds
  `_period_start`/`_period_end` from the event payload's `sub.current_start`/
  `sub.current_end` — for a same-period retry, Razorpay reports the
  **same** period the subscription is already in: `_period_start =
  2026-08-01`.
- Before the upsert, `SELECT ... INTO prior_period_end` reads the row's
  *current* `current_period_end = 2026-09-01` (this is captured before the
  `INSERT ... ON CONFLICT DO UPDATE` below it runs, so it's genuinely the
  pre-update value, not already overwritten by this same call).
- Downgrade-apply condition: `_period_start (2026-08-01) >=
  prior_period_end (2026-09-01)` → `2026-08-01 >= 2026-09-01` → **FALSE**.
  The `UPDATE ... SET plan_id = prior_pending_plan_id` is **not** reached.
  `pending_plan_id` stays set, `plan_id` stays Business. **Confirmed: does
  not apply early.**
- Contrast with the correct positive case (real period rollover): next
  cycle's `subscription.charged` fires with `sub.current_start =
  2026-09-01` (the new period). `_period_start (2026-09-01) >=
  prior_period_end (2026-09-01)` → TRUE (inclusive `>=`, matching "at the
  start of your next billing period" from `SubscriptionActions.tsx`'s
  downgrade dialog copy) → downgrade correctly applies, `plan_id` flips to
  Professional, `pending_plan_id` cleared.
- Edge case checked: a brand-new subscription (`prior_period_end IS NULL`,
  i.e. this company never had a subscription row before) can't accidentally
  apply a downgrade, because `prior_pending_plan_id` would also be NULL in
  that case (no subscription row existed to have a `pending_plan_id` set on
  it) — the `AND prior_period_end IS NOT NULL` guard is technically
  redundant with that but is a correct, cheap defensive belt-and-suspenders
  check the code comment itself calls out explicitly.

**Result: PASS (by trace).** This is exactly right — it reads the *prior*
`current_period_end` before the mutating `INSERT ... ON CONFLICT DO UPDATE`
runs (ordering matters here — reading it after would already reflect the
just-applied new period, breaking the comparison), and gates strictly on
`_period_start >= prior_period_end` rather than on event type, so a
`payment.failed` (or any other same-period event) cannot trigger the
downgrade early. Note this correctness *shares the same blind spot as
scenario 8*: if a genuinely out-of-order/delayed webhook reports a
`_period_start` that looks like a rollover but isn't (or vice versa), this
logic would inherit that bad input — the ordering gap in scenario 8 is the
root cause to fix; this scenario's own gating logic is otherwise sound given
correctly-ordered input.

---

## Summary

| # | Scenario | Result | Action |
|---|---|---|---|
| 1 | Trial→paid resolution | PASS | none |
| 2 | Trial-expired → Starter caps | PASS | none |
| 3 | Professional→Business proration | **GAP** | documented, not fixed (no upgrade codepath exists at all) |
| 4 | Business→Professional downgrade blocker math | PASS | verified by trace + real Vitest test |
| 5 | Past-due grace enforcement | **BUG → FIXED** | migration `20260814000001` + CLAUDE.md update |
| 6 | Cancel-at-period-end semantics / auto-flip | PARTIAL PASS + **GAP** | `cancel_at` math correct; provider-side cancel call + any status-flip backstop are both unbuilt — documented |
| 7 | Duplicate webhook dedup | PASS | none |
| 8 | Out-of-order webhook | **GAP** | documented, not fixed (needs a real ordering-token design decision) |
| 9 | Scheduled downgrade doesn't apply mid-period | PASS | none |

## Runnable Vitest coverage added this session

```
frontend/src/components/SubscriptionActions.test.tsx
  + "blocks a Business -> Professional downgrade when active users exceed
     the target plan cap (real plan numbers)"   (scenario 4)

frontend/src/components/UpgradeModal.test.tsx
  + "renders without a suggested plan when required_plan is null
     (e.g. past-due grace expired)"              (scenario 5, post-fix)
```

Run with:
```
cd frontend && npx vitest run src/components/SubscriptionActions.test.tsx src/components/UpgradeModal.test.tsx
```
Result at time of writing: **7 passed (7)** across both files (3 pre-existing
+ 2 new in `SubscriptionActions.test.tsx`, 1 pre-existing + 1 new in
`UpgradeModal.test.tsx`). Full frontend suite (`npx vitest run`): **41 passed,
0 failed** (one unrelated Playwright e2e spec file fails to *load* under
Vitest — `e2e/golden-path.spec.ts` calls `test.skip()` at module scope, which
Playwright's test runner allows but Vitest's collector doesn't; this is
pre-existing and unrelated to billing).
