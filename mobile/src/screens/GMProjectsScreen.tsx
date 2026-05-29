import React, { memo, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@/context/AuthContext';
import { useGMProjects, type GMProject } from '@/hooks/useGMProjects';
import { theme, statusColor } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'GMProjects'>;

const STATUS_COLORS: Record<string, string> = {
  DRAFT: theme.textDim,
  APPROVED: theme.accent,
  ACTIVE: theme.success,
  CLOSED: theme.textDim,
};

export default function GMProjectsScreen() {
  const nav = useNavigation<Nav>();
  const { profile, role } = useAuth();
  const q = useGMProjects();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('ALL');

  const initials = (profile?.full_name ?? 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  useLayoutEffect(() => {
    nav.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity onPress={() => nav.navigate('Reports')} style={s.headerIcon}>
            <Text style={s.headerIconText}>📊</Text>
          </TouchableOpacity>
          {role === 'SUPERADMIN' && (
            <TouchableOpacity
              onPress={() => nav.navigate('UserManagement')}
              style={s.headerIcon}
            >
              <Text style={s.headerIconText}>👥</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => nav.navigate('Profile')} style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [nav, initials, role]);

  const projects = q.data ?? [];

  const stats = useMemo(() => ({
    total: projects.length,
    active: projects.filter((p) => p.status === 'ACTIVE').length,
    closed: projects.filter((p) => p.status === 'CLOSED').length,
    unassigned: projects.filter((p) => !p.assigned_supervisor_name).length,
  }), [projects]);

  const visible = useMemo(() => {
    const q2 = search.toLowerCase();
    return projects.filter((p) => {
      const matchStatus = filter === 'ALL' || p.status === filter;
      const matchSearch =
        !q2 ||
        p.project_number.toLowerCase().includes(q2) ||
        p.site_name.toLowerCase().includes(q2) ||
        (p.client ?? '').toLowerCase().includes(q2);
      return matchStatus && matchSearch;
    });
  }, [projects, search, filter]);

  if (q.isLoading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  const FILTERS = ['ALL', 'DRAFT', 'APPROVED', 'ACTIVE', 'CLOSED'];

  return (
    <View style={s.root}>
      {/* Stats row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.statsScroll}
        contentContainerStyle={s.statsRow}>
        {[
          { label: 'Total', value: stats.total, color: theme.text },
          { label: 'Active', value: stats.active, color: theme.success },
          { label: 'Closed', value: stats.closed, color: theme.textDim },
          { label: 'No Supervisor', value: stats.unassigned, color: theme.warn },
        ].map((stat) => (
          <View key={stat.label} style={s.statCard}>
            <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Search */}
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search projects…"
          placeholderTextColor={theme.textDim}
        />
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll}
        contentContainerStyle={s.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.chip, filter === f && s.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.chipText, filter === f && s.chipTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={visible}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: theme.pad, paddingTop: 4 }}
        refreshControl={
          <RefreshControl
            refreshing={q.isFetching && !q.isLoading}
            onRefresh={() => q.refetch()}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>No projects match this filter.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() =>
              nav.navigate('ProjectOverview', {
                projectId: item.id,
                projectNumber: item.project_number,
                siteName: item.site_name,
              })
            }
          />
        )}
      />

      {/* FAB — create new project */}
      <TouchableOpacity style={s.fab} onPress={() => nav.navigate('CreateProject')}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const ProjectCard = memo(function ProjectCard({
  project,
  onPress,
}: {
  project: GMProject;
  onPress: () => void;
}) {
  const sc = STATUS_COLORS[project.status] ?? theme.textDim;
  return (
    <TouchableOpacity activeOpacity={0.75} style={s.card} onPress={onPress}>
      <View style={s.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.projectNum}>{project.project_number}</Text>
          <Text style={s.siteName}>{project.site_name}</Text>
          {project.client ? <Text style={s.client}>{project.client}</Text> : null}
        </View>
        <View style={[s.badge, { borderColor: sc }]}>
          <Text style={[s.badgeText, { color: sc }]}>{project.status}</Text>
        </View>
      </View>
      {project.assigned_supervisor_name ? (
        <Text style={s.supervisor}>Supervisor: {project.assigned_supervisor_name}</Text>
      ) : (
        <Text style={[s.supervisor, { color: theme.warn }]}>No supervisor assigned</Text>
      )}
    </TouchableOpacity>
  );
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  statsScroll: { flexGrow: 0 },
  statsRow: { padding: theme.pad, gap: 10, paddingBottom: 8 },
  statCard: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 80,
  },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { color: theme.textDim, fontSize: 11, marginTop: 2 },
  searchRow: { paddingHorizontal: theme.pad, paddingBottom: 8 },
  searchInput: {
    backgroundColor: theme.card,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  filterScroll: { flexGrow: 0 },
  filterRow: { paddingHorizontal: theme.pad, gap: 8, paddingBottom: 8 },
  chip: {
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipText: { color: theme.textDim, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: theme.primaryText },
  card: {
    backgroundColor: theme.card,
    padding: theme.pad,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  projectNum: { color: theme.text, fontWeight: '700', fontSize: 16 },
  siteName: { color: theme.textDim, fontSize: 13, marginTop: 2 },
  client: { color: theme.textDim, fontSize: 12, marginTop: 1 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  supervisor: { color: theme.textDim, fontSize: 12 },
  empty: { paddingTop: 60, alignItems: 'center' },
  emptyText: { color: theme.textDim },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  avatarText: { color: theme.primary, fontWeight: '800', fontSize: 13 },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: { fontSize: 16 },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },
});
