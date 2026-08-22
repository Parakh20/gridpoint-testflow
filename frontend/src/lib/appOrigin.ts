// Where the tenant app lives, as seen from the marketing site.
//
// Under the single-domain architecture the app is served from one host for
// every tenant. The marketing site sits on a different origin (the apex), so
// its "Sign in" / "Get started" links must cross to the app origin — the
// signup and login sessions have to be created on the same origin the
// workspace runs on, otherwise the session wouldn't carry over (this is
// exactly what made Google signup a two-step flow under per-tenant
// subdomains).
//
// In local dev everything is served from one localhost origin, so links stay
// relative and no cross-origin hop happens.
const APP_HOST = 'https://app.optimustesting.com';

function isLocalHost(): boolean {
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

/** Absolute (or relative, in dev) URL for a path inside the tenant app. */
export function appUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return isLocalHost() ? normalized : `${APP_HOST}${normalized}`;
}
