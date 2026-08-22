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
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { theme, statusColor } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type R = RouteProp<RootStackParamList, 'ProjectOverview'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'ProjectOverview'>;

type InstanceSummary = {
  id: string;
  label: string;
  equipment_type: string;
  totalTasks: number;
  submittedOrApproved: number;
};

type ProjectDetail = {
  project_number: string;
  site_name: string;
  client: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  instances: InstanceSummary[];
};

async function fetchProjectDetail(projectId: string): Promise<ProjectDetail> {
  const [projectRes, instancesRes] = await Promise.all([
    supabase
      .from('projects')
      .select('project_number, site_name, client, status, start_date, end_date')
      .eq('id', projectId)
      .single(),
    supabase
      .from('equipment_instances')
      .select('id, label, equipment_type')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('seq_number'),
  ]);
  if (projectRes.error) throw projectRes.error;
  if (!instancesRes.data?.length) {
    return { ...projectRes.data as any, instances: [] };
  }

  const instanceIds = instancesRes.data.map((i: any) => i.id);
  const { data: tasks } = await supabase
    .from('test_tasks')
    .select('equipment_instance_id, status')
    .in('equipment_instance_id', instanceIds);

  const tasksByInstance: Record<string, { total: number; done: number }> = {};
  for (const t of tasks ?? []) {
    const entry = tasksByInstance[t.equipment_instance_id] ?? { total: 0, done: 0 };
    entry.total++;
    if (t.status === 'SUBMITTED' || t.status === 'APPROVED') entry.done++;
    tasksByInstance[t.equipment_instance_id] = entry;
  }

  const instances: InstanceSummary[] = instancesRes.data.map((i: any) => ({
    id: i.id,
    label: i.label,
    equipment_type: i.equipment_type,
    totalTasks: tasksByInstance[i.id]?.total ?? 0,
    submittedOrApproved: tasksByInstance[i.id]?.done ?? 0,
  }));

  return { ...(projectRes.data as any), instances };
}

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ProjectOverviewScreen() {
  const { params } = useRoute<R>();
  const nav = useNavigation<Nav>();
  const { role } = useAuth();
  const q = useQuery({
    queryKey: ['project-overview', params.projectId],
    queryFn: () => fetchProjectDetail(params.projectId),
  });
  const [filter, setFilter] = useState('');
  const filteredInstances = useMemo(() => {
    const instances = q.data?.instances ?? [];
    const query = filter.trim().toLowerCase();
    if (!query) return instances;
    return instances.filter(
      (inst) =>
        inst.label.toLowerCase().includes(query) ||
        inst.equipment_type.toLowerCase().replace(/_/g, ' ').includes(query)
    );
  }, [q.data?.instances, filter]);

  if (q.isLoading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  const data = q.data;
  if (!data) return null;

  const sc = statusColor(data.status);
  const totalTasks = data.instances.reduce((a, i) => a + i.totalTasks, 0);
  const doneTasks = data.instances.reduce((a, i) => a + i.submittedOrApproved, 0);
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <FlatList
      style={s.root}
      contentContainerStyle={{ padding: theme.pad, paddingBottom: 40 }}
      data={filteredInstances}
      keyExtractor={(inst) => inst.id}
      refreshControl={
        <RefreshControl refreshing={q.isFetching && !q.isLoading} onRefresh={() => q.refetch()} tintColor={theme.primary} />
      }
      ListHeaderComponent={
        <>
          {/* Project info card */}
          <View style={s.infoCard}>
            <View style={s.infoRow}>
              <Text style={s.projectNum}>{data.project_number}</Text>
              <View style={[s.badge, { borderColor: sc }]}>
                <Text style={[s.badgeText, { color: sc }]}>{data.status}</Text>
              </View>
            </View>
            <Text style={s.siteName}>{data.site_name}</Text>
            {data.client ? <Text style={s.client}>{data.client}</Text> : null}
            <View style={s.divider} />
            <View style={s.datesRow}>
              <View>
                <Text style={s.dateLabel}>Start Date</Text>
                <Text style={s.dateVal}>{fmt(data.start_date)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.dateLabel}>End Date</Text>
                <Text style={s.dateVal}>{fmt(data.end_date)}</Text>
              </View>
            </View>
          </View>

          {/* Action buttons — role gated */}
          {(role === 'GM' || role === 'SUPERADMIN' || role === 'SUPERVISOR') && (
            <View style={s.actionsRow}>
              {(role === 'GM' || role === 'SUPERADMIN') && (
                <>
                  <ActionButton
                    label="Edit Project"
                    onPress={() => nav.navigate('EditProject', { projectId: params.projectId, projectNumber: params.projectNumber })}
                  />
                  <ActionButton
                    label="Manage Scope"
                    onPress={() => nav.navigate('ScopeManagement', { projectId: params.projectId, projectNumber: params.projectNumber })}
                    disabled={data.status === 'CLOSED'}
                  />
                  <ActionButton
                    label="Tests & Generate"
                    onPress={() => nav.navigate('TestingScope', { projectId: params.projectId, projectNumber: params.projectNumber })}
                    disabled={data.status === 'CLOSED'}
                  />
                  <ActionButton
                    label="Assign Supervisor"
                    onPress={() => nav.navigate('AssignSupervisor', { projectId: params.projectId, projectNumber: params.projectNumber })}
                  />
                </>
              )}
              <ActionButton
                label="Assign Engineers"
                onPress={() => nav.navigate('EngineerAssignment', { projectId: params.projectId, projectNumber: params.projectNumber })}
              />
              <ActionButton
                label="View Report"
                onPress={() => nav.navigate('ReportDetail', { projectId: params.projectId, projectNumber: params.projectNumber })}
              />
            </View>
          )}

          {/* Overall progress */}
          <View style={s.progressCard}>
            <View style={s.progressRow}>
              <Text style={s.progressLabel}>Overall Progress</Text>
              <Text style={[s.progressPct, { color: pct === 100 ? theme.success : theme.primary }]}>
                {pct}%
              </Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: pct === 100 ? theme.success : theme.primary }]} />
            </View>
            <Text style={s.progressSub}>
              {doneTasks} / {totalTasks} tests submitted or approved
            </Text>
          </View>

          <Text style={s.sectionTitle}>EQUIPMENT UNITS ({data.instances.length})</Text>

          {data.instances.length > 0 && (
            <TextInput
              style={s.filterInput}
              value={filter}
              onChangeText={setFilter}
              placeholder="Filter by label or type…"
              placeholderTextColor={theme.textDim}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          )}

          {data.instances.length === 0 && (
            <Text style={s.emptyText}>No equipment instances generated yet.</Text>
          )}
          {data.instances.length > 0 && filteredInstances.length === 0 && (
            <Text style={s.emptyText}>No equipment units match "{filter}".</Text>
          )}
        </>
      }
      renderItem={({ item: inst }) => {
        const instPct = inst.totalTasks > 0
          ? Math.round((inst.submittedOrApproved / inst.totalTasks) * 100)
          : 0;
        const allDone = inst.totalTasks > 0 && inst.submittedOrApproved === inst.totalTasks;
        return (
          <View style={s.instanceRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.instanceLabel}>{inst.label}</Text>
              <Text style={s.instanceType}>{inst.equipment_type.replace(/_/g, ' ')}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[s.instPct, { color: allDone ? theme.success : theme.text }]}>
                {instPct}%
              </Text>
              <Text style={s.instCount}>
                {inst.submittedOrApproved}/{inst.totalTasks}
              </Text>
            </View>
          </View>
        );
      }}
    />
  );
}

function ActionButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      style={[s.actionBtn, disabled && s.actionBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={s.actionBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  infoCard: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: theme.pad,
    marginBottom: 12,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  projectNum: { color: theme.text, fontWeight: '700', fontSize: 20 },
  siteName: { color: theme.textDim, fontSize: 14, marginTop: 4 },
  client: { color: theme.textDim, fontSize: 13, marginTop: 2 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: theme.border, marginVertical: 12 },
  datesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dateLabel: { color: theme.textDim, fontSize: 11 },
  dateVal: { color: theme.text, fontSize: 13, fontWeight: '600', marginTop: 2 },
  progressCard: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: theme.pad,
    marginBottom: 20,
    gap: 8,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: theme.text, fontWeight: '600' },
  progressPct: { fontSize: 22, fontWeight: '700' },
  progressTrack: { height: 6, backgroundColor: theme.muted, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressSub: { color: theme.textDim, fontSize: 12 },
  sectionTitle: {
    color: theme.textDim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  filterInput: {
    backgroundColor: theme.card,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    marginBottom: 12,
  },
  instanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  instanceLabel: { color: theme.text, fontWeight: '600', fontSize: 14 },
  instanceType: { color: theme.textDim, fontSize: 12, marginTop: 2 },
  instPct: { fontSize: 16, fontWeight: '700' },
  instCount: { color: theme.textDim, fontSize: 11, marginTop: 1 },
  emptyText: { color: theme.textDim },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  actionBtn: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  actionBtnDisabled: { opacity: 0.35 },
  actionBtnText: { color: theme.primary, fontWeight: '600', fontSize: 13 },
});
