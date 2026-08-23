import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SubscriptionStatus } from '@testflow/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { trialBannerState } from '@/lib/trialStatus';
import { theme } from '@/theme';

const BILLING_STALE_MS = 5 * 60 * 1000;

/**
 * Trial countdown / degraded-subscription notice, mirroring the web app's
 * TrialBanner. Deliberately has no "Manage billing" action: billing is
 * SUPERADMIN-only and lives on the web app, so on mobile this is informational
 * and points the user at their administrator instead.
 *
 * Sits with the other global strips at the bottom of the app shell.
 */
export function TrialBanner() {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? null;
  const insets = useSafeAreaInsets();

  const { data } = useQuery({
    queryKey: ['trial-banner', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const [companyRes, subRes] = await Promise.all([
        supabase.from('companies').select('trial_ends_at').eq('id', companyId).maybeSingle(),
        supabase.from('subscriptions').select('status').eq('company_id', companyId).maybeSingle(),
      ]);
      return {
        trialEndsAt: (companyRes.data as { trial_ends_at: string | null } | null)?.trial_ends_at ?? null,
        subscriptionStatus:
          (subRes.data as { status: SubscriptionStatus } | null)?.status ?? null,
      };
    },
    enabled: !!companyId,
    staleTime: BILLING_STALE_MS,
  });

  if (!data) return null;

  const state = trialBannerState({
    subscriptionStatus: data.subscriptionStatus,
    trialEndsAt: data.trialEndsAt,
    now: new Date(),
  });
  if (!state) return null;

  return (
    <View
      style={[
        s.bar,
        { backgroundColor: state.severity === 'urgent' ? theme.danger : theme.warn },
        { paddingBottom: insets.bottom + 6 },
      ]}
    >
      <Text style={s.text}>{state.message}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  text: { color: '#fff', textAlign: 'center', fontSize: 12, fontWeight: '600' },
});
