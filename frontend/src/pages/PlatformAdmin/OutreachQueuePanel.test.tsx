import { describe, it, expect } from 'vitest';
import { buildBuckets } from './OutreachQueuePanel';
import type { Lead, LeadStage } from './leadTypes';

const TODAY = '2026-08-27';

function lead(over: Partial<Lead> & { id: string }): Lead {
  return {
    company_name: over.id, segment: null, region: null, size_signal: null,
    why_fit: null, buyer_title: null, contact_name: null, contact_phone: null,
    contact_email: null, outreach_approach: null, priority: 3, confidence: null,
    source_url: null, stage: 'NEW' as LeadStage, next_action_date: null,
    last_contacted_at: null, tech_stack: null, tech_stack_source: null,
    notes: null, company_id: null,
    created_at: TODAY, updated_at: TODAY,
    ...over,
  } as Lead;
}

const bucket = (leads: Lead[], key: string) =>
  buildBuckets(leads, TODAY).find(b => b.key === key)!.leads.map(l => l.id);

describe('buildBuckets', () => {
  it('puts a lead whose follow-up date has passed in overdue', () => {
    expect(bucket([lead({ id: 'a', next_action_date: '2026-08-26' })], 'overdue')).toEqual(['a']);
  });

  it('separates today from overdue rather than lumping them together', () => {
    const leads = [
      lead({ id: 'past', next_action_date: '2026-08-26' }),
      lead({ id: 'now', next_action_date: TODAY }),
    ];
    expect(bucket(leads, 'overdue')).toEqual(['past']);
    expect(bucket(leads, 'today')).toEqual(['now']);
  });

  it('excludes closed stages from every actionable bucket', () => {
    const closed: LeadStage[] = ['WON', 'LOST', 'PARKED'];
    for (const stage of closed) {
      const leads = [lead({ id: 'x', stage, next_action_date: '2026-08-01' })];
      expect(bucket(leads, 'overdue')).toEqual([]);
      expect(bucket(leads, 'untouched')).toEqual([]);
    }
  });

  it('flags a contacted lead with nothing scheduled as gone quiet after a week', () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 86_400_000).toISOString();
    expect(bucket([lead({ id: 'q', stage: 'CONTACTED', last_contacted_at: eightDaysAgo })], 'quiet'))
      .toEqual(['q']);
  });

  it('does not call a lead quiet while a follow-up is still scheduled', () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 86_400_000).toISOString();
    const leads = [lead({ id: 'q', last_contacted_at: eightDaysAgo, next_action_date: '2026-09-30' })];
    expect(bucket(leads, 'quiet')).toEqual([]);
  });

  it('does not call a lead quiet before the seven-day window', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();
    expect(bucket([lead({ id: 'q', last_contacted_at: twoDaysAgo })], 'quiet')).toEqual([]);
  });

  it('counts a lead as never contacted only when it has no touch and no plan', () => {
    const leads = [
      lead({ id: 'fresh' }),
      lead({ id: 'touched', last_contacted_at: TODAY }),
      lead({ id: 'planned', next_action_date: '2026-09-30' }),
    ];
    expect(bucket(leads, 'untouched')).toEqual(['fresh']);
  });

  it('orders never-contacted by priority so the best leads surface first', () => {
    const leads = [
      lead({ id: 'low', priority: 2 }),
      lead({ id: 'high', priority: 5 }),
      lead({ id: 'mid', priority: 3 }),
    ];
    expect(bucket(leads, 'untouched')).toEqual(['high', 'mid', 'low']);
  });
});
