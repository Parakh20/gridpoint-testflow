/**
 * Role-rank order used by both apps to pick the highest-privilege role when
 * a user has multiple `user_roles` rows.
 *
 * Lower number = higher privilege.
 */

export type AppRole = 'SUPERADMIN' | 'GM' | 'SUPERVISOR' | 'ENGINEER';

export const ROLE_RANK: Record<AppRole, number> = {
  SUPERADMIN: 0,
  GM: 1,
  SUPERVISOR: 2,
  ENGINEER: 3,
};

/**
 * Given an array of role strings, returns the highest-privilege one (or null
 * if the array is empty or contains only unknown roles).
 */
export function highestRole(roles: ReadonlyArray<string>): AppRole | null {
  let best: AppRole | null = null;
  let bestRank = Infinity;
  for (const r of roles) {
    const rank = (ROLE_RANK as Record<string, number>)[r];
    if (rank === undefined) continue;
    if (rank < bestRank) {
      best = r as AppRole;
      bestRank = rank;
    }
  }
  return best;
}
