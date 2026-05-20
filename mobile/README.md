# TestFlow Field — Mobile

Engineer-focused companion app to the TestFlow web platform. Reuses the same Supabase backend (RLS handles all auth/tenancy). Built with Expo + React Native.

## Scope (v0.1)

- Email/password sign-in (Supabase Auth, **tokens stored in `expo-secure-store`**, not AsyncStorage)
- Role gate — only `ENGINEER` accounts can use the app; everyone else hits a friendly block screen
- "My Projects" — projects with at least one task assigned to the signed-in engineer, with search + sort
- Per-project task list with status filters, live counts, **progress bar**, and rework-reason callouts
- Dynamic test form rendered from `test_templates.fields` (JSON Schema or legacy array form)
- Save draft / Submit for review — upserts `test_records` and transitions `test_tasks.status`
- **Auto-save** (1.5s debounce while editing) + **dirty-form guard** on back press
- Profile / Settings screen with workspace info, app version, sign out
- **30-min idle timeout** mirroring the web app
- Toast notifications, error boundary, **offline banner**, network-aware error messages
- Haptic feedback on submit / selection
- Deep-linking scheme: `testflow://projects/<projectId>` etc.

Out of scope (deferred until field testing exposes priorities): camera/nameplate capture, offline write queue, push notifications, supervisor/GM/superadmin flows (use the web app).

## Setup

```bash
cd mobile
npm install
npx expo start
```

Then either scan the QR with Expo Go on your phone, or press `a` (Android emulator) / `i` (iOS simulator).

If any native module versions look wrong: `npx expo install --check`.

## Architecture

```
mobile/
├── App.tsx                          # ErrorBoundary → SafeAreaProvider → QueryClient → AuthProvider → ToastProvider → NetworkBanner + Navigator
├── app.json                         # Supabase URL+anon key in expo.extra, deep-link scheme "testflow"
├── src/
│   ├── theme.ts                     # Dark theme tokens + statusColor()
│   ├── lib/
│   │   ├── supabase.ts              # Client + EQUIPMENT_LABEL
│   │   ├── secureStorage.ts         # Chunked SecureStore adapter for Supabase (JWTs exceed the 2KB cap)
│   │   ├── queryClient.ts           # TanStack Query client + qk() key factory
│   │   └── errors.ts                # explainSupabaseError() — human messages for common codes
│   ├── context/
│   │   └── AuthContext.tsx          # Session + role + profile fetch, deadlock-safe setTimeout(0), 30-min idle timeout
│   ├── hooks/
│   │   ├── useProjects.ts           # Engineer-assigned projects
│   │   └── useTasks.ts              # Engineer-assigned tasks for one project
│   ├── components/
│   │   ├── Toast.tsx                # ToastProvider + useToast() (success/error/info/warn)
│   │   ├── ErrorBoundary.tsx        # Catches render crashes, shows reset button
│   │   └── NetworkBanner.tsx        # Top banner when offline (NetInfo)
│   ├── navigation/
│   │   ├── RootNavigator.tsx        # Stack with role-gated routes + linking config
│   │   └── types.ts                 # RootStackParamList
│   └── screens/
│       ├── LoginScreen.tsx          # Email/password, show/hide, basic validation
│       ├── ProjectListScreen.tsx    # Search + sort (Recent / Active / Number)
│       ├── TaskListScreen.tsx       # Filter chips + progress bar + rework callouts
│       ├── TestFormScreen.tsx       # Dynamic schema form, auto-save, dirty guard, required-field highlights, haptics
│       ├── ProfileScreen.tsx        # Workspace, role, version, sign out
│       └── RoleBlockedScreen.tsx    # Friendly block for non-engineer roles
```

### Security model

- **Token storage:** `expo-secure-store` (iOS Keychain / Android Keystore), with chunking for the long Supabase refresh JWTs. AsyncStorage on web only.
- **RLS:** every query goes through Supabase as the signed-in user. The mobile app trusts the DB to enforce company isolation — never adds `.eq('company_id', …)` itself.
- **Role gate:** non-engineers never reach the tenant data screens; they hit `RoleBlockedScreen` with a sign-out button.
- **Idle timeout:** 30 min of background-or-no-touch ⇒ auto sign-out, matching the web app.
- **Soft-deleted projects** (`deleted_at IS NOT NULL`) are filtered out client-side as a defense-in-depth alongside the web policy.

### Data flow

1. `AuthProvider` resolves `session` then defers a `user_roles + profiles` fetch via `setTimeout(0)` (avoids the Supabase `onAuthStateChange` deadlock pattern the web app documents).
2. Screens never call Supabase directly except for form persistence — they use `useProjects` / `useTasks` (TanStack Query) so caches stay coherent and pull-to-refresh + invalidation are uniform.
3. `TestFormScreen` is the only mutation site. Submit is two calls: `upsert test_records (onConflict: test_task_id)` then `update test_tasks.status = SUBMITTED`. On submit success we `invalidateQueries(['tasks'])` + `['projects']` so the list reflects the new state when the user lands back.

### Form schema interpretation

`test_templates.fields` accepts two shapes:
- Legacy array: `[{ name, label, type, enum?, unit?, required? }]`
- JSON Schema object: `{ type: 'object', properties: {...}, required: [...] }`

`normalizeFields()` in `TestFormScreen.tsx` collapses both into the array form before rendering. Enum + boolean fields render as chip rows; numeric inputs get a decimal keypad.

## Known limitations (v0.1)

- **No offline writes.** Engineers in substations with no cell signal can't submit. The offline banner warns them. Building a proper write queue with conflict resolution is a 2–3 day project — not done until field feedback validates it's the right next step.
- **No camera capture.** Nameplate plates would benefit from photo evidence but require `expo-camera` + a Supabase Storage bucket + nameplate-record schema changes. Deferred.
- **No push notifications** when a supervisor returns a task for rework. Engineers learn about it on next refresh.
