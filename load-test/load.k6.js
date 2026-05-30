// k6 concurrent-traffic test: ramps to 100 virtual users that log in and run a
// realistic read/write mix against PostgREST. Run with:
//
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... k6 run load.k6.js
//
// Requires load-test/seeded-users.json (produced by seed.mjs).
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Trend, Rate } from 'k6/metrics';

const URL = __ENV.SUPABASE_URL;
const ANON = __ENV.SUPABASE_ANON_KEY;
const PASSWORD = __ENV.TEST_PASSWORD || 'LoadTest123!';
if (!URL || !ANON) throw new Error('Set SUPABASE_URL and SUPABASE_ANON_KEY');

const users = new SharedArray('users', () => JSON.parse(open('./seeded-users.json')));

const loginTrend = new Trend('login_ms', true);
const readTrend = new Trend('read_ms', true);
const errRate = new Rate('app_errors');

export const options = {
  stages: [
    { duration: '1m', target: 25 },
    { duration: '2m', target: 100 }, // 100 concurrent VUs
    { duration: '2m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    read_ms: ['p(95)<800'],
    login_ms: ['p(95)<1500'],
  },
};

// Per-VU session cache. Real users log in once and then browse for a long time;
// re-authenticating every iteration would just hammer (and trip) GoTrue's token
// endpoint rate limit instead of exercising the app's read paths. Each k6 VU has
// its own module scope, so these are per-VU.
let vuToken = null;
let vuUser = null;

function login(u) {
  const res = http.post(
    `${URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email: u.email, password: PASSWORD }),
    { headers: { apikey: ANON, 'Content-Type': 'application/json' }, tags: { name: 'login' } }
  );
  loginTrend.add(res.timings.duration);
  const ok = check(res, { 'login 200': (r) => r.status === 200 });
  errRate.add(!ok);
  return ok ? res.json('access_token') : null;
}

export default function () {
  // Authenticate once per VU, then reuse the access token across iterations.
  if (!vuToken) {
    vuUser = users[Math.floor(Math.random() * users.length)];
    vuToken = login(vuUser);
    if (!vuToken) { sleep(1); return; } // rate-limited at login; back off and retry next iter
  }
  const token = vuToken;
  const headers = { apikey: ANON, Authorization: `Bearer ${token}`, tags: { name: 'rest' } };

  // Read mix — the hot paths the dashboards hit (RLS-filtered).
  const projects = http.get(`${URL}/rest/v1/projects?select=id,project_number,status&deleted_at=is.null&limit=50`, { headers });
  readTrend.add(projects.timings.duration);
  if (projects.status === 401) { vuToken = null; return; } // token expired → re-login next iter
  errRate.add(!check(projects, { 'projects 200': (r) => r.status === 200 }));

  const list = projects.json();
  if (Array.isArray(list) && list.length) {
    const p = list[Math.floor(Math.random() * list.length)];
    const tasks = http.get(
      `${URL}/rest/v1/test_tasks?select=id,status,equipment_instances!inner(project_id)&equipment_instances.project_id=eq.${p.id}&limit=100`,
      { headers }
    );
    readTrend.add(tasks.timings.duration);
    errRate.add(!check(tasks, { 'tasks 200': (r) => r.status === 200 }));
  }

  sleep(Math.random() * 2 + 1); // user think-time
}
