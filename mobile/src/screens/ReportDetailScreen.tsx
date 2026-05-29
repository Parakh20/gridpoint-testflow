import React, { useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useReportDetail, type ReportTask } from '@/hooks/useReports';
import { theme, statusColor } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type R = RouteProp<RootStackParamList, 'ReportDetail'>;

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function passFailStyle(v: string | null) {
  if (v === 'PASS') return { color: theme.success, label: 'PASS' };
  if (v === 'FAIL') return { color: theme.danger, label: 'FAIL' };
  if (v) return { color: theme.warn, label: v };
  return null;
}

export default function ReportDetailScreen() {
  const { params } = useRoute<R>();
  const q = useReportDetail(params.projectId);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  if (q.isLoading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }
  if (q.error || !q.data) {
    return (
      <View style={[s.root, s.center]}>
        <Text style={s.dim}>Failed to load report.</Text>
      </View>
    );
  }

  const { project, stats, groups } = q.data;
  const sc = statusColor(project.status);
  const pct = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{ padding: theme.pad, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={q.isFetching && !q.isLoading} onRefresh={() => q.refetch()} tintColor={theme.primary} />
      }
    >
      {/* Project info */}
      <View style={s.card}>
        <View style={s.rowBetween}>
          <Text style={s.projectNum}>{project.project_number}</Text>
          <View style={[s.badge, { borderColor: sc }]}>
            <Text style={[s.badgeText, { color: sc }]}>{project.status}</Text>
          </View>
        </View>
        <Text style={s.siteName}>{project.site_name}</Text>
        {project.site_address ? <Text style={s.dim}>{project.site_address}</Text> : null}
        <View style={s.divider} />
        <KV k="Client" v={project.client ?? '—'} />
        <KV k="Manager" v={project.managerName ?? '—'} />
        <KV k="Start" v={fmt(project.start_date)} />
        <KV k="End" v={fmt(project.end_date)} />
      </View>

      {/* Progress */}
      <View style={s.card}>
        <View style={s.rowBetween}>
          <Text style={s.cardTitle}>Approved</Text>
          <Text style={[s.pct, { color: pct === 100 ? theme.success : theme.primary }]}>{pct}%</Text>
        </View>
        <View style={s.track}>
          <View style={[s.fill, { width: `${pct}%` as any, backgroundColor: pct === 100 ? theme.success : theme.primary }]} />
        </View>
        <View style={s.statsRow}>
          <Stat label="Total" value={stats.total} />
          <Stat label="Approved" value={stats.approved} color={theme.success} />
          <Stat label="Submitted" value={stats.submitted} color={theme.primary} />
          <Stat label="In Prog" value={stats.inProgress} color={theme.warn} />
          <Stat label="Draft" value={stats.draft} color={theme.textDim} />
        </View>
      </View>

      <Text style={s.sectionTitle}>EQUIPMENT ({groups.length})</Text>
      {groups.length === 0 ? (
        <Text style={s.dim}>No equipment generated for this project yet.</Text>
      ) : (
        groups.map((g) => {
          const isOpen = expanded.has(g.instanceId);
          const done = g.tasks.filter((t) => t.status === 'APPROVED').length;
          const nameplateEntries = Object.entries(g.nameplate).filter(([, v]) => v !== null && v !== '');
          return (
            <View key={g.instanceId} style={s.group}>
              <TouchableOpacity style={s.groupHeader} onPress={() => toggle(g.instanceId)} activeOpacity={0.7}>
                <View style={{ flex: 1 }}>
                  <Text style={s.groupTitle}>{g.label}</Text>
                  <Text style={s.dim}>{g.equipmentType.replace(/_/g, ' ')}</Text>
                </View>
                <Text style={s.groupCount}>{done}/{g.tasks.length}</Text>
                <Text style={s.chev}>{isOpen ? '⌄' : '›'}</Text>
              </TouchableOpacity>

              {isOpen && (
                <View style={s.groupBody}>
                  {nameplateEntries.length > 0 && (
                    <View style={s.nameplateBox}>
                      <Text style={s.nameplateTitle}>NAMEPLATE</Text>
                      {nameplateEntries.map(([k, v]) => (
                        <KV key={k} k={prettyKey(k)} v={String(v)} small />
                      ))}
                    </View>
                  )}
                  {g.tasks.map((t) => (
                    <TaskCard key={t.id} task={t} />
                  ))}
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function TaskCard({ task }: { task: ReportTask }) {
  const tsc = statusColor(task.status);
  const pf = passFailStyle(task.passFail);
  const payloadEntries = Object.entries(task.payload).filter(([, v]) => v !== null && v !== '' && typeof v !== 'object');
  return (
    <View style={s.taskCard}>
      <View style={s.rowBetween}>
        <Text style={s.taskName}>{task.testName}</Text>
        <View style={[s.statusPill, { borderColor: tsc }]}>
          <Text style={[s.statusPillText, { color: tsc }]}>{task.status}</Text>
        </View>
      </View>
      <Text style={s.dim}>{task.testCode}{task.engineerName ? ` · ${task.engineerName}` : ''}</Text>

      {pf && (
        <View style={s.pfRow}>
          <Text style={[s.pfText, { color: pf.color }]}>● {pf.label}</Text>
        </View>
      )}
      {payloadEntries.length > 0 && (
        <View style={s.payloadBox}>
          {payloadEntries.map(([k, v]) => (
            <KV key={k} k={prettyKey(k)} v={String(v)} small />
          ))}
        </View>
      )}
      {task.remarks ? <Text style={s.remarks}>“{task.remarks}”</Text> : null}
      {task.reworkReason ? <Text style={s.rework}>Rework: {task.reworkReason}</Text> : null}
      {payloadEntries.length === 0 && !pf && !task.remarks ? (
        <Text style={s.dimSmall}>No data recorded.</Text>
      ) : null}
    </View>
  );
}

function KV({ k, v, small }: { k: string; v: string; small?: boolean }) {
  return (
    <View style={s.kvRow}>
      <Text style={[s.kvKey, small && s.kvKeySmall]}>{k}</Text>
      <Text style={[s.kvVal, small && s.kvValSmall]}>{v}</Text>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View style={s.stat}>
      <Text style={[s.statValue, color ? { color } : null]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function prettyKey(k: string) {
  return k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  dim: { color: theme.textDim, fontSize: 13 },
  dimSmall: { color: theme.textDim, fontSize: 12, fontStyle: 'italic' },
  card: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: theme.radius, padding: theme.pad, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  projectNum: { color: theme.text, fontWeight: '700', fontSize: 18 },
  siteName: { color: theme.text, fontSize: 14, marginTop: 4 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: theme.border, marginVertical: 10 },
  cardTitle: { color: theme.text, fontWeight: '600' },
  pct: { fontSize: 20, fontWeight: '700' },
  track: { height: 6, backgroundColor: theme.muted, borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  fill: { height: '100%', borderRadius: 3 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { color: theme.text, fontSize: 17, fontWeight: '700' },
  statLabel: { color: theme.textDim, fontSize: 10, marginTop: 2 },
  sectionTitle: { color: theme.textDim, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },
  group: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: theme.radius, marginBottom: 10, overflow: 'hidden' },
  groupHeader: { flexDirection: 'row', alignItems: 'center', padding: theme.pad, gap: 8 },
  groupTitle: { color: theme.text, fontWeight: '700', fontSize: 15 },
  groupCount: { color: theme.textDim, fontSize: 13, fontWeight: '600' },
  chev: { color: theme.textDim, fontSize: 18, width: 16, textAlign: 'center' },
  groupBody: { paddingHorizontal: theme.pad, paddingBottom: theme.pad, gap: 8 },
  nameplateBox: { backgroundColor: theme.muted, borderRadius: 8, padding: 10, marginBottom: 4 },
  nameplateTitle: { color: theme.textDim, fontSize: 10, fontWeight: '700', letterSpacing: 0.6, marginBottom: 6 },
  taskCard: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 10 },
  taskName: { color: theme.text, fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  statusPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  statusPillText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
  pfRow: { marginTop: 6 },
  pfText: { fontSize: 12, fontWeight: '700' },
  payloadBox: { marginTop: 8, gap: 2 },
  remarks: { color: theme.textDim, fontSize: 12, fontStyle: 'italic', marginTop: 6 },
  rework: { color: theme.warn, fontSize: 12, marginTop: 6 },
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, gap: 12 },
  kvKey: { color: theme.textDim, fontSize: 13, flexShrink: 1 },
  kvKeySmall: { fontSize: 12 },
  kvVal: { color: theme.text, fontSize: 13, fontWeight: '500', textAlign: 'right', flexShrink: 1 },
  kvValSmall: { fontSize: 12 },
});
