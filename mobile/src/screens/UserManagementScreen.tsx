import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCompanyUsers, type CompanyUser } from '@/hooks/useCompanyUsers';
import { theme, roleBadge } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'UserManagement'>;

export default function UserManagementScreen() {
  const nav = useNavigation<Nav>();
  const q = useCompanyUsers();
  const [search, setSearch] = useState('');

  const users = useMemo(() => {
    const all = q.data ?? [];
    if (!search) return all;
    const lower = search.toLowerCase();
    return all.filter(
      (u) =>
        u.name.toLowerCase().includes(lower) ||
        u.email.toLowerCase().includes(lower) ||
        (u.role ?? '').toLowerCase().includes(lower)
    );
  }, [q.data, search]);

  if (q.isLoading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      <View style={s.searchWrap}>
        <TextInput
          style={s.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search users…"
          placeholderTextColor={theme.textDim}
          autoCorrect={false}
        />
      </View>

      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        contentContainerStyle={{ padding: theme.pad, paddingTop: 0 }}
        refreshControl={
          <RefreshControl
            refreshing={q.isFetching && !q.isLoading}
            onRefresh={() => q.refetch()}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No users found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <UserRow
            user={item}
            onPress={() => nav.navigate('UserDetail', { userId: item.id, userName: item.name })}
          />
        )}
      />

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => nav.navigate('CreateUser')}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function UserRow({ user, onPress }: { user: CompanyUser; onPress: () => void }) {
  const rb = user.role ? roleBadge[user.role as keyof typeof roleBadge] : null;
  return (
    <TouchableOpacity style={[s.row, !user.is_active && s.rowInactive]} onPress={onPress} activeOpacity={0.7}>
      <View style={{ flex: 1 }}>
        <View style={s.rowTop}>
          <Text style={s.name}>{user.name}</Text>
          {!user.is_active && (
            <View style={s.inactivePill}>
              <Text style={s.inactivePillText}>INACTIVE</Text>
            </View>
          )}
        </View>
        <Text style={s.email}>{user.email}</Text>
      </View>
      {rb && (
        <View style={[s.roleBadge, { backgroundColor: rb.bg, borderColor: rb.border }]}>
          <Text style={[s.roleBadgeText, { color: rb.text }]}>{user.role}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  searchWrap: { padding: theme.pad, paddingBottom: 8 },
  search: {
    backgroundColor: theme.card,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    padding: 14,
    marginBottom: 8,
  },
  rowInactive: { opacity: 0.55 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: theme.text, fontWeight: '600', fontSize: 15 },
  email: { color: theme.textDim, fontSize: 12, marginTop: 2 },
  inactivePill: { backgroundColor: 'rgba(219,57,42,0.12)', borderWidth: 1, borderColor: theme.danger, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
  inactivePillText: { color: theme.danger, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  roleBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  roleBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  empty: { paddingTop: 80, alignItems: 'center' },
  emptyTitle: { color: theme.textDim, fontSize: 16 },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },
});
