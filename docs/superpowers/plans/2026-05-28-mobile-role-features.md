# Mobile Role Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full GM/SUPERADMIN/SUPERVISOR feature parity on mobile — project creation/editing, scope management, supervisor/engineer assignment, and SUPERADMIN user management.

**Architecture:** Dedicated stack screens per action (8 new screens), hooks grouped by domain, entry points via FAB on GMProjectsScreen and action buttons on ProjectOverviewScreen. No new native modules — fully OTA-compatible.

**Tech Stack:** React Native (Expo), TanStack Query v5, Supabase JS client, `@testflow/shared` for error messages, `theme.*` tokens, `useToast()` for feedback.

---

## File Map

**New files:**
- `mobile/src/hooks/useProjectMutations.ts` — create, update project; fetch single project for editing
- `mobile/src/hooks/useScopeItems.ts` — fetch scope_items, upsert all 8 equipment types
- `mobile/src/hooks/useCompanyMembers.ts` — supervisors list, engineers list, project instances with assignees, assign supervisor/engineer mutations
- `mobile/src/hooks/useCompanyUsers.ts` — all company users list; create/role-change/active-toggle mutations
- `mobile/src/screens/CreateProjectScreen.tsx`
- `mobile/src/screens/EditProjectScreen.tsx`
- `mobile/src/screens/ScopeManagementScreen.tsx`
- `mobile/src/screens/AssignSupervisorScreen.tsx`
- `mobile/src/screens/EngineerAssignmentScreen.tsx`
- `mobile/src/screens/UserManagementScreen.tsx`
- `mobile/src/screens/CreateUserScreen.tsx`
- `mobile/src/screens/UserDetailScreen.tsx`

**Modified files:**
- `mobile/src/navigation/types.ts` — add 8 new routes
- `mobile/src/navigation/RootNavigator.tsx` — import and register new screens
- `mobile/src/screens/GMProjectsScreen.tsx` — FAB + SUPERADMIN users icon
- `mobile/src/screens/ProjectOverviewScreen.tsx` — action buttons row

---

## Task 1: Extend Navigation Types and RootNavigator

**Files:**
- Modify: `mobile/src/navigation/types.ts`
- Modify: `mobile/src/navigation/RootNavigator.tsx`

- [ ] **Step 1: Add new routes to types.ts**

Replace entire file content:

```typescript
export type RootStackParamList = {
  Login: undefined;
  Profile: undefined;
  // Engineer
  Projects: undefined;
  Tasks: { projectId: string; projectNumber: string };
  EquipmentDetail: {
    instanceId: string;
    instanceLabel: string;
    equipmentType: string;
    projectId: string;
  };
  TestForm: {
    taskId: string;
    templateId: string;
    instanceLabel: string;
    testName: string;
    currentStatus: string;
  };
  // GM / SUPERADMIN
  GMProjects: undefined;
  CreateProject: undefined;
  EditProject: { projectId: string; projectNumber: string };
  ScopeManagement: { projectId: string; projectNumber: string };
  AssignSupervisor: { projectId: string; projectNumber: string };
  // GM / SUPERADMIN / SUPERVISOR
  EngineerAssignment: { projectId: string; projectNumber: string };
  // SUPERADMIN only
  UserManagement: undefined;
  CreateUser: undefined;
  UserDetail: { userId: string; userName: string };
  // Supervisor
  SupervisorHome: undefined;
  // Shared (GM + Supervisor + SUPERADMIN)
  ProjectOverview: {
    projectId: string;
    projectNumber: string;
    siteName: string;
  };
  // Platform admin
  PlatformLogin: undefined;
  PlatformDashboard: undefined;
};
```

- [ ] **Step 2: Add imports for new screens in RootNavigator.tsx**

Add these imports after the existing `// GM` import block (around line 17):

```typescript
// GM / SUPERADMIN screens
import CreateProjectScreen from '@/screens/CreateProjectScreen';
import EditProjectScreen from '@/screens/EditProjectScreen';
import ScopeManagementScreen from '@/screens/ScopeManagementScreen';
import AssignSupervisorScreen from '@/screens/AssignSupervisorScreen';
import EngineerAssignmentScreen from '@/screens/EngineerAssignmentScreen';
// SUPERADMIN only
import UserManagementScreen from '@/screens/UserManagementScreen';
import CreateUserScreen from '@/screens/CreateUserScreen';
import UserDetailScreen from '@/screens/UserDetailScreen';
```

- [ ] **Step 3: Register new screens in GM/SUPERADMIN stack**

Replace the `role === 'GM' || role === 'SUPERADMIN'` branch:

```typescript
} : role === 'GM' || role === 'SUPERADMIN' ? (
  <>
    <Stack.Screen name="GMProjects" component={GMProjectsScreen}
      options={{ title: role === 'SUPERADMIN' ? 'All Projects (Admin)' : 'All Projects' }} />
    <Stack.Screen name="CreateProject" component={CreateProjectScreen}
      options={{ title: 'New Project' }} />
    <Stack.Screen name="EditProject" component={EditProjectScreen}
      options={({ route }) => ({ title: `Edit ${route.params.projectNumber}` })} />
    <Stack.Screen name="ScopeManagement" component={ScopeManagementScreen}
      options={({ route }) => ({ title: `Scope — ${route.params.projectNumber}` })} />
    <Stack.Screen name="AssignSupervisor" component={AssignSupervisorScreen}
      options={{ title: 'Assign Supervisor' }} />
    <Stack.Screen name="EngineerAssignment" component={EngineerAssignmentScreen}
      options={{ title: 'Assign Engineers' }} />
    <Stack.Screen name="UserManagement" component={UserManagementScreen}
      options={{ title: 'Users' }} />
    <Stack.Screen name="CreateUser" component={CreateUserScreen}
      options={{ title: 'Add User' }} />
    <Stack.Screen name="UserDetail" component={UserDetailScreen}
      options={({ route }) => ({ title: route.params.userName })} />
    <Stack.Screen name="ProjectOverview" component={ProjectOverviewScreen}
      options={({ route }) => ({ title: route.params.projectNumber })} />
    <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    {platformScreens}
  </>
) : role === 'SUPERVISOR' ? (
  <>
    <Stack.Screen name="SupervisorHome" component={SupervisorHomeScreen} options={{ title: 'Supervisor' }} />
    <Stack.Screen name="EngineerAssignment" component={EngineerAssignmentScreen}
      options={{ title: 'Assign Engineers' }} />
    <Stack.Screen name="ProjectOverview" component={ProjectOverviewScreen}
      options={({ route }) => ({ title: route.params.projectNumber })} />
    <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    {platformScreens}
  </>
```

