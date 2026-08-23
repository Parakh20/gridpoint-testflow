// Shapes returned by platform-admin-data's email actions. Raw Postgres rows
// (snake_case), same posture as billingTypes.ts / planTypes.ts. Kept in sync
// with supabase/migrations/20260823000009_email_log.sql and
// supabase/migrations/20260823000010_inbound_emails.sql.

export interface EmailTemplateOption {
  key: string;
  label: string;
  requires_subject: boolean;
  requires_message: boolean;
}

export interface SentEmail {
  id: string;
  to_email: string;
  subject: string;
  template: string;
  status: 'sent' | 'failed';
  resend_message_id: string | null;
  error: string | null;
  actor: string;
  sent_at: string;
}

export interface InboundEmail {
  id: string;
  from_email: string;
  from_name: string | null;
  /** Only returned by get_unassigned_inbound — absent on the per-company view. */
  to_email?: string | null;
  subject: string | null;
  text_body: string | null;
  received_at: string;
  handled: boolean;
}
