import React, { memo, useMemo, useRef, useState } from 'react';
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
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useProjects, type Project } from '@/hooks/useProjects';
import { theme, statusColor } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';
import { useToast } from '@/components/Toast';
import { explainSupabaseError } from '@/lib/errors';
import { useRealtimeChannel, usePollingFallback } from '@/lib/realtime';
import { PROJECT_STATUS_RANK } from '@testflow/shared';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Projects'>;

const SORTS = [
  { key: 'recent', label: 'Recent' },
  { key: 'active', label: 'Active first' },
  { key: 'number', label: 'Project #' },
] as const;
type SortKey = (typeof SORTS)[number]['key'];

const STATUS_RANK = PROJECT_STATUS_RANK as Record<string, number>;

export default function ProjectListScreen() {
  const nav = useNavigation<Nav>();
  const { userId, profile } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useProjects(userId);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');

  React.useEffect(() => {
    if (q.error) toast.error(explainSupabaseError(q.error));
  }, [q.error, toast]);

  // Realtime sync — mirror the web app: listen for new assignments and project
  // status changes. Suffix channel name with userId so multiple devices don't collide.
  const invalidateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedInvalidate = () => {
    if (invalidateTimer.current) clearTimeout(invalidateTimer.current);
    invalidateTimer.current = setTimeout(() => {
      qc.invalidateQueries({ queryKey: ['projects'] });
    }, 800);
  };

  useRealtimeChannel(
    `mobile:projects:${userId ?? 'anon'}`,
    (channel) => {
      if (!userId) return;
      channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'test_tasks',
            filter: `assigned_to=eq.${userId}`,
          },
          debouncedInvalidate
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'projects' },
          debouncedInvalidate
        );
    },
    [userId]
  );

  usePollingFallback(() => qc.invalidateQueries({ queryKey: ['projects'] }), 30_000);

  const projects = q.data ?? [];

  const visible = useMemo(() => {
    const s = search.trim().toLowerCase();
    let list: Project[] = s
      ? projects.filter(
          (p) =>
            p.project_number.toLowerCase().includes(s) ||
            p.site_name.toLowerCase().includes(s) ||
            (p.client ?? '').toLowerCase().includes(s)
        )
      : [...projects];

    if (sort === 'active') {
      list.sort((a, b) => {
        const ra = STATUS_RANK[a.status] ?? 9;
        const rb = STATUS_RANK[b.status] ?? 9;
        if (ra !== rb) return ra - rb;
        return (b.start_date ?? '').localeCompare(a.start_date ?? '');
      });
    } else if (sort === 'number') {
      list.sort((a, b) => a.project_number.localeCompare(b.project_number));
    } else {
      list.sort((a, b) => (b.start_date ?? '').localeCompare(a.start_date ?? ''));
    }
    return list;
  }, [projects, search, sort]);

  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>My Projects</Text>
          <Text style={s.subtitle}>
            {profile?.full_name ? `Hi, ${profile.full_name.split(' ')[0]} · ` : ''}
            {projects.length} assigned
          </Text>
        </View>
        <TouchableOpacity onPress={() => nav.navigate('Profile')} style={s.avatar}>
          <Text style={s.avatarText}>
            {(profile?.full_name ?? 'U')
              .split(' ')
              .map((p) => p[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={s.searchWrap}>
        <TextInput
          style={s.search}
          placeholder="Search project #, site, client"
          placeholderTextColor={theme.textDim}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        <View style={s.sortRow}>
          {SORTS.map((opt) => {
            const active = sort === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[s.sortChip, active && s.sortChipActive]}
                onPress={() => setSort(opt.key)}
              >
                <Text style={[s.sortText, active && s.sortTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {q.isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={keyExtractor}
          extraData={`${visible.length}`}
          contentContainerStyle={{ padding: theme.pad, paddingTop: 4 }}
          refreshControl={
            <RefreshControl
              refreshing={q.isFetching && !q.isLoading}
              onRefresh={() => q.refetch()}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📋</Text>
              <Text style={s.emptyTitle}>
                {search ? 'No matches' : 'Nothing assigned yet'}
              </Text>
              <Text style={s.emptyBody}>
                {search
                  ? 'Try a different search term.'
                  : "Your supervisor hasn't assigned any test tasks. Pull to refresh."}
              </Text>
            </View>
          }
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={11}
          removeClippedSubviews
          renderItem={({ item }) => (
            <ProjectRow
              item={item}
              onPress={() =>
                nav.navigate('Tasks', {
                  projectId: item.id,
                  projectNumber: item.project_number,
                })
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const keyExtractor = (p: Project) => p.id;

const ProjectRow = memo(function ProjectRow({
  item,
  onPress,
}: {
  item: Project;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.7} style={s.card} onPress={onPress}>
      <View style={s.row}>
        <Text style={s.num}>{item.project_number}</Text>
        <View style={[s.badge, { borderColor: statusColor(item.status) }]}>
          <Text style={[s.badgeText, { color: statusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={s.site} numberOfLines={1}>
        {item.site_name}
      </Text>
      {item.client ? (
        <Text style={s.client} numberOfLines={1}>
          {item.client}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.pad,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: { color: theme.text, fontSize: 26, fontWeight: '800' },
  subtitle: { color: theme.textDim, marginTop: 2, fontSize: 13 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: theme.primary, fontWeight: '800' },
  searchWrap: { paddingHorizontal: theme.pad, marginTop: 12 },
  search: {
    backgroundColor: theme.card,
    color: theme.text,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sortRow: { flexDirection: 'row', marginTop: 10, marginBottom: 8 },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    marginRight: 8,
  },
  sortChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  sortText: { color: theme.textDim, fontSize: 12, fontWeight: '600' },
  sortTextActive: { color: theme.primaryText },
  card: {
    backgroundColor: theme.card,
    padding: theme.pad,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  num: { color: theme.text, fontWeight: '700', fontSize: 16 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  site: { color: theme.text, marginTop: 6 },
  client: { color: theme.textDim, marginTop: 2, fontSize: 12 },
  empty: { paddingTop: 80, alignItems: 'center' },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { color: theme.text, fontSize: 16, fontWeight: '600' },
  emptyBody: { color: theme.textDim, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
});
