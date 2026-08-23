// Reusable operator email templates for platform-admin-data's
// send_company_email action.
//
// Kept as data (subject + html builders) rather than free text so the common
// sends — welcome, trial ending, payment failed — are consistent and don't
// depend on an operator retyping them. 'custom' is the escape hatch for
// anything else.
//
// Every interpolated value goes through escapeHtml: the inputs are a company
// name, a person's name and an operator-typed message, none of which are
// trusted to be HTML-safe.

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface TemplateContext {
  companyName: string;
  companySlug: string;
  recipientName: string;
  /** Operator-supplied free text. Used as the whole body by 'custom', and as
   *  an optional appended note by the others. */
  message?: string;
  /** Whole days remaining, for trial_ending. */
  daysRemaining?: number;
}

export interface RenderedEmail {
  subject: string;
  html: string;
}

const APP_ORIGIN = 'optimustesting.com';

function workspaceUrl(slug: string): string {
  return `https://${slug}.${APP_ORIGIN}`;
}

function layout(bodyHtml: string, ctx: TemplateContext): string {
  const note = ctx.message
    ? `<p style="white-space:pre-wrap">${escapeHtml(ctx.message)}</p>`
    : '';
  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#1a1a1a">
      <p>Hi ${escapeHtml(ctx.recipientName || 'there')},</p>
      ${bodyHtml}
      ${note}
      <p style="margin-top:24px">— The TestFlow team</p>
    </div>
  `.trim();
}

// Every render() takes the same (ctx, subject) pair even though only 'custom'
// uses the subject — a uniform signature is what lets the caller hold one of
// these as a union and invoke it without narrowing first.
export const EMAIL_TEMPLATES = {
  custom: {
    label: 'Custom message',
    /** Freeform: the operator supplies both subject and body. */
    requiresSubject: true,
    requiresMessage: true,
    render: (ctx: TemplateContext, subject: string): RenderedEmail => ({
      subject,
      html: layout('', ctx),
    }),
  },
  welcome: {
    label: 'Welcome',
    requiresSubject: false,
    requiresMessage: false,
    render: (ctx: TemplateContext, _subject: string): RenderedEmail => ({
      subject: `Welcome to TestFlow, ${ctx.companyName}`,
      html: layout(
        `<p>Your TestFlow workspace for <strong>${escapeHtml(ctx.companyName)}</strong> is ready.</p>
         <p>Sign in at <a href="${workspaceUrl(ctx.companySlug)}">${escapeHtml(workspaceUrl(ctx.companySlug))}</a>
         to set up your first project and invite your commissioning team.</p>`,
        ctx,
      ),
    }),
  },
  trial_ending: {
    label: 'Trial ending',
    requiresSubject: false,
    requiresMessage: false,
    render: (ctx: TemplateContext, _subject: string): RenderedEmail => {
      const days = ctx.daysRemaining;
      const when =
        days == null ? 'soon'
        : days <= 0 ? 'today'
        : days === 1 ? 'tomorrow'
        : `in ${days} days`;
      return {
        subject: `Your TestFlow trial ends ${when}`,
        html: layout(
          `<p>Your TestFlow trial for <strong>${escapeHtml(ctx.companyName)}</strong> ends ${escapeHtml(when)}.</p>
           <p>To keep your projects, records and reports accessible, choose a plan from
           Billing in your workspace:
           <a href="${workspaceUrl(ctx.companySlug)}/settings/billing">${escapeHtml(workspaceUrl(ctx.companySlug))}/settings/billing</a>.</p>`,
          ctx,
        ),
      };
    },
  },
  payment_failed: {
    label: 'Payment failed',
    requiresSubject: false,
    requiresMessage: false,
    render: (ctx: TemplateContext, _subject: string): RenderedEmail => ({
      subject: 'Action needed: your TestFlow payment did not go through',
      html: layout(
        `<p>We could not process the latest payment for
         <strong>${escapeHtml(ctx.companyName)}</strong>.</p>
         <p>Your team keeps full access for a short grace period. Update the payment
         method in Billing to avoid interruption:
         <a href="${workspaceUrl(ctx.companySlug)}/settings/billing">${escapeHtml(workspaceUrl(ctx.companySlug))}/settings/billing</a>.</p>`,
        ctx,
      ),
    }),
  },
} as const;

export type EmailTemplateKey = keyof typeof EMAIL_TEMPLATES;

export const EMAIL_TEMPLATE_KEYS = Object.keys(EMAIL_TEMPLATES) as EmailTemplateKey[];

export function isTemplateKey(v: unknown): v is EmailTemplateKey {
  // Object.hasOwn, not `in`: `in` walks the prototype chain, so 'constructor',
  // 'toString' and friends would pass and the caller would then index into a
  // non-template and crash on `.render`.
  return typeof v === 'string' && Object.hasOwn(EMAIL_TEMPLATES, v);
}
