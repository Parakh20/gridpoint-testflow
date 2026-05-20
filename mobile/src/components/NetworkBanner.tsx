import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/theme';

export function NetworkBanner() {
  const [online, setOnline] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const sub = NetInfo.addEventListener((s) => {
      setOnline(Boolean(s.isConnected && s.isInternetReachable !== false));
    });
    return () => sub();
  }, []);

  if (online) return null;
  return (
    <View style={[s.bar, { paddingTop: insets.top + 4 }]}>
      <Text style={s.text}>Offline — submissions will fail until reconnected</Text>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    backgroundColor: theme.danger,
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  text: { color: '#fff', textAlign: 'center', fontSize: 12, fontWeight: '600' },
});
