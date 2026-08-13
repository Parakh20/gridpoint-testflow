// ─── Platform admin token store ──────────────────────────────────────────────
// SECURITY: the platform token is the ONLY credential in front of
// `platform-admin-data` and `create-tenant`, which act with the Supabase
// service-role key and can read every tenant, delete companies, and mint
// magic links for any user. It must therefore never be built into the client
// bundle: a `VITE_*` value is inlined as a string literal at build time and
// the same deployment serves every tenant subdomain, so anyone could fetch the
// admin chunk and read it.
//
// Instead the operator types the token at platform login; it lives in
// sessionStorage for the tab's lifetime only.

const TOKEN_KEY = 'platform_token';

export const getPlatformToken = (): string =>
  sessionStorage.getItem(TOKEN_KEY) ?? '';

export const setPlatformToken = (token: string): void => {
  sessionStorage.setItem(TOKEN_KEY, token);
};

export const clearPlatformToken = (): void => {
  sessionStorage.removeItem(TOKEN_KEY);
};
