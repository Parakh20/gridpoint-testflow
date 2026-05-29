// Volume seed: creates one test company, N users (roles distributed),
// M projects with scope -> generated equipment + tasks, engineer assignments,
// and test_records for a fraction of tasks.
//
//   USERS=100 PROJECTS=20 RECORDS_PCT=40 node seed.mjs
//
// Re-runnable: it reuses the test company by slug and adds more data.
import { writeFileSync } from 'fs';
import { admin, assertSafeTarget, pool, num, EQUIPMENT_TYPES, TEST_EMAIL_DOMAIN, TEST_PASSWORD, TEST_COMPANY_SLUG } from './lib.mjs';

assertSafeTarget();
const db = admin();

const USERS = num('USERS', 100);
const PROJECTS = num('PROJECTS', 20);
const RECORDS_PCT = num('RECORDS_PCT', 40);
const QTY_PER_TYPE = num('QTY_PER_TYPE', 3);

const roleFor = (i) => (i === 0 ? 'SUPERADMIN' : i <= 2 ? 'GM' : i <= 9 ? 'SUPERVISOR' : 'ENGINEER');
const tag = Date.now().toString(36);

async function ensureCompany() {
  const { data: existing } = await db.from('companies').select('id').eq('slug', TEST_COMPANY_SLUG).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await db.from('companies')
    .insert({ name: 'Load Test Co', slug: TEST_COMPANY_SLUG })
    .select('id').single();
  if (error) throw error;
  return data.id;
}

async function createUser(companyId, i) {
  const email = `lt_${tag}_${i}@${TEST_EMAIL_DOMAIN}`;
  const role = roleFor(i);
  const { data: created, error } = await db.auth.admin.createUser({
    email, password: TEST_PASSWORD, email_confirm: true,
    user_metadata: { name: `LT ${role} ${i}` },
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  const uid = created.user.id;
  // Profile is auto-created by trigger with company_id NULL — attach to test company.
  await db.from('profiles').update({ company_id: companyId, name: `LT ${role} ${i}`, is_active: true }).eq('id', uid);
  await db.from('user_roles').upsert({ user_id: uid, role, company_id: companyId }, { onConflict: 'user_id,role' });
  return { uid, role, email };
}

async function seedProject(companyId, createdBy, supervisorId, engineerIds, templatesByType, p) {
  const { data: proj, error } = await db.from('projects').insert({
    project_number: `LT-${tag}-${String(p).padStart(3, '0')}`,
    site_name: `Load Test Substation ${p}`,
    site_address: `Grid Block ${p}, Test City`,
    client: 'Load Test Client',
    status: 'ACTIVE',
    company_id: companyId,
    created_by: createdBy,
    assigned_to: supervisorId,
    start_date: '2026-01-01',
  }).select('id').single();
  if (error) throw new Error(`project ${p}: ${error.message}`);
  const projectId = proj.id;

  // Scope: a handful of equipment types.
  const types = EQUIPMENT_TYPES.slice(0, 4);
  await db.from('scope_items').insert(types.map((t) => ({ project_id: projectId, equipment_type: t, quantity: QTY_PER_TYPE })));

  // Test scope: enable all templates for those types.
  const scopeRows = [];
  for (const t of types) for (const tpl of templatesByType[t] ?? []) {
    scopeRows.push({ project_id: projectId, equipment_type: t, test_template_id: tpl, is_enabled: true });
  }
  if (scopeRows.length) await db.from('project_test_scope').insert(scopeRows);

  // Generate equipment + tasks via the real RPC (idempotent, FOR UPDATE locked).
  const { error: genErr } = await db.rpc('generate_project_equipment', { _project_id: projectId });
  if (genErr) throw new Error(`generate ${p}: ${genErr.message}`);

  // Assign engineers round-robin to instances, and their tasks.
  const { data: instances } = await db.from('equipment_instances').select('id').eq('project_id', projectId);
  await pool(instances ?? [], 10, async (inst, idx) => {
    const eng = engineerIds[idx % engineerIds.length];
    await db.from('equipment_instances').update({ assigned_to: eng }).eq('id', inst.id);
    await db.from('test_tasks').update({ assigned_to: eng }).eq('equipment_instance_id', inst.id);
  });

  // Fill test_records for a fraction of tasks.
  const { data: allTasks } = await db.from('test_tasks')
    .select('id, equipment_instance_id, equipment_instances!inner(project_id)')
    .eq('equipment_instances.project_id', projectId);
  const toFill = (allTasks ?? []).filter(() => Math.random() * 100 < RECORDS_PCT);
  if (toFill.length) {
    await db.from('test_records').upsert(
      toFill.map((t) => ({
        test_task_id: t.id,
        payload: { value: +(Math.random() * 100).toFixed(2), unit: 'kV' },
        pass_fail: Math.random() < 0.85 ? 'PASS' : 'FAIL',
        remarks: 'load-test record',
      })),
      { onConflict: 'test_task_id' }
    );
  }
  return { projectId, instances: instances?.length ?? 0, recordsFilled: toFill.length };
}

async function main() {
  console.time('seed');
  const companyId = await ensureCompany();
  console.log(`company: ${companyId}`);

  console.log(`creating ${USERS} users…`);
  const users = await pool([...Array(USERS).keys()], 8, (i) => createUser(companyId, i));
  const superadmin = users.find((u) => u.role === 'SUPERADMIN') ?? users[0];
  const supervisors = users.filter((u) => u.role === 'SUPERVISOR').map((u) => u.uid);
  const engineers = users.filter((u) => u.role === 'ENGINEER').map((u) => u.uid);
  console.log(`  ${users.length} users (${supervisors.length} sup, ${engineers.length} eng)`);

  // Preload active templates grouped by equipment type.
  const { data: templates } = await db.from('test_templates').select('id, equipment_type').eq('is_active', true);
  const templatesByType = {};
  for (const t of templates ?? []) (templatesByType[t.equipment_type] ??= []).push(t.id);

  console.log(`creating ${PROJECTS} projects…`);
  let totalInstances = 0, totalRecords = 0;
  await pool([...Array(PROJECTS).keys()], 4, async (p) => {
    const sup = supervisors[p % Math.max(1, supervisors.length)] ?? superadmin.uid;
    const r = await seedProject(companyId, superadmin.uid, sup, engineers.length ? engineers : [superadmin.uid], templatesByType, p);
    totalInstances += r.instances; totalRecords += r.recordsFilled;
    process.stdout.write('.');
  });

  // Write credentials so k6 can log these users in.
  writeFileSync(new URL('./seeded-users.json', import.meta.url), JSON.stringify(
    users.map((u) => ({ email: u.email, role: u.role })), null, 2));

  console.log(`\n✔ seeded: ${USERS} users, ${PROJECTS} projects, ${totalInstances} equipment units, ${totalRecords} test records`);
  console.log('  wrote load-test/seeded-users.json (for k6)');
  console.timeEnd('seed');
}

main().catch((e) => { console.error('\n✖', e.message); process.exit(1); });