- [ ] **Step 4: Add stub files for all new screens (so TypeScript can resolve imports)**

Create `mobile/src/screens/CreateProjectScreen.tsx`:
```typescript
import React from 'react';
import { View, Text } from 'react-native';
export default function CreateProjectScreen() {
  return <View><Text>CreateProject stub</Text></View>;
}
```

Repeat for each new screen — `EditProjectScreen.tsx`, `ScopeManagementScreen.tsx`, `AssignSupervisorScreen.tsx`, `EngineerAssignmentScreen.tsx`, `UserManagementScreen.tsx`, `CreateUserScreen.tsx`, `UserDetailScreen.tsx` — same stub pattern.

- [ ] **Step 5: TypeScript check**

```bash
cd mobile && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/navigation/ mobile/src/screens/CreateProjectScreen.tsx mobile/src/screens/EditProjectScreen.tsx mobile/src/screens/ScopeManagementScreen.tsx mobile/src/screens/AssignSupervisorScreen.tsx mobile/src/screens/EngineerAssignmentScreen.tsx mobile/src/screens/UserManagementScreen.tsx mobile/src/screens/CreateUserScreen.tsx mobile/src/screens/UserDetailScreen.tsx
git commit -m "feat(mobile): add navigation routes for GM/SUPERADMIN/SUPERVISOR features (stubs)"
```

---

## Task 2: useProjectMutations Hook

**Files:**
- Create: `mobile/src/hooks/useProjectMutations.ts`

- [ ] **Step 1: Create the hook file**

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ── Types ────────────────────────────────────────────────────────────────────

export type ProjectFields = {
  project_number: string;
  site_name: string;
  site_address: string;
  client: string | null;
  start_date: string | null;   // 'YYYY-MM-DD' or null
  end_date: string | null;     // 'YYYY-MM-DD' or null
};

export type ProjectDetail = ProjectFields & {
  id: string;
  status: string;
  assigned_to: string | null;
  created_by: string;
};

// ── Fetch single project for editing ─────────────────────────────────────────

async function fetchProject(projectId: string): Promise<ProjectDetail> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, project_number, site_name, site_address, client, status, start_date, end_date, assigned_to, created_by')
    .eq('id', projectId)
    .single();
  if (error) throw error;
  return data as ProjectDetail;
}

export function useProjectDetail(projectId: string) {
  return useQuery({
    queryKey: ['project-detail', projectId],
    queryFn: () => fetchProject(projectId),
  });
}

// ── Create project ────────────────────────────────────────────────────────────

type CreateInput = ProjectFields & { createdBy: string; companyId: string };

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateInput) => {
      const { error } = await supabase.from('projects').insert({
        project_number: input.project_number,
        site_name: input.site_name,
        site_address: input.site_address,
        client: input.client || null,
        start_date: input.start_date || null,
        end_date: input.end_date || null,
        created_by: input.createdBy,
        company_id: input.companyId,
        status: 'DRAFT',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gm-projects'] });
    },
  });
}

// ── Update project ────────────────────────────────────────────────────────────

type UpdateInput = {
  projectId: string;
  fields: Partial<ProjectFields>;
  newStatus?: string;
  currentStatus?: string;
};

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateInput) => {
      // Update metadata fields
      if (Object.keys(input.fields).length > 0) {
        const { error } = await supabase
          .from('projects')
          .update(input.fields)
          .eq('id', input.projectId);
        if (error) throw error;
      }
      // Update status separately with optimistic-concurrency guard
      if (input.newStatus && input.currentStatus && input.newStatus !== input.currentStatus) {
        const { error } = await supabase
          .from('projects')
          .update({ status: input.newStatus })
          .eq('id', input.projectId)
          .eq('status', input.currentStatus);
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['gm-projects'] });
      qc.invalidateQueries({ queryKey: ['project-overview', variables.projectId] });
      qc.invalidateQueries({ queryKey: ['project-detail', variables.projectId] });
    },
  });
}

