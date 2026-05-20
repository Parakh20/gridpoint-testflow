import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { theme } from '@/theme';

function isLikelyEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export default function LoginScreen() {
  const { signIn } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    const trimmed = email.trim();
    if (!isLikelyEmail(trimmed)) {
      toast.warn('Enter a valid email address');
      return;
    }
    if (password.length < 6) {
      toast.warn('Password must be at least 6 characters');
      return;
    }

    setBusy(true);
    const { error } = await signIn(trimmed, password);
    setBusy(false);
    if (error) {
      toast.error(
        /Invalid login credentials/i.test(error)
          ? 'Incorrect email or password'
          : error
      );
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.flex}
      >
        <View style={s.brand}>
          <View style={s.logoBox}>
            <Text style={s.logoMark}>⚡</Text>
          </View>
          <Text style={s.logo}>TestFlow</Text>
          <Text style={s.tag}>Field Engineer</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Sign in</Text>
          <Text style={s.cardSub}>Use the credentials issued by your company admin.</Text>

          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.com"
            placeholderTextColor={theme.textDim}
            editable={!busy}
          />

          <Text style={s.label}>Password</Text>
          <View style={s.passwordRow}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              secureTextEntry={!show}
              autoCapitalize="none"
              autoComplete="password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={theme.textDim}
              editable={!busy}
              onSubmitEditing={onSubmit}
              returnKeyType="go"
            />
            <TouchableOpacity onPress={() => setShow((v) => !v)} style={s.eye}>
              <Text style={s.eyeText}>{show ? 'HIDE' : 'SHOW'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[s.button, busy && { opacity: 0.7 }]} onPress={onSubmit} disabled={busy}>
            {busy ? (
              <ActivityIndicator color={theme.primaryText} />
            ) : (
              <Text style={s.buttonText}>Sign in</Text>
            )}
          </TouchableOpacity>

          <Text style={s.note}>
            No public sign-up. Forgot your password? Ask your company admin to reset it.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  flex: { flex: 1, justifyContent: 'center', padding: theme.pad },
  brand: { alignItems: 'center', marginBottom: 32 },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoMark: { fontSize: 30 },
  logo: { color: theme.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  tag: { color: theme.textDim, marginTop: 4 },
  card: {
    backgroundColor: theme.card,
    padding: 20,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardTitle: { color: theme.text, fontSize: 18, fontWeight: '700' },
  cardSub: { color: theme.textDim, fontSize: 12, marginTop: 2, marginBottom: 12 },
  label: { color: theme.textDim, fontSize: 12, marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: theme.bg,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eye: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  eyeText: { color: theme.primary, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  button: {
    backgroundColor: theme.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: { color: theme.primaryText, fontWeight: '700', fontSize: 15 },
  note: { color: theme.textDim, fontSize: 11, marginTop: 16, textAlign: 'center', lineHeight: 16 },
});
