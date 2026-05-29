# TestFlow load-test toolkit

Simulates scale on a **staging** Supabase project: volume data, 100 concurrent
users, Realtime fan-out, and concurrency-correctness checks.

> ⚠️ **Never run against production.** Every script reads `load-test/.env` and
> aborts if `SUPABASE_URL` is the prod ref (override only with `ALLOW_PROD=1`).

## Quick start (one command)

```bash
cd load-test
cp .env.example .env        # fill URL + anon + service-role key (+ ALLOW_PROD=1 if targeting prod)
npm install

SMOKE=1 npm run all         # tiny validation run (5 users / 2 projects), auto-cleans
npm run all                 # full run: seed 100 -> concurrency -> k6 -> realtime -> cleanup
KEEP=1 npm run all          # full run but keep the data to inspect in the app; cleanup later
```

`npm run all` reads everything from `.env` (including injecting env into k6). Install
[k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) to include the traffic
stage — it's skipped with a warning if k6 isn't on PATH.

> If you're using a **staging** project: create it in the dashboard, then
> `supabase link --project-ref <staging-ref> && supabase db push` before running.
> Targeting **prod** (no customers): keep `ALLOW_PROD=1` in `.env`.

---

## Individual steps (if you don't want the runner)

## 1. Volume / query speed

```bash
USERS=100 PROJECTS=20 npm run seed
```
Creates 1 company, 100 users (roles distributed), 20 projects with generated
equipment + tasks, engineer assignments, and test records. Then click around the
web app pointed at staging and watch **Dashboard → Query Performance** in Supabase
for slow RLS queries.

## 2. Concurrent traffic (k6)

Install [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/), then:
```bash
SUPABASE_URL=$SUPABASE_URL SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY k6 run load.k6.js
```
Ramps to 100 VUs that log in and hit the hot read paths. Watch `http_req_failed`,
`read_ms` p95, `login_ms` p95 against the thresholds in the script.

## 3. Realtime fan-out

```bash
CLIENTS=100 HOLD_SECONDS=60 npm run realtime
```
Opens 100 concurrent subscriptions and reports peak connected vs. errored — your
tier's ceiling. (Realtime must be enabled on the project.)

## 4. Concurrency correctness

```bash
npm run concurrency
```
Races the optimistic status guard and `generate_project_equipment` lock; expects
exactly one winner each.

## Cleanup

```bash
npm run cleanup
```
Deletes all `@loadtest.local` auth users and the load-test company (cascades).

## Gotchas at 100 users
- **Use the pooler** (port 6543, transaction mode) for the connection string if you
  add direct-DB scripts — direct connections are capped.
- **Auth rate limits**: logins are staggered/ramped to avoid the token-endpoint limit.
- **Your app limits** (`create-user` 30/hr, `generate-report` 10/hr, `rate_limit_check`)
  will trip under load — that's expected.
- **Realtime caps** are per tier; #3 finds yours.