// ── Soft-delete project (SUPERADMIN only) ────────────────────────────────────

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from('projects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gm-projects'] });
    },
  });
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd mobile && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/hooks/useProjectMutations.ts
git commit -m "feat(mobile): add useProjectMutations hook (create, update, delete, detail)"
```

---

## Task 3: CreateProjectScreen

**Files:**
- Modify: `mobile/src/screens/CreateProjectScreen.tsx`

- [ ] **Step 1: Implement CreateProjectScreen**

```typescript
import React, { useState } from 'react';
import {
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@/context/AuthContext';
import { useCreateProject } from '@/hooks/useProjectMutations';
import { useToast } from '@/components/Toast';
import { explainSupabaseError } from '@/lib/errors';
import { theme } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CreateProject'>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
    if (startDate && !DATE_RE.test(startDate)) e.startDate = 'Use YYYY-MM-DD format';
    if (endDate && !DATE_RE.test(endDate)) e.endDate = 'Use YYYY-MM-DD format';
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
```

- [ ] **Step 2: TypeScript check**

```bash
cd mobile && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/CreateProjectScreen.tsx
git commit -m "feat(mobile): implement CreateProjectScreen"
```

---

## Task 4: EditProjectScreen

**Files:**
- Modify: `mobile/src/screens/EditProjectScreen.tsx`

- [ ] **Step 1: Implement EditProjectScreen**

```typescript
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
```

- [ ] **Step 2: TypeScript check**

```bash
cd mobile && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/EditProjectScreen.tsx
git commit -m "feat(mobile): implement EditProjectScreen with status transitions and soft-delete"
```

---

## Task 5: useScopeItems Hook

**Files:**
- Create: `mobile/src/hooks/useScopeItems.ts`

- [ ] **Step 1: Create the hook file**

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type EquipmentType =
  | 'POWER_TRANSFORMER' | 'CT' | 'CVT' | 'LA'
  | 'SF6_BREAKER' | 'ISOLATOR' | 'VCB' | 'EARTH_PIT';

export const EQUIPMENT_TYPES: { type: EquipmentType; label: string }[] = [
  { type: 'POWER_TRANSFORMER', label: 'Power Transformer' },
  { type: 'CT',                label: 'Current Transformer' },
  { type: 'CVT',               label: 'Capacitive VT' },
  { type: 'LA',                label: 'Lightning Arrester' },
  { type: 'SF6_BREAKER',       label: 'SF6 Breaker' },
  { type: 'ISOLATOR',          label: 'Isolator' },
  { type: 'VCB',               label: 'Vacuum Circuit Breaker' },
  { type: 'EARTH_PIT',         label: 'Earth Pit' },
];

export type ScopeRow = { equipment_type: EquipmentType; quantity: number };

async function fetchScopeItems(projectId: string): Promise<ScopeRow[]> {
  const { data, error } = await supabase
    .from('scope_items')
    .select('equipment_type, quantity')
    .eq('project_id', projectId);
  if (error) throw error;
  return (data ?? []) as ScopeRow[];
}

export function useScopeItems(projectId: string) {
  return useQuery({
    queryKey: ['scope-items', projectId],
    queryFn: () => fetchScopeItems(projectId),
  });
}

type SaveScopeInput = {
  projectId: string;
  rows: ScopeRow[];   // all 8 types, quantity 0–500
};

export function useSaveScopeItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, rows }: SaveScopeInput) => {
      // Delete existing rows first, then insert — simpler than upsert with enum PK
      const { error: delErr } = await supabase
        .from('scope_items')
        .delete()
        .eq('project_id', projectId);
      if (delErr) throw delErr;

      const nonZero = rows.filter((r) => r.quantity > 0);
      if (nonZero.length === 0) return;

      const { error } = await supabase.from('scope_items').insert(
        nonZero.map((r) => ({
          project_id: projectId,
          equipment_type: r.equipment_type,
          quantity: r.quantity,
        }))
      );
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['scope-items', variables.projectId] });
      qc.invalidateQueries({ queryKey: ['project-overview', variables.projectId] });
    },
  });
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd mobile && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/hooks/useScopeItems.ts
git commit -m "feat(mobile): add useScopeItems hook"
```

---

## Task 6: ScopeManagementScreen

**Files:**
- Modify: `mobile/src/screens/ScopeManagementScreen.tsx`

- [ ] **Step 1: Implement ScopeManagementScreen**

```typescript
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { EQUIPMENT_TYPES, useScopeItems, useSaveScopeItems, type EquipmentType } from '@/hooks/useScopeItems';
import { useToast } from '@/components/Toast';
import { explainSupabaseError } from '@/lib/errors';
import { theme } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ScopeManagement'>;
type R = RouteProp<RootStackParamList, 'ScopeManagement'>;

export default function ScopeManagementScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const toast = useToast();

  const scopeQ = useScopeItems(params.projectId);
  const saveMutation = useSaveScopeItems();

  // Fetch project status to know if scope is locked
  const statusQ = useQuery({
    queryKey: ['project-status', params.projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('status')
        .eq('id', params.projectId)
        .single();
      if (error) throw error;
      return (data as any).status as string;
    },
  });

  const isLocked = statusQ.data === 'ACTIVE' || statusQ.data === 'CLOSED';

  // quantities map: equipmentType → quantity
  const [quantities, setQuantities] = useState<Record<EquipmentType, number>>(
    () => Object.fromEntries(EQUIPMENT_TYPES.map((e) => [e.type, 0])) as Record<EquipmentType, number>
  );

  useEffect(() => {
    if (!scopeQ.data) return;
    const map = Object.fromEntries(scopeQ.data.map((r) => [r.equipment_type, r.quantity]));
    setQuantities((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next) as EquipmentType[]) {
        next[key] = map[key] ?? 0;
      }
      return next;
    });
  }, [scopeQ.data]);

  const adjust = (type: EquipmentType, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [type]: Math.max(0, Math.min(500, (prev[type] ?? 0) + delta)),
    }));
  };

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({
        projectId: params.projectId,
        rows: EQUIPMENT_TYPES.map((e) => ({ equipment_type: e.type, quantity: quantities[e.type] })),
      });
      toast.success('Scope saved');
      nav.goBack();
    } catch (err: any) {
      toast.error(explainSupabaseError(err));
    }
  };

  if (scopeQ.isLoading || statusQ.isLoading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      {isLocked && (
        <View style={s.lockBanner}>
          <Text style={s.lockText}>Scope locked — project is {statusQ.data}</Text>
        </View>
      )}
      <ScrollView contentContainerStyle={s.scroll}>
        {EQUIPMENT_TYPES.map(({ type, label }) => (
          <View key={type} style={s.row}>
            <Text style={s.rowLabel}>{label}</Text>
            <View style={s.stepper}>
              <TouchableOpacity
                style={[s.stepBtn, isLocked && s.stepBtnDisabled]}
                onPress={() => adjust(type, -1)}
                disabled={isLocked}
              >
                <Text style={s.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={s.qty}>{quantities[type]}</Text>
              <TouchableOpacity
                style={[s.stepBtn, isLocked && s.stepBtnDisabled]}
                onPress={() => adjust(type, 1)}
                disabled={isLocked}
              >
                <Text style={s.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {!isLocked && (
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.btn, saveMutation.isPending && s.btnDisabled]}
            onPress={handleSave}
            disabled={saveMutation.isPending}
          >
            <Text style={s.btnText}>{saveMutation.isPending ? 'Saving…' : 'Save Scope'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  lockBanner: { backgroundColor: 'rgba(236,157,42,0.12)', borderBottomWidth: 1, borderBottomColor: theme.warn, paddingVertical: 10, paddingHorizontal: theme.pad },
  lockText: { color: theme.warn, fontWeight: '600', fontSize: 13 },
  scroll: { padding: theme.pad, paddingBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    paddingHorizontal: theme.pad,
    paddingVertical: 12,
    marginBottom: 10,
  },
  rowLabel: { color: theme.text, fontSize: 15, flex: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: theme.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: { opacity: 0.35 },
  stepBtnText: { color: theme.text, fontSize: 20, fontWeight: '600', lineHeight: 24 },
  qty: { color: theme.text, fontSize: 17, fontWeight: '700', minWidth: 28, textAlign: 'center' },
  footer: { padding: theme.pad, borderTopWidth: 1, borderTopColor: theme.border },
  btn: { backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: theme.primaryText, fontWeight: '700', fontSize: 16 },
});
```

- [ ] **Step 2: TypeScript check**

```bash
cd mobile && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/ScopeManagementScreen.tsx
git commit -m "feat(mobile): implement ScopeManagementScreen with equipment steppers"
```

---

## Task 7: useCompanyMembers Hook

**Files:**
- Create: `mobile/src/hooks/useCompanyMembers.ts`

- [ ] **Step 1: Create the hook file**

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type Member = { id: string; name: string; email: string };

export type InstanceWithAssignee = {
  id: string;
  label: string;
  equipment_type: string;
  assigned_to: string | null;
  assignee_name: string | null;
};

// ── Supervisor list ───────────────────────────────────────────────────────────

async function fetchCompanySupervisors(): Promise<Member[]> {
  const { data: roles, error } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'SUPERVISOR');
  if (error) throw error;
  if (!roles?.length) return [];
  const ids = roles.map((r: any) => r.user_id);
  const { data: profiles, error: pe } = await supabase
    .from('profiles')
    .select('id, name, email')
    .in('id', ids)
    .eq('is_active', true);
  if (pe) throw pe;
  return (profiles ?? []).map((p: any) => ({ id: p.id, name: p.name, email: p.email }));
}

