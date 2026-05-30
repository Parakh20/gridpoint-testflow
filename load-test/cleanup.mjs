// Tear down everything seed.mjs created, in child-first FK order.
//
//   node cleanup.mjs
//
// Why explicit ordering (not just "delete company, cascade"): several FKs to
// companies(id) and auth.users(id) were created with NO ON DELETE clause
// (= NO ACTION/RESTRICT). So:
//   - a user who is projects.created_by / audit_logs.actor_id can't be deleted
//     while those rows exist, and
//   - the company can't be deleted while profiles/user_roles/projects/
//     audit_logs/instruments still reference it.
// We clear the referencing rows first, then the users, then the company.
import { admin, assertSafeTarget, pool, withRetry, TEST_COMPANY_SLUG, TEST_EMAIL_DOMAIN } from './lib.mjs';

assertSafeTarget();
const db = admin();

async function delBy(table, col, val) {
  const { error } = await withRetry(async () => {
    const r = await db.from(table).delete().eq(col, val);
    if (r.error) throw new Error(`${table}: ${r.error.message}`);
    return r;
  }, { label: `del ${table}` });
  if (error) console.warn(`  ${table} delete:`, error.message);
}

async function main() {
  const { data: company } = await db.from('companies').select('id').eq('slug', TEST_COMPANY_SLUG).maybeSingle();

  if (company) {
    const cid = company.id;
    // 1) Projects first — cascades scope_items / equipment_instances /
    //    test_tasks / test_records, clearing their created_by / assigned_to
    //    references back to auth.users.
    await delBy('projects', 'company_id', cid);
    // 2) Other rows that reference companies(id) with no cascade.
    await delBy('instruments', 'company_id', cid);
    await delBy('subscriptions', 'company_id', cid);
    console.log('cleared company child data');
    // NOTE: audit_logs is deliberately NOT cleared here. The deletes above (and
    // the user/role deletes below) fire AFTER-DELETE audit triggers that insert
    // fresh audit_logs rows tagged with this company. audit_logs must be cleared
    // LAST, after every audited delete has run — see step 5 below.
  }

  // 3) Delete auth users in the test domain. With projects/audit_logs gone,
  //    nothing RESTRICTs them now; profiles + user_roles cascade from auth.users.
  let deleted = 0, failed = 0, page = 1;
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const victims = data.users.filter((u) => u.email?.endsWith(`@${TEST_EMAIL_DOMAIN}`));
    await pool(victims, 8, async (u) => {
      try {
        await withRetry(async () => {
          const { error: e } = await db.auth.admin.deleteUser(u.id);
          if (e) throw new Error(e.message);
        }, { label: `delUser ${u.email}` });
        deleted++;
      } catch (e) {
        failed++;
        console.warn(`  deleteUser ${u.email}:`, e.message);
      }
    });
    if (data.users.length < 200) break;
    page++;
  }
  console.log(`deleted ${deleted} auth users${failed ? ` (${failed} failed)` : ''}`);

  if (company) {
    // 4) Safety net: any profiles/user_roles still pinned to the company
    //    (e.g. a user whose auth delete failed above) would block the company.
    await delBy('profiles', 'company_id', company.id);
    await delBy('user_roles', 'company_id', company.id); // audited — fires triggers
    // 5) audit_logs LAST: every audited delete above (projects/equipment/tasks/
    //    records via cascade, plus user_roles) wrote new audit_logs rows tagged
    //    with this company. Clear them now, when nothing audited remains to run.
    await delBy('audit_logs', 'company_id', company.id);
    // 6) Finally the company itself (companies is not audited, so no new rows).
    const { error } = await db.from('companies').delete().eq('id', company.id);
    if (error) { console.error('✖ company delete still blocked:', error.message); process.exit(1); }
    console.log('deleted load-test company');
  }
  console.log('✔ cleanup done');
}

main().catch((e) => { console.error('✖', e.message); process.exit(1); });
