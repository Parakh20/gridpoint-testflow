import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@/context/AuthContext';
import { useProjectDetail } from '@/hooks/useProjectMutations';
import { useCompanySupervisors, useAssignSupervisor } from '@/hooks/useCompanyMembers';
import { useToast } from '@/components/Toast';
import { explainSupabaseError } from '@/lib/errors';
import { theme } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AssignSupervisor'>;
type R = RouteProp<RootStackParamList, 'AssignSupervisor'>;

export default function AssignSupervisorScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const { userId, role } = useAuth();
  const toast = useToast();

  const projectQ = useProjectDetail(params.projectId);
  const supervisorsQ = useCompanySupervisors();
  const assignMutation = useAssignSupervisor();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const supervisors = supervisorsQ.data ?? [];
  const filtered = search
    ? supervisors.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase())
      )
    : supervisors;

  const currentAssignedTo = projectQ.data?.assigned_to ?? null;

  const handleConfirm = async (supervisorId: string | null) => {
    if (!userId || !role) return;
    try {
      await assignMutation.mutateAsync({
        projectId: params.projectId,
        supervisorId,
        callerId: userId,
        callerRole: role,
      });
      toast.success(supervisorId ? 'Supervisor assigned' : 'Supervisor removed');
      nav.goBack();
    } catch (err: any) {
      toast.error(explainSupabaseError(err));
    }
  };

  const isLoading = projectQ.isLoading || supervisorsQ.isLoading;

  if (isLoading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      {/* Current supervisor banner */}
      {currentAssignedTo && (
        <View style={s.currentBanner}>
          <View style={{ flex: 1 }}>
            <Text style={s.currentLabel}>Currently assigned</Text>
            <Text style={s.currentName}>
              {supervisors.find((s2) => s2.id === currentAssignedTo)?.name ?? 'Unknown'}
            </Text>
          </View>
          <TouchableOpacity
            style={s.removeBtn}
            onPress={() => handleConfirm(null)}
            disabled={assignMutation.isPending}
          >
            <Text style={s.removeBtnText}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={s.searchWrap}>
        <TextInput
          style={s.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search supervisors…"
          placeholderTextColor={theme.textDim}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingHorizontal: theme.pad, paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>No supervisors found in this company.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isCurrent = item.id === currentAssignedTo;
          const isSelected = item.id === selected;
          return (
            <TouchableOpacity
              style={[s.row, isCurrent && s.rowCurrent]}
              onPress={() => setSelected(isSelected ? null : item.id)}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.name}</Text>
                <Text style={s.email}>{item.email}</Text>
              </View>
              {isCurrent && <Text style={s.currentTag}>Current</Text>}
              {isSelected && !isCurrent && (
                <View style={s.check}>
                  <Text style={s.checkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {selected && selected !== currentAssignedTo && (
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.confirmBtn, assignMutation.isPending && s.confirmBtnDisabled]}
            onPress={() => handleConfirm(selected)}
            disabled={assignMutation.isPending}
          >
            <Text style={s.confirmBtnText}>
              {assignMutation.isPending ? 'Assigning…' : 'Confirm Assignment'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  currentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: theme.pad,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    padding: 12,
  },
  currentLabel: { color: theme.textDim, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  currentName: { color: theme.text, fontWeight: '700', fontSize: 15, marginTop: 2 },
  removeBtn: { borderWidth: 1, borderColor: theme.danger, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  removeBtnText: { color: theme.danger, fontWeight: '600', fontSize: 13 },
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
  rowCurrent: { borderColor: theme.primary },
  name: { color: theme.text, fontWeight: '600', fontSize: 15 },
  email: { color: theme.textDim, fontSize: 12, marginTop: 2 },
  currentTag: { color: theme.primary, fontSize: 12, fontWeight: '700' },
  check: { width: 26, height: 26, borderRadius: 13, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  checkText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  empty: { paddingTop: 40, alignItems: 'center' },
  emptyText: { color: theme.textDim },
  footer: { padding: theme.pad, borderTopWidth: 1, borderTopColor: theme.border },
  confirmBtn: { backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: theme.primaryText, fontWeight: '700', fontSize: 16 },
});