export function useCompanySupervisors() {
  return useQuery({ queryKey: ['company-supervisors'], queryFn: fetchCompanySupervisors });
}

// ── Engineer list ─────────────────────────────────────────────────────────────

async function fetchCompanyEngineers(): Promise<Member[]> {
  const { data: roles, error } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'ENGINEER');
  if (error) throw error;
  if (!roles?.length) return [];
  const ids = roles.map((r: any) => r.user_id);
  const { data: profiles, error: pe } = await supabase
    .from('profiles')
    .select('id, name, email')
    .in('id', ids)
    .eq('is_active', true);
  if (pe) throw pe;
  return (profiles ?? []).map((p: any) => ({ id: p.id, name: p.name, email: p.email }));
}

export function useCompanyEngineers() {
  return useQuery({ queryKey: ['company-engineers'], queryFn: fetchCompanyEngineers });
}

// ── Project instances with assignee names ─────────────────────────────────────

async function fetchProjectInstances(projectId: string): Promise<InstanceWithAssignee[]> {
  const { data: instances, error } = await supabase
    .from('equipment_instances')
    .select('id, label, equipment_type, assigned_to')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('seq_number');
  if (error) throw error;
  if (!instances?.length) return [];

  const assignedIds = [
    ...new Set(instances.filter((i: any) => i.assigned_to).map((i: any) => i.assigned_to)),
  ];
  let nameMap: Record<string, string> = {};
  if (assignedIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', assignedIds);
    nameMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.name]));
  }

  return instances.map((i: any) => ({
    id: i.id,
    label: i.label,
    equipment_type: i.equipment_type,
    assigned_to: i.assigned_to,
    assignee_name: i.assigned_to ? (nameMap[i.assigned_to] ?? null) : null,
  }));
}

export function useProjectInstances(projectId: string) {
  return useQuery({
    queryKey: ['project-instances', projectId],
    queryFn: () => fetchProjectInstances(projectId),
  });
}

// ── Assign supervisor to project ──────────────────────────────────────────────

type AssignSupervisorInput = {
  projectId: string;
  supervisorId: string | null;   // null = remove
  callerId: string;
  callerRole: string;
};

export function useAssignSupervisor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AssignSupervisorInput) => {
      const { error } = await supabase
        .from('projects')
        .update({ assigned_to: input.supervisorId })
        .eq('id', input.projectId);
      if (error) throw error;

      // Record GM→Supervisor relationship when a GM assigns
      if (input.callerRole === 'GM' && input.supervisorId) {
        await supabase.from('supervisor_assignments').upsert(
          {
            gm_id: input.callerId,
            supervisor_id: input.supervisorId,
            created_by: input.callerId,
          },
          { onConflict: 'gm_id,supervisor_id' }
        );
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['gm-projects'] });
      qc.invalidateQueries({ queryKey: ['project-overview', variables.projectId] });
      qc.invalidateQueries({ queryKey: ['project-detail', variables.projectId] });
    },
  });
}

// ── Assign engineer to equipment instance ─────────────────────────────────────

type AssignEngineerInput = {
  instanceId: string;
  engineerId: string | null;   // null = unassign
  projectId: string;
};

export function useAssignEngineer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AssignEngineerInput) => {
      const { error } = await supabase
        .from('equipment_instances')
        .update({ assigned_to: input.engineerId })
        .eq('id', input.instanceId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['project-instances', variables.projectId] });
      qc.invalidateQueries({ queryKey: ['project-overview', variables.projectId] });
    },
  });
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd mobile && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/hooks/useCompanyMembers.ts
git commit -m "feat(mobile): add useCompanyMembers hook (supervisors, engineers, instances, assignments)"
```

---

## Task 8: AssignSupervisorScreen

**Files:**
- Modify: `mobile/src/screens/AssignSupervisorScreen.tsx`

- [ ] **Step 1: Implement AssignSupervisorScreen**

```typescript
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { useProjectDetail } from '@/hooks/useProjectMutations';
import { useCompanySupervisors, useAssignSupervisor, type Member } from '@/hooks/useCompanyMembers';
import { useToast } from '@/components/Toast';
import { explainSupabaseError } from '@/lib/errors';
import { theme } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AssignSupervisor'>;
type R = RouteProp<RootStackParamList, 'AssignSupervisor'>;

