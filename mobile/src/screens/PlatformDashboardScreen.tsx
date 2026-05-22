import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { roleBadge, theme } from '@/theme';
import { platformFetch } from '@/lib/platformFetch';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { PLATFORM_AUTH_KEY } from './PlatformLoginScreen';
import type { RootStackParamList } from '@/navigation/types';

const BASE_DOMAIN = 'optimustesting.com';

type Company = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  is_active: boolean;
};

type Stats = { companies: number; users: number; activeProjects: number };

type GlobalUser = {
  id: string;
  full_name: string;
  email: string;
  company_id: string | null;
  company_name: string | null;
  company_slug: string | null;
  role: string;
};

type Tab = 'companies' | 'users' | 'create';

type Props = NativeStackScreenProps<RootStackParamList, 'PlatformDashboard'>;

export default function PlatformDashboardScreen({ navigation }: Props) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('companies');
  const [stats, setStats] = useState<Stats>({ companies: 0, users: 0, activeProjects: 0 });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<GlobalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCompanies = useCallback(async () => {
    const [statsData, companiesData] = await Promise.all([
      platformFetch<any>('get_stats'),
      platformFetch<any>('get_all_companies'),
    ]);
    setStats({
      companies: statsData?.total_companies ?? 0,
      users: statsData?.total_users ?? 0,
      activeProjects: statsData?.active_projects ?? 0,
    });
    setCompanies(companiesData?.companies ?? []);
  }, []);

  const fetchUsers = useCallback(async () => {
    const data = await platformFetch<any>('get_all_users');
    setUsers(Array.isArray(data?.users) ? data.users : []);
    setUsersLoaded(true);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await fetchCompanies();
      } catch (err: any) {
        toast.error(`Failed to load: ${err.message ?? err}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchCompanies, toast]);

  const onTab = async (next: Tab) => {
    setTab(next);
    if (next === 'users' && !usersLoaded) {
      setLoading(true);
      try {
        await fetchUsers();
      } catch (err: any) {
        toast.error(`Failed to load users: ${err.message ?? err}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (tab === 'companies') await fetchCompanies();
      else if (tab === 'users') await fetchUsers();
    } catch (err: any) {
      toast.error(`Refresh failed: ${err.message ?? err}`);
    } finally {
      setRefreshing(false);
    }
  };

  const toggleStatus = async (c: Company) => {
    const next = !c.is_active;
    Alert.alert(
      `${next ? 'Activate' : 'Suspend'} ${c.name}?`,
      next
        ? 'This will restore access for all users of this company.'
        : 'All users will be signed out and blocked from logging in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: next ? 'Activate' : 'Suspend',
          style: next ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await platformFetch('toggle_company_status', { company_id: c.id, is_active: next });
              setCompanies(prev => prev.map(x => (x.id === c.id ? { ...x, is_active: next } : x)));
              toast.success(next ? 'Company activated' : 'Company suspended');
            } catch (err: any) {
              toast.error(err.message ?? 'Failed to update status');
            }
          },
        },
      ],
    );
  };

  const deleteCompany = (c: Company) => {
    Alert.alert(
      `Delete ${c.name}?`,
      'This permanently deletes the company, all users, projects, and test data. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await platformFetch('delete_company', { company_id: c.id });
              toast.success(`${c.name} deleted`);
              await fetchCompanies();
            } catch (err: any) {
              toast.error(err.message ?? 'Failed to delete');
            }
          },
        },
      ],
    );
  };

  const logout = async () => {
    await AsyncStorage.removeItem(PLATFORM_AUTH_KEY);
    navigation.replace('PlatformLogin');
  };

  const headerRight = (
    <TouchableOpacity onPress={logout} style={s.logoutBtn}>
      <Text style={s.logoutText}>Logout</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <View style={s.headerBrand}>
          <View style={s.logoBox}>
            <Text style={s.logoMark}>⚡</Text>
          </View>
          <View>
            <Text style={s.headerTitle}>TestFlow</Text>
            <Text style={s.headerTag}>Platform Admin</Text>
          </View>
        </View>
        {headerRight}
      </View>

      <View style={s.tabBar}>
        <TabPill label="Companies" active={tab === 'companies'} onPress={() => onTab('companies')} />
        <TabPill label="Users" active={tab === 'users'} onPress={() => onTab('users')} />
        <TabPill label="Create" active={tab === 'create'} onPress={() => onTab('create')} />
      </View>

      {tab === 'companies' && (
        <FlatList
          data={companies}
          keyExtractor={c => c.id}
          ListHeaderComponent={<StatsBar stats={stats} loading={loading} />}
          renderItem={({ item }) => (
            <CompanyCard
              company={item}
              onToggle={() => toggleStatus(item)}
              onDelete={() => deleteCompany(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={s.listPad}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            loading ? null : (
              <View style={s.empty}>
                <Text style={s.emptyText}>No companies yet. Switch to Create.</Text>
              </View>
            )
          }
        />
      )}

      {tab === 'users' && (
        <FlatList
          data={users}
          keyExtractor={u => u.id}
          renderItem={({ item }) => <UserCard user={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={s.listPad}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            loading ? (
              <View style={s.empty}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : (
              <View style={s.empty}>
                <Text style={s.emptyText}>No users found.</Text>
              </View>
            )
          }
        />
      )}

      {tab === 'create' && (
        <CreateTenantForm
          onCreated={async () => {
            await fetchCompanies();
            setTab('companies');
          }}
        />
      )}

      {loading && tab === 'companies' && companies.length === 0 && (
        <View style={s.loaderOverlay} pointerEvents="none">
          <ActivityIndicator color={theme.primary} />
        </View>
      )}
    </SafeAreaView>
  );
}

function TabPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.tabPill, active && s.tabPillActive]}
      android_ripple={{ color: theme.muted }}
    >
      <Text style={[s.tabPillText, active && s.tabPillTextActive]}>{label}</Text>
    </Pressable>
  );
}

