import { describe, it, expect } from 'vitest';
import { sortDrafts, type OutreachDraft, type DraftStatus } from './OutreachDraftsPanel';

function draft(id: string, status: DraftStatus, priority: number | null): OutreachDraft {
  return {
    id, lead_id: `lead-${id}`, contact_id: `c-${id}`,
    to_email: `${id}@example.com`, to_name: null,
    subject: id, body: id, status,
    sent_at: null, error: null, message_id: null,
    lead: { company_name: id, priority, stage: 'NEW' },
  };
}

describe('sortDrafts', () => {
  it('puts failed sends first — they are the ones needing a decision', () => {
    const out = sortDrafts([draft('a', 'SENT', 5), draft('b', 'DRAFT', 5), draft('c', 'FAILED', 5)]);
    expect(out.map(d => d.status)).toEqual(['FAILED', 'DRAFT', 'SENT']);
  });

  it('sinks sent mail below unsent work regardless of priority', () => {
    const out = sortDrafts([draft('sent-high', 'SENT', 5), draft('draft-low', 'DRAFT', 1)]);
    expect(out.map(d => d.id)).toEqual(['draft-low', 'sent-high']);
  });

  it('orders by lead priority within a status', () => {
    const out = sortDrafts([draft('low', 'DRAFT', 2), draft('high', 'DRAFT', 5), draft('mid', 'DRAFT', 3)]);
    expect(out.map(d => d.id)).toEqual(['high', 'mid', 'low']);
  });

  it('treats a missing priority as lowest rather than throwing', () => {
    const out = sortDrafts([draft('none', 'DRAFT', null), draft('some', 'DRAFT', 1)]);
    expect(out.map(d => d.id)).toEqual(['some', 'none']);
  });

  it('does not mutate the array it was given', () => {
    const input = [draft('a', 'SENT', 1), draft('b', 'DRAFT', 1)];
    const before = input.map(d => d.id);
    sortDrafts(input);
    expect(input.map(d => d.id)).toEqual(before);
  });
});
