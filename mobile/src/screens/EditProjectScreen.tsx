import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
import { useProjectDetail, useUpdateProject, useDeleteProject } from '@/hooks/useProjectMutations';
import { useToast } from '@/components/Toast';
import { explainSupabaseError } from '@/lib/errors';
import { theme, statusColor } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'EditProject'>;
type R = RouteProp<RootStackParamList, 'EditProject'>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUS_ORDER = ['DRAFT', 'APPROVED', 'ACTIVE', 'CLOSED'] as const;
type ProjectStatus = typeof STATUS_ORDER[number];

export default function EditProjectScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const { role } = useAuth();
  const toast = useToast();

  const q = useProjectDetail(params.projectId);
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();

  const [projectNumber, setProjectNumber] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [client, setClient] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('DRAFT');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-fill once data loads
  useEffect(() => {
    if (!q.data) return;
    const d = q.data;
    setProjectNumber(d.project_number);
    setSiteName(d.site_name);
    setSiteAddress(d.site_address);
    setClient(d.client ?? '');
    setStartDate(d.start_date ?? '');
    setEndDate(d.end_date ?? '');
    setStatus(d.status as ProjectStatus);
  }, [q.data]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!projectNumber.trim()) e.projectNumber = 'Required';
    if (!siteName.trim()) e.siteName = 'Required';
    if (!siteAddress.trim()) e.siteAddress = 'Required';
    if (startDate && !DATE_RE.test(startDate)) e.startDate = 'Use YYYY-MM-DD format';
    if (endDate && !DATE_RE.test(endDate)) e.endDate = 'Use YYYY-MM-DD format';
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    try {
      await updateMutation.mutateAsync({
        projectId: params.projectId,
        fields: {
          project_number: projectNumber.trim(),
          site_name: siteName.trim(),
          site_address: siteAddress.trim(),
          client: client.trim() || null,
          start_date: startDate || null,
          end_date: endDate || null,
        },
        newStatus: status,
        currentStatus: q.data?.status,
      });
      toast.success('Project updated');
      nav.goBack();
    } catch (err: any) {
      if (err?.code === '23505') {
        setErrors({ projectNumber: 'Project number already exists' });
      } else {
        toast.error(explainSupabaseError(err));
      }
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete project?',
      `"${params.projectNumber}" will be soft-deleted. It can be restored by a SUPERADMIN.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(params.projectId);
              toast.success('Project deleted');
              nav.goBack();
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

  const currentStatusIndex = STATUS_ORDER.indexOf(q.data?.status as ProjectStatus ?? 'DRAFT');

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <Field label="Project Number *" error={errors.projectNumber}>
            <TextInput
              style={[s.input, errors.projectNumber && s.inputError]}
              value={projectNumber}
              onChangeText={(v) => { setProjectNumber(v); setErrors((p) => ({ ...p, projectNumber: '' })); }}
              placeholderTextColor={theme.textDim}
              autoCapitalize="characters"
            />
          </Field>

          <Field label="Site Name *" error={errors.siteName}>
            <TextInput
              style={[s.input, errors.siteName && s.inputError]}
              value={siteName}
              onChangeText={(v) => { setSiteName(v); setErrors((p) => ({ ...p, siteName: '' })); }}
              placeholderTextColor={theme.textDim}
            />
          </Field>

          <Field label="Site Address *" error={errors.siteAddress}>
            <TextInput
              style={[s.input, s.multiline, errors.siteAddress && s.inputError]}
              value={siteAddress}
              onChangeText={(v) => { setSiteAddress(v); setErrors((p) => ({ ...p, siteAddress: '' })); }}
              placeholderTextColor={theme.textDim}
              multiline
              numberOfLines={2}
            />
          </Field>

          <Field label="Client (optional)">
            <TextInput
              style={s.input}
              value={client}
              onChangeText={setClient}
              placeholderTextColor={theme.textDim}
            />
          </Field>

          <Field label="Start Date (optional)" error={errors.startDate}>
            <TextInput
              style={[s.input, errors.startDate && s.inputError]}
              value={startDate}
              onChangeText={(v) => { setStartDate(v); setErrors((p) => ({ ...p, startDate: '' })); }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textDim}
              keyboardType="numbers-and-punctuation"
            />
          </Field>

          <Field label="End Date (optional)" error={errors.endDate}>
            <TextInput
              style={[s.input, errors.endDate && s.inputError]}
              value={endDate}
              onChangeText={(v) => { setEndDate(v); setErrors((p) => ({ ...p, endDate: '' })); }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textDim}
              keyboardType="numbers-and-punctuation"
            />
          </Field>

          <Field label="Status">
            <View style={s.statusRow}>
              {STATUS_ORDER.map((s2, idx) => {
                const sc = statusColor(s2);
                const isActive = status === s2;
                const isDisabled = idx < currentStatusIndex; // cannot go back
                return (
                  <TouchableOpacity
                    key={s2}
                    style={[
                      s.statusChip,
                      isActive && { backgroundColor: sc, borderColor: sc },
                      isDisabled && s.statusChipDisabled,
                    ]}
                    onPress={() => !isDisabled && setStatus(s2)}
                    disabled={isDisabled}
                  >
                    <Text style={[s.statusChipText, isActive && s.statusChipTextActive]}>
                      {s2}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Field>

          <TouchableOpacity
            style={[s.btn, updateMutation.isPending && s.btnDisabled]}
            onPress={handleSave}
            disabled={updateMutation.isPending}
          >
            <Text style={s.btnText}>{updateMutation.isPending ? 'Saving…' : 'Save Changes'}</Text>
          </TouchableOpacity>

          {role === 'SUPERADMIN' && (
            <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} disabled={deleteMutation.isPending}>
              <Text style={s.deleteBtnText}>Delete Project</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      {children}
      {error ? <Text style={s.errorText}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: theme.pad, paddingBottom: 40 },
  field: { marginBottom: 16 },
  label: { color: theme.textDim, fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: theme.card,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
  inputError: { borderColor: theme.danger },
  multiline: { minHeight: 60, textAlignVertical: 'top' },
  errorText: { color: theme.danger, fontSize: 12, marginTop: 4 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: {
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statusChipDisabled: { opacity: 0.35 },
  statusChipText: { color: theme.textDim, fontWeight: '600', fontSize: 13 },
  statusChipTextActive: { color: '#fff' },
  btn: { backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: theme.primaryText, fontWeight: '700', fontSize: 16 },
  deleteBtn: { marginTop: 24, borderWidth: 1, borderColor: theme.danger, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  deleteBtnText: { color: theme.danger, fontWeight: '700', fontSize: 15 },
});
