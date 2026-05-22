import React, { useEffect, useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '@/theme';
import { platformAdminPassword } from '@/lib/platformFetch';
import { useToast } from '@/components/Toast';
import type { RootStackParamList } from '@/navigation/types';

export const PLATFORM_AUTH_KEY = 'platform_authed';

type Props = NativeStackScreenProps<RootStackParamList, 'PlatformLogin'>;

export default function PlatformLoginScreen({ navigation }: Props) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PLATFORM_AUTH_KEY).then(v => {
      if (v === 'true') {
        navigation.replace('PlatformDashboard');
      }
    });
  }, [navigation]);

  const expected = platformAdminPassword();

  const onSubmit = async () => {
    setBusy(true);
    if (!expected) {
      toast.error('platformAdminPassword not configured in app.json');
      setBusy(false);
      return;
    }
    if (password === expected) {
      await AsyncStorage.setItem(PLATFORM_AUTH_KEY, 'true');
      navigation.replace('PlatformDashboard');
    } else {
      toast.error('Invalid platform password');
    }
    setBusy(false);
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
          <Text style={s.tag}>Platform Admin</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Owner sign in</Text>
          <Text style={s.cardSub}>
            Platform owner access only · admin.optimustesting.com
          </Text>

          <Text style={s.label}>Platform Password</Text>
          <TextInput
            style={s.input}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={theme.textDim}
            onSubmitEditing={onSubmit}
          />

          <TouchableOpacity
            style={[s.btn, busy && s.btnDisabled]}
            disabled={busy}
            onPress={onSubmit}
          >
            {busy ? (
              <ActivityIndicator color={theme.primaryText} />
            ) : (
              <Text style={s.btnText}>Enter Admin Panel</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.backLink}>← Back to engineer sign-in</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  flex: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  brand: { alignItems: 'center', marginBottom: 32 },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoMark: { fontSize: 26, color: theme.primaryText },
  logo: { color: theme.text, fontSize: 22, fontWeight: '700' },
  tag: {
    color: theme.textDim,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 24,
  },
  cardTitle: { color: theme.text, fontSize: 18, fontWeight: '600' },
  cardSub: { color: theme.textDim, fontSize: 12, marginTop: 4, marginBottom: 20 },
  label: {
    color: theme.textDim,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.bg,
    color: theme.text,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 20,
  },
  btn: {
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: theme.primaryText, fontWeight: '600', fontSize: 15 },
  backLink: { color: theme.textDim, fontSize: 12, textAlign: 'center' },
});
