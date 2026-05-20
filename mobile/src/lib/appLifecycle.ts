import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Invalidate all queries when the app returns to the foreground.
 * React Query's built-in refetchOnWindowFocus doesn't fire on RN, so we do it manually.
 */
export function useAppForegroundRefetch() {
  const qc = useQueryClient();
  useEffect(() => {
    let last: AppStateStatus = AppState.currentState;
    const sub = AppState.addEventListener('change', (next) => {
      if (last.match(/inactive|background/) && next === 'active') {
        qc.invalidateQueries();
      }
      last = next;
    });
    return () => sub.remove();
  }, [qc]);
}
