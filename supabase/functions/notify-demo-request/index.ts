import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildCorsHeaders } from '../_shared/cors.ts';
import { enforceRateLimit } from '../_shared/rate_limit.ts';

const NOTIFY_EMAIL = Deno.env.get('DEMO_NOTIFY_EMAIL') ?? 'sharmaparakh05@gmail.com';

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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const rl = await enforceRateLimit(supabaseAdmin, req, {
      key: 'notify-demo-request',
      limit: 30,
      windowMinutes: 60,
    }, cors);
    if (!rl.ok) return rl.response;

    const { name, email, company, phone, message } = await req.json();

    if (!name || !email || !company) {
      return json({ error: 'name, email, and company are required' }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Invalid email address' }, 400);
    }

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      console.error('[notify-demo-request] RESEND_API_KEY not configured');
      return json({ error: 'Email notification is not configured' }, 500);
    }

    const escape = (value: string) =>
      value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const html = `
      <h2>New demo request</h2>
      <p><strong>Name:</strong> ${escape(String(name))}</p>
      <p><strong>Company:</strong> ${escape(String(company))}</p>
      <p><strong>Email:</strong> ${escape(String(email))}</p>
      <p><strong>Phone:</strong> ${phone ? escape(String(phone)) : '—'}</p>
      <p><strong>Message:</strong> ${message ? escape(String(message)) : '—'}</p>
    `;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TestFlow Demo Requests <onboarding@resend.dev>',
        to: [NOTIFY_EMAIL],
        reply_to: email,
        subject: `New demo request — ${company}`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('[notify-demo-request] Resend send failed:', errText);
      return json({ error: 'Failed to send notification email' }, 502);
    }

    return json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return json({ error: message }, 500);
  }
});
