// Realtime fan-out: open N concurrent Realtime subscriptions to the
// `projects` + `test_tasks` channels and report how many actually connect.
// Finds your tier's concurrent-connection ceiling.
//
//   CLIENTS=100 HOLD_SECONDS=60 node realtime-fanout.mjs
//
// NOTE: requires Realtime to be enabled on the project and the tables in the
// supabase_realtime publication (they are, per migrations). This uses the anon
// key; RLS still applies to the rows that flow.
import { createClient } from '@supabase/supabase-js';
import { assertSafeTarget, URL, ANON_KEY, num, sleep } from './lib.mjs';

assertSafeTarget();
if (!ANON_KEY) throw new Error('Set SUPABASE_ANON_KEY in load-test/.env');

const CLIENTS = num('CLIENTS', 100);
const HOLD = num('HOLD_SECONDS', 60);

let connected = 0, errored = 0, closed = 0;
const clients = [];

console.log(`opening ${CLIENTS} realtime subscriptions…`);
for (let i = 0; i < CLIENTS; i++) {
  const c = createClient(URL, ANON_KEY, { realtime: { params: { eventsPerSecond: 5 } } });
  const ch = c.channel(`load-${i}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'test_tasks' }, () => {})
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {})
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') connected++;
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') errored++;
      else if (status === 'CLOSED') closed++;
    });
  clients.push({ c, ch });
  if (i % 10 === 0) await sleep(50); // stagger to avoid auth burst limits
}

const t = setInterval(() => {
  console.log(`  connected=${connected}  errored=${errored}  closed=${closed}  / ${CLIENTS}`);
}, 2000);

await sleep(HOLD * 1000);
clearInterval(t);
console.log(`\nPeak connected: ${connected}/${CLIENTS}  (errored=${errored}, closed=${closed})`);
console.log('Tearing down…');
for (const { c, ch } of clients) { try { await c.removeChannel(ch); } catch {} }
process.exit(0);
