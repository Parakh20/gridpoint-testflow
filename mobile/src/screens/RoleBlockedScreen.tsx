import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { theme } from '@/theme';

export default function RoleBlockedScreen() {
  const { role, email, signOut, profile } = useAuth();

  const message =
    role === null
      ? 'Your account does not have a role assigned yet. Ask your company admin to set you up as an Engineer.'
      : 'This mobile app is for Field Engineers. Your role is ' +
        role +
        ' — please use the web dashboard at testflow.io instead.';

  return (
    <SafeAreaView style={s.root}>
      <View style={s.card}>
        <Text style={s.icon}>⛔</Text>
        <Text style={s.title}>Access restricted</Text>
        <Text style={s.body}>{message}</Text>

        <View style={s.meta}>
          {profile?.company_name && (
            <Text style={s.metaLine}>Workspace · {profile.company_name}</Text>
          )}
          {email && <Text style={s.metaLine}>Signed in as · {email}</Text>}
          {role && <Text style={s.metaLine}>Role · {role}</Text>}
        </View>

        <TouchableOpacity style={s.btn} onPress={signOut}>
          <Text style={s.btnText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
    paddingHorizontal: theme.pad,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    padding: 24,
    alignItems: 'center',
  },
  icon: { fontSize: 48 },
  title: { color: theme.text, fontSize: 22, fontWeight: '700', marginTop: 12 },
  body: { color: theme.textDim, marginTop: 10, textAlign: 'center', lineHeight: 21 },
  meta: { marginTop: 24, alignSelf: 'stretch' },
  metaLine: { color: theme.textDim, fontSize: 12, marginTop: 4 },
  btn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  btnText: { color: theme.primaryText, fontWeight: '700' },
});
