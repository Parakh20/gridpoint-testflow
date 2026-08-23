// Unit tests for the operator email templates behind
// platform-admin-data's send_company_email action.
//
// The thing worth pinning down: operator- and tenant-supplied strings (a
// company name, a person's name, a typed message) are interpolated into HTML,
// so escaping is a correctness requirement, not a nicety.
//
// Pure — no network. Run:
//   cd supabase/functions && deno test --allow-env _shared/email_templates.test.ts
import { assert, assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { EMAIL_TEMPLATES, escapeHtml, isTemplateKey } from './email_templates.ts';

const ctx = {
  companyName: 'Acme Power',
  companySlug: 'acme-power',
  recipientName: 'Priya',
};

Deno.test('escapeHtml neutralises tags and quotes', () => {
  assertEquals(escapeHtml('<script>alert("x")</script>'), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
});

Deno.test('a company name containing markup cannot inject HTML into the body', () => {
  const { html } = EMAIL_TEMPLATES.welcome.render(
    { ...ctx, companyName: '<img src=x onerror=alert(1)>' },
    '',
  );
  assert(!html.includes('<img'), 'raw <img> tag survived into the rendered body');
  assertStringIncludes(html, '&lt;img');
});

Deno.test('an operator note is escaped but keeps its line breaks', () => {
  const { html } = EMAIL_TEMPLATES.welcome.render({ ...ctx, message: 'line 1\n<b>line 2</b>' }, '');
  assertStringIncludes(html, 'white-space:pre-wrap');
  assertStringIncludes(html, '&lt;b&gt;line 2&lt;/b&gt;');
});

Deno.test('welcome links at the tenant subdomain, not the apex', () => {
  const { subject, html } = EMAIL_TEMPLATES.welcome.render(ctx, '');
  assertStringIncludes(subject, 'Acme Power');
  assertStringIncludes(html, 'https://acme-power.optimustesting.com');
});

Deno.test('trial_ending phrases the deadline from days remaining', () => {
  assertStringIncludes(EMAIL_TEMPLATES.trial_ending.render({ ...ctx, daysRemaining: 5 }, '').subject, 'in 5 days');
  assertStringIncludes(EMAIL_TEMPLATES.trial_ending.render({ ...ctx, daysRemaining: 1 }, '').subject, 'tomorrow');
  assertStringIncludes(EMAIL_TEMPLATES.trial_ending.render({ ...ctx, daysRemaining: 0 }, '').subject, 'today');
  // No trial_ends_at on the company — must not render "in undefined days".
  assertStringIncludes(EMAIL_TEMPLATES.trial_ending.render(ctx, '').subject, 'soon');
});

Deno.test('custom uses the operator-supplied subject verbatim', () => {
  const { subject } = EMAIL_TEMPLATES.custom.render({ ...ctx, message: 'hello' }, 'Following up on your pilot');
  assertEquals(subject, 'Following up on your pilot');
});

Deno.test('isTemplateKey rejects anything not in the template map', () => {
  assertEquals(isTemplateKey('welcome'), true);
  assertEquals(isTemplateKey('constructor'), false);
  assertEquals(isTemplateKey(42), false);
});
