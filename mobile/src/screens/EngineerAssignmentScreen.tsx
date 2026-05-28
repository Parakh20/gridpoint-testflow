import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  useProjectInstances,
  useCompanyEngineers,
  useAssignEngineer,
  type InstanceWithAssignee,
} from '@/hooks/useCompanyMembers';
import { useToast } from '@/components/Toast';
import { explainSupabaseError } from '@/lib/errors';
import { theme } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type R = RouteProp<RootStackParamList, 'EngineerAssignment'>;

export default function EngineerAssignmentScreen() {
  const { params } = useRoute<R>();
  const toast = useToast();

  const instancesQ = useProjectInstances(params.projectId);
  const engineersQ = useCompanyEngineers();
  const assignMutation = useAssignEngineer();

  const [pickerInstance, setPickerInstance] = useState<InstanceWithAssignee | null>(null);
  const [search, setSearch] = useState('');

  const engineers = engineersQ.data ?? [];
  const filteredEngineers = search
    ? engineers.filter(
        (e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.email.toLowerCase().includes(search.toLowerCase())
      )
    : engineers;

  const handleAssign = async (engineerId: string | null) => {
    if (!pickerInstance) return;
    try {
      await assignMutation.mutateAsync({
        instanceId: pickerInstance.id,
        engineerId,
        projectId: params.projectId,
      });
      toast.success(engineerId ? 'Engineer assigned' : 'Engineer removed');
      setPickerInstance(null);
      setSearch('');
    } catch (err: any) {
      toast.error(explainSupabaseError(err));
    }
  };

  if (instancesQ.isLoading || engineersQ.isLoading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  const instances = instancesQ.data ?? [];

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      <FlatList
        data={instances}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: theme.pad }}
        refreshControl={
          <RefreshControl
            refreshing={instancesQ.isFetching && !instancesQ.isLoading}
            onRefresh={() => instancesQ.refetch()}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No equipment instances</Text>
            <Text style={s.emptyBody}>Generate equipment first via Scope Management.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardLeft}>
              <Text style={s.instanceLabel}>{item.label}</Text>
              <Text style={s.equipmentType}>{item.equipment_type.replace(/_/g, ' ')}</Text>
            </View>
            <View style={s.cardRight}>
              <Text style={s.assigneeName}>
                {item.assignee_name ?? 'Unassigned'}
              </Text>
              <TouchableOpacity
                style={s.assignBtn}
                onPress={() => { setPickerInstance(item); setSearch(''); }}
              >
                <Text style={s.assignBtnText}>
                  {item.assigned_to ? 'Change' : 'Assign'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Engineer picker modal */}
      <Modal
        visible={pickerInstance !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setPickerInstance(null); setSearch(''); }}
      >
        <SafeAreaView style={s.modal} edges={['top', 'bottom']}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Assign Engineer</Text>
            <TouchableOpacity onPress={() => { setPickerInstance(null); setSearch(''); }}>
              <Text style={s.modalClose}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.modalSub}>{pickerInstance?.label}</Text>

          <View style={s.searchWrap}>
            <TextInput
              style={s.search}
              value={search}
              onChangeText={setSearch}
              placeholder="Search engineers…"
              placeholderTextColor={theme.textDim}
              autoFocus
            />
          </View>

          {pickerInstance?.assigned_to && (
            <TouchableOpacity
              style={s.removeRow}
              onPress={() => handleAssign(null)}
              disabled={assignMutation.isPending}
            >
              <Text style={s.removeRowText}>Remove current assignment</Text>
            </TouchableOpacity>
          )}

          <FlatList
            data={filteredEngineers}
            keyExtractor={(e) => e.id}
            contentContainerStyle={{ paddingHorizontal: theme.pad, paddingBottom: 20 }}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyBody}>No engineers found.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isCurrent = item.id === pickerInstance?.assigned_to;
              return (
                <TouchableOpacity
                  style={[s.engineerRow, isCurrent && s.engineerRowCurrent]}
                  onPress={() => handleAssign(item.id)}
                  disabled={assignMutation.isPending}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.engineerName}>{item.name}</Text>
                    <Text style={s.engineerEmail}>{item.email}</Text>
                  </View>
                  {isCurrent && <Text style={s.currentTag}>Current</Text>}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
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
  cardLeft: { flex: 1 },
  instanceLabel: { color: theme.text, fontWeight: '700', fontSize: 15 },
  equipmentType: { color: theme.textDim, fontSize: 12, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  assigneeName: { color: theme.textDim, fontSize: 13 },
  assignBtn: { backgroundColor: theme.muted, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  assignBtnText: { color: theme.primary, fontWeight: '600', fontSize: 13 },
  empty: { paddingTop: 60, alignItems: 'center' },
  emptyTitle: { color: theme.text, fontSize: 16, fontWeight: '600' },
  emptyBody: { color: theme.textDim, marginTop: 6, textAlign: 'center' },
  // Modal
  modal: { flex: 1, backgroundColor: theme.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.pad, borderBottomWidth: 1, borderBottomColor: theme.border },
  modalTitle: { color: theme.text, fontSize: 18, fontWeight: '700' },
  modalClose: { color: theme.primary, fontSize: 16 },
  modalSub: { color: theme.textDim, paddingHorizontal: theme.pad, paddingBottom: 8, fontSize: 13 },
  searchWrap: { paddingHorizontal: theme.pad, paddingBottom: 8 },
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
  removeRow: { marginHorizontal: theme.pad, marginBottom: 8, padding: 12, borderWidth: 1, borderColor: theme.danger, borderRadius: 10 },
  removeRowText: { color: theme.danger, fontWeight: '600', textAlign: 'center' },
  engineerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    padding: 14,
    marginBottom: 8,
  },
  engineerRowCurrent: { borderColor: theme.primary },
  engineerName: { color: theme.text, fontWeight: '600', fontSize: 15 },
  engineerEmail: { color: theme.textDim, fontSize: 12, marginTop: 2 },
  currentTag: { color: theme.primary, fontSize: 12, fontWeight: '700' },
});