export default function AssignSupervisorScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const { userId, role } = useAuth();
  const toast = useToast();

  const projectQ = useProjectDetail(params.projectId);
  const supervisorsQ = useCompanySupervisors();
  const assignMutation = useAssignSupervisor();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const supervisors = supervisorsQ.data ?? [];
  const filtered = search
    ? supervisors.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase())
      )
    : supervisors;

  const currentAssignedTo = projectQ.data?.assigned_to ?? null;

  const handleConfirm = async (supervisorId: string | null) => {
    if (!userId || !role) return;
    try {
      await assignMutation.mutateAsync({
        projectId: params.projectId,
        supervisorId,
        callerId: userId,
        callerRole: role,
      });
      toast.success(supervisorId ? 'Supervisor assigned' : 'Supervisor removed');
      nav.goBack();
    } catch (err: any) {
      toast.error(explainSupabaseError(err));
    }
  };

  const isLoading = projectQ.isLoading || supervisorsQ.isLoading;

  if (isLoading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      {/* Current supervisor banner */}
      {currentAssignedTo && (
        <View style={s.currentBanner}>
          <View style={{ flex: 1 }}>
            <Text style={s.currentLabel}>Currently assigned</Text>
            <Text style={s.currentName}>
              {supervisors.find((s2) => s2.id === currentAssignedTo)?.name ?? 'Unknown'}
            </Text>
          </View>
          <TouchableOpacity
            style={s.removeBtn}
            onPress={() => handleConfirm(null)}
            disabled={assignMutation.isPending}
          >
            <Text style={s.removeBtnText}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={s.searchWrap}>
        <TextInput
          style={s.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search supervisors…"
          placeholderTextColor={theme.textDim}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingHorizontal: theme.pad, paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>No supervisors found in this company.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isCurrent = item.id === currentAssignedTo;
          const isSelected = item.id === selected;
          return (
            <TouchableOpacity
              style={[s.row, isCurrent && s.rowCurrent]}
              onPress={() => setSelected(isSelected ? null : item.id)}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.name}</Text>
                <Text style={s.email}>{item.email}</Text>
              </View>
              {isCurrent && <Text style={s.currentTag}>Current</Text>}
              {isSelected && !isCurrent && (
                <View style={s.check}>
                  <Text style={s.checkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {selected && selected !== currentAssignedTo && (
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.confirmBtn, assignMutation.isPending && s.confirmBtnDisabled]}
            onPress={() => handleConfirm(selected)}
            disabled={assignMutation.isPending}
          >
            <Text style={s.confirmBtnText}>
              {assignMutation.isPending ? 'Assigning…' : 'Confirm Assignment'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  currentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: theme.pad,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    padding: 12,
  },
  currentLabel: { color: theme.textDim, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  currentName: { color: theme.text, fontWeight: '700', fontSize: 15, marginTop: 2 },
  removeBtn: { borderWidth: 1, borderColor: theme.danger, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  removeBtnText: { color: theme.danger, fontWeight: '600', fontSize: 13 },
  searchWrap: { paddingHorizontal: theme.pad, paddingBottom: 8 },
  search: {
    backgroundColor: theme.card,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    padding: 14,
    marginBottom: 8,
  },
  rowCurrent: { borderColor: theme.primary },
  name: { color: theme.text, fontWeight: '600', fontSize: 15 },
  email: { color: theme.textDim, fontSize: 12, marginTop: 2 },
  currentTag: { color: theme.primary, fontSize: 12, fontWeight: '700' },
  check: { width: 26, height: 26, borderRadius: 13, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  checkText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  empty: { paddingTop: 40, alignItems: 'center' },
  emptyText: { color: theme.textDim },
  footer: { padding: theme.pad, borderTopWidth: 1, borderTopColor: theme.border },
  confirmBtn: { backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: theme.primaryText, fontWeight: '700', fontSize: 16 },
});
```

- [ ] **Step 2: TypeScript check**

```bash
cd mobile && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/AssignSupervisorScreen.tsx
git commit -m "feat(mobile): implement AssignSupervisorScreen"
```

---

## Task 9: EngineerAssignmentScreen

**Files:**
- Modify: `mobile/src/screens/EngineerAssignmentScreen.tsx`

- [ ] **Step 1: Implement EngineerAssignmentScreen**

```typescript
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  useProjectInstances,
  useCompanyEngineers,
  useAssignEngineer,
  type InstanceWithAssignee,
  type Member,
} from '@/hooks/useCompanyMembers';
import { useToast } from '@/components/Toast';
import { explainSupabaseError } from '@/lib/errors';
import { theme } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type R = RouteProp<RootStackParamList, 'EngineerAssignment'>;

export default function EngineerAssignmentScreen() {
  const { params } = useRoute<R>();
  const toast = useToast();

  const instancesQ = useProjectInstances(params.projectId);
  const engineersQ = useCompanyEngineers();
  const assignMutation = useAssignEngineer();

  const [pickerInstance, setPickerInstance] = useState<InstanceWithAssignee | null>(null);
  const [search, setSearch] = useState('');

  const engineers = engineersQ.data ?? [];
  const filteredEngineers = search
    ? engineers.filter(
        (e) =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.email.toLowerCase().includes(search.toLowerCase())
      )
    : engineers;

  const handleAssign = async (engineerId: string | null) => {
    if (!pickerInstance) return;
    try {
      await assignMutation.mutateAsync({
        instanceId: pickerInstance.id,
        engineerId,
        projectId: params.projectId,
      });
      toast.success(engineerId ? 'Engineer assigned' : 'Engineer removed');
      setPickerInstance(null);
      setSearch('');
    } catch (err: any) {
      toast.error(explainSupabaseError(err));
    }
  };

  if (instancesQ.isLoading || engineersQ.isLoading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  const instances = instancesQ.data ?? [];

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      <FlatList
        data={instances}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: theme.pad }}
        refreshControl={
          <RefreshControl
            refreshing={instancesQ.isFetching && !instancesQ.isLoading}
            onRefresh={() => instancesQ.refetch()}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No equipment instances</Text>
            <Text style={s.emptyBody}>Generate equipment first via Scope Management.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardLeft}>
              <Text style={s.instanceLabel}>{item.label}</Text>
              <Text style={s.equipmentType}>{item.equipment_type.replace(/_/g, ' ')}</Text>
            </View>
            <View style={s.cardRight}>
              <Text style={s.assigneeName}>
                {item.assignee_name ?? 'Unassigned'}
              </Text>
              <TouchableOpacity
                style={s.assignBtn}
                onPress={() => { setPickerInstance(item); setSearch(''); }}
              >
                <Text style={s.assignBtnText}>
                  {item.assigned_to ? 'Change' : 'Assign'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Engineer picker modal */}
      <Modal
        visible={pickerInstance !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setPickerInstance(null); setSearch(''); }}
      >
        <SafeAreaView style={s.modal} edges={['top', 'bottom']}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Assign Engineer</Text>
            <TouchableOpacity onPress={() => { setPickerInstance(null); setSearch(''); }}>
              <Text style={s.modalClose}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.modalSub}>{pickerInstance?.label}</Text>

          <View style={s.searchWrap}>
            <TextInput
              style={s.search}
              value={search}
              onChangeText={setSearch}
              placeholder="Search engineers…"
              placeholderTextColor={theme.textDim}
              autoFocus
            />
          </View>

          {pickerInstance?.assigned_to && (
            <TouchableOpacity
              style={s.removeRow}
              onPress={() => handleAssign(null)}
              disabled={assignMutation.isPending}
            >
              <Text style={s.removeRowText}>Remove current assignment</Text>
            </TouchableOpacity>
          )}

          <FlatList
            data={filteredEngineers}
            keyExtractor={(e) => e.id}
            contentContainerStyle={{ paddingHorizontal: theme.pad, paddingBottom: 20 }}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyBody}>No engineers found.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isCurrent = item.id === pickerInstance?.assigned_to;
              return (
                <TouchableOpacity
                  style={[s.engineerRow, isCurrent && s.engineerRowCurrent]}
                  onPress={() => handleAssign(item.id)}
                  disabled={assignMutation.isPending}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.engineerName}>{item.name}</Text>
                    <Text style={s.engineerEmail}>{item.email}</Text>
                  </View>
                  {isCurrent && <Text style={s.currentTag}>Current</Text>}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    padding: theme.pad,
    marginBottom: 10,
  },
  cardLeft: { flex: 1 },
  instanceLabel: { color: theme.text, fontWeight: '700', fontSize: 15 },
  equipmentType: { color: theme.textDim, fontSize: 12, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  assigneeName: { color: theme.textDim, fontSize: 13 },
  assignBtn: { backgroundColor: theme.muted, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  assignBtnText: { color: theme.primary, fontWeight: '600', fontSize: 13 },
  empty: { paddingTop: 60, alignItems: 'center' },
  emptyTitle: { color: theme.text, fontSize: 16, fontWeight: '600' },
  emptyBody: { color: theme.textDim, marginTop: 6, textAlign: 'center' },
  // Modal
  modal: { flex: 1, backgroundColor: theme.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.pad, borderBottomWidth: 1, borderBottomColor: theme.border },
  modalTitle: { color: theme.text, fontSize: 18, fontWeight: '700' },
  modalClose: { color: theme.primary, fontSize: 16 },
  modalSub: { color: theme.textDim, paddingHorizontal: theme.pad, paddingBottom: 8, fontSize: 13 },
  searchWrap: { paddingHorizontal: theme.pad, paddingBottom: 8 },
  search: {
    backgroundColor: theme.card,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  removeRow: { marginHorizontal: theme.pad, marginBottom: 8, padding: 12, borderWidth: 1, borderColor: theme.danger, borderRadius: 10 },
  removeRowText: { color: theme.danger, fontWeight: '600', textAlign: 'center' },
  engineerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    padding: 14,
    marginBottom: 8,
  },
  engineerRowCurrent: { borderColor: theme.primary },
  engineerName: { color: theme.text, fontWeight: '600', fontSize: 15 },
  engineerEmail: { color: theme.textDim, fontSize: 12, marginTop: 2 },
  currentTag: { color: theme.primary, fontSize: 12, fontWeight: '700' },
});
```

- [ ] **Step 2: TypeScript check**

```bash
cd mobile && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/EngineerAssignmentScreen.tsx
git commit -m "feat(mobile): implement EngineerAssignmentScreen with modal picker"
```

---

## Task 10: useCompanyUsers Hook

**Files:**
- Create: `mobile/src/hooks/useCompanyUsers.ts`

- [ ] **Step 1: Create the hook file**

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type CompanyUser = {
  id: string;
  name: string;
  email: string;
  role: string | null;
  is_active: boolean;
  created_at: string;
};

// ── List all users in company ─────────────────────────────────────────────────

async function fetchCompanyUsers(): Promise<CompanyUser[]> {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, name, email, is_active, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!profiles?.length) return [];

  const ids = profiles.map((p: any) => p.id);
  const { data: roles } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .in('user_id', ids);

  const roleMap = Object.fromEntries((roles ?? []).map((r: any) => [r.user_id, r.role]));
  return (profiles ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    is_active: p.is_active,
    created_at: p.created_at,
    role: roleMap[p.id] ?? null,
  }));
}

export function useCompanyUsers() {
  return useQuery({ queryKey: ['company-users'], queryFn: fetchCompanyUsers });
}

// ── Create user (calls Edge Function) ────────────────────────────────────────

type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: string;
};

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: input,
      });
      if (error) throw error;
      if (data?.error) {
        const err = new Error(data.error) as any;
        err.edgeFnError = data.error;
        throw err;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-users'] });
    },
  });
}

// ── Update user role ──────────────────────────────────────────────────────────

type UpdateRoleInput = { userId: string; newRole: string };

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, newRole }: UpdateRoleInput) => {
      // user_roles has UNIQUE(user_id, role) — delete old role first, then insert new
      await supabase.from('user_roles').delete().eq('user_id', userId);
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: newRole });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-users'] });
    },
  });
}

// ── Toggle user active ────────────────────────────────────────────────────────

type ToggleActiveInput = { userId: string; isActive: boolean };

export function useToggleUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, isActive }: ToggleActiveInput) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-users'] });
    },
  });
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd mobile && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/hooks/useCompanyUsers.ts
git commit -m "feat(mobile): add useCompanyUsers hook (list, create, role, active)"
```

---

## Task 11: UserManagementScreen

**Files:**
- Modify: `mobile/src/screens/UserManagementScreen.tsx`

- [ ] **Step 1: Implement UserManagementScreen**

```typescript
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCompanyUsers, type CompanyUser } from '@/hooks/useCompanyUsers';
import { theme, roleBadge } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'UserManagement'>;

export default function UserManagementScreen() {
  const nav = useNavigation<Nav>();
  const q = useCompanyUsers();
  const [search, setSearch] = useState('');

  const users = useMemo(() => {
    const all = q.data ?? [];
    if (!search) return all;
    const lower = search.toLowerCase();
    return all.filter(
      (u) =>
        u.name.toLowerCase().includes(lower) ||
        u.email.toLowerCase().includes(lower) ||
        (u.role ?? '').toLowerCase().includes(lower)
    );
  }, [q.data, search]);

  if (q.isLoading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      <View style={s.searchWrap}>
        <TextInput
          style={s.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search users…"
          placeholderTextColor={theme.textDim}
          autoCorrect={false}
        />
      </View>

      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        contentContainerStyle={{ padding: theme.pad, paddingTop: 0 }}
        refreshControl={
          <RefreshControl
            refreshing={q.isFetching && !q.isLoading}
            onRefresh={() => q.refetch()}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No users found</Text>
          </View>
        }
        renderItem={({ item }) => <UserRow user={item} onPress={() => nav.navigate('UserDetail', { userId: item.id, userName: item.name })} />}
      />

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => nav.navigate('CreateUser')}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function UserRow({ user, onPress }: { user: CompanyUser; onPress: () => void }) {
  const rb = user.role ? roleBadge[user.role as keyof typeof roleBadge] : null;
  return (
    <TouchableOpacity style={[s.row, !user.is_active && s.rowInactive]} onPress={onPress} activeOpacity={0.7}>
      <View style={{ flex: 1 }}>
        <View style={s.rowTop}>
          <Text style={s.name}>{user.name}</Text>
          {!user.is_active && <View style={s.inactivePill}><Text style={s.inactivePillText}>INACTIVE</Text></View>}
        </View>
        <Text style={s.email}>{user.email}</Text>
      </View>
      {rb && (
        <View style={[s.roleBadge, { backgroundColor: rb.bg, borderColor: rb.border }]}>
          <Text style={[s.roleBadgeText, { color: rb.text }]}>{user.role}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  searchWrap: { padding: theme.pad, paddingBottom: 8 },
  search: {
    backgroundColor: theme.card,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    padding: 14,
    marginBottom: 8,
  },
  rowInactive: { opacity: 0.55 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: theme.text, fontWeight: '600', fontSize: 15 },
  email: { color: theme.textDim, fontSize: 12, marginTop: 2 },
  inactivePill: { backgroundColor: 'rgba(219,57,42,0.12)', borderWidth: 1, borderColor: theme.danger, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
  inactivePillText: { color: theme.danger, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  roleBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  roleBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  empty: { paddingTop: 80, alignItems: 'center' },
  emptyTitle: { color: theme.textDim, fontSize: 16 },
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
```

- [ ] **Step 2: TypeScript check**

```bash
cd mobile && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/UserManagementScreen.tsx
git commit -m "feat(mobile): implement UserManagementScreen"
```

---

## Task 12: CreateUserScreen

**Files:**
- Modify: `mobile/src/screens/CreateUserScreen.tsx`

- [ ] **Step 1: Implement CreateUserScreen**

```typescript
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
```

- [ ] **Step 2: TypeScript check**

```bash
cd mobile && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/CreateUserScreen.tsx
git commit -m "feat(mobile): implement CreateUserScreen"
```

---

## Task 13: UserDetailScreen

**Files:**
- Modify: `mobile/src/screens/UserDetailScreen.tsx`

- [ ] **Step 1: Implement UserDetailScreen**

```typescript
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCompanyUsers, useUpdateUserRole, useToggleUserActive } from '@/hooks/useCompanyUsers';
import { useToast } from '@/components/Toast';
import { explainSupabaseError } from '@/lib/errors';
import { theme, roleBadge } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'UserDetail'>;
type R = RouteProp<RootStackParamList, 'UserDetail'>;

const ROLES = ['ENGINEER', 'SUPERVISOR', 'GM', 'SUPERADMIN'] as const;
type Role = typeof ROLES[number];

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function UserDetailScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const toast = useToast();

  const usersQ = useCompanyUsers();
  const roleM = useUpdateUserRole();
  const activeM = useToggleUserActive();

  const user = usersQ.data?.find((u) => u.id === params.userId);
  const [selectedRole, setSelectedRole] = useState<Role>('ENGINEER');

  useEffect(() => {
    if (user?.role) setSelectedRole(user.role as Role);
  }, [user?.role]);

  const handleRoleChange = async () => {
    if (!user || selectedRole === user.role) return;
    try {
      await roleM.mutateAsync({ userId: user.id, newRole: selectedRole });
      toast.success('Role updated');
    } catch (err: any) {
      toast.error(explainSupabaseError(err));
    }
  };

  const handleToggleActive = () => {
    if (!user) return;
    const nextActive = !user.is_active;
    if (!nextActive) {
      Alert.alert(
        'Deactivate user?',
        `${user.name} will lose access to the app immediately.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Deactivate',
            style: 'destructive',
            onPress: async () => {
              try {
                await activeM.mutateAsync({ userId: user.id, isActive: false });
                toast.success('User deactivated');
              } catch (err: any) {
                toast.error(explainSupabaseError(err));
              }
            },
          },
        ]
      );
    } else {
      activeM.mutateAsync({ userId: user.id, isActive: true })
        .then(() => toast.success('User reactivated'))
        .catch((err: any) => toast.error(explainSupabaseError(err)));
    }
  };

  if (usersQ.isLoading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[s.root, s.center]}>
        <Text style={s.notFound}>User not found</Text>
      </View>
    );
  }

  const rb = user.role ? roleBadge[user.role as keyof typeof roleBadge] : null;

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Info card */}
        <View style={s.infoCard}>
          <Text style={s.name}>{user.name}</Text>
          <Text style={s.email}>{user.email}</Text>
          <View style={s.metaRow}>
            {rb && (
              <View style={[s.roleBadge, { backgroundColor: rb.bg, borderColor: rb.border }]}>
                <Text style={[s.roleBadgeText, { color: rb.text }]}>{user.role}</Text>
              </View>
            )}
            <View style={[s.activePill, { backgroundColor: user.is_active ? 'rgba(46,158,99,0.12)' : 'rgba(219,57,42,0.12)', borderColor: user.is_active ? theme.success : theme.danger }]}>
              <Text style={[s.activePillText, { color: user.is_active ? theme.success : theme.danger }]}>
                {user.is_active ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>
          </View>
          <Text style={s.since}>Member since {fmt(user.created_at)}</Text>
        </View>

        {/* Role section */}
        <Text style={s.sectionTitle}>Change Role</Text>
        <View style={s.roleRow}>
          {ROLES.map((r) => {
            const rb2 = roleBadge[r];
            const active = selectedRole === r;
            return (
              <TouchableOpacity
                key={r}
                style={[s.roleChip, active && { backgroundColor: rb2.bg, borderColor: rb2.border }]}
                onPress={() => setSelectedRole(r)}
              >
                <Text style={[s.roleChipText, active && { color: rb2.text }]}>{r}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {selectedRole !== user.role && (
          <TouchableOpacity
            style={[s.btn, roleM.isPending && s.btnDisabled]}
            onPress={handleRoleChange}
            disabled={roleM.isPending}
          >
            <Text style={s.btnText}>{roleM.isPending ? 'Updating…' : `Set role to ${selectedRole}`}</Text>
          </TouchableOpacity>
        )}

        {/* Active toggle */}
        <View style={s.divider} />
        <TouchableOpacity
          style={[s.toggleBtn, { borderColor: user.is_active ? theme.danger : theme.success }]}
          onPress={handleToggleActive}
          disabled={activeM.isPending}
        >
          <Text style={[s.toggleBtnText, { color: user.is_active ? theme.danger : theme.success }]}>
            {activeM.isPending
              ? '…'
              : user.is_active
              ? 'Deactivate User'
              : 'Reactivate User'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  notFound: { color: theme.textDim, fontSize: 16 },
  scroll: { padding: theme.pad, paddingBottom: 40 },
  infoCard: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: theme.radius, padding: 16, marginBottom: 24 },
  name: { color: theme.text, fontSize: 20, fontWeight: '700' },
  email: { color: theme.textDim, fontSize: 14, marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  roleBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  roleBadgeText: { fontSize: 11, fontWeight: '700' },
  activePill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  activePillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  since: { color: theme.textDim, fontSize: 12, marginTop: 10 },
  sectionTitle: { color: theme.textDim, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  roleChip: { borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  roleChipText: { color: theme.textDim, fontWeight: '600', fontSize: 13 },
  btn: { backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginBottom: 4 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: theme.primaryText, fontWeight: '700', fontSize: 15 },
  divider: { height: 1, backgroundColor: theme.border, marginVertical: 20 },
  toggleBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  toggleBtnText: { fontWeight: '700', fontSize: 15 },
});
```

- [ ] **Step 2: TypeScript check**

```bash
cd mobile && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/UserDetailScreen.tsx
git commit -m "feat(mobile): implement UserDetailScreen (role change, deactivate/reactivate)"
```

---

## Task 14: Update GMProjectsScreen — FAB + SUPERADMIN Users Icon

**Files:**
- Modify: `mobile/src/screens/GMProjectsScreen.tsx`

- [ ] **Step 1: Add FAB and SUPERADMIN users icon**

In `GMProjectsScreen.tsx`, the `useLayoutEffect` currently sets only the profile avatar in `headerRight`. Update it to also show a users icon for SUPERADMIN. Also add a FAB at the bottom. Make these changes:

**Replace the import block** (add `useRef` to imports if needed — it's not needed here):
```typescript
// at the top, add to existing imports:
import { useAuth } from '@/context/AuthContext';  // already imported
```
(already imported — no change needed for imports)

**Update `useLayoutEffect`** (replace the existing one):
```typescript
  useLayoutEffect(() => {
    nav.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
```

**Add `role` to the destructured useAuth call** — change:
```typescript
  const { profile } = useAuth();
```
to:
```typescript
  const { profile, role } = useAuth();
```

**Add FAB** — in the return JSX, add after `</FlatList>` and before closing `</View>`:
```typescript
      {/* FAB — create new project */}
      <TouchableOpacity style={s.fab} onPress={() => nav.navigate('CreateProject')}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>
```

**Add new styles** to the StyleSheet (append before closing `}`):
```typescript
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
```

- [ ] **Step 2: TypeScript check**

```bash
cd mobile && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/GMProjectsScreen.tsx
git commit -m "feat(mobile): add FAB and SUPERADMIN users icon to GMProjectsScreen"
```

---

## Task 15: Update ProjectOverviewScreen — Action Buttons

**Files:**
- Modify: `mobile/src/screens/ProjectOverviewScreen.tsx`

- [ ] **Step 1: Add role-aware action buttons to ProjectOverviewScreen**

The screen currently has no navigation or useAuth imports. Add:

**New imports** (add to existing imports at the top):
```typescript
import { TouchableOpacity } from 'react-native';   // add to existing RN import list
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@/context/AuthContext';
```

**Add Nav type** after the existing `type R = ...` line:
```typescript
type Nav = NativeStackNavigationProp<RootStackParamList, 'ProjectOverview'>;
```

**In the component body**, add after `const { params } = useRoute<R>();`:
```typescript
  const nav = useNavigation<Nav>();
  const { role } = useAuth();
```

**Add action buttons** in the JSX, after the closing `</View>` of the `infoCard` (after the `{/* Overall progress */}` comment block), insert:

```typescript
      {/* Action buttons — role gated */}
      {(role === 'GM' || role === 'SUPERADMIN' || role === 'SUPERVISOR') && (
        <View style={s.actionsRow}>
          {(role === 'GM' || role === 'SUPERADMIN') && (
            <>
              <ActionButton
                label="Edit Project"
                onPress={() => nav.navigate('EditProject', { projectId: params.projectId, projectNumber: params.projectNumber })}
              />
              <ActionButton
                label="Manage Scope"
                onPress={() => nav.navigate('ScopeManagement', { projectId: params.projectId, projectNumber: params.projectNumber })}
                disabled={data.status === 'CLOSED'}
              />
              <ActionButton
                label="Assign Supervisor"
                onPress={() => nav.navigate('AssignSupervisor', { projectId: params.projectId, projectNumber: params.projectNumber })}
              />
            </>
          )}
          <ActionButton
            label="Assign Engineers"
            onPress={() => nav.navigate('EngineerAssignment', { projectId: params.projectId, projectNumber: params.projectNumber })}
          />
        </View>
      )}
```

**Add `ActionButton` helper** before the StyleSheet (after the main component):
```typescript
function ActionButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      style={[s.actionBtn, disabled && s.actionBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={s.actionBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}
```

**Add new styles** to the existing StyleSheet:
```typescript
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  actionBtn: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  actionBtnDisabled: { opacity: 0.35 },
  actionBtnText: { color: theme.primary, fontWeight: '600', fontSize: 13 },
```

- [ ] **Step 2: TypeScript check**

```bash
cd mobile && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/ProjectOverviewScreen.tsx
git commit -m "feat(mobile): add role-gated action buttons to ProjectOverviewScreen"
```

---

## Task 16: Final TypeScript Check and Integration Smoke Test

- [ ] **Step 1: Full TypeScript check**

```bash
cd mobile && npx tsc --noEmit
```
Expected: 0 errors, 0 warnings that block compilation.

- [ ] **Step 2: Verify Metro starts clean**

```bash
cd mobile && npx expo start --clear
```
Expected: Metro starts, no "module not found" or "unresolved import" errors in the terminal.

- [ ] **Step 3: Manual smoke test checklist**

Sign in as each role and verify:

**GM / SUPERADMIN:**
- [ ] GMProjectsScreen shows `+` FAB in bottom-right
- [ ] Tapping `+` navigates to "New Project" form
- [ ] Creating a project with a blank required field shows inline error
- [ ] Successfully created project appears in projects list
- [ ] Tapping a project → ProjectOverviewScreen shows **Edit Project**, **Manage Scope**, **Assign Supervisor**, **Assign Engineers** buttons
- [ ] Edit Project pre-fills all fields, status picker only allows forward transitions
- [ ] Scope Management shows all 8 equipment types with steppers; Save works
- [ ] Assign Supervisor lists active supervisors; current one highlighted; Remove works
- [ ] Assign Engineers shows all instances; tapping "Assign" opens modal picker

**SUPERADMIN additionally:**
- [ ] Users icon (👥) in header of GMProjectsScreen
- [ ] UserManagement screen shows all company users with role badge and active status
- [ ] Create User validates password policy and navigates back on success
- [ ] UserDetail shows role picker; changing role saves; Deactivate shows confirmation alert

**SUPERVISOR:**
- [ ] ProjectOverviewScreen shows only **Assign Engineers** button (no Edit/Scope/Supervisor)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(mobile): complete GM/SUPERADMIN/SUPERVISOR role features

- 8 new screens: CreateProject, EditProject, ScopeManagement,
  AssignSupervisor, EngineerAssignment, UserManagement,
  CreateUser, UserDetail
- 4 new hook files: useProjectMutations, useScopeItems,
  useCompanyMembers, useCompanyUsers
- ProjectOverviewScreen: role-gated action buttons
- GMProjectsScreen: FAB + SUPERADMIN users icon

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
