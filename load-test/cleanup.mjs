// Tear down everything seed.mjs created: the load-test company, its projects
// (cascade), and all auth users in the test email domain.
//
//   node cleanup.mjs
import { admin, assertSafeTarget, pool, TEST_COMPANY_SLUG, TEST_EMAIL_DOMAIN } from './lib.mjs';

assertSafeTarget();
const db = admin();

async function main() {
  const { data: company } = await db.from('companies').select('id').eq('slug', TEST_COMPANY_SLUG).maybeSingle();

  // Delete auth users in the test domain (profiles/user_roles cascade from auth.users).
  let deleted = 0, page = 1;
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const victims = data.users.filter((u) => u.email?.endsWith(`@${TEST_EMAIL_DOMAIN}`));
    await pool(victims, 8, async (u) => { await db.auth.admin.deleteUser(u.id); deleted++; });
    if (data.users.length < 200) break;
    page++;
  }
  console.log(`deleted ${deleted} auth users`);

  if (company) {
    // Hard-delete the company; projects/scope/equipment/tasks/records cascade.
    const { error } = await db.from('companies').delete().eq('id', company.id);
    if (error) console.warn('company delete:', error.message);
    else console.log('deleted load-test company + cascade');
  }
  console.log('✔ cleanup done');
}

main().catch((e) => { console.error('✖', e.message); process.exit(1); });
