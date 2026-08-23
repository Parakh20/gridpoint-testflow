// Unit tests for the Svix webhook signature verifier used by resend-inbound.
//
// This is the only thing standing between a public endpoint and an attacker
// writing arbitrary text into the admin panel as a "customer email", so the
// negative cases matter as much as the positive one.
//
// Pure — no network, no `supabase start`. Run:
//   cd supabase/functions && deno test --allow-env _shared/svix.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { verifySvixSignature } from './svix.ts';

const SECRET_B64 = btoa('a-test-signing-secret-value');
const SECRET = `whsec_${SECRET_B64}`;

async function sign(id: string, timestamp: string, body: string, secret = SECRET): Promise<string> {
  const raw = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const key = await crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${timestamp}.${body}`));
  return `v1,${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;
}

const nowTs = () => String(Math.floor(Date.now() / 1000));

Deno.test('accepts a correctly signed delivery', async () => {
  const body = JSON.stringify({ type: 'email.received' });
  const ts = nowTs();
  const signature = await sign('msg_1', ts, body);
  assertEquals(await verifySvixSignature(body, { id: 'msg_1', timestamp: ts, signature }, SECRET), null);
});

Deno.test('accepts when the header carries several signatures (secret rotation)', async () => {
  const body = JSON.stringify({ type: 'email.received' });
  const ts = nowTs();
  const good = await sign('msg_1', ts, body);
  const stale = await sign('msg_1', ts, body, `whsec_${btoa('some-other-secret')}`);
  assertEquals(
    await verifySvixSignature(body, { id: 'msg_1', timestamp: ts, signature: `${stale} ${good}` }, SECRET),
    null,
  );
});

Deno.test('rejects a body tampered with after signing', async () => {
  const ts = nowTs();
  const signature = await sign('msg_1', ts, '{"type":"email.received"}');
  const result = await verifySvixSignature('{"type":"email.received","injected":true}', { id: 'msg_1', timestamp: ts, signature }, SECRET);
  assertEquals(result, 'no matching signature');
});

Deno.test('rejects a signature computed with the wrong secret', async () => {
  const body = '{}';
  const ts = nowTs();
  const signature = await sign('msg_1', ts, body, `whsec_${btoa('attacker-secret')}`);
  assertEquals(await verifySvixSignature(body, { id: 'msg_1', timestamp: ts, signature }, SECRET), 'no matching signature');
});

Deno.test('rejects a replayed capture outside the timestamp tolerance', async () => {
  const body = '{}';
  const old = String(Math.floor(Date.now() / 1000) - 3600);
  const signature = await sign('msg_1', old, body);
  assertEquals(await verifySvixSignature(body, { id: 'msg_1', timestamp: old, signature }, SECRET), 'timestamp outside tolerance');
});

Deno.test('rejects a delivery with no signature headers at all', async () => {
  assertEquals(
    await verifySvixSignature('{}', { id: null, timestamp: null, signature: null }, SECRET),
    'missing signature headers',
  );
});

Deno.test('rejects an unversioned or malformed signature entry', async () => {
  const ts = nowTs();
  assertEquals(await verifySvixSignature('{}', { id: 'msg_1', timestamp: ts, signature: 'garbage' }, SECRET), 'no matching signature');
});
