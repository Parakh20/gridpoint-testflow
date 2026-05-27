import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useSupProjects, usePendingReviews, useReviewTask, type SupProject, type PendingReview } from '@/hooks/useSupervisor';
import { theme, statusColor } from '@/theme';
import { useToast } from '@/components/Toast';
import { explainSupabaseError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SupervisorHome'>;
type Tab = 'projects' | 'reviews';

export default function SupervisorHomeScreen() {
  const nav = useNavigation<Nav>();
  const { userId } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('reviews');

  const projectsQ = useSupProjects(userId);
  const reviewsQ = usePendingReviews(userId);
  const reviewMutation = useReviewTask(userId);

  const projects = projectsQ.data ?? [];
  const pendingTests = reviewsQ.data ?? [];

  const stats = useMemo(() => ({
    assigned: projects.length,
    active: projects.filter((p) => p.status === 'ACTIVE').length,
    pendingStart: projects.filter((p) => p.status === 'APPROVED').length,
    pendingReview: pendingTests.length,
  }), [projects, pendingTests]);

  // Rework modal state
  const [reworkTask, setReworkTask] = useState<PendingReview | null>(null);
  const [reworkReason, setReworkReason] = useState('');
  const [submittingRework, setSubmittingRework] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []); // empty deps: uses functional setState, no external references

  const selectAll = useCallback(
    () => setSelectedIds(new Set(pendingTests.map((t) => t.id))),
    [pendingTests]
  );
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const allSelected = pendingTests.length > 0 && selectedIds.size === pendingTests.length;

  // Clear stale selections when the pending review list refreshes
  React.useEffect(() => {
    clearSelection();
  }, [clearSelection, reviewsQ.dataUpdatedAt]);

  const handleApprove = (task: PendingReview) => {
    Alert.alert(
      'Approve test?',
      `${task.testName} — ${task.instanceLabel}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await reviewMutation.mutateAsync({ taskId: task.id, action: 'APPROVED' });
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              toast.success('Approved');
            } catch (e) {
              toast.error(explainSupabaseError(e));
            }
          },
        },
      ]
    );
  };

  const handleSendRework = async () => {
    if (!reworkTask || !reworkReason.trim()) return;
    setSubmittingRework(true);
    try {
      await reviewMutation.mutateAsync({ taskId: reworkTask.id, action: 'REWORK', reason: reworkReason.trim() });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      toast.success('Sent back for rework');
      setReworkTask(null);
      setReworkReason('');
    } catch (e) {
      toast.error(explainSupabaseError(e));
    } finally {
      setSubmittingRework(false);
    }
  };

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setBulkApproving(true);
    try {
      const { data: updated, error } = await supabase
        .from('test_tasks')
        .update({ status: 'APPROVED', approved_at: new Date().toISOString(), rework_reason: null })
        .in('id', ids)
        .eq('status', 'SUBMITTED')
        .select('id');
      if (error) throw error;
      const count = updated?.length ?? 0;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast.success(`${count} task${count !== 1 ? 's' : ''} approved`);
      clearSelection();
      qc.invalidateQueries({ queryKey: ['pending-reviews', userId] });
      qc.invalidateQueries({ queryKey: ['sup-projects', userId] });
      reviewMutation.reset();
    } catch (e) {
      toast.error(explainSupabaseError(e));
    } finally {
      setBulkApproving(false);
    }
  };

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'reviews', label: 'Pending Reviews', badge: pendingTests.length || undefined },
    { id: 'projects', label: 'My Projects', badge: projects.length || undefined },
  ];

  return (
    <View style={s.root}>
      {/* Stats strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.statsScroll}
        contentContainerStyle={s.statsRow}
      >
        {[
          { label: 'Assigned', value: stats.assigned, color: theme.text },
          { label: 'Active', value: stats.active, color: theme.accent },
          { label: 'Pending Start', value: stats.pendingStart, color: theme.warn },
          { label: 'Pending Review', value: stats.pendingReview, color: '#f97316' },
        ].map((stat) => (
          <View key={stat.label} style={s.statCard}>
            <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[s.tab, active && s.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[s.tabLabel, active && s.tabLabelActive]}>
                {tab.label}
                {tab.badge ? (
                  <Text style={[s.tabBadge, active && s.tabBadgeActive]}> {tab.badge}</Text>
                ) : null}
              </Text>
              {active && <View style={s.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Projects tab */}
      {activeTab === 'projects' && (
        <FlatList
          data={projectsQ.data ?? []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: theme.pad }}
          refreshControl={
            <RefreshControl
              refreshing={projectsQ.isFetching && !projectsQ.isLoading}
              onRefresh={() => projectsQ.refetch()}
              tintColor={theme.primary}
            />
          }
          ListHeaderComponent={
            projectsQ.isLoading ? (
              <View style={s.center}><ActivityIndicator color={theme.primary} /></View>
            ) : null
          }
          ListEmptyComponent={
            !projectsQ.isLoading ? (
              <View style={s.center}>
                <Text style={s.emptyText}>No projects assigned to you.</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <ProjectCard
              project={item}
              onPress={() =>
                nav.navigate('ProjectOverview', {
                  projectId: item.id,
                  projectNumber: item.project_number,
                  siteName: item.site_name,
                })
              }
            />
          )}
        />
      )}

      {/* Reviews tab */}
      {activeTab === 'reviews' && (
        <FlatList
          data={reviewsQ.data ?? []}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: theme.pad }}
          refreshControl={
            <RefreshControl
              refreshing={reviewsQ.isFetching && !reviewsQ.isLoading}
              onRefresh={() => reviewsQ.refetch()}
              tintColor={theme.primary}
            />
          }
          ListHeaderComponent={
            <>
              {reviewsQ.isLoading && (
                <View style={s.center}><ActivityIndicator color={theme.primary} /></View>
              )}
              {!reviewsQ.isLoading && selectedIds.size > 0 && (
                <View style={s.bulkHeader}>
                  <TouchableOpacity style={s.checkbox} onPress={allSelected ? clearSelection : selectAll} hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}>
                    <View style={[s.checkboxInner, allSelected && s.checkboxChecked]}>
                      {allSelected && <Text style={s.checkmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                  <Text style={s.bulkCount}>{selectedIds.size} selected</Text>
                  <TouchableOpacity
                    style={[s.bulkApproveBtn, bulkApproving && s.btnDisabled]}
                    disabled={bulkApproving}
                    onPress={handleBulkApprove}
                  >
                    {bulkApproving ? (
                      <ActivityIndicator color={theme.primaryText} size="small" />
                    ) : (
                      <Text style={s.bulkApproveBtnText}>Approve All</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            !reviewsQ.isLoading ? (
              <View style={s.allClearCard}>
                <Text style={s.allClearText}>All clear — no pending reviews</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <ReviewCard
              task={item}
              onApprove={() => handleApprove(item)}
              onRework={() => { setReworkTask(item); setReworkReason(''); }}
              loading={reviewMutation.isPending && reviewMutation.variables?.taskId === item.id}
              selected={selectedIds.has(item.id)}
              onToggle={toggleSelect}
            />
          )}
        />
      )}

      {/* Rework reason modal */}
      <Modal
        visible={reworkTask !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setReworkTask(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Send for Rework</Text>
            {reworkTask && (
              <Text style={s.modalSub}>
                {reworkTask.testName} — {reworkTask.instanceLabel}
              </Text>
            )}
            <TextInput
              style={s.reworkInput}
              value={reworkReason}
              onChangeText={setReworkReason}
              placeholder="Explain what needs to be corrected…"
              placeholderTextColor={theme.textDim}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoFocus
            />
            <View style={s.modalBtns}>
              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnGhost]}
                onPress={() => setReworkTask(null)}
              >
                <Text style={s.modalBtnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnDanger, (!reworkReason.trim() || submittingRework) && s.btnDisabled]}
                disabled={!reworkReason.trim() || submittingRework}
                onPress={handleSendRework}
              >
                {submittingRework ? (
                  <ActivityIndicator color={theme.primaryText} />
                ) : (
                  <Text style={s.modalBtnDangerText}>Send for Rework</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const ProjectCard = memo(function ProjectCard({
  project,
  onPress,
}: {
  project: SupProject;
  onPress: () => void;
}) {
  const sc = statusColor(project.status);
  return (
    <TouchableOpacity activeOpacity={0.75} style={s.card} onPress={onPress}>
      <View style={s.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.projectNum}>{project.project_number}</Text>
          <Text style={s.siteName}>{project.site_name}</Text>
        </View>
        <View style={[s.badge, { borderColor: sc }]}>
          <Text style={[s.badgeText, { color: sc }]}>{project.status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const ReviewCard = memo(function ReviewCard({
  task,
  onApprove,
  onRework,
  loading,
  selected,
  onToggle,
}: {
  task: PendingReview;
  onApprove: () => void;
  onRework: () => void;
  loading: boolean;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <View style={s.reviewCard}>
      <View style={s.reviewCardTop}>
        <TouchableOpacity style={s.checkbox} onPress={() => onToggle(task.id)} hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}>
          <View style={[s.checkboxInner, selected && s.checkboxChecked]}>
            {selected && <Text style={s.checkmark}>✓</Text>}
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.reviewProject}>{task.projectNumber}</Text>
          <Text style={s.reviewTest}>{task.testName}</Text>
          <Text style={s.reviewInstance}>
            {task.instanceLabel} · {task.testCode}
          </Text>
        </View>
      </View>
      <View style={s.reviewActions}>
        <TouchableOpacity
          style={[s.actionBtn, s.actionBtnRework, loading && s.btnDisabled]}
          disabled={loading}
          onPress={onRework}
        >
          <Text style={s.actionBtnReworkText}>Rework</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, s.actionBtnApprove, loading && s.btnDisabled]}
          disabled={loading}
          onPress={onApprove}
        >
          {loading ? (
            <ActivityIndicator color={theme.primaryText} />
          ) : (
            <Text style={s.actionBtnApproveText}>Approve</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { paddingVertical: 40, alignItems: 'center' },

  // Stats strip
  statsScroll: { flexGrow: 0 },
  statsRow: { padding: theme.pad, gap: 10, paddingBottom: 8 },
  statCard: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 80,
  },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { color: theme.textDim, fontSize: 11, marginTop: 2 },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', position: 'relative' },
  tabActive: {},
  tabLabel: { color: theme.textDim, fontSize: 13, fontWeight: '600' },
  tabLabelActive: { color: theme.text },
  tabBadge: { color: theme.textDim, fontSize: 12 },
  tabBadgeActive: { color: theme.primary },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: theme.primary,
  },

  // Project card
  card: {
    backgroundColor: theme.card,
    padding: theme.pad,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 10,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  projectNum: { color: theme.text, fontWeight: '700', fontSize: 15 },
  siteName: { color: theme.textDim, fontSize: 13, marginTop: 2 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  // Review card
  reviewCard: {
    backgroundColor: theme.card,
    padding: theme.pad,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 10,
    gap: 4,
  },
  reviewCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  checkbox: { paddingTop: 2 },
  checkboxInner: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: theme.primary, borderColor: theme.primary },
  checkmark: { color: theme.primaryText, fontSize: 12, fontWeight: '700' },
  reviewProject: { color: theme.primary, fontSize: 11, fontWeight: '700' },
  reviewTest: { color: theme.text, fontWeight: '600', fontSize: 15 },
  reviewInstance: { color: theme.textDim, fontSize: 12 },
  reviewActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnRework: { borderWidth: 1, borderColor: theme.border, backgroundColor: theme.muted },
  actionBtnApprove: { backgroundColor: theme.primary },
  actionBtnReworkText: { color: theme.text, fontWeight: '600', fontSize: 13 },
  actionBtnApproveText: { color: theme.primaryText, fontWeight: '700', fontSize: 13 },
  btnDisabled: { opacity: 0.5 },

  // Bulk approval header
  bulkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.cardAlt,
    borderRadius: theme.radius,
    paddingHorizontal: theme.pad,
    paddingVertical: 10,
    marginBottom: 8,
  },
  bulkCount: { flex: 1, color: theme.text, fontWeight: '600', fontSize: 13 },
  bulkApproveBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bulkApproveBtnText: { color: theme.primaryText, fontWeight: '700', fontSize: 13 },

  // Rework modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 12,
  },
  modalTitle: { color: theme.text, fontSize: 18, fontWeight: '700' },
  modalSub: { color: theme.textDim, fontSize: 13 },
  reworkInput: {
    backgroundColor: theme.muted,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 12,
    minHeight: 100,
    fontSize: 14,
  },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  modalBtnGhost: { borderWidth: 1, borderColor: theme.border },
  modalBtnDanger: { backgroundColor: theme.danger },
  modalBtnGhostText: { color: theme.text, fontWeight: '600' },
  modalBtnDangerText: { color: theme.primaryText, fontWeight: '700' },

  emptyText: { color: theme.textDim },
  allClearCard: {
    backgroundColor: 'rgba(46, 158, 99, 0.12)',
    borderWidth: 1,
    borderColor: theme.success,
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  allClearText: { color: theme.success, fontWeight: '600', fontSize: 15 },
});
