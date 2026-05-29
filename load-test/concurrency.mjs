// Concurrency-correctness checks. Proves the guards hold when many requests
// race on the same row. Uses the service-role client to set up, and fires
// simultaneous updates that mirror what the app does.
//
//   node concurrency.mjs
import { admin, assertSafeTarget, TEST_COMPANY_SLUG } from './lib.mjs';

assertSafeTarget();
const db = admin();

async function getContext() {
  const { data: company } = await db.from('companies').select('id').eq('slug', TEST_COMPANY_SLUG).maybeSingle();
  if (!company) throw new Error('Run seed.mjs first (no load-test company found).');
  // projects.created_by is NOT NULL — borrow any user from the test company.
  const { data: user } = await db.from('profiles').select('id').eq('company_id', company.id).limit(1).maybeSingle();
  if (!user) throw new Error('No users in the load-test company — run seed.mjs first.');
  return { companyId: company.id, userId: user.id };
}

// 1) Optimistic status transition: app guards UPDATE with .eq('status', current).
//    Fire 20 racers DRAFT->APPROVED; exactly ONE should win.
async function testStatusGuard(companyId, userId) {
  const { data: proj, error } = await db.from('projects')
    .insert({ project_number: `RACE-${Date.now()}`, site_name: 'Race', site_address: 'x', status: 'DRAFT', company_id: companyId, created_by: userId })
    .select('id').single();
  if (error) throw new Error(`status-guard setup: ${error.message}`);

  const racers = Array.from({ length: 20 }, () =>
    db.from('projects').update({ status: 'APPROVED' }).eq('id', proj.id).eq('status', 'DRAFT').select('id')
  );
  const results = await Promise.all(racers);
  const winners = results.filter((r) => (r.data?.length ?? 0) > 0).length;
  await db.from('projects').update({ deleted_at: new Date().toISOString() }).eq('id', proj.id);
  return { name: 'optimistic status guard (expect 1 winner)', winners, pass: winners === 1 };
}

// 2) generate_project_equipment is idempotent under a race: many simultaneous
//    calls -> exactly one generates, the rest get already_existed=true.
async function testGenerateRace(companyId, userId) {
  const { data: proj, error } = await db.from('projects')
    .insert({ project_number: `GEN-${Date.now()}`, site_name: 'Gen', site_address: 'x', status: 'APPROVED', company_id: companyId, created_by: userId })
    .select('id').single();
  if (error) throw new Error(`generate-race setup: ${error.message}`);
  await db.from('scope_items').insert({ project_id: proj.id, equipment_type: 'CT', quantity: 5 });
  const { data: tpls } = await db.from('test_templates').select('id').eq('equipment_type', 'CT').eq('is_active', true).limit(1);
  if (tpls?.length) await db.from('project_test_scope').insert({ project_id: proj.id, equipment_type: 'CT', test_template_id: tpls[0].id, is_enabled: true });

  const calls = Array.from({ length: 10 }, () => db.rpc('generate_project_equipment', { _project_id: proj.id }));
  const results = await Promise.all(calls);
  const generated = results.filter((r) => r.data && r.data.already_existed === false).length;
  const { count } = await db.from('equipment_instances').select('id', { count: 'exact', head: true }).eq('project_id', proj.id);
  await db.from('projects').update({ deleted_at: new Date().toISOString() }).eq('id', proj.id);
  return { name: 'generate_equipment race (expect 1 generated, 5 instances)', generated, instances: count, pass: generated === 1 && count === 5 };
}

const out = [];
const { companyId, userId } = await getContext();
out.push(await testStatusGuard(companyId, userId));
out.push(await testGenerateRace(companyId, userId));

let ok = true;
for (const r of out) {
  console.log(`${r.pass ? '✔' : '✖'} ${r.name} → ${JSON.stringify({ ...r, name: undefined, pass: undefined })}`);
  ok = ok && r.pass;
}
console.log(ok ? '\nAll concurrency guards held.' : '\nA guard FAILED — investigate.');
process.exit(ok ? 0 : 1);
