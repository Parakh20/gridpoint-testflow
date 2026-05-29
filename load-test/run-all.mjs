// One-command runner: seed -> concurrency -> k6 -> realtime -> cleanup.
// Everything reads load-test/.env. Just `npm run all`.
//
//   npm run all            full suite, then auto-cleanup
//   KEEP=1 npm run all     keep the seeded data (inspect it in the app) — run `npm run cleanup` later
//   SMOKE=1 npm run all     tiny run (5 users / 2 projects) to validate against the schema first
import 'dotenv/config';
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { assertSafeTarget } from './lib.mjs';

assertSafeTarget();

const SMOKE = process.env.SMOKE === '1';
const KEEP = process.env.KEEP === '1';
const env = { ...process.env };
if (SMOKE) { env.USERS = '5'; env.PROJECTS = '2'; env.CLIENTS = '10'; env.HOLD_SECONDS = '15'; }

function step(title, cmd, args, { optional = false } = {}) {
  console.log(`\n\x1b[1m▶ ${title}\x1b[0m`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', env, cwd: new URL('.', import.meta.url).pathname });
  if (r.error?.code === 'ENOENT') {
    if (optional) { console.warn(`  ⚠ ${cmd} not installed — skipping. (install: https://grafana.com/docs/k6/latest/set-up/install-k6/)`); return true; }
    throw new Error(`${cmd} not found`);
  }
  if (r.status !== 0) {
    if (optional) { console.warn(`  ⚠ ${title} exited ${r.status} — continuing.`); return true; }
    console.error(`\n✖ "${title}" failed (exit ${r.status}). Data may be partially seeded — run \`npm run cleanup\`.`);
    process.exit(r.status ?? 1);
  }
  return true;
}

console.log(SMOKE ? '\n=== SMOKE run (small) ===' : '\n=== FULL run ===');

step('1/4 Seed data', 'node', ['seed.mjs']);
step('2/4 Concurrency correctness', 'node', ['concurrency.mjs']);
if (existsSync(new URL('./seeded-users.json', import.meta.url)))
  step('3/4 k6 concurrent traffic', 'k6', ['run', 'load.k6.js'], { optional: true });
else
  console.warn('\n  ⚠ no seeded-users.json — skipping k6');
step('4/4 Realtime fan-out', 'node', ['realtime-fanout.mjs'], { optional: true });

if (KEEP) {
  console.log('\n\x1b[1m✔ Suite done. Data kept (KEEP=1).\x1b[0m Inspect it in the app, then run `npm run cleanup`.');
} else {
  step('Cleanup', 'node', ['cleanup.mjs']);
  console.log('\n\x1b[1m✔ Suite done and cleaned up.\x1b[0m');
}
