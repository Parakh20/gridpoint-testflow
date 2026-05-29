import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  useTestScope,
  useSaveTestScope,
  useGenerateEquipment,
  type TestScopeGroup,
} from '@/hooks/useTestScope';
import { useToast } from '@/components/Toast';
import { explainSupabaseError } from '@/lib/errors';
import { theme } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'TestingScope'>;
type R = RouteProp<RootStackParamList, 'TestingScope'>;

export default function TestingScopeScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const toast = useToast();

  const q = useTestScope(params.projectId);
  const saveMutation = useSaveTestScope();
  const generateMutation = useGenerateEquipment();

  const [groups, setGroups] = useState<TestScopeGroup[]>([]);

  useEffect(() => {
    if (q.data) setGroups(q.data.groups);
  }, [q.data]);

  const alreadyGenerated = q.data?.alreadyGenerated ?? false;
  const hasEnabledTests = groups.some((g) => g.templates.some((t) => t.isEnabled));

  const toggleTemplate = (type: string, templateId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.equipmentType === type
          ? { ...g, templates: g.templates.map((t) => (t.id === templateId ? { ...t, isEnabled: !t.isEnabled } : t)) }
          : g
      )
    );
  };

  const toggleAll = (type: string, enabled: boolean) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.equipmentType === type
          ? { ...g, templates: g.templates.map((t) => ({ ...t, isEnabled: enabled })) }
          : g
      )
    );
  };

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({ projectId: params.projectId, groups });
      toast.success('Testing scope saved');
    } catch (err: any) {
      toast.error(explainSupabaseError(err));
    }
  };

  const handleGenerate = () => {
    if (!hasEnabledTests) {
      toast.error('Select at least one test before generating equipment');
      return;
    }
    Alert.alert(
      'Generate equipment?',
      'This creates equipment units and their test tasks from the current scope. It can only be done once per project.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            try {
              // Persist selections first so the RPC sees the latest enabled state.
              await saveMutation.mutateAsync({ projectId: params.projectId, groups });
              const r = await generateMutation.mutateAsync(params.projectId);
              if (r.already_existed) {
                toast.error('Equipment was already generated for this project');
              } else {
                toast.success(`Generated ${r.generated_instances} units and ${r.generated_tasks} tasks`);
                nav.goBack();
              }
            } catch (err: any) {
              toast.error(explainSupabaseError(err));
            }
          },
        },
      ]
    );
  };

  if (q.isLoading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (groups.length === 0) {
    return (
      <View style={[s.root, s.center, { padding: theme.pad }]}>
        <Text style={s.emptyTitle}>No equipment in scope</Text>
        <Text style={s.emptyBody}>Define equipment quantities in Manage Scope first, then return here to pick tests.</Text>
      </View>
    );
  }

  const busy = saveMutation.isPending || generateMutation.isPending;

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      {alreadyGenerated && (
        <View style={s.banner}>
          <Text style={s.bannerText}>
            Equipment already generated. Test selections can still be saved, but generation is locked.
          </Text>
        </View>
      )}
      <ScrollView contentContainerStyle={s.scroll}>
        {groups.map((g) => {
          const allOn = g.templates.length > 0 && g.templates.every((t) => t.isEnabled);
          return (
            <View key={g.equipmentType} style={s.group}>
              <View style={s.groupHeader}>
                <Text style={s.groupTitle}>{g.label}</Text>
                <TouchableOpacity onPress={() => toggleAll(g.equipmentType, !allOn)}>
                  <Text style={s.toggleAll}>{allOn ? 'Disable all' : 'Enable all'}</Text>
                </TouchableOpacity>
              </View>
              {g.templates.length === 0 ? (
                <Text style={s.noTemplates}>No test templates for this equipment type.</Text>
              ) : (
                g.templates.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={s.testRow}
                    onPress={() => toggleTemplate(g.equipmentType, t.id)}
                  >
                    <View style={[s.checkbox, t.isEnabled && s.checkboxOn]}>
                      {t.isEnabled && <Text style={s.checkboxTick}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.testName}>{t.testName}</Text>
                      <Text style={s.testCode}>{t.testCode} · {t.tab}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.btnSecondary, busy && s.btnDisabled]}
          onPress={handleSave}
          disabled={busy}
        >
          <Text style={s.btnSecondaryText}>{saveMutation.isPending ? 'Saving…' : 'Save Selections'}</Text>
        </TouchableOpacity>
        {!alreadyGenerated && (
          <TouchableOpacity
            style={[s.btn, busy && s.btnDisabled]}
            onPress={handleGenerate}
            disabled={busy}
          >
            <Text style={s.btnText}>{generateMutation.isPending ? 'Generating…' : 'Generate Equipment'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  banner: { backgroundColor: 'rgba(236,157,42,0.12)', borderBottomWidth: 1, borderBottomColor: theme.warn, padding: theme.pad },
  bannerText: { color: theme.warn, fontSize: 12, fontWeight: '600' },
  scroll: { padding: theme.pad, paddingBottom: 16 },
  group: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    padding: theme.pad,
    marginBottom: 12,
  },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  groupTitle: { color: theme.text, fontWeight: '700', fontSize: 15 },
  toggleAll: { color: theme.primary, fontWeight: '600', fontSize: 13 },
  noTemplates: { color: theme.textDim, fontSize: 13 },
  testRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, gap: 12 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: theme.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: theme.primary, borderColor: theme.primary },
  checkboxTick: { color: '#fff', fontWeight: '800', fontSize: 13 },
  testName: { color: theme.text, fontSize: 14, fontWeight: '500' },
  testCode: { color: theme.textDim, fontSize: 12, marginTop: 1 },
  emptyTitle: { color: theme.text, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  emptyBody: { color: theme.textDim, marginTop: 8, textAlign: 'center', lineHeight: 20 },
  footer: { flexDirection: 'row', gap: 10, padding: theme.pad, borderTopWidth: 1, borderTopColor: theme.border },
  btn: { flex: 1, backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: theme.primaryText, fontWeight: '700', fontSize: 15 },
  btnSecondary: { flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnSecondaryText: { color: theme.primary, fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.5 },
});
