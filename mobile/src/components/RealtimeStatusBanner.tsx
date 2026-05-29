import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRealtimeStatus } from '@/lib/realtime';
import { theme } from '@/theme';

/**
 * Mobile mirror of frontend/src/components/RealtimeStatusBanner.tsx.
 * Shows a small banner when realtime is unavailable so engineers know why
 * data isn't auto-updating. Polling fallback keeps things live — this is
 * just expectation-setting.
 */
export function RealtimeStatusBanner() {
  const status = useRealtimeStatus();
  const insets = useSafeAreaInsets();
  if (status === 'connected' || status === 'connecting') return null;

  const isDisabled = status === 'disabled';
  const tone = isDisabled
    ? { bg: 'rgba(148, 163, 184, 0.12)', fg: theme.textDim, border: theme.border }
    : { bg: 'rgba(245, 158, 11, 0.14)', fg: theme.warn, border: theme.warn };

  return (
    <View
      style={[
        s.bar,
        { backgroundColor: tone.bg, borderTopColor: tone.border, paddingBottom: insets.bottom + 6 },
      ]}
      accessibilityRole="alert"
    >
      <Text style={[s.dot, { color: tone.fg }]}>●</Text>
      <Text style={[s.text, { color: tone.fg }]} numberOfLines={1}>
        {isDisabled
          ? 'Live updates off — refreshing every 30s.'
          : 'Live updates paused — refreshing every 30s.'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 6,
    borderTopWidth: 1,
  },
  dot: { fontSize: 10, marginRight: 8 },
  text: { fontSize: 11, fontWeight: '600', flex: 1 },
});
