// Outbound SMTP for hand-sent outreach, distinct from Resend.
//
// Resend carries transactional mail (rework notices, trial confirmations) and
// its Acceptable Use Policy prohibits cold outreach and harvested lists. The one
// RESEND_API_KEY is shared by every transactional sender, so an AUP strike from
// a sales experiment would stop engineers being told their tasks were sent back
// for rework. Cold mail therefore leaves by a completely separate path: a real
// mailbox over SMTP, which is a person sending mail rather than an application
// blasting it.
//
// Required secrets:
//   SMTP_USER          the mailbox address, e.g. someone@gmail.com
//   SMTP_APP_PASSWORD  a Gmail App Password (16 chars). NOT the account
//                      password -- Google rejects those over SMTP, and an app
//                      password can be revoked on its own without touching the
//                      account.
// Optional:
//   SMTP_FROM_NAME     display name on the From header
//   SMTP_HOST/PORT     override for a non-Gmail mailbox

// Imported dynamically inside sendPlainMail, not at module top level. This
// module is pulled into platform-admin-data, which serves every admin action --
// a top-level import that fails to resolve would take the whole admin panel down
// rather than just the ability to send mail.
const DENOMAILER = 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const DEFAULT_HOST = 'smtp.gmail.com';
const DEFAULT_PORT = 465; // implicit TLS; 587 STARTTLS also works but is slower to hand-shake

export interface SmtpConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  fromName: string | null;
}

/** Reads SMTP config from secrets, or returns null when it isn't configured.
 *  Null rather than throwing so a caller can answer "not configured yet" with a
 *  501 instead of a 500 -- one is a setup step, the other is a bug. */
export function readSmtpConfig(): SmtpConfig | null {
  const user = Deno.env.get('SMTP_USER')?.trim();
  const password = Deno.env.get('SMTP_APP_PASSWORD')?.trim();
  if (!user || !password) return null;
  const port = Number(Deno.env.get('SMTP_PORT') ?? DEFAULT_PORT);
  return {
    user,
    password,
    host: Deno.env.get('SMTP_HOST')?.trim() || DEFAULT_HOST,
    port: Number.isFinite(port) ? port : DEFAULT_PORT,
    fromName: Deno.env.get('SMTP_FROM_NAME')?.trim() || null,
  };
}

export interface SendResult {
  ok: boolean;
  messageId: string | null;
  error: string | null;
}

/** A Message-ID we generate ourselves, so the row in outreach_drafts can be tied
 *  back to the copy sitting in the mailbox's Sent folder. The domain part is the
 *  sender's own domain, which is what receivers expect. */
function buildMessageId(user: string): string {
  const domain = user.split('@')[1] ?? 'localhost';
  const rand = crypto.randomUUID();
  return `<${rand}@${domain}>`;
}

/**
 * Sends one plain-text message. Plain text on purpose: outreach that looks
 * hand-written outperforms HTML, and an HTML part from a fresh sender is one
 * more spam signal for no gain.
 */
export async function sendPlainMail(opts: {
  config: SmtpConfig;
  to: string;
  toName?: string | null;
  subject: string;
  text: string;
  replyTo?: string | null;
}): Promise<SendResult> {
  const { config } = opts;
  const messageId = buildMessageId(config.user);

  let SMTPClient: new (cfg: unknown) => {
    send: (msg: unknown) => Promise<unknown>;
    close: () => Promise<void>;
  };
  try {
    ({ SMTPClient } = await import(DENOMAILER));
  } catch (err) {
    return {
      ok: false,
      messageId: null,
      error: `SMTP library failed to load: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const client = new SMTPClient({
    connection: {
      hostname: config.host,
      port: config.port,
      tls: true,
      auth: { username: config.user, password: config.password },
    },
  });

  try {
    await client.send({
      from: config.fromName ? `${config.fromName} <${config.user}>` : config.user,
      to: opts.toName ? `${opts.toName} <${opts.to}>` : opts.to,
      subject: opts.subject,
      content: opts.text,
      replyTo: opts.replyTo ?? undefined,
      headers: { 'Message-ID': messageId },
    });
    return { ok: true, messageId, error: null };
  } catch (err) {
    return {
      ok: false,
      messageId: null,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    // close() can itself throw if the connection already dropped; a failure to
    // hang up cleanly must not mask a send that actually succeeded.
    try {
      await client.close();
    } catch { /* ignore */ }
  }
}
