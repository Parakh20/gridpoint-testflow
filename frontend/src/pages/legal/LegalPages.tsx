// Policy pages required for Razorpay's website review (and generally for
// selling a subscription online in India). Razorpay's reviewer checklist
// explicitly requires that the business name used here matches the name the
// Razorpay account is registered under — see LEGAL_ENTITY below.
//
// These are plain content pages with no auth and no data access, served on
// the marketing host.
import { type ReactNode } from 'react';

// ─────────────────────────────────────────────────────────────────────────
// Sole proprietorship: the proprietor is the legal entity, so LEGAL_ENTITY is
// the proprietor's name and must match the Razorpay account registration
// exactly — Razorpay rejects submissions where the two differ.
// ─────────────────────────────────────────────────────────────────────────
const LEGAL_ENTITY = 'Parakh Sharma';
const CONTACT_EMAIL = 'support@optimustesting.com';
const CONTACT_PHONE = '+91 94135 52887';
const CONTACT_ADDRESS = 'Hostel 4, IIT Bombay, Powai, Mumbai 400076, Maharashtra, India';
const LAST_UPDATED = '23 August 2026';
const GOVERNING_STATE = 'Maharashtra';

const PRODUCT = 'TestFlow';

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <a href="/" className="text-white/50 text-sm hover:text-white">← Back to {PRODUCT}</a>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-white/40 text-sm">Last updated: {LAST_UPDATED}</p>
        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-white/70 [&_h2]:text-white [&_h2]:font-semibold [&_h2]:text-lg [&_h2]:mt-8 [&_h2]:mb-2 [&_a]:text-[#60a5fa] [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
          {children}
        </div>
        <div className="mt-12 border-t border-white/10 pt-6 text-sm text-white/45">
          <p>{PRODUCT} is operated by {LEGAL_ENTITY}.</p>
          <p className="mt-1">Questions? <a href="/contact" className="text-[#60a5fa]">Contact us</a>.</p>
        </div>
      </div>
    </div>
  );
}

export function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service">
      <p>
        These terms govern your use of {PRODUCT}, a commissioning management platform for
        electrical substation testing, operated by {LEGAL_ENTITY} ("we", "us"). By creating a
        workspace or using the service, you agree to them.
      </p>

      <h2>1. Accounts and workspaces</h2>
      <p>
        Each customer organisation gets a workspace. The person who creates it becomes its
        administrator and is responsible for who they invite and what those users do. You must
        provide accurate information and keep credentials secure. You are responsible for all
        activity under your workspace.
      </p>

      <h2>2. Trial</h2>
      <p>
        New workspaces include a 14-day trial with reduced limits. No payment details are
        required to start a trial. If you do not subscribe before the trial ends, the workspace
        remains accessible but restricted to trial limits until you subscribe.
      </p>

      <h2>3. Subscriptions and billing</h2>
      <ul>
        <li>Plans are billed monthly or annually in advance, in Indian Rupees (INR).</li>
        <li>Current prices are shown on our pricing page and are inclusive of applicable taxes unless stated otherwise.</li>
        <li>Payments are processed by Razorpay. We do not store your card details.</li>
        <li>Subscriptions renew automatically until cancelled.</li>
        <li>Plan limits (users, active projects) are enforced by the platform. Exceeding them requires an upgrade.</li>
      </ul>

      <h2>4. Upgrades, downgrades and cancellation</h2>
      <p>
        Upgrades take effect immediately, with the remainder of the cycle prorated by our payment
        provider. Downgrades take effect at the start of your next billing period, and are only
        permitted if your current usage fits within the target plan's limits. Cancellation takes
        effect at the end of the paid period — see our{' '}
        <a href="/refund-policy">Refund &amp; Cancellation Policy</a>.
      </p>

      <h2>5. Your data</h2>
      <p>
        You retain ownership of the test records, project data and documents you put into
        {' '}{PRODUCT}. We process it to provide the service, as described in our{' '}
        <a href="/privacy">Privacy Policy</a>. You can export project data at any time in Excel or
        PDF format.
      </p>

      <h2>6. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Attempt to access another organisation's workspace or data.</li>
        <li>Probe, scan or test the vulnerability of the service without written permission.</li>
        <li>Resell or white-label the service without a written agreement.</li>
        <li>Upload unlawful content, or content you lack the right to store.</li>
      </ul>

      <h2>7. Availability</h2>
      <p>
        We aim for high availability but do not guarantee uninterrupted service. Planned
        maintenance will be communicated where practical. The service is provided "as is" without
        warranties beyond those that cannot be excluded under applicable law.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        {PRODUCT} is a record-keeping and workflow tool. It does not certify equipment, replace
        professional engineering judgement, or assume responsibility for commissioning decisions.
        To the extent permitted by law, our total liability in any 12-month period is limited to
        the fees you paid us in that period.
      </p>

      <h2>9. Suspension and termination</h2>
      <p>
        We may suspend a workspace for non-payment or breach of these terms. You may stop using
        the service at any time by cancelling your subscription. On termination we retain your
        data for a limited period to allow export, after which it may be deleted.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update these terms. Material changes will be notified to workspace administrators
        by email. Continued use after the change takes effect constitutes acceptance.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These terms are governed by the laws of India, with exclusive jurisdiction in the courts
        of {GOVERNING_STATE}.
      </p>
    </LegalLayout>
  );
}