function StatsBar({ stats, loading }: { stats: Stats; loading: boolean }) {
  const cells = [
    { label: 'Companies', value: stats.companies },
    { label: 'Users', value: stats.users },
    { label: 'Active', value: stats.activeProjects },
  ];
  return (
    <View style={s.statsRow}>
      {cells.map(c => (
        <View key={c.label} style={s.statCard}>
          <Text style={s.statValue}>
            {loading ? '…' : c.value}
          </Text>
          <Text style={s.statLabel}>{c.label}</Text>
        </View>
      ))}
    </View>
  );
}

function CompanyCard({
  company,
  onToggle,
  onDelete,
}: {
  company: Company;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const workspaceUrl = `https://${company.slug}.${BASE_DOMAIN}`;
  const created = new Date(company.created_at).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>{company.name}</Text>
          <View style={s.slugChip}>
            <Text style={s.slugChipText}>{company.slug}</Text>
          </View>
        </View>
        <StatusPill active={company.is_active} />
      </View>

      <TouchableOpacity onPress={() => Linking.openURL(workspaceUrl)}>
        <Text style={s.link}>{workspaceUrl} ↗</Text>
      </TouchableOpacity>
      <Text style={s.metaLine}>Created {created}</Text>

      <View style={s.actionRow}>
        <ActionBtn label="Open" onPress={() => Linking.openURL(workspaceUrl)} />
        <ActionBtn
          label={company.is_active ? 'Suspend' : 'Activate'}
          color={company.is_active ? theme.warn : theme.success}
          onPress={onToggle}
        />
        <ActionBtn label="Delete" color={theme.danger} onPress={onDelete} />
      </View>
    </View>
  );
}

