import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MailTab } from './MailTab';
import { platformFetch } from './platformFetch';

vi.mock('./platformFetch', () => ({ platformFetch: vi.fn() }));

const mocked = vi.mocked(platformFetch);

function routeFetch(inbox: unknown[], unhandled = 0) {
  mocked.mockImplementation(async (action: string) => {
    switch (action) {
      case 'get_mail_inbox': return { emails: inbox, unhandled_count: unhandled };
      case 'get_mail_sent': return { emails: [] };
      case 'get_all_companies': return { companies: [] };
      case 'get_email_templates': return { templates: [], sender_configured: true };
      default: return {};
    }
  });
}

describe('MailTab', () => {
  beforeEach(() => mocked.mockReset());

  it('labels inbound mail that matched no company, rather than hiding it', async () => {
    routeFetch([{
      id: 'in1', company_id: null, companies: null,
      from_email: 'prospect@example.com', from_name: null, to_email: 'support@optimustesting.com',
      subject: 'Pricing question', text_body: 'How much for 40 engineers?',
      received_at: '2026-08-23T09:00:00Z', handled: false,
    }], 1);

    render(<MailTab active />);
    expect(await screen.findByText('Pricing question')).toBeInTheDocument();
    // This is the case the per-company panel structurally cannot show.
    expect(screen.getByText(/no matching company/i)).toBeInTheDocument();
    // Exact match: "Show unhandled only" (the filter button) also contains the word.
    expect(screen.getByText('unhandled')).toBeInTheDocument();
  });

  it('attributes inbound mail to the company its sender resolved to', async () => {
    routeFetch([{
      id: 'in2', company_id: 'co1', companies: { name: 'SLPL Power', slug: 'slpl-power' },
      from_email: 'ops@slpl.example', from_name: 'Ops', to_email: 'support@optimustesting.com',
      subject: 'Rework export', text_body: null,
      received_at: '2026-08-23T09:00:00Z', handled: true,
    }]);

    render(<MailTab active />);
    expect(await screen.findByText('SLPL Power')).toBeInTheDocument();
    expect(screen.queryByText(/no matching company/i)).not.toBeInTheDocument();
  });

  it('explains an empty inbox instead of rendering a bare blank panel', async () => {
    routeFetch([]);
    render(<MailTab active />);
    expect(await screen.findByText(/nothing received yet/i)).toBeInTheDocument();
  });

  it('fetches nothing until its tab is actually opened', () => {
    routeFetch([]);
    render(<MailTab active={false} />);
    expect(mocked).not.toHaveBeenCalled();
  });
});
