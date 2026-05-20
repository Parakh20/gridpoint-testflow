import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useHeaderHeight } from '@react-navigation/elements';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { theme, statusColor } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';
import { useToast } from '@/components/Toast';
import { explainSupabaseError } from '@/lib/errors';
import {
  normalizeFields,
  ENGINEER_EDITABLE_TEST_STATUSES,
  type FieldSchema,
} from '@testflow/shared';

type Nav = NativeStackNavigationProp<RootStackParamList, 'TestForm'>;
type R = RouteProp<RootStackParamList, 'TestForm'>;

const AUTOSAVE_DEBOUNCE_MS = 1500;

export default function TestFormScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const { userId } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const headerHeight = useHeaderHeight();

  const [fields, setFields] = useState<FieldSchema[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState(params.currentStatus);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showRequired, setShowRequired] = useState(false);
  const [dirty, setDirty] = useState(false);

  const valuesRef = useRef(values);
  const notesRef = useRef(notes);
  const submittingRef = useRef(false);
  valuesRef.current = values;
  notesRef.current = notes;
  submittingRef.current = submitting;

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoad = useRef(true);
  const persistInFlight = useRef(false);

  // Load template + existing record
  useEffect(() => {
    (async () => {
      try {
        const [{ data: tpl, error: tplErr }, { data: rec, error: recErr }] = await Promise.all([
          supabase.from('test_templates').select('fields').eq('id', params.templateId).maybeSingle(),
          supabase.from('test_records').select('*').eq('test_task_id', params.taskId).maybeSingle(),
        ]);
        if (tplErr) throw tplErr;
        if (recErr) throw recErr;

        setFields(normalizeFields(tpl?.fields));
        if (rec) {
          setRecordId(rec.id);
          setValues((rec.data as Record<string, any>) ?? {});
          setNotes((rec.notes as string) ?? '');
        }
      } catch (e) {
        toast.error(explainSupabaseError(e));
      } finally {
        setLoading(false);
        // Skip the "values changed" effect on initial load.
        setTimeout(() => {
          initialLoad.current = false;
        }, 0);
      }
    })();
  }, [params.taskId, params.templateId, toast]);

  const readOnly = status === 'SUBMITTED' || status === 'APPROVED';

  const setField = (name: string, v: any) => {
    setValues((cur) => ({ ...cur, [name]: v }));
    setDirty(true);
  };

  const setNotesDirty = (t: string) => {
    setNotes(t);
    setDirty(true);
  };

  const missing = useMemo(() => {
    return fields
      .filter((f) => f.required && f.name)
      .map((f) => f.name!)
      .filter((n) => values[n] === undefined || values[n] === '' || values[n] === null);
  }, [fields, values]);

  const persistRecord = useCallback(
    async (silent: boolean): Promise<{ ok: boolean; recordId: string | null }> => {
      if (!userId) return { ok: false, recordId: null };
      if (readOnly) return { ok: true, recordId };
      // Don't double-fire — autosave + manual save + submit can all race.
      if (persistInFlight.current) return { ok: true, recordId };
      persistInFlight.current = true;

      try {
        // Coerce numeric fields from in-progress strings ("12.", "-") to clean numbers or null.
        const normalized: Record<string, any> = { ...valuesRef.current };
        for (const f of fields) {
          if (!f.name || f.type !== 'number') continue;
          const v = normalized[f.name];
          if (v === undefined || v === null || v === '') {
            normalized[f.name] = null;
            continue;
          }
          if (typeof v === 'number') continue;
          const trimmed = String(v).replace(/\.$/, '').replace(/^-$/, '');
          const num = Number(trimmed);
          normalized[f.name] = Number.isFinite(num) ? num : null;
        }

        const payload: any = {
          test_task_id: params.taskId,
          data: normalized,
          notes: notesRef.current,
          recorded_by: userId,
        };
        if (recordId) payload.id = recordId;

        const { data, error } = await supabase
          .from('test_records')
          .upsert(payload, { onConflict: 'test_task_id' })
          .select('id')
          .single();

        if (error) {
          if (!silent) toast.error(explainSupabaseError(error));
          return { ok: false, recordId };
        }

        const id = data?.id ?? recordId;
        if (id && id !== recordId) setRecordId(id);
        setLastSavedAt(new Date());
        return { ok: true, recordId: id };
      } finally {
        persistInFlight.current = false;
      }
    },
    [userId, readOnly, recordId, params.taskId, toast, fields]
  );

  // Auto-save with debounce — only when dirty + not in a final state and not submitting.
  useEffect(() => {
    if (initialLoad.current) return;
    if (readOnly) return;
    if (!dirty) return;
    if (submittingRef.current) return;

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      // Re-check guards at fire time — they may have changed during the debounce window.
      if (submittingRef.current || readOnly) return;
      setSaving(true);
      const { ok } = await persistRecord(true);
      setSaving(false);
      if (ok) setDirty(false);
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [values, notes, dirty, readOnly, persistRecord]);

  // Dirty-form guard on back press
  useEffect(() => {
    const unsub = nav.addListener('beforeRemove', (e) => {
      if (!dirty || readOnly) return;
      e.preventDefault();
      Alert.alert(
        'Unsaved changes',
        'Save before leaving?',
        [
          { text: 'Discard', style: 'destructive', onPress: () => nav.dispatch(e.data.action) },
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save',
            onPress: async () => {
              setSaving(true);
              const { ok } = await persistRecord(false);
              setSaving(false);
              if (ok) {
                setDirty(false);
                nav.dispatch(e.data.action);
              }
            },
          },
        ],
        { cancelable: true }
      );
    });
    return unsub;
  }, [dirty, readOnly, nav, persistRecord]);

  const submit = async () => {
    if (submittingRef.current) return;
    if (missing.length > 0) {
      setShowRequired(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      toast.warn(`Missing required: ${missing.length} field${missing.length > 1 ? 's' : ''}`);
      return;
    }
    Alert.alert(
      'Submit for review?',
      'Once submitted, you cannot edit this test until your supervisor returns it for rework.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'default',
          onPress: async () => {
            setSubmitting(true);
            // Cancel any in-flight autosave debounce so we don't race ourselves.
            if (autosaveTimer.current) clearTimeout(autosaveTimer.current);

            try {
              const { ok } = await persistRecord(false);
              if (!ok) return;

              // Optimistic concurrency: only transition if the task is still in an
              // engineer-editable state. Matches the web app's guard pattern.
              const { data, error } = await supabase
                .from('test_tasks')
                .update({
                  status: 'SUBMITTED',
                  submitted_at: new Date().toISOString(),
                  rework_reason: null,
                })
                .eq('id', params.taskId)
                .in('status', ENGINEER_EDITABLE_TEST_STATUSES as unknown as string[])
                .select('id');

              if (error) {
                toast.error(explainSupabaseError(error));
                return;
              }
              if (!data || data.length === 0) {
                toast.warn(
                  'Task was already moved by someone else. Refresh to see the latest status.'
                );
                qc.invalidateQueries({ queryKey: ['tasks'] });
                setTimeout(() => nav.goBack(), 600);
                return;
              }

              setStatus('SUBMITTED');
              setDirty(false);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
                () => {}
              );
              qc.invalidateQueries({ queryKey: ['tasks'] });
              qc.invalidateQueries({ queryKey: ['projects'] });
              toast.success('Submitted for review');
              setTimeout(() => nav.goBack(), 400);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  const requiredCount = fields.filter((f) => f.required).length;
  const filledRequired = requiredCount - missing.length;

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight + 8}
    >
      <ScrollView
        contentContainerStyle={{ padding: theme.pad, paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.headerCard}>
          <View style={s.row}>
            <Text style={s.label}>{params.instanceLabel}</Text>
            <View style={[s.badge, { borderColor: statusColor(status) }]}>
              <Text style={[s.badgeText, { color: statusColor(status) }]}>
                {status.replace('_', ' ')}
              </Text>
            </View>
          </View>
          <Text style={s.testName}>{params.testName}</Text>

          {requiredCount > 0 && !readOnly && (
            <View style={s.metaRow}>
              <Text style={s.meta}>
                {filledRequired}/{requiredCount} required filled
              </Text>
              {lastSavedAt && (
                <Text style={s.meta}>
                  {saving ? 'Saving…' : `Saved ${timeAgo(lastSavedAt)}`}
                </Text>
              )}
            </View>
          )}
        </View>

        {fields.length === 0 ? (
          <View style={s.card}>
            <Text style={s.empty}>
              This test template has no structured fields. Use the Notes field below to record
              your readings.
            </Text>
          </View>
        ) : (
          fields.map((f) => {
            if (!f.name) return null;
            const v = values[f.name];
            const isMissing = showRequired && f.required && (v === undefined || v === '' || v === null);
            return (
              <View key={f.name} style={s.field}>
                <Text style={s.fieldLabel}>
                  {f.label ?? f.name}
                  {f.required && <Text style={{ color: theme.danger }}> *</Text>}
                  {f.unit ? <Text style={s.unit}> ({f.unit})</Text> : null}
                </Text>

                {f.enum && f.enum.length > 0 ? (
                  <View style={s.enumRow}>
                    {f.enum.map((opt) => {
                      const active = v === opt;
                      return (
                        <TouchableOpacity
                          key={opt}
                          disabled={readOnly}
                          style={[
                            s.enumChip,
                            active && s.enumChipActive,
                            isMissing && s.enumChipMissing,
                          ]}
                          onPress={() => {
                            setField(f.name!, opt);
                            void Haptics.selectionAsync();
                          }}
                        >
                          <Text style={[s.enumChipText, active && s.enumChipTextActive]}>
                            {opt}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : f.type === 'boolean' ? (
                  <View style={s.enumRow}>
                    {['Yes', 'No'].map((opt) => {
                      const boolVal = opt === 'Yes';
                      const active = v === boolVal;
                      return (
                        <TouchableOpacity
                          key={opt}
                          disabled={readOnly}
                          style={[
                            s.enumChip,
                            active && s.enumChipActive,
                            isMissing && s.enumChipMissing,
                          ]}
                          onPress={() => {
                            setField(f.name!, boolVal);
                            void Haptics.selectionAsync();
                          }}
                        >
                          <Text style={[s.enumChipText, active && s.enumChipTextActive]}>
                            {opt}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <TextInput
                    style={[s.input, readOnly && s.inputDisabled, isMissing && s.inputMissing]}
                    editable={!readOnly}
                    keyboardType={f.type === 'number' ? 'decimal-pad' : 'default'}
                    maxLength={f.type === 'number' ? 24 : 500}
                    value={v === undefined || v === null ? '' : String(v)}
                    onChangeText={(t) => {
                      if (f.type === 'number') {
                        // Strip anything other than digits, single decimal, leading minus.
                        let cleaned = t.replace(/[^0-9.\-]/g, '');
                        // Keep minus only at start.
                        cleaned = cleaned.replace(/(?!^)-/g, '');
                        // Allow at most one decimal point.
                        const firstDot = cleaned.indexOf('.');
                        if (firstDot !== -1) {
                          cleaned =
                            cleaned.slice(0, firstDot + 1) +
                            cleaned.slice(firstDot + 1).replace(/\./g, '');
                        }
                        if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-.') {
                          setField(f.name!, cleaned);
                          return;
                        }
                        const num = Number(cleaned);
                        // Preserve the user's typing state (e.g. trailing dot or zero) by
                        // storing the string when it isn't yet a clean number, otherwise the number.
                        const looksInProgress = /[.\-]$/.test(cleaned) || /\.0*$/.test(cleaned);
                        setField(f.name!, looksInProgress || Number.isNaN(num) ? cleaned : num);
                      } else {
                        setField(f.name!, t);
                      }
                    }}
                    placeholder="Enter value"
                    placeholderTextColor={theme.textDim}
                  />
                )}
                {isMissing && <Text style={s.errText}>Required</Text>}
              </View>
            );
          })
        )}

        <View style={s.field}>
          <Text style={s.fieldLabel}>Notes</Text>
          <TextInput
            style={[s.input, s.notes, readOnly && s.inputDisabled]}
            editable={!readOnly}
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotesDirty}
            placeholder="Observations, anomalies, instrument notes…"
            placeholderTextColor={theme.textDim}
          />
        </View>
      </ScrollView>

      {!readOnly && (
        <View style={s.actions}>
          <TouchableOpacity
            style={[s.btn, s.btnGhost]}
            disabled={saving || submitting || !dirty}
            onPress={async () => {
              if (submittingRef.current) return;
              setSaving(true);
              const { ok } = await persistRecord(false);
              setSaving(false);
              if (ok) {
                setDirty(false);
                toast.success('Draft saved');
              }
            }}
          >
            <Text style={[s.btnGhostText, (!dirty || saving || submitting) && { opacity: 0.5 }]}>
              {saving ? 'Saving…' : dirty ? 'Save draft' : 'Saved'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btn, s.btnPrimary, (saving || submitting) && { opacity: 0.7 }]}
            onPress={submit}
            disabled={saving || submitting}
          >
            {submitting ? (
              <ActivityIndicator color={theme.primaryText} />
            ) : (
              <Text style={s.btnPrimaryText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function timeAgo(d: Date): string {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  return d.toLocaleTimeString();
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  headerCard: {
    backgroundColor: theme.card,
    padding: theme.pad,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 14,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: theme.text, fontWeight: '700' },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  testName: { color: theme.text, marginTop: 6, fontSize: 18, fontWeight: '600' },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  meta: { color: theme.textDim, fontSize: 11 },
  card: {
    backgroundColor: theme.card,
    padding: theme.pad,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
  },
  empty: { color: theme.textDim, lineHeight: 20 },
  field: { marginBottom: 14 },
  fieldLabel: { color: theme.textDim, fontSize: 12, marginBottom: 6 },
  unit: { color: theme.textDim, fontSize: 11 },
  input: {
    backgroundColor: theme.card,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  inputDisabled: { opacity: 0.6 },
  inputMissing: { borderColor: theme.danger },
  notes: { minHeight: 90, textAlignVertical: 'top' },
  enumRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  enumChip: {
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.card,
  },
  enumChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  enumChipMissing: { borderColor: theme.danger },
  enumChipText: { color: theme.text, fontSize: 13 },
  enumChipTextActive: { color: theme.primaryText, fontWeight: '700' },
  errText: { color: theme.danger, fontSize: 11, marginTop: 4 },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    padding: theme.pad,
    paddingBottom: 24,
    backgroundColor: theme.bg,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    gap: 10,
  },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  btnGhost: { borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card },
  btnGhostText: { color: theme.text, fontWeight: '600' },
  btnPrimary: { backgroundColor: theme.primary },
  btnPrimaryText: { color: theme.primaryText, fontWeight: '700' },
});
