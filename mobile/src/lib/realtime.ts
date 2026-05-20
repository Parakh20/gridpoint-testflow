/**
 * Mobile-side mirror of frontend/src/lib/realtime.ts.
 *
 * Same shape, same env-flag semantics, so the two clients stay in lock-step:
 * - When `realtimeEnabled` is true, both apps subscribe to Postgres changes.
 * - When false (Free tier kill-switch), both apps fall back to 30s polling.
 *
 * If you change behavior here, update the web file too — they document the
 * same invariant in CLAUDE.md gotcha #22.
 */

import { useEffect, useRef, useSyncExternalStore } from 'react';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Default ON; mirror the web's flag. Pass `realtimeEnabled: false` in app.json
// → expo.extra to disable (e.g. on Supabase Free tier).
export const REALTIME_ENABLED =
  (Constants.expoConfig?.extra as any)?.realtimeEnabled !== false;

export type RealtimeStatus = 'connecting' | 'connected' | 'error' | 'disabled';

let status: RealtimeStatus = REALTIME_ENABLED ? 'connecting' : 'disabled';
const statusListeners = new Set<() => void>();

const setStatus = (next: RealtimeStatus) => {
  if (status === next) return;
  status = next;
  statusListeners.forEach((l) => l());
};

const subscribeStatus = (l: () => void) => {
  statusListeners.add(l);
  return () => {
    statusListeners.delete(l);
  };
};

const getStatus = () => status;

export const useRealtimeStatus = () =>
  useSyncExternalStore(subscribeStatus, getStatus, getStatus);

interface ChannelBuilder {
  (channel: RealtimeChannel): void;
}

/**
 * Create and tear down a single realtime channel for the component lifetime.
 * No-op if `realtimeEnabled` is false — companion `usePollingFallback` keeps
 * the UI live in that case.
 *
 * @param channelName Suffix with `user.id` to avoid cross-device collisions.
 */
export function useRealtimeChannel(
  channelName: string,
  build: ChannelBuilder,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: any[]
) {
  useEffect(() => {
    if (!REALTIME_ENABLED) {
      setStatus('disabled');
      return;
    }

    setStatus('connecting');
    const channel = supabase.channel(channelName);
    build(channel);

    channel.subscribe((subStatus) => {
      if (subStatus === 'SUBSCRIBED') setStatus('connected');
      else if (subStatus === 'CHANNEL_ERROR' || subStatus === 'TIMED_OUT')
        setStatus('error');
    });

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Polls a callback every `intervalMs` ONLY when realtime is disabled or errored.
 * Pair with every `useRealtimeChannel` so the UI still updates on Free tier.
 *
 * Default 30s — same as web. Don't go under 15s.
 */
export function usePollingFallback(refetch: () => void, intervalMs = 30_000) {
  const liveStatus = useRealtimeStatus();
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    const shouldPoll = liveStatus === 'disabled' || liveStatus === 'error';
    if (!shouldPoll) return;
    const id = setInterval(() => refetchRef.current(), intervalMs);
    return () => clearInterval(id);
  }, [liveStatus, intervalMs]);
}
