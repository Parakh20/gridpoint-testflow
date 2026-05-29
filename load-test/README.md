# TestFlow load-test toolkit

Simulates scale on a **staging** Supabase project: volume data, 100 concurrent
users, Realtime fan-out, and concurrency-correctness checks.

> ⚠️ **Never run against production.** Every script reads `load-test/.env` and
> aborts if `SUPABASE_URL` is the prod ref (override only with `ALLOW_PROD=1`).

## 0. Stand up a staging project (one-time)

```bash
# create a new project in the Supabase dashboard (e.g. testflow-staging),
# ideally on the same tier as prod, then from the repo root:
supabase link --project-ref <staging-ref>
supabase db push          # applies all migrations to staging
```

Copy `.env.example` → `.env` and fill in the staging URL + anon + service-role keys.

```bash
cd load-test
cp .env.example .env       # edit it
npm install
```

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
