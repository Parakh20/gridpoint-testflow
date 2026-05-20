import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Application from 'expo-application';
import { useAuth } from '@/context/AuthContext';
import { theme } from '@/theme';

export default function ProfileScreen() {
  const { profile, role, email, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'You will need to re-enter your email and password.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  const initials = (profile?.full_name ?? 'User')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{ padding: theme.pad, paddingBottom: Math.max(theme.pad, insets.bottom + 16) }}
    >
      <View style={s.head}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Text style={s.name}>{profile?.full_name ?? 'Unnamed engineer'}</Text>
        <Text style={s.email}>{email ?? '—'}</Text>
        {role && (
          <View style={s.roleBadge}>
            <Text style={s.roleBadgeText}>{role}</Text>
          </View>
        )}
      </View>

      <View style={s.card}>
        <Row label="Workspace" value={profile?.company_name ?? '—'} />
        <Divider />
        <Row label="Role" value={role ?? 'Unassigned'} />
        <Divider />
        <Row label="App version" value={Application.nativeApplicationVersion ?? '0.1.0'} />
        <Divider />
        <Row label="Build" value={Application.nativeBuildVersion ?? 'dev'} />
      </View>

      <View style={s.tipsCard}>
        <Text style={s.tipsTitle}>Tips</Text>
        <Tip text="Forms auto-save while you type. Look for the “Saved Xs ago” line." />
        <Tip text="Submitted tests are locked. Ask your supervisor for a rework if you need to change them." />
        <Tip text="No data outside your company workspace will ever load — RLS enforces this server-side." />
        <Tip text="You'll be signed out automatically after 30 minutes of inactivity." />
      </View>

      <TouchableOpacity style={s.signOut} onPress={confirmSignOut}>
        <Text style={s.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

function Tip({ text }: { text: string }) {
  return (
    <View style={s.tip}>
      <Text style={s.tipDot}>•</Text>
      <Text style={s.tipText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  head: { alignItems: 'center', paddingVertical: 16 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.card,
    borderWidth: 2,
    borderColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: theme.primary, fontSize: 24, fontWeight: '800' },
  name: { color: theme.text, fontSize: 20, fontWeight: '700', marginTop: 12 },
  email: { color: theme.textDim, marginTop: 2, fontSize: 13 },
  roleBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.primary,
  },
  roleBadgeText: { color: theme.primary, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  card: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    marginTop: 20,
    paddingHorizontal: theme.pad,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  rowLabel: { color: theme.textDim, fontSize: 13 },
  rowValue: { color: theme.text, fontSize: 13, fontWeight: '600', maxWidth: '60%' },
  divider: { height: 1, backgroundColor: theme.border },
  tipsCard: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    marginTop: 16,
    padding: theme.pad,
  },
  tipsTitle: { color: theme.text, fontWeight: '700', marginBottom: 8 },
  tip: { flexDirection: 'row', marginTop: 6 },
  tipDot: { color: theme.primary, marginRight: 8, fontSize: 14 },
  tipText: { color: theme.textDim, flex: 1, fontSize: 13, lineHeight: 19 },
  signOut: {
    marginTop: 24,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: theme.danger,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  signOutText: { color: theme.danger, fontWeight: '700' },
});
