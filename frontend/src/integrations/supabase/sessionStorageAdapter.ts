// Supabase auth session storage backed by a cookie scoped to the parent
// domain, so ONE sign-in works across every host we serve the app on:
//   app.optimustesting.com        canonical
//   <slug>.optimustesting.com     company subdomain alias
// localStorage is per-origin, so under it a user signed in on the app host
// appears signed out on their company subdomain — that is the whole reason
// this adapter exists.
//
// A customer's own custom domain is a genuinely different site, so it does
// NOT share this cookie and requires its own sign-in. That's unavoidable
// (no browser shares cookies across unrelated registrable domains) and is
// also the correct security boundary.
//
// On localhost there is no parent domain to share with, so the cookie is
// host-only and this behaves exactly like localStorage did.

const PARENT_DOMAIN = '.optimustesting.com';
// Supabase's session JSON (two JWTs + user object) commonly lands around
// 2–4KB, and browsers cap a single cookie near 4KB, so the value is split
// across numbered chunks rather than risking silent truncation.
const CHUNK_SIZE = 3000;

function cookieDomainAttr(): string {
  const host = window.location.hostname;
  return host.endsWith(PARENT_DOMAIN) ? `; domain=${PARENT_DOMAIN}` : '';
}

function readRawCookie(name: string): string | null {
  const prefix = `${encodeURIComponent(name)}=`;
  for (const part of document.cookie.split('; ')) {
    if (part.startsWith(prefix)) return decodeURIComponent(part.slice(prefix.length));
  }
  return null;
}

function writeRawCookie(name: string, value: string): void {
  // Lax rather than Strict: the OAuth and email-confirmation flows return via
  // a cross-site top-level navigation, and Strict would withhold the cookie on
  // that first request and bounce the user back to the login screen.
  document.cookie =
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}` +
    `; path=/${cookieDomainAttr()}; max-age=31536000; SameSite=Lax` +
    (window.location.protocol === 'https:' ? '; Secure' : '');
}

function deleteRawCookie(name: string): void {
  document.cookie =
    `${encodeURIComponent(name)}=; path=/${cookieDomainAttr()}; max-age=0; SameSite=Lax` +
    (window.location.protocol === 'https:' ? '; Secure' : '');
}

export const crossSubdomainStorage = {
  getItem(key: string): string | null {
    const single = readRawCookie(key);
    if (single !== null) return single;

    // Chunked form: `${key}.0`, `${key}.1`, ... written by setItem below.
    let index = 0;
    let joined = '';
    for (;;) {
      const part = readRawCookie(`${key}.${index}`);
      if (part === null) break;
      joined += part;
      index++;
    }
    return joined || null;
  },

  setItem(key: string, value: string): void {
    // Always clear the other representation first, otherwise a shrinking
    // session leaves stale chunks behind that getItem would concatenate onto
    // the fresh value and corrupt it.
    this.removeItem(key);

    if (value.length <= CHUNK_SIZE) {
      writeRawCookie(key, value);
      return;
    }
    for (let i = 0; i * CHUNK_SIZE < value.length; i++) {
      writeRawCookie(`${key}.${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
    }
  },

  removeItem(key: string): void {
    deleteRawCookie(key);
    for (let i = 0; i < 20; i++) {
      if (readRawCookie(`${key}.${i}`) === null) break;
      deleteRawCookie(`${key}.${i}`);
    }
  },
};
