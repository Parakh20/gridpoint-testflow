/**
 * Maps a user role to its dashboard route.
 * Use this everywhere instead of hardcoding '/gm'.
 */
export function dashboardPath(role: string | null): string {
  switch (role) {
    case 'SUPERADMIN': return '/superadmin';
    case 'GM':         return '/gm';
    case 'SUPERVISOR': return '/supervisor';
    case 'ENGINEER':   return '/engineer';
    default:           return '/';
  }
}
