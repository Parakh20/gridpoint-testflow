import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useTasks, type TaskRow } from '@/hooks/useTasks';
import { theme, statusColor } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';
import { useToast } from '@/components/Toast';
import { explainSupabaseError } from '@/lib/errors';
import { useRealtimeChannel, usePollingFallback } from '@/lib/realtime';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Tasks'>;
type R = RouteProp<RootStackParamList, 'Tasks'>;

const FILTERS = ['ALL', 'DRAFT', 'IN_PROGRESS', 'REWORK', 'SUBMITTED', 'APPROVED'] as const;
type Filter = (typeof FILTERS)[number];

export default function TaskListScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const { userId } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useTasks(userId, params.projectId);

  const [filter, setFilter] = useState<Filter>('ALL');

  useEffect(() => {
    if (q.error) toast.error(explainSupabaseError(q.error));
  }, [q.error, toast]);

  // Realtime: supervisor approving / sending back / re-assigning shows up here
  // within seconds. Debounced so a burst of changes coalesces.
  const invalidateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedInvalidate = () => {
    if (invalidateTimer.current) clearTimeout(invalidateTimer.current);
    invalidateTimer.current = setTimeout(() => {
      qc.invalidateQueries({ queryKey: ['tasks', userId ?? ''] });
    }, 800);
  };

  useRealtimeChannel(
    `mobile:tasks:${userId ?? 'anon'}:${params.projectId}`,
    (channel) => {
      if (!userId) return;
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'test_tasks',
          filter: `assigned_to=eq.${userId}`,
        },
        debouncedInvalidate
      );
    },
    [userId, params.projectId]
  );

  usePollingFallback(
    () => qc.invalidateQueries({ queryKey: ['tasks', userId ?? ''] }),
    30_000
  );

  const rows = q.data ?? [];

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const progress = useMemo(() => {
    if (rows.length === 0) return 0;
    const done = rows.filter((r) => r.status === 'APPROVED' || r.status === 'SUBMITTED').length;
    return Math.round((done / rows.length) * 100);
  }, [rows]);

  const visible = useMemo(
    () => (filter === 'ALL' ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter]
  );

  if (q.isLoading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>{params.projectNumber}</Text>
        <Text style={s.subtitle}>{rows.length} tests assigned to you</Text>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={s.progressLabel}>{progress}% submitted or approved</Text>
      </View>

      <View style={s.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[s.chip, active && s.chipActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>
                  {f.replace('_', ' ')}
                  {counts[f] ? ` · ${counts[f]}` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={visible}
        keyExtractor={taskKey}
        extraData={filter}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={11}
        removeClippedSubviews
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
            <Text style={s.emptyTitle}>No tasks</Text>
            <Text style={s.emptyBody}>Nothing matches this filter.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TaskRowCard
            item={item}
            onPress={() =>
              nav.navigate('TestForm', {
                taskId: item.id,
                templateId: item.templateId,
                instanceLabel: item.instanceLabel,
                testName: item.templateName,
                currentStatus: item.status,
              })
            }
          />
        )}
      />
    </View>
  );
}

const taskKey = (r: TaskRow) => r.id;

const TaskRowCard = memo(function TaskRowCard({
  item,
  onPress,
}: {
  item: TaskRow;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.7} style={s.card} onPress={onPress}>
      <View style={s.row}>
        <Text style={s.label}>{item.instanceLabel}</Text>
        <View style={[s.badge, { borderColor: statusColor(item.status) }]}>
          <Text style={[s.badgeText, { color: statusColor(item.status) }]}>
            {item.status.replace('_', ' ')}
          </Text>
        </View>
      </View>
      <Text style={s.test}>{item.templateName}</Text>
      <Text style={s.code}>
        {item.templateCode} · {item.templateTab}
      </Text>
      {item.status === 'REWORK' && item.rework_reason ? (
        <View style={s.reworkBox}>
          <Text style={s.reworkLabel}>REWORK REASON</Text>
          <Text style={s.reworkText}>{item.rework_reason}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { padding: theme.pad, paddingBottom: 8 },
  title: { color: theme.text, fontSize: 22, fontWeight: '700' },
  subtitle: { color: theme.textDim, marginTop: 2 },
  progressTrack: {
    height: 6,
    backgroundColor: theme.card,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: theme.primary },
  progressLabel: { color: theme.textDim, fontSize: 11, marginTop: 4 },
  filterBar: { paddingLeft: theme.pad, paddingBottom: 10 },
  chip: {
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 8,
  },
  chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipText: { color: theme.textDim, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: theme.primaryText },
  card: {
    backgroundColor: theme.card,
    padding: theme.pad,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: theme.text, fontWeight: '700', fontSize: 14 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  test: { color: theme.text, marginTop: 6, fontSize: 15 },
  code: { color: theme.textDim, fontSize: 11, marginTop: 2 },
  reworkBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: theme.danger,
    padding: 10,
    marginTop: 10,
    borderRadius: 4,
  },
  reworkLabel: { color: theme.danger, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  reworkText: { color: theme.text, marginTop: 4, fontSize: 13 },
  empty: { paddingTop: 80, alignItems: 'center' },
  emptyTitle: { color: theme.text, fontSize: 16, fontWeight: '600' },
  emptyBody: { color: theme.textDim, marginTop: 8 },
});
