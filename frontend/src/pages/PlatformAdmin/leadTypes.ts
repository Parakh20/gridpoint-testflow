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
  /** Maintained by trg_leads_touch_stamp from lead_activities; NOTE rows don't count. */
  last_contacted_at: string | null;
  /** What they use to record and report test results today. Free text. */
  tech_stack: string | null;
  /** Where the tech_stack claim came from. Unsourced research is a guess. */
  tech_stack_source: string | null;
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

export const CONTACT_SENIORITIES = [
  'C_SUITE',
  'DIRECTOR',
  'MANAGER',
  'ENGINEER',
  'GENERIC',
  'UNKNOWN',
] as const;
export type ContactSeniority = (typeof CONTACT_SENIORITIES)[number];

export const SENIORITY_LABEL: Record<ContactSeniority, string> = {
  C_SUITE: 'C-suite',
  DIRECTOR: 'Director',
  MANAGER: 'Manager',
  ENGINEER: 'Engineer',
  GENERIC: 'Shared inbox',
  UNKNOWN: 'Unknown',
};

export const EMAIL_STATUSES = ['PUBLISHED', 'UNVERIFIED', 'BOUNCED', 'OPTED_OUT'] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

/**
 * How much to trust an address. PUBLISHED means it was read off a page the
 * company controls; UNVERIFIED means a directory/aggregator or an inferred
 * name-to-mailbox mapping. Nothing in this table is a first.last@ guess.
 */
export const EMAIL_STATUS_LABEL: Record<EmailStatus, string> = {
  PUBLISHED: 'Published',
  UNVERIFIED: 'Unverified',
  BOUNCED: 'Bounced',
  OPTED_OUT: 'Opted out',
};

export interface LeadContact {
  id: string;
  lead_id: string;
  full_name: string | null;
  title: string | null;
  seniority: ContactSeniority;
  email: string | null;
  email_status: EmailStatus;
  phone: string | null;
  linkedin_url: string | null;
  source_url: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
