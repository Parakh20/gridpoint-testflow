// Svix webhook signature verification.
//
// Resend signs webhook deliveries with Svix, which is a different scheme from
// Razorpay's plain HMAC-over-body (see billing_provider.verifyWebhookSignature):
// the signed content is `${svix-id}.${svix-timestamp}.${body}`, the secret is
// base64 after a `whsec_` prefix, and the signature header can carry several
// space-separated versioned signatures (`v1,<sig> v1,<sig>`) during a secret
// rotation.
//
// This endpoint is public and stores customer email as-is, so a forged
// delivery would put attacker-authored text in front of an operator as a
// genuine customer message. Verification is not optional.

const TOLERANCE_SECONDS = 5 * 60;

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

/** Length-independent comparison so a signature can't be recovered by timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface SvixHeaders {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
}

export function readSvixHeaders(req: Request): SvixHeaders {
  // Svix sends `svix-*`; a Resend-branded proxy may send `webhook-*` instead
  // (both are documented Svix header sets). Accept either.
  const get = (a: string, b: string) => req.headers.get(a) ?? req.headers.get(b);
  return {
    id: get('svix-id', 'webhook-id'),
    timestamp: get('svix-timestamp', 'webhook-timestamp'),
    signature: get('svix-signature', 'webhook-signature'),
  };
}

/**
 * Verify a Svix-signed webhook body. Returns null when valid, or a short
 * reason string when not — the reason is for logging, never for the response
 * body, which must not tell an attacker which check failed.
 */
export async function verifySvixSignature(
  rawBody: string,
  headers: SvixHeaders,
  secret: string,
): Promise<string | null> {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return 'missing signature headers';

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return 'malformed timestamp';
  // Reject replays of an old capture, and deliveries claiming to be from the
  // future (clock skew beyond tolerance is indistinguishable from forgery).
  if (Math.abs(Date.now() / 1000 - ts) > TOLERANCE_SECONDS) return 'timestamp outside tolerance';

  const secretBytes = base64ToBytes(secret.startsWith('whsec_') ? secret.slice(6) : secret);
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${timestamp}.${rawBody}`));
  const expected = bytesToBase64(signed);

  // The header carries one or more `v<version>,<base64sig>` pairs.
  for (const part of signature.split(' ')) {
    const [version, provided] = part.split(',');
    if (version !== 'v1' || !provided) continue;
    if (safeEqual(provided, expected)) return null;
  }
  return 'no matching signature';
}
