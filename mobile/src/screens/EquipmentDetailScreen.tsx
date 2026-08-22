import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useTasks, type TaskRow } from '@/hooks/useTasks';
import { useNameplate, useSaveNameplate } from '@/hooks/useNameplate';
import { NAMEPLATE_FIELDS, type NameplateFieldDef } from '@/lib/nameplateFields';
import { theme, statusColor, statusTextColor } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';
import { useToast } from '@/components/Toast';
import { explainSupabaseError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { ENGINEER_EDITABLE_TEST_STATUSES } from '@testflow/shared';
import { rollUpTaskCounts } from '@/lib/taskProgress';

type Nav = NativeStackNavigationProp<RootStackParamList, 'EquipmentDetail'>;
type R = RouteProp<RootStackParamList, 'EquipmentDetail'>;

type Tab = 'nameplate' | 'testing' | 'review';

const TABS: { id: Tab; label: string; num: number }[] = [
  { id: 'nameplate', label: 'Nameplate Details', num: 1 },
  { id: 'testing', label: 'Testing Parameters', num: 2 },
  { id: 'review', label: 'Review & Submit', num: 3 },
];

const AUTOSAVE_DEBOUNCE_MS = 1500;

export default function EquipmentDetailScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const { userId } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>('nameplate');

  // ── Task data (re-uses cached query from TaskListScreen) ──────────────────
  const q = useTasks(userId, params.projectId);
  const instanceTasks = useMemo(
    () => (q.data ?? []).filter((t) => t.instanceId === params.instanceId),
    [q.data, params.instanceId]
  );

  // ── Nameplate data ────────────────────────────────────────────────────────
  const nameplateQ = useNameplate(params.instanceId);
  const saveNameplateMutation = useSaveNameplate(params.instanceId);
  const [nameplateData, setNameplateData] = useState<Record<string, any>>({});
  const [nameplateDirty, setNameplateDirty] = useState(false);
  const [nameplateSaving, setNameplateSaving] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoad = useRef(true);

  useEffect(() => {
    if (nameplateQ.data && initialLoad.current) {
      setNameplateData(nameplateQ.data);
      setTimeout(() => { initialLoad.current = false; }, 0);
    }
  }, [nameplateQ.data]);

  const handleNameplateChange = useCallback((key: string, value: any) => {
    setNameplateData((prev) => ({ ...prev, [key]: value }));
    setNameplateDirty(true);
  }, []);

  // Autosave nameplate on change
  useEffect(() => {
    if (initialLoad.current || !nameplateDirty) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      setNameplateSaving(true);
      try {
        await saveNameplateMutation.mutateAsync(nameplateData);
        setNameplateDirty(false);
      } catch (e) {
        toast.error(explainSupabaseError(e));
      } finally {
        setNameplateSaving(false);
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
  }, [nameplateData, nameplateDirty]);

  // ── Submit All ────────────────────────────────────────────────────────────
  const [submittingAll, setSubmittingAll] = useState(false);
  const submittable = useMemo(
    () => instanceTasks.filter((t) =>
      (ENGINEER_EDITABLE_TEST_STATUSES as readonly string[]).includes(t.status)
    ),
    [instanceTasks]
  );
  const allDone = instanceTasks.length > 0 &&
    instanceTasks.every((t) => t.status === 'SUBMITTED' || t.status === 'APPROVED');

  const handleSubmitAll = () => {
    if (submittable.length === 0) return;
    Alert.alert(
      'Submit all tests?',
      `This will submit ${submittable.length} test${submittable.length !== 1 ? 's' : ''} for review. Tests without saved data will be skipped.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit All',
          onPress: async () => {
            setSubmittingAll(true);
            try {
              const { error } = await supabase
                .from('test_tasks')
                .update({ status: 'SUBMITTED', submitted_at: new Date().toISOString(), rework_reason: null })
                .in('id', submittable.map((t) => t.id))
                .in('status', ENGINEER_EDITABLE_TEST_STATUSES as unknown as string[]);
              if (error) {
                toast.error(explainSupabaseError(error));
                return;
              }
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              qc.invalidateQueries({ queryKey: ['tasks'] });
              toast.success('All tests submitted for review');
            } finally {
              setSubmittingAll(false);
            }
          },
        },
      ]
    );
  };

  const nameplateFields: NameplateFieldDef[] = NAMEPLATE_FIELDS[params.equipmentType] ?? [];

  // ── Progress ──────────────────────────────────────────────────────────────
  const progress = useMemo(() => rollUpTaskCounts(instanceTasks).pct, [instanceTasks]);

  return (
    <View style={s.root}>
      {/* ── Tab bar ───────────────────────────────────────────────────── */}
      <View style={s.tabBar}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[s.tab, active && s.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <View style={s.tabContent}>
                <View style={[s.tabNum, active && s.tabNumActive]}>
                  <Text style={[s.tabNumText, active && s.tabNumTextActive]}>{tab.num}</Text>
                </View>
                <Text style={[s.tabLabel, active && s.tabLabelActive]} numberOfLines={1}>
                  {tab.label}
                </Text>
              </View>
              {active && <View style={s.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Tab content ───────────────────────────────────────────────── */}
      {activeTab === 'nameplate' && (
        <NameplateTab
          fields={nameplateFields}
          data={nameplateData}
          onChange={handleNameplateChange}
          loading={nameplateQ.isLoading}
          saving={nameplateSaving}
          dirty={nameplateDirty}
          equipmentType={params.equipmentType}
        />
      )}

      {activeTab === 'testing' && (
        <TestingTab
          tasks={instanceTasks}
          loading={q.isLoading}
          onTaskPress={(task) =>
            nav.navigate('TestForm', {
              taskId: task.id,
              templateId: task.templateId,
              instanceLabel: task.instanceLabel,
              testName: task.templateName,
              currentStatus: task.status,
            })
          }
        />
      )}

      {activeTab === 'review' && (
        <ReviewTab
          tasks={instanceTasks}
          progress={progress}
          submittable={submittable}
          submittingAll={submittingAll}
          allDone={allDone}
          onSubmitAll={handleSubmitAll}
        />
      )}
    </View>
  );
}

// ─── Nameplate tab ────────────────────────────────────────────────────────────

function NameplateTab({
  fields,
  data,
  onChange,
  loading,
  saving,
  dirty,
  equipmentType,
}: {
  fields: NameplateFieldDef[];
  data: Record<string, any>;
  onChange: (key: string, value: any) => void;
  loading: boolean;
  saving: boolean;
  dirty: boolean;
  equipmentType: string;
}) {
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  const saveStatus = saving ? 'Saving…' : dirty ? 'Unsaved changes' : 'Saved';

  return (
    <ScrollView
      contentContainerStyle={{ padding: theme.pad, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Equipment Nameplate Information</Text>
        <Text style={[s.saveStatus, dirty && { color: theme.warn }]}>{saveStatus}</Text>
      </View>

      {fields.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyText}>
            No nameplate fields defined for{' '}
            {equipmentType.replace(/_/g, ' ')}.
          </Text>
        </View>
      ) : (
        <View style={s.nameplateGrid}>
          {fields.map((f) => (
            <View key={f.key} style={[s.nameplateCell, f.span === 'full' && s.nameplateCellFull]}>
              <Text style={s.fieldLabel}>
                {f.label}
                {f.unit ? <Text style={s.unit}> ({f.unit})</Text> : null}
              </Text>
              <TextInput
                style={s.input}
                keyboardType={f.type === 'number' ? 'decimal-pad' : 'default'}
                value={data[f.key] !== undefined && data[f.key] !== null ? String(data[f.key]) : ''}
                onChangeText={(t) => {
                  if (f.type === 'number') {
                    const num = parseFloat(t);
                    onChange(f.key, t === '' ? '' : Number.isFinite(num) ? num : t);
                  } else {
                    onChange(f.key, t);
                  }
                }}
                placeholder="—"
                placeholderTextColor={theme.textDim}
              />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Testing parameters tab ───────────────────────────────────────────────────

function TestingTab({
  tasks,
  loading,
  onTaskPress,
}: {
  tasks: TaskRow[];
  loading: boolean;
  onTaskPress: (task: TaskRow) => void;
}) {
  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (tasks.length === 0) {
    return (
      <View style={s.center}>
        <Text style={s.emptyText}>No test tasks for this equipment unit.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={(t) => t.id}
      contentContainerStyle={{ padding: theme.pad }}
      renderItem={({ item }) => <TestTaskCard task={item} onPress={() => onTaskPress(item)} />}
    />
  );
}

const TestTaskCard = memo(function TestTaskCard({
  task,
  onPress,
}: {
  task: TaskRow;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.75} style={s.taskCard} onPress={onPress}>
      <View style={s.taskRow}>
        <Text style={s.taskName}>{task.templateName}</Text>
        <View style={[s.badge, { borderColor: statusColor(task.status) }]}>
          <Text style={[s.badgeText, { color: statusTextColor(task.status) }]}>
            {task.status.replace('_', ' ')}
          </Text>
        </View>
      </View>
      <Text style={s.taskCode}>
        {task.templateCode} · {task.templateTab}
      </Text>
      {task.status === 'REWORK' && task.rework_reason ? (
        <View style={s.reworkBox}>
          <Text style={s.reworkLabel}>REWORK REASON</Text>
          <Text style={s.reworkText}>{task.rework_reason}</Text>
        </View>
      ) : null}
      <Text style={s.taskChevron}>›</Text>
    </TouchableOpacity>
  );
});

// ─── Review & Submit tab ──────────────────────────────────────────────────────

function ReviewTab({
  tasks,
  progress,
  submittable,
  submittingAll,
  allDone,
  onSubmitAll,
}: {
  tasks: TaskRow[];
  progress: number;
  submittable: TaskRow[];
  submittingAll: boolean;
  allDone: boolean;
  onSubmitAll: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={{ padding: theme.pad, paddingBottom: 40 }}>
      {/* Progress */}
      <View style={s.progressCard}>
        <View style={s.progressRow}>
          <Text style={s.progressLabel}>Overall Progress</Text>
          <Text style={[s.progressPct, { color: progress === 100 ? theme.success : theme.primary }]}>
            {progress}%
          </Text>
        </View>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${progress}%` as any }]} />
        </View>
        <Text style={s.progressSub}>
          {tasks.filter((t) => t.status === 'SUBMITTED' || t.status === 'APPROVED').length} of{' '}
          {tasks.length} test{tasks.length !== 1 ? 's' : ''} submitted or approved
        </Text>
      </View>

      {/* Task status list */}
      <Text style={s.reviewSectionTitle}>Test Status</Text>
      {tasks.map((task) => (
        <View key={task.id} style={s.reviewRow}>
          <View style={s.reviewDot}>
            <View style={[s.dot, { backgroundColor: statusColor(task.status) }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.reviewTaskName}>{task.templateName}</Text>
            <Text style={s.reviewTaskCode}>{task.templateCode}</Text>
          </View>
          <View style={[s.badge, { borderColor: statusColor(task.status) }]}>
            <Text style={[s.badgeText, { color: statusTextColor(task.status) }]}>
              {task.status.replace('_', ' ')}
            </Text>
          </View>
        </View>
      ))}

      {/* Submit All */}
      {!allDone && (
        <TouchableOpacity
          style={[s.submitBtn, (submittingAll || submittable.length === 0) && s.submitBtnDisabled]}
          disabled={submittingAll || submittable.length === 0}
          onPress={onSubmitAll}
        >
          {submittingAll ? (
            <ActivityIndicator color={theme.primaryText} />
          ) : (
            <Text style={s.submitBtnText}>
              Submit All ({submittable.length} test{submittable.length !== 1 ? 's' : ''})
            </Text>
          )}
        </TouchableOpacity>
      )}

      {allDone && (
        <View style={s.allDoneCard}>
          <Text style={s.allDoneText}>All tests submitted or approved ✓</Text>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.bg,
  },
  tab: { flex: 1, paddingVertical: 12, paddingHorizontal: 4, position: 'relative' },
  tabActive: {},
  tabContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  tabNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabNumActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  tabNumText: { color: theme.textDim, fontSize: 10, fontWeight: '700' },
  tabNumTextActive: { color: theme.primaryText },
  tabLabel: { color: theme.textDim, fontSize: 11, fontWeight: '600', flexShrink: 1 },
  tabLabelActive: { color: theme.text },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: theme.primary,
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
  },

  // Nameplate tab
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: { color: theme.text, fontWeight: '700', fontSize: 15 },
  saveStatus: { color: theme.textDim, fontSize: 11 },
  nameplateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  nameplateCell: { width: '47%' },
  nameplateCellFull: { width: '100%' },
  fieldLabel: { color: theme.textDim, fontSize: 12, marginBottom: 5 },
  unit: { color: theme.textDim, fontSize: 11 },
  input: {
    backgroundColor: theme.card,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    padding: theme.pad,
    borderWidth: 1,
    borderColor: theme.border,
  },
  emptyText: { color: theme.textDim, lineHeight: 20 },

  // Testing tab
  taskCard: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    padding: theme.pad,
    marginBottom: 10,
    position: 'relative',
  },
  taskRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  taskName: { color: theme.text, fontWeight: '600', fontSize: 14, flex: 1, marginRight: 8 },
  taskCode: { color: theme.textDim, fontSize: 11, marginTop: 4 },
  taskChevron: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    color: theme.textDim,
    fontSize: 20,
  },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
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

  // Review tab
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
  progressPct: { fontSize: 20, fontWeight: '700' },
  progressTrack: { height: 6, backgroundColor: theme.muted, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.primary, borderRadius: 3 },
  progressSub: { color: theme.textDim, fontSize: 12 },
  reviewSectionTitle: {
    color: theme.textDim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  reviewDot: { width: 20, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  reviewTaskName: { color: theme.text, fontSize: 13, fontWeight: '500' },
  reviewTaskCode: { color: theme.textDim, fontSize: 11, marginTop: 1 },
  submitBtn: {
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: theme.primaryText, fontWeight: '700', fontSize: 15 },
  allDoneCard: {
    backgroundColor: 'rgba(46, 158, 99, 0.12)',
    borderWidth: 1,
    borderColor: theme.success,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  allDoneText: { color: theme.success, fontWeight: '600', fontSize: 14 },
});
