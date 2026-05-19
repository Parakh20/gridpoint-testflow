/**
 * Shared realtime infrastructure.
 *
 * Why this exists:
 * - Supabase Free tier caps realtime at 200 concurrent connections + 100 msgs/sec.
 *   With 100 users × multiple tabs × multiple page-level subscriptions, we hit
 *   the cap easily. This module gives us one place to toggle realtime off
 *   (env flag) and to track connection health for the UI.
 * - Components register channels via `useRealtimeChannel`, which becomes a
 *   no-op when realtime is disabled. The accompanying `usePollingFallback`
 *   hook then drives refetches via a plain interval instead.
 */

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export const REALTIME_ENABLED = import.meta.env.VITE_REALTIME_ENABLED !== 'false';

export type RealtimeStatus = 'connecting' | 'connected' | 'error' | 'disabled';

// ── Status store (lightweight observable) ───────────────────────────────────
let status: RealtimeStatus = REALTIME_ENABLED ? 'connecting' : 'disabled';
const statusListeners = new Set<() => void>();

const setStatus = (next: RealtimeStatus) => {
  if (status === next) return;
  status = next;
  statusListeners.forEach(l => l());
};

const subscribeStatus = (l: () => void) => {
  statusListeners.add(l);
  return () => { statusListeners.delete(l); };
};

const getStatus = () => status;

/** Subscribe to overall realtime connection health. Disabled → 'disabled'. */
export const useRealtimeStatus = () =>
  useSyncExternalStore(subscribeStatus, getStatus, getStatus);

// ── Channel lifecycle helper ────────────────────────────────────────────────

interface ChannelBuilder {
  /**
   * Called once when the channel is created. Attach `.on(...)` handlers
   * to the channel inside this callback. Do NOT call `.subscribe()` — the
   * helper handles that.
   */
  (channel: RealtimeChannel): void;
}

/**
 * Create and tear down a single realtime channel for the component lifetime.
 *
 * - No-op if `VITE_REALTIME_ENABLED=false` — components fall back to polling.
 * - Tracks subscription status globally so the UI can show a banner if the
 *   connection drops or errors.
 *
 * @param channelName Unique channel name. Suffix with `user.id` to avoid
 *                    cross-tab subscription collisions.
 * @param build       Attaches handlers to the channel before subscribe.
 * @param deps        useEffect dependency list (mirror normal hook rules).
 */
export function useRealtimeChannel(
  channelName: string,
  build: ChannelBuilder,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: any[],
) {
  // Track active channel count for status — if any channel is connected,
  // status is 'connected'. If all error out, status is 'error'.
  useEffect(() => {
    if (!REALTIME_ENABLED) {
      setStatus('disabled');
      return;
    }

    setStatus('connecting');
    const channel = supabase.channel(channelName);
    build(channel);

    channel.subscribe((subStatus) => {
      // SUBSCRIBED | TIMED_OUT | CLOSED | CHANNEL_ERROR
      if (subStatus === 'SUBSCRIBED') setStatus('connected');
      else if (subStatus === 'CHANNEL_ERROR' || subStatus === 'TIMED_OUT') setStatus('error');
    });

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ── Polling fallback ────────────────────────────────────────────────────────

/**
 * Polls a callback on an interval ONLY when realtime is disabled or errored.
 * Use this in components that previously relied on realtime invalidations so
 * the UI still feels live on Free tier (or after a connection drop).
 *
 * @param refetch  The function to call on each tick (typically a TanStack
 *                 Query `queryClient.invalidateQueries` or `refetch`).
 * @param intervalMs  Default 30s. Don't go below 15s — that's just attacking
 *                    your own DB.
 */
export function usePollingFallback(refetch: () => void, intervalMs = 30_000) {
  const status = useRealtimeStatus();
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    // Poll when realtime is off OR the live connection has failed
    const shouldPoll = status === 'disabled' || status === 'error';
    if (!shouldPoll) return;

    const id = setInterval(() => refetchRef.current(), intervalMs);
    return () => clearInterval(id);
  }, [status, intervalMs]);
}
