import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildCorsHeaders } from '../_shared/cors.ts';
import { enforceRateLimit } from '../_shared/rate_limit.ts';

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  try {
    // ── 1. Authenticate caller ────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401);

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) return json({ error: 'Unauthorized' }, 401);

    // ── 2. Verify caller role: only GM or SUPERADMIN can generate reports ─────
    const { data: roleRow } = await callerClient
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .single();

    if (!roleRow || !['GM', 'SUPERADMIN'].includes(roleRow.role)) {
      return json({ error: 'Forbidden: only GM or SUPERADMIN can generate reports' }, 403);
    }

    // Rate limit: 10 reports per caller per hour. Anthropic tokens are expensive.
    const supabaseAdminForRl = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const rl = await enforceRateLimit(supabaseAdminForRl, req, {
      key: `generate-report:${caller.id}`,
      limit: 10,
      windowMinutes: 60,
    }, cors);
    if (!rl.ok) return rl.response;

    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('company_id')
      .eq('id', caller.id)
      .single();

    if (!callerProfile?.company_id) return json({ error: 'Caller has no company assigned' }, 400);

    // ── 3. Validate input ────────────────────────────────────────────────────
    const { project_id } = await req.json();
    if (!project_id || typeof project_id !== 'string') {
      return json({ error: 'project_id is required' }, 400);
    }

    // ── 4. Verify project belongs to caller's company (tenant isolation) ─────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const projectRes = await supabase.from('projects').select('*').eq('id', project_id).single();
    if (projectRes.error || !projectRes.data) return json({ error: 'Project not found' }, 404);
    const project = projectRes.data;

    if (project.company_id !== callerProfile.company_id) {
      return json({ error: 'Forbidden: project belongs to another company' }, 403);
    }

    // ── 4b. Claim the AI-report lock ─────────────────────────────────────────
    // Prevents two concurrent calls from burning Anthropic tokens on the same
    // project. Stale locks (>5 min) auto-expire so a crashed generation
    // doesn't permanently block retries.
    const { data: claimed, error: claimErr } = await supabase.rpc('claim_ai_report_lock', {
      _project_id: project_id,
    });
    if (claimErr) return json({ error: `Lock error: ${claimErr.message}` }, 500);
    if (!claimed) {
      return json(
        { error: 'A report is already being generated for this project. Please wait a moment and try again.' },
        409,
      );
    }

    let success = false;
    try {

    // ── 5. Fetch related data (still service-role since we already verified) ─
    const [scopeRes, instancesRes, tasksRes] = await Promise.all([
      supabase.from('scope_items').select('equipment_type, quantity').eq('project_id', project_id),
      supabase
        .from('equipment_instances')
        .select('id, label, equipment_type, status')
        .eq('project_id', project_id)
        .order('equipment_type')
        .order('seq_number'),
      supabase
        .from('test_tasks')
        .select(`
          id, status,
          equipment_instance:equipment_instances!inner(label, equipment_type, project_id),
          test_template:test_templates(test_name, test_code),
          test_records(payload, pass_fail, remarks, ambient)
        `)
        .eq('equipment_instance.project_id', project_id),
    ]);

    const totalTasks    = tasksRes.data?.length ?? 0;
    const approvedTasks = tasksRes.data?.filter(t => t.status === 'APPROVED').length ?? 0;
    const failedTasks   = tasksRes.data?.filter(t =>
      Array.isArray(t.test_records) && t.test_records.some((r: any) => r.pass_fail === 'FAIL')
    ).length ?? 0;
    const pendingTasks  = tasksRes.data?.filter(t => t.status === 'DRAFT' || t.status === 'IN_PROGRESS').length ?? 0;

    const scopeSummary = (scopeRes.data ?? [])
      .map(s => `  - ${s.equipment_type}: ${s.quantity} units`)
      .join('\n');

    const failedList = (tasksRes.data ?? [])
      .filter(t => Array.isArray(t.test_records) && t.test_records.some((r: any) => r.pass_fail === 'FAIL'))
      .map(t => {
        const record = (t.test_records as any[])[0];
        return `  - ${t.equipment_instance?.label ?? 'Unknown'} / ${t.test_template?.test_code ?? 'Unknown'}: ${record?.remarks ?? 'No remarks'}`;
      })
      .join('\n') || '  None';

    const prompt = `You are a senior electrical commissioning engineer writing a formal project completion report.

PROJECT DETAILS
---------------
Project Number : ${project.project_number}
Site Name      : ${project.site_name}
Site Address   : ${project.site_address}
Client         : ${project.client ?? 'N/A'}
Status         : ${project.status}
Start Date     : ${project.start_date ?? 'N/A'}
End Date       : ${project.end_date ?? 'N/A'}

EQUIPMENT SCOPE
---------------
${scopeSummary}

TEST SUMMARY
------------
Total test tasks  : ${totalTasks}
Approved (passed) : ${approvedTasks}
Failed            : ${failedTasks}
Pending / open    : ${pendingTasks}
Completion        : ${totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0}%

FAILED / FLAGGED TESTS
----------------------
${failedList}

INSTRUCTIONS
------------
Write a professional commissioning completion report that includes:
1. Executive Summary (2–3 paragraphs)
2. Scope of Work
3. Test Results Summary with a brief analysis
4. Issues Found (if any) with recommended corrective actions
5. Overall Conclusion and sign-off recommendation

Use formal engineering language. Be concise but thorough. Do not fabricate specific measurement values — work only from the data provided above.`;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      throw new Error(`Anthropic API error: ${anthropicRes.status} ${err}`);
    }

    const anthropicData = await anthropicRes.json();
    const reportText = anthropicData.content[0]?.text ?? '';

      success = true;

      const { error: usageError } = await supabase.from('usage_records').insert({
        company_id: project.company_id,
        metric: 'ai_report_generated',
        metadata: { project_id },
      });
      if (usageError) {
        console.error('usage_records insert failed (non-blocking):', usageError.message);
      }

      return json({ report: reportText });
    } finally {
      // Always release the lock, even on failure — caller can retry.
      await supabase.rpc('release_ai_report_lock', { _project_id: project_id, _success: success });
    }
  } catch (error) {
    console.error('generate-report error:', error);
    return json({ error: (error as Error).message }, 500);
  }
});
