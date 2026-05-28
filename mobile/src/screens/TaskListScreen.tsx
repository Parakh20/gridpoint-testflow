import React, { memo, useEffect, useMemo, useRef } from 'react';
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

type InstanceGroup = {
  instanceId: string;
  instanceLabel: string;
  equipmentType: string;
  tasks: TaskRow[];
  totalCount: number;
  doneCount: number;
  hasRework: boolean;
};

export default function TaskListScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const { userId } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useTasks(userId, params.projectId);

  useEffect(() => {
    if (q.error) toast.error(explainSupabaseError(q.error));
  }, [q.error, toast]);

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
        { event: '*', schema: 'public', table: 'test_tasks', filter: `assigned_to=eq.${userId}` },
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

  // Group tasks by equipment instance
  const instanceGroups = useMemo<InstanceGroup[]>(() => {
    const map = new Map<string, InstanceGroup>();
    for (const task of rows) {
      const existing = map.get(task.instanceId);
      if (existing) {
        existing.tasks.push(task);
        existing.totalCount++;
        if (task.status === 'SUBMITTED' || task.status === 'APPROVED') existing.doneCount++;
        if (task.status === 'REWORK') existing.hasRework = true;
      } else {
        map.set(task.instanceId, {
          instanceId: task.instanceId,
          instanceLabel: task.instanceLabel,
          equipmentType: task.equipmentType,
          tasks: [task],
          totalCount: 1,
          doneCount: task.status === 'SUBMITTED' || task.status === 'APPROVED' ? 1 : 0,
          hasRework: task.status === 'REWORK',
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.instanceLabel.localeCompare(b.instanceLabel)
    );
  }, [rows]);

  const overallProgress = useMemo(() => {
    if (rows.length === 0) return 0;
    const done = rows.filter((r) => r.status === 'SUBMITTED' || r.status === 'APPROVED').length;
    return Math.round((done / rows.length) * 100);
  }, [rows]);

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
        <Text style={s.subtitle}>
          {instanceGroups.length} equipment unit{instanceGroups.length !== 1 ? 's' : ''} ·{' '}
          {rows.length} tests assigned
        </Text>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${overallProgress}%` as any }]} />
        </View>
        <Text style={s.progressLabel}>{overallProgress}% submitted or approved</Text>
      </View>

      <FlatList
        data={instanceGroups}
        keyExtractor={(g) => g.instanceId}
        contentContainerStyle={{ padding: theme.pad, paddingTop: 8 }}
        refreshControl={
          <RefreshControl
            refreshing={q.isFetching && !q.isLoading}
            onRefresh={() => q.refetch()}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No tasks assigned</Text>
            <Text style={s.emptyBody}>Your supervisor hasn't assigned any tests yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <InstanceCard
            group={item}
            onPress={() =>
              nav.navigate('EquipmentDetail', {
                instanceId: item.instanceId,
                instanceLabel: item.instanceLabel,
                equipmentType: item.equipmentType,
                projectId: params.projectId,
              })
            }
          />
        )}
      />
    </View>
  );
}

const InstanceCard = memo(function InstanceCard({
  group,
  onPress,
}: {
  group: InstanceGroup;
  onPress: () => void;
}) {
  const pct = group.totalCount > 0 ? Math.round((group.doneCount / group.totalCount) * 100) : 0;
  const allDone = group.doneCount === group.totalCount && group.totalCount > 0;

  return (
    <TouchableOpacity activeOpacity={0.75} style={s.card} onPress={onPress}>
      <View style={s.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardLabel}>{group.instanceLabel}</Text>
          <Text style={s.cardType}>{group.equipmentType.replace(/_/g, ' ')}</Text>
        </View>
        <View style={s.cardRight}>
          <Text style={[s.pctText, { color: allDone ? theme.success : theme.primary }]}>
            {pct}%
          </Text>
          <Text style={s.countText}>
            {group.doneCount}/{group.totalCount} tests
          </Text>
        </View>
      </View>

      <View style={s.miniTrack}>
        <View style={[s.miniFill, { width: `${pct}%` as any, backgroundColor: allDone ? theme.success : theme.primary }]} />
      </View>

      {group.hasRework && (
        <View style={s.reworkPill}>
          <Text style={s.reworkPillText}>REWORK REQUIRED</Text>
        </View>
      )}

      <Text style={s.chevron}>›</Text>
    </TouchableOpacity>
  );
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { padding: theme.pad, paddingBottom: 8 },
  title: { color: theme.text, fontSize: 22, fontWeight: '700' },
  subtitle: { color: theme.textDim, marginTop: 2, fontSize: 13 },
  progressTrack: { height: 5, backgroundColor: theme.card, borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.primary },
  progressLabel: { color: theme.textDim, fontSize: 11, marginTop: 4 },
  card: {
    backgroundColor: theme.card,
    padding: theme.pad,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 10,
    position: 'relative',
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardLabel: { color: theme.text, fontWeight: '700', fontSize: 16 },
  cardType: { color: theme.textDim, fontSize: 12, marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  pctText: { fontSize: 18, fontWeight: '700' },
  countText: { color: theme.textDim, fontSize: 11, marginTop: 1 },
  miniTrack: { height: 4, backgroundColor: theme.muted, borderRadius: 2, overflow: 'hidden' },
  miniFill: { height: '100%', borderRadius: 2 },
  reworkPill: {
    marginTop: 10,
    backgroundColor: 'rgba(219, 57, 42, 0.12)',
    borderWidth: 1,
    borderColor: theme.danger,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  reworkPillText: { color: theme.danger, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  chevron: { position: 'absolute', right: 14, top: '50%', color: theme.textDim, fontSize: 24 },
  empty: { paddingTop: 80, alignItems: 'center' },
  emptyTitle: { color: theme.text, fontSize: 16, fontWeight: '600' },
  emptyBody: { color: theme.textDim, marginTop: 8, textAlign: 'center' },
});
