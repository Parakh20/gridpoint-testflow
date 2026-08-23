// Host model for the app.
//
// The app is served on three kinds of host, and all of them are equivalent
// as far as the app is concerned — the company a user operates as always
// comes from their own profile (see CompanyContext), never from the URL.
// The host only brands the page and shapes links.
//
//   app.optimustesting.com      canonical app host
//   <slug>.optimustesting.com   company subdomain alias (cosmetic)
//   <customer's own domain>     premium custom_domain feature
//
// Sessions are shared across the first two by a cookie scoped to
// .optimustesting.com (see integrations/supabase/sessionStorageAdapter).
// A custom domain is a separate site and keeps its own session.

const BASE_DOMAIN = 'optimustesting.com';
const APP_HOST = `app.${BASE_DOMAIN}`;

/** Hosts under the base domain that are NOT company subdomain aliases. */
const RESERVED_SUBDOMAINS = new Set(['app', 'www', 'admin', 'api', 'mail']);

export function isLocalHost(host: string = window.location.hostname): boolean {
  return host === 'localhost' || host === '127.0.0.1';
}

/** The marketing site (apex / www), which is not the app. */
export function isMarketingHost(host: string = window.location.hostname): boolean {
  return host === BASE_DOMAIN || host === `www.${BASE_DOMAIN}`;
}

export function isAdminHost(host: string = window.location.hostname): boolean {
  return host === `admin.${BASE_DOMAIN}`;
}

/**
 * The company slug implied by a subdomain alias, or null when the host
 * carries no such hint (the canonical app host, localhost, or a custom
 * domain). Only ever a *hint* — it brands the login page and is checked
 * against the signed-in user's real company; it never grants access.
 */
export function subdomainSlugHint(host: string = window.location.hostname): string | null {
  if (!host.endsWith(`.${BASE_DOMAIN}`)) return null;
  const label = host.slice(0, -(BASE_DOMAIN.length + 1));
  if (!label || label.includes('.')) return null;
  return RESERVED_SUBDOMAINS.has(label) ? null : label;
}

/** True when this host is a customer-owned domain rather than one of ours. */
export function isCustomDomainHost(host: string = window.location.hostname): boolean {
  if (isLocalHost(host)) return false;
  return host !== BASE_DOMAIN && !host.endsWith(`.${BASE_DOMAIN}`);
}

/** Absolute (or relative, in dev) URL for a path inside the tenant app. */
export function appUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return isLocalHost() ? normalized : `https://${APP_HOST}${normalized}`;
}

/** The workspace URL to show a company for its subdomain alias. */
export function workspaceUrlForSlug(slug: string): string {
  return `https://${slug}.${BASE_DOMAIN}`;
}