function UserCard({ user }: { user: GlobalUser }) {
  const badge = roleBadge[user.role as keyof typeof roleBadge] ?? {
    text: theme.textDim,
    bg: theme.muted,
    border: theme.border,
  };
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>{user.full_name || '—'}</Text>
          <Text style={s.metaLine}>{user.email}</Text>
        </View>
        <View
          style={[
            s.roleBadge,
            { backgroundColor: badge.bg, borderColor: badge.border },
          ]}
        >
          <Text style={[s.roleBadgeText, { color: badge.text }]}>
            {user.role === 'SUPERVISOR' ? 'MANAGER' : user.role}
          </Text>
        </View>
      </View>
      <Text style={s.metaLine}>
        {user.company_name ? `${user.company_name} · ${user.company_slug}` : 'No company'}
      </Text>
    </View>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <View
      style={[
        s.statusPill,
        {
          backgroundColor: active ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
          borderColor: active ? 'rgba(34,197,94,0.30)' : 'rgba(239,68,68,0.30)',
        },
      ]}
    >
      <View
        style={[
          s.statusDot,
          { backgroundColor: active ? '#4ade80' : '#f87171' },
        ]}
      />
      <Text
        style={[s.statusPillText, { color: active ? '#4ade80' : '#f87171' }]}
      >
        {active ? 'Active' : 'Suspended'}
      </Text>
    </View>
  );
}

function ActionBtn({
  label,
  onPress,
  color,
}: {
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={s.actionBtn}>
      <Text style={[s.actionBtnText, color ? { color } : null]}>{label}</Text>
    </TouchableOpacity>
  );
}

function generateSlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function CreateTenantForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const toast = useToast();
  const [companyName, setCompanyName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const slugValid = useMemo(
    () => /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || /^[a-z0-9]$/.test(slug),
    [slug],
  );

  const submit = async () => {
    if (!slugValid) {
      toast.warn('Slug must be lowercase a–z, 0–9, hyphens');
      return;
    }
    if (adminPassword.length < 8) {
      toast.warn('Password must be at least 8 characters');
      return;
    }
    setBusy(true);
    try {
      // create-tenant Edge Function — same body shape as web.
      const token = Constants.expoConfig?.extra?.platformAdminToken;
      const { data, error } = await supabase.functions.invoke('create-tenant', {
        body: {
          name: companyName.trim(),
          slug: slug.trim(),
          email: adminEmail.trim(),
          password: adminPassword,
          full_name: adminFullName.trim(),
        },
        headers: { 'X-Platform-Token': token ?? '' },
      });
      if (error) throw error;
      if ((data as any)?.error) {
        const err = (data as any).error;
        if (err === 'slug_taken') throw new Error(`Slug "${slug}" already in use`);
        if (err === 'email_taken') throw new Error(`${adminEmail} already registered`);
        throw new Error((data as any).message ?? err);
      }
      toast.success(`${companyName} created`);
      setCompanyName('');
      setSlug('');
      setSlugManual(false);
      setAdminFullName('');
      setAdminEmail('');
      setAdminPassword('');
      await onCreated();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to create');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[s.listPad, { paddingTop: 8 }]}>
      <View style={s.card}>
        <Text style={s.formSection}>Company Details</Text>
        <FormField label="Company Name" value={companyName} onChangeText={t => {
          setCompanyName(t);
          if (!slugManual) setSlug(generateSlug(t));
        }} placeholder="Acme Power Corp" />
        <FormField
          label="Slug"
          value={slug}
          onChangeText={t => { setSlugManual(true); setSlug(t.toLowerCase().replace(/[^a-z0-9-]/g, '')); }}
          placeholder="acme-power"
          mono
        />
        {slug ? (
          <Text style={[s.hint, !slugValid && { color: theme.danger }]}>
            {slugValid ? `→ https://${slug}.${BASE_DOMAIN}` : 'a–z, 0–9, hyphens only'}
          </Text>
        ) : null}

        <View style={s.divider} />

        <Text style={s.formSection}>SUPERADMIN Account</Text>
        <FormField label="Full Name" value={adminFullName} onChangeText={setAdminFullName} placeholder="Jane Smith" />
        <FormField label="Email" value={adminEmail} onChangeText={setAdminEmail} placeholder="admin@acme.com" keyboardType="email-address" />
        <FormField label="Password" value={adminPassword} onChangeText={setAdminPassword} placeholder="Min. 8 characters" secureTextEntry />

        <TouchableOpacity
          style={[s.submitBtn, (busy || !companyName || !slugValid || !adminFullName || !adminEmail || adminPassword.length < 8) && s.btnDisabled]}
          disabled={busy || !companyName || !slugValid || !adminFullName || !adminEmail || adminPassword.length < 8}
          onPress={submit}
        >
          {busy ? <ActivityIndicator color={theme.primaryText} /> : <Text style={s.submitBtnText}>Create Company + Admin</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FormField(props: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  mono?: boolean;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.label}>{props.label}</Text>
      <TextInput
        style={[s.input, props.mono && { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) }]}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={theme.textDim}
        secureTextEntry={props.secureTextEntry}
        autoCapitalize={props.keyboardType === 'email-address' ? 'none' : 'sentences'}
        autoCorrect={false}
        keyboardType={props.keyboardType ?? 'default'}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
  },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: theme.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  logoMark: { color: theme.primaryText, fontSize: 18 },
  headerTitle: { color: theme.text, fontWeight: '700', fontSize: 15 },
  headerTag: {
    color: theme.textDim, fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  logoutBtn: {
    borderWidth: 1, borderColor: theme.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  logoutText: { color: theme.text, fontSize: 12, fontWeight: '500' },

  tabBar: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
    backgroundColor: theme.bg,
  },
  tabPill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border,
  },
  tabPillActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  tabPillText: { color: theme.textDim, fontSize: 12, fontWeight: '600' },
  tabPillTextActive: { color: theme.primaryText },

  listPad: { padding: 16, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border,
    borderRadius: theme.radius, paddingVertical: 12, alignItems: 'center',
  },
  statValue: {
    color: theme.text, fontSize: 22, fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  statLabel: {
    color: theme.textDim, fontSize: 10, letterSpacing: 1.2,
    textTransform: 'uppercase', marginTop: 4,
  },

  card: {
    backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border,
    borderRadius: theme.radius, padding: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardTitle: { color: theme.text, fontSize: 15, fontWeight: '600' },
  slugChip: {
    alignSelf: 'flex-start', backgroundColor: theme.muted, paddingHorizontal: 6,
    paddingVertical: 2, borderRadius: 4, marginTop: 4,
  },
  slugChipText: {
    color: theme.textDim, fontSize: 11,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  link: { color: theme.primary, fontSize: 12, marginTop: 8 },
  metaLine: { color: theme.textDim, fontSize: 11, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  actionBtn: {
    flex: 1, minWidth: 80, paddingVertical: 8, paddingHorizontal: 10,
    borderWidth: 1, borderColor: theme.border, borderRadius: 8, alignItems: 'center',
  },
  actionBtnText: { color: theme.text, fontSize: 12, fontWeight: '500' },

  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: {
    fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase',
  },

  roleBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 10, fontWeight: '700', letterSpacing: 0.8,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },

  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: theme.textDim, fontSize: 13 },
  loaderOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },

  formSection: {
    color: theme.textDim, fontSize: 10, letterSpacing: 1.5,
    textTransform: 'uppercase', fontWeight: '600', marginBottom: 12,
  },
  label: {
    color: theme.textDim, fontSize: 10, letterSpacing: 1.2,
    textTransform: 'uppercase', marginBottom: 4,
  },
  input: {
    borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bg,
    color: theme.text, borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 14,
  },
  hint: { color: theme.textDim, fontSize: 11, marginTop: -6, marginBottom: 8 },
  divider: { height: 1, backgroundColor: theme.border, marginVertical: 12 },
  submitBtn: {
    backgroundColor: theme.primary, borderRadius: 8, paddingVertical: 12,
    alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  submitBtnText: { color: theme.primaryText, fontWeight: '600', fontSize: 14 },
});