export function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        This policy explains what {LEGAL_ENTITY} collects when you use {PRODUCT}, why, and what
        control you have over it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data:</strong> name, work email, company name, and (optionally) phone, company size, industry and country provided at signup.</li>
        <li><strong>Workspace content:</strong> projects, equipment records, test measurements, and reports you create.</li>
        <li><strong>Usage data:</strong> log entries, audit records of significant actions, and error diagnostics.</li>
        <li><strong>Payment data:</strong> handled by Razorpay. We receive subscription status and invoice metadata, never full card details.</li>
      </ul>

      <h2>Why we process it</h2>
      <ul>
        <li>To provide the service and keep each organisation's data isolated.</li>
        <li>To bill you and maintain records required by law.</li>
        <li>To provide support and investigate faults.</li>
        <li>To send service messages such as email confirmation and rework notifications.</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>We do not sell personal data. We use these processors:</p>
      <ul>
        <li><strong>Supabase</strong> — application database, authentication and file storage.</li>
        <li><strong>Vercel</strong> — application hosting.</li>
        <li><strong>Razorpay</strong> — payment processing.</li>
        <li><strong>Resend</strong> — transactional email delivery.</li>
        <li><strong>Anthropic</strong> — AI report generation, when you choose to generate a report.</li>
      </ul>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit. Access is enforced at the database level so users can only
        reach their own organisation's records. Significant actions are recorded in an audit
        trail. Sessions time out after 30 minutes of inactivity.
      </p>

      <h2>Retention</h2>
      <p>
        Workspace content is retained while your account is active. Deleted projects and records
        are retained for 90 days before permanent removal. Audit records are archived after 180
        days. Records we must keep for tax or accounting purposes are retained as required by law.
      </p>

      <h2>Your rights</h2>
      <p>
        You may request a copy of the personal data associated with your account, or ask for it to
        be erased. Workspace administrators can action both from within the platform; otherwise
        contact us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Note that erasure
        anonymises your personal details but preserves the test records themselves, which form a
        compliance and audit trail your organisation may be required to keep.
      </p>

      <h2>Cookies</h2>
      <p>
        We use cookies strictly to keep you signed in across our application subdomains. We do not
        use advertising or cross-site tracking cookies.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalLayout>
  );
}

export function RefundPolicy() {
  return (
    <LegalLayout title="Refund &amp; Cancellation Policy">
      <p>
        This policy explains how cancellations and refunds work for {PRODUCT} subscriptions sold
        by {LEGAL_ENTITY}.
      </p>

      <h2>Free trial</h2>
      <p>
        Every new workspace starts with a 14-day trial. No payment details are required, and no
        charge is made during the trial. We encourage you to evaluate the platform fully before
        subscribing.
      </p>

      <h2>Cancellation</h2>
      <ul>
        <li>You can cancel at any time from <strong>Settings → Billing</strong> in your workspace.</li>
        <li>Cancellation takes effect at the <strong>end of your current paid period</strong>. You keep full access until then.</li>
        <li>You will not be charged again after cancelling.</li>
        <li>No further action is needed — the subscription stops automatically at the period end.</li>
      </ul>

      <h2>Refunds</h2>
      <p>
        Because access continues for the full period you have paid for, we do{' '}
        <strong>not</strong> provide pro-rata refunds for the unused portion of a billing period.
      </p>
      <p>We will issue a refund in these circumstances:</p>
      <ul>
        <li><strong>Duplicate charge</strong> — billed more than once for the same period.</li>
        <li><strong>Billing error</strong> — charged an incorrect amount, or charged after a confirmed cancellation.</li>
        <li><strong>Failed access</strong> — a sustained platform fault prevented you from using the service for a significant part of a billing period, and we could not resolve it.</li>
      </ul>

      <h2>How to request a refund</h2>
      <p>
        Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with your workspace name and
        the invoice in question. We respond within 3 business days. Approved refunds are returned
        to the original payment method via Razorpay, typically within 5–7 business days depending
        on your bank or card issuer.
      </p>

      <h2>Plan changes</h2>
      <ul>
        <li><strong>Upgrades</strong> take effect immediately and are prorated for the remainder of the cycle.</li>
        <li><strong>Downgrades</strong> take effect at the start of the next billing period. No refund is issued for the difference in the current period.</li>
      </ul>

      <h2>Annual plans</h2>
      <p>
        Annual subscriptions follow the same terms: cancellation takes effect at the end of the
        paid year, and unused months are not refunded except in the circumstances listed above.
      </p>
    </LegalLayout>
  );
}

export function ContactUs() {
  return (
    <LegalLayout title="Contact Us">
      <p>
        We are happy to help with questions about the platform, billing, or a trial.
      </p>

      <h2>Support</h2>
      <p>
        Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a><br />
        We aim to respond within one business day.
      </p>

      <h2>Phone</h2>
      <p>{CONTACT_PHONE}</p>

      <h2>Registered address</h2>
      <p className="whitespace-pre-line">{`${LEGAL_ENTITY}\n${CONTACT_ADDRESS}`}</p>

      <h2>Sales</h2>
      <p>
        For demos, pilots or enterprise pricing, use the enquiry form on our{' '}
        <a href="/#cta">home page</a> and we will get back to you within one business day.
      </p>
    </LegalLayout>
  );
}
