import React, { useEffect, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useCompanyUsers, useUpdateUserRole, useToggleUserActive } from '@/hooks/useCompanyUsers';
import { useToast } from '@/components/Toast';
import { explainSupabaseError } from '@/lib/errors';
import { theme, roleBadge } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type R = RouteProp<RootStackParamList, 'UserDetail'>;

const ROLES = ['ENGINEER', 'SUPERVISOR', 'GM', 'SUPERADMIN'] as const;
type Role = typeof ROLES[number];

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function UserDetailScreen() {
  const { params } = useRoute<R>();
  const toast = useToast();

  const usersQ = useCompanyUsers();
  const roleM = useUpdateUserRole();
  const activeM = useToggleUserActive();

  const user = usersQ.data?.find((u) => u.id === params.userId);
  const [selectedRole, setSelectedRole] = useState<Role>('ENGINEER');

  useEffect(() => {
    if (user?.role) setSelectedRole(user.role as Role);
  }, [user?.role]);

  const handleRoleChange = async () => {
    if (!user || selectedRole === user.role) return;
    try {
      await roleM.mutateAsync({ userId: user.id, newRole: selectedRole });
      toast.success('Role updated');
    } catch (err: any) {
      toast.error(explainSupabaseError(err));
    }
  };

  const handleToggleActive = () => {
    if (!user) return;
    const nextActive = !user.is_active;
    if (!nextActive) {
      Alert.alert(
        'Deactivate user?',
        `${user.name} will lose access to the app immediately.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Deactivate',
            style: 'destructive',
            onPress: async () => {
              try {
                await activeM.mutateAsync({ userId: user.id, isActive: false });
                toast.success('User deactivated');
              } catch (err: any) {
                toast.error(explainSupabaseError(err));
              }
            },
          },
        ]
      );
    } else {
      activeM.mutateAsync({ userId: user.id, isActive: true })
        .then(() => toast.success('User reactivated'))
        .catch((err: any) => toast.error(explainSupabaseError(err)));
    }
  };

  if (usersQ.isLoading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[s.root, s.center]}>
        <Text style={s.notFound}>User not found</Text>
      </View>
    );
  }

  const rb = user.role ? roleBadge[user.role as keyof typeof roleBadge] : null;

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Info card */}
        <View style={s.infoCard}>
          <Text style={s.name}>{user.name}</Text>
          <Text style={s.email}>{user.email}</Text>
          <View style={s.metaRow}>
            {rb && (
              <View style={[s.roleBadge, { backgroundColor: rb.bg, borderColor: rb.border }]}>
                <Text style={[s.roleBadgeText, { color: rb.text }]}>{user.role}</Text>
              </View>
            )}
            <View style={[
              s.activePill,
              {
                backgroundColor: user.is_active ? 'rgba(46,158,99,0.12)' : 'rgba(219,57,42,0.12)',
                borderColor: user.is_active ? theme.success : theme.danger,
              },
            ]}>
              <Text style={[s.activePillText, { color: user.is_active ? theme.success : theme.danger }]}>
                {user.is_active ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>
          </View>
          <Text style={s.since}>Member since {fmt(user.created_at)}</Text>
        </View>

        {/* Role section */}
        <Text style={s.sectionTitle}>Change Role</Text>
        <View style={s.roleRow}>
          {ROLES.map((r) => {
            const rb2 = roleBadge[r];
            const active = selectedRole === r;
            return (
              <TouchableOpacity
                key={r}
                style={[s.roleChip, active && { backgroundColor: rb2.bg, borderColor: rb2.border }]}
                onPress={() => setSelectedRole(r)}
              >
                <Text style={[s.roleChipText, active && { color: rb2.text }]}>{r}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {selectedRole !== user.role && (
          <TouchableOpacity
            style={[s.btn, roleM.isPending && s.btnDisabled]}
            onPress={handleRoleChange}
            disabled={roleM.isPending}
          >
            <Text style={s.btnText}>{roleM.isPending ? 'Updating…' : `Set role to ${selectedRole}`}</Text>
          </TouchableOpacity>
        )}

        {/* Active toggle */}
        <View style={s.divider} />
        <TouchableOpacity
          style={[s.toggleBtn, { borderColor: user.is_active ? theme.danger : theme.success }]}
          onPress={handleToggleActive}
          disabled={activeM.isPending}
        >
          <Text style={[s.toggleBtnText, { color: user.is_active ? theme.danger : theme.success }]}>
            {activeM.isPending
              ? '…'
              : user.is_active
              ? 'Deactivate User'
              : 'Reactivate User'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  notFound: { color: theme.textDim, fontSize: 16 },
  scroll: { padding: theme.pad, paddingBottom: 40 },
  infoCard: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: theme.radius, padding: 16, marginBottom: 24 },
  name: { color: theme.text, fontSize: 20, fontWeight: '700' },
  email: { color: theme.textDim, fontSize: 14, marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  roleBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  roleBadgeText: { fontSize: 11, fontWeight: '700' },
  activePill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  activePillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  since: { color: theme.textDim, fontSize: 12, marginTop: 10 },
  sectionTitle: { color: theme.textDim, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  roleChip: { borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  roleChipText: { color: theme.textDim, fontWeight: '600', fontSize: 13 },
  btn: { backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginBottom: 4 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: theme.primaryText, fontWeight: '700', fontSize: 15 },
  divider: { height: 1, backgroundColor: theme.border, marginVertical: 20 },
  toggleBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  toggleBtnText: { fontWeight: '700', fontSize: 15 },
});
