// Sender identity for outbound Resend mail.
//
// Read from a secret rather than hardcoded so the cutover from Resend's
// shared sandbox sender to our own verified domain is a `supabase secrets
// set`, not a code change and redeploy of every mailing function.
//
// This matters more than it looks: Resend's shared onboarding@resend.dev
// sender only delivers to the address that owns the Resend account. Every
// message to an actual customer — trial confirmations, rework notices —
// silently fails until RESEND_FROM points at a verified domain. Keeping the
// sandbox value as the default means a misconfigured environment degrades to
// "only reaches the operator" rather than "throws on every send".
const DEFAULT_FROM = 'TestFlow <onboarding@resend.dev>';

/**
 * The From header for transactional mail, e.g.
 * `TestFlow <noreply@optimustesting.com>`. Set RESEND_FROM once the sending
 * domain is verified in Resend.
 */
export function resendFrom(): string {
  return Deno.env.get('RESEND_FROM')?.trim() || DEFAULT_FROM;
}
