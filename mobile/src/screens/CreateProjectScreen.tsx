import React, { useState } from 'react';
import {
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@/context/AuthContext';
import { useCreateProject } from '@/hooks/useProjectMutations';
import { useToast } from '@/components/Toast';
import { explainSupabaseError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { isPlanGateRlsError, planLimitMessage, type CanCreateProjectStatus } from '@/lib/planLimits';
import { theme } from '@/theme';
import { isValidDate } from '@/lib/dateInput';
import { DateField } from '@/components/DateField';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CreateProject'>;

export default function CreateProjectScreen() {
  const nav = useNavigation<Nav>();
  const { userId, profile } = useAuth();
  const toast = useToast();
  const mutation = useCreateProject();

  const [projectNumber, setProjectNumber] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [client, setClient] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!projectNumber.trim()) e.projectNumber = 'Required';
    if (!siteName.trim()) e.siteName = 'Required';
    if (!siteAddress.trim()) e.siteAddress = 'Required';
    if (startDate && !isValidDate(startDate)) e.startDate = 'Enter a valid date';
    if (endDate && !isValidDate(endDate)) e.endDate = 'Enter a valid date';
    if (isValidDate(startDate) && isValidDate(endDate) && endDate < startDate) {
      e.endDate = 'End date must be after start date';
    }
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    if (!userId || !profile?.company_id) {
      toast.error('Session error — please sign out and back in');
      return;
    }
    try {
      // Pre-flight the plan gate so a blocked GM gets a real reason instead of
      // the bare "permission denied" the projects INSERT policy would produce.
      // Mirrors frontend/src/pages/projects/NewProject.tsx.
      const { data: statusRaw, error: statusError } = await supabase.rpc('check_can_create_project');
      const status = statusRaw as CanCreateProjectStatus | null;
      if (!statusError && status && !status.allowed) {
        toast.error(planLimitMessage(status));
        return;
      }

      await mutation.mutateAsync({
        project_number: projectNumber.trim(),
        site_name: siteName.trim(),
        site_address: siteAddress.trim(),
        client: client.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        createdBy: userId,
        companyId: profile.company_id,
      });
      toast.success('Project created');
      nav.goBack();
    } catch (err: any) {
      if (err?.code === '23505') {
        setErrors({ projectNumber: 'Project number already exists' });
      } else if (isPlanGateRlsError(err)) {
        // Only reachable if the pre-check above raced another creation; the
        // real usage count isn't known here, so the message stays generic.
        toast.error(planLimitMessage(null));
      } else {
        toast.error(explainSupabaseError(err));
      }
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Field label="Project Number *" error={errors.projectNumber}>
            <TextInput
              style={[s.input, errors.projectNumber && s.inputError]}
              value={projectNumber}
              onChangeText={(v) => { setProjectNumber(v); setErrors((p) => ({ ...p, projectNumber: '' })); }}
              placeholder="e.g. PRJ-2026-001"
              placeholderTextColor={theme.textDim}
              autoCapitalize="characters"
            />
          </Field>

          <Field label="Site Name *" error={errors.siteName}>
            <TextInput
              style={[s.input, errors.siteName && s.inputError]}
              value={siteName}
              onChangeText={(v) => { setSiteName(v); setErrors((p) => ({ ...p, siteName: '' })); }}
              placeholder="e.g. Nashik 220kV Substation"
              placeholderTextColor={theme.textDim}
            />
          </Field>

          <Field label="Site Address *" error={errors.siteAddress}>
            <TextInput
              style={[s.input, s.multiline, errors.siteAddress && s.inputError]}
              value={siteAddress}
              onChangeText={(v) => { setSiteAddress(v); setErrors((p) => ({ ...p, siteAddress: '' })); }}
              placeholder="Full site address"
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
              placeholder="Client organisation name"
              placeholderTextColor={theme.textDim}
            />
          </Field>

          <DateField
            label="Start Date (optional)"
            value={startDate}
            error={errors.startDate}
            onChange={(v) => { setStartDate(v); setErrors((p) => ({ ...p, startDate: '' })); }}
          />

          <DateField
            label="End Date (optional)"
            value={endDate}
            error={errors.endDate}
            minDate={isValidDate(startDate) ? startDate : undefined}
            onChange={(v) => { setEndDate(v); setErrors((p) => ({ ...p, endDate: '' })); }}
          />

          <TouchableOpacity
            style={[s.btn, mutation.isPending && s.btnDisabled]}
            onPress={handleSubmit}
            disabled={mutation.isPending}
          >
            <Text style={s.btnText}>{mutation.isPending ? 'Creating…' : 'Create Project'}</Text>
          </TouchableOpacity>
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
  btn: {
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: theme.primaryText, fontWeight: '700', fontSize: 16 },
});
