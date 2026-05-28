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
import { useCreateUser } from '@/hooks/useCompanyUsers';
import { useToast } from '@/components/Toast';
import { theme, roleBadge } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CreateUser'>;

const ROLES = ['ENGINEER', 'SUPERVISOR', 'GM', 'SUPERADMIN'] as const;
type Role = typeof ROLES[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PWD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;

export default function CreateUserScreen() {
  const nav = useNavigation<Nav>();
  const toast = useToast();
  const mutation = useCreateUser();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('ENGINEER');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPwd, setShowPwd] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Required';
    if (!email.trim()) e.email = 'Required';
    else if (!EMAIL_RE.test(email)) e.email = 'Invalid email address';
    if (!password) e.password = 'Required';
    else if (!PWD_RE.test(password)) e.password = 'Must be 10+ chars with uppercase, lowercase, and a digit';
    return e;
  };

  const handleCreate = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    try {
      await mutation.mutateAsync({ name: name.trim(), email: email.trim(), password, role });
      toast.success('User created');
      nav.goBack();
    } catch (err: any) {
      const msg: string = err?.edgeFnError ?? err?.message ?? 'Failed to create user';
      if (msg.toLowerCase().includes('rate')) {
        toast.error('Rate limit reached — try again later');
      } else if (msg.toLowerCase().includes('email') || msg.toLowerCase().includes('already')) {
        setErrors({ email: 'Email already in use' });
      } else {
        toast.error(msg);
      }
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <Field label="Full Name *" error={errors.name}>
            <TextInput
              style={[s.input, errors.name && s.inputError]}
              value={name}
              onChangeText={(v) => { setName(v); setErrors((p) => ({ ...p, name: '' })); }}
              placeholder="e.g. Rajesh Kumar"
              placeholderTextColor={theme.textDim}
            />
          </Field>

          <Field label="Email *" error={errors.email}>
            <TextInput
              style={[s.input, errors.email && s.inputError]}
              value={email}
              onChangeText={(v) => { setEmail(v); setErrors((p) => ({ ...p, email: '' })); }}
              placeholder="user@company.com"
              placeholderTextColor={theme.textDim}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </Field>

          <Field label="Password *" error={errors.password}>
            <View style={s.pwdRow}>
              <TextInput
                style={[s.input, s.pwdInput, errors.password && s.inputError]}
                value={password}
                onChangeText={(v) => { setPassword(v); setErrors((p) => ({ ...p, password: '' })); }}
                placeholder="10+ chars, upper + lower + digit"
                placeholderTextColor={theme.textDim}
                secureTextEntry={!showPwd}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={s.showPwdBtn} onPress={() => setShowPwd((v) => !v)}>
                <Text style={s.showPwdText}>{showPwd ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </Field>

          <Field label="Role">
            <View style={s.roleRow}>
              {ROLES.map((r) => {
                const rb = roleBadge[r];
                const active = role === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[
                      s.roleChip,
                      active && { backgroundColor: rb.bg, borderColor: rb.border },
                    ]}
                    onPress={() => setRole(r)}
                  >
                    <Text style={[s.roleChipText, active && { color: rb.text }]}>{r}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Field>

          <TouchableOpacity
            style={[s.btn, mutation.isPending && s.btnDisabled]}
            onPress={handleCreate}
            disabled={mutation.isPending}
          >
            <Text style={s.btnText}>{mutation.isPending ? 'Creating…' : 'Create User'}</Text>
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
    flex: 1,
  },
  inputError: { borderColor: theme.danger },
  errorText: { color: theme.danger, fontSize: 12, marginTop: 4 },
  pwdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pwdInput: { flex: 1 },
  showPwdBtn: { paddingHorizontal: 12, paddingVertical: 11, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 10 },
  showPwdText: { color: theme.primary, fontWeight: '600', fontSize: 13 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: { borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  roleChipText: { color: theme.textDim, fontWeight: '600', fontSize: 13 },
  btn: { backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: theme.primaryText, fontWeight: '700', fontSize: 16 },
});
