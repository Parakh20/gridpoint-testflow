/**
 * Translate Supabase / Postgres errors into human-readable copy.
 * Same function used on web and mobile so error UX stays consistent.
 *
 * Add a new case here when you find an error code that confuses users.
 */

type ErrorLike = {
  message?: string;
  code?: string;
  details?: string;
};

export function explainSupabaseError(err: unknown): string {
  if (!err) return 'Unknown error';
  const anyErr = err as ErrorLike;
  const msg = anyErr.message ?? String(err);

  if (/JWT|expired|invalid token/i.test(msg)) {
    return 'Your session expired. Please sign in again.';
  }
  if (/Network request failed|fetch/i.test(msg)) {
    return 'Network error. Check your connection.';
  }
  if (anyErr.code === '23514') {
    return 'A value violates database rules (e.g. quantity must be 1–500).';
  }
  if (anyErr.code === '23505') {
    return 'Conflict — that record already exists.';
  }
  if (/row-level security|permission denied/i.test(msg)) {
    return "You don't have permission for that action.";
  }
  return msg;
}
