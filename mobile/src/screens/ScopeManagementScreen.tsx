import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { EQUIPMENT_TYPES, useScopeItems, useSaveScopeItems, type EquipmentType } from '@/hooks/useScopeItems';
import { useToast } from '@/components/Toast';
import { explainSupabaseError } from '@/lib/errors';
import { theme } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ScopeManagement'>;
type R = RouteProp<RootStackParamList, 'ScopeManagement'>;

export default function ScopeManagementScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const toast = useToast();

  const scopeQ = useScopeItems(params.projectId);
  const saveMutation = useSaveScopeItems();

  // Fetch project status to know if scope is locked
  const statusQ = useQuery({
    queryKey: ['project-status', params.projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('status')
        .eq('id', params.projectId)
        .single();
      if (error) throw error;
      return (data as any).status as string;
    },
  });

  const isLocked = statusQ.data === 'ACTIVE' || statusQ.data === 'CLOSED';

  // quantities map: equipmentType → quantity
  const [quantities, setQuantities] = useState<Record<EquipmentType, number>>(
    () => Object.fromEntries(EQUIPMENT_TYPES.map((e) => [e.type, 0])) as Record<EquipmentType, number>
  );

  useEffect(() => {
    if (!scopeQ.data) return;
    const map = Object.fromEntries(scopeQ.data.map((r) => [r.equipment_type, r.quantity]));
    setQuantities((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next) as EquipmentType[]) {
        next[key] = map[key] ?? 0;
      }
      return next;
    });
  }, [scopeQ.data]);

  const adjust = (type: EquipmentType, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [type]: Math.max(0, Math.min(500, (prev[type] ?? 0) + delta)),
    }));
  };

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({
        projectId: params.projectId,
        rows: EQUIPMENT_TYPES.map((e) => ({ equipment_type: e.type, quantity: quantities[e.type] })),
      });
      toast.success('Scope saved');
      nav.goBack();
    } catch (err: any) {
      toast.error(explainSupabaseError(err));
    }
  };

  if (scopeQ.isLoading || statusQ.isLoading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      {isLocked && (
        <View style={s.lockBanner}>
          <Text style={s.lockText}>Scope locked — project is {statusQ.data}</Text>
        </View>
      )}
      <ScrollView contentContainerStyle={s.scroll}>
        {EQUIPMENT_TYPES.map(({ type, label }) => (
          <View key={type} style={s.row}>
            <Text style={s.rowLabel}>{label}</Text>
            <View style={s.stepper}>
              <TouchableOpacity
                style={[s.stepBtn, isLocked && s.stepBtnDisabled]}
                onPress={() => adjust(type, -1)}
                disabled={isLocked}
              >
                <Text style={s.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={s.qty}>{quantities[type]}</Text>
              <TouchableOpacity
                style={[s.stepBtn, isLocked && s.stepBtnDisabled]}
                onPress={() => adjust(type, 1)}
                disabled={isLocked}
              >
                <Text style={s.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {!isLocked && (
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.btn, saveMutation.isPending && s.btnDisabled]}
            onPress={handleSave}
            disabled={saveMutation.isPending}
          >
            <Text style={s.btnText}>{saveMutation.isPending ? 'Saving…' : 'Save Scope'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  lockBanner: { backgroundColor: 'rgba(236,157,42,0.12)', borderBottomWidth: 1, borderBottomColor: theme.warn, paddingVertical: 10, paddingHorizontal: theme.pad },
  lockText: { color: theme.warn, fontWeight: '600', fontSize: 13 },
  scroll: { padding: theme.pad, paddingBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    paddingHorizontal: theme.pad,
    paddingVertical: 12,
    marginBottom: 10,
  },
  rowLabel: { color: theme.text, fontSize: 15, flex: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: theme.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: { opacity: 0.35 },
  stepBtnText: { color: theme.text, fontSize: 20, fontWeight: '600', lineHeight: 24 },
  qty: { color: theme.text, fontSize: 17, fontWeight: '700', minWidth: 28, textAlign: 'center' },
  footer: { padding: theme.pad, borderTopWidth: 1, borderTopColor: theme.border },
  btn: { backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: theme.primaryText, fontWeight: '700', fontSize: 16 },
});
