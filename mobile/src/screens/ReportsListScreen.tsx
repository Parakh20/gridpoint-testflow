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
import { useReportProjects } from '@/hooks/useReports';
import { theme, statusColor } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Reports'>;

export default function ReportsListScreen() {
  const nav = useNavigation<Nav>();
  const q = useReportProjects();
  const [search, setSearch] = useState('');

  const projects = q.data ?? [];
  const visible = useMemo(() => {
    const s2 = search.toLowerCase();
    if (!s2) return projects;
    return projects.filter(
      (p) =>
        p.project_number.toLowerCase().includes(s2) ||
        p.site_name.toLowerCase().includes(s2) ||
        (p.client ?? '').toLowerCase().includes(s2)
    );
  }, [projects, search]);

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
          placeholder="Search projects…"
          placeholderTextColor={theme.textDim}
        />
      </View>
      <FlatList
        data={visible}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: theme.pad, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={q.isFetching && !q.isLoading} onRefresh={() => q.refetch()} tintColor={theme.primary} />
        }
        ListEmptyComponent={<Text style={s.empty}>No projects found.</Text>}
        renderItem={({ item }) => {
          const sc = statusColor(item.status);
          return (
            <TouchableOpacity
              style={s.card}
              activeOpacity={0.75}
              onPress={() =>
                nav.navigate('ReportDetail', { projectId: item.id, projectNumber: item.project_number })
              }
            >
              <View style={{ flex: 1 }}>
                <View style={s.cardTop}>
                  <Text style={s.projectNum}>{item.project_number}</Text>
                  <View style={[s.badge, { borderColor: sc }]}>
                    <Text style={[s.badgeText, { color: sc }]}>{item.status}</Text>
                  </View>
                </View>
                <Text style={s.siteName}>{item.site_name}</Text>
                {item.client ? <Text style={s.client}>{item.client}</Text> : null}
              </View>
              <Text style={s.chev}>›</Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    padding: theme.pad,
    marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  projectNum: { color: theme.text, fontWeight: '700', fontSize: 15 },
  siteName: { color: theme.textDim, fontSize: 13, marginTop: 3 },
  client: { color: theme.textDim, fontSize: 12, marginTop: 1 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  chev: { color: theme.textDim, fontSize: 26, marginLeft: 8 },
  empty: { color: theme.textDim, textAlign: 'center', paddingTop: 40 },
});
