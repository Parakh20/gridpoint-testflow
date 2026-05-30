export const LEAD_STAGES = [
  'NEW',
  'CONTACTED',
  'DEMO_BOOKED',
  'PILOT',
  'WON',
  'LOST',
  'PARKED',
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_CHANNELS = [
  'WHATSAPP',
  'PHONE',
  'LINKEDIN',
  'EMAIL',
  'IN_PERSON',
  'EVENT',
  'NOTE',
] as const;
export type LeadChannel = (typeof LEAD_CHANNELS)[number];

export const STAGE_LABEL: Record<LeadStage, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  DEMO_BOOKED: 'Demo booked',
  PILOT: 'Pilot',
  WON: 'Won',
  LOST: 'Lost',
  PARKED: 'Parked',
};

export const CHANNEL_LABEL: Record<LeadChannel, string> = {
  WHATSAPP: 'WhatsApp',
  PHONE: 'Phone',
  LINKEDIN: 'LinkedIn',
  EMAIL: 'Email',
  IN_PERSON: 'In person',
  EVENT: 'Event',
  NOTE: 'Note',
};

export interface Lead {
  id: string;
  company_name: string;
  segment: string | null;
  region: string | null;
  size_signal: string | null;
  why_fit: string | null;
  buyer_title: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  outreach_approach: string | null;
  priority: number | null;
  confidence: string | null;
  source_url: string | null;
  stage: LeadStage;
  next_action_date: string | null;
  notes: string | null;
  company_id: string | null;
  created_at: string;
  updated_at: string;
  // augmented by get_all_leads
  activity_count?: number;
  last_activity_at?: string | null;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  channel: LeadChannel;
  body: string;
  occurred_at: string;
  created_at: string;
}
