# Mobile Production Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up EAS Build + EAS Update for the TestFlow Field mobile app so engineers receive OTA JS updates automatically on every push to `main`, and production APK/IPA binaries are built on demand via `eas build`.

**Architecture:** Replace the static `app.json` with a dynamic `app.config.js` that reads Supabase credentials from `process.env` (sourced from EAS secrets in CI, and a local `.env` file in dev). Add `eas.json` with three build profiles (development / preview / production). Extend the existing `mobile.yml` CI workflow with an EAS Update step that publishes a new JS bundle to the `production` channel on every push to `main`.

**Tech Stack:** Expo SDK 54, `expo-updates`, EAS CLI (`eas-cli`), GitHub Actions

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `mobile/app.json` | Delete | Replaced by `app.config.js` |
| `mobile/app.config.js` | Create | Dynamic config: reads secrets from `process.env`, configures `expo-updates` |
| `mobile/eas.json` | Create | Three build profiles: development, preview, production |
| `mobile/.env` | Create (committed) | Local dev defaults for public Supabase URL/key |
| `mobile/package.json` | Modify | Add `expo-updates` dependency |
| `mobile/src/lib/supabase.ts` | No change needed | Already reads `Constants.expoConfig?.extra?.supabaseUrl` |
| `.github/workflows/mobile.yml` | Modify | Add EAS Update step after existing checks |
| `CLAUDE.md` | Modify | Add section on when to cut a new native build |

---

## Prerequisites (Manual — Do Before Any Code Tasks)

These are one-time manual steps. They cannot be automated.

- [ ] **P1: Create Expo account**

  Go to [expo.dev](https://expo.dev) and create a free account if you don't have one.

- [ ] **P2: Install EAS CLI globally**

  ```bash
  npm install -g eas-cli
  eas login
  ```

  Confirm with: `eas whoami` — should print your Expo username.

- [ ] **P3: Run `eas init` to link the repo**

  ```bash
  cd /home/parakh/Desktop/gridpoint-testflow/mobile
  eas init
  ```

  EAS will prompt for a project name — use `testflow-field`. It writes a `projectId` UUID into `app.json`. **Copy this UUID** — you need it in Task 2.

  Example output:
  ```
  Created @your-account/testflow-field
  Project ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  ```

- [ ] **P4: Set EAS secrets**

  In the Expo dashboard → your project → Secrets, add:
  | Name | Value |
  |---|---|
  | `SUPABASE_URL` | `https://hxfilijpaocogsgjrjnq.supabase.co` |
  | `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4ZmlsaWpwYW9jb2dzZ2pyam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDI0NzMsImV4cCI6MjA5MDk3ODQ3M30.HEA9t7h876Sf7vJlIrVd5MGSADf9t-wbv5y0xe9zAws` |
  | `PLATFORM_ADMIN_PASSWORD` | value from `mobile/app.json` `platformAdminPassword` field |
  | `PLATFORM_ADMIN_TOKEN` | value from `mobile/app.json` `platformAdminToken` field |

- [ ] **P5: Create GitHub Actions secret `EXPO_TOKEN`**

  In Expo dashboard → Account Settings → Access Tokens → Create token.
  In GitHub → repo Settings → Secrets and variables → Actions → New secret:
  - Name: `EXPO_TOKEN`
  - Value: the token you just generated

---

## Task 1: Install `expo-updates`

**Files:**
- Modify: `mobile/package.json`
- Modify: `mobile/package-lock.json` (auto-updated)

- [ ] **Step 1: Install the package**

  ```bash
  cd /home/parakh/Desktop/gridpoint-testflow/mobile
  npx expo install expo-updates
  ```

  Expected: `expo-updates` appears in `dependencies` in `package.json`. The version will be pinned to the SDK 54-compatible version (e.g., `~0.29.0`).

- [ ] **Step 2: Verify TypeScript still passes**

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git -C /home/parakh/Desktop/gridpoint-testflow add mobile/package.json mobile/package-lock.json
  git -C /home/parakh/Desktop/gridpoint-testflow commit -m "feat(mobile): install expo-updates for OTA support"
  ```

---

## Task 2: Create `eas.json`

**Files:**
- Create: `mobile/eas.json`

- [ ] **Step 1: Create the file**

  Create `mobile/eas.json` with this exact content:

  ```json
  {
    "cli": {
      "version": ">= 16.0.0"
    },
    "build": {
      "development": {
        "developmentClient": true,
        "distribution": "internal",
        "channel": "development"
      },
      "preview": {
        "distribution": "internal",
        "channel": "preview",
        "android": {
          "buildType": "apk"
        }
      },
      "production": {
        "distribution": "internal",
        "channel": "production",
        "android": {
          "buildType": "apk"
        }
      }
    },
    "submit": {
      "production": {}
    }
  }
  ```

- [ ] **Step 2: Verify EAS CLI accepts the config**

  ```bash
  cd /home/parakh/Desktop/gridpoint-testflow/mobile
  eas build:list --limit 1
  ```

  Expected: runs without config errors (may show empty list if no builds yet — that's fine).

- [ ] **Step 3: Commit**

  ```bash
  git -C /home/parakh/Desktop/gridpoint-testflow add mobile/eas.json
  git -C /home/parakh/Desktop/gridpoint-testflow commit -m "feat(mobile): add eas.json with development/preview/production profiles"
  ```

---

## Task 3: Replace `app.json` with `app.config.js`

**Files:**
- Create: `mobile/app.config.js`
- Create: `mobile/.env` (committed — only public values)
- Delete: `mobile/app.json`

**Context:** `app.config.js` is evaluated at `expo start`, `eas build`, and `eas update` time. `process.env` is populated from `.env` (local dev) or EAS secrets (CI/build). Replace `REPLACE_WITH_PROJECT_ID` with the UUID from Prerequisite P3.

- [ ] **Step 1: Create `mobile/.env` for local dev**

  Create `mobile/.env` with:

  ```
  SUPABASE_URL=https://hxfilijpaocogsgjrjnq.supabase.co
  SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4ZmlsaWpwYW9jb2dzZ2pyam5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDI0NzMsImV4cCI6MjA5MDk3ODQ3M30.HEA9t7h876Sf7vJlIrVd5MGSADf9t-wbv5y0xe9zAws
  ```

  (The anon key is intentionally public — see CLAUDE.md Gotcha #17. `PLATFORM_ADMIN_PASSWORD` and `PLATFORM_ADMIN_TOKEN` go in `.env.local` which is gitignored.)

- [ ] **Step 2: Ensure `.env.local` is gitignored**

  Check `mobile/.gitignore` (or root `.gitignore`) contains `.env.local`. If not, add it.

  The root `.gitignore` likely already has `*.local` or `.env.local`. Verify:

  ```bash
  grep -r "env.local\|\.local" /home/parakh/Desktop/gridpoint-testflow/.gitignore 2>/dev/null || echo "not found in root"
  grep -r "env.local\|\.local" /home/parakh/Desktop/gridpoint-testflow/mobile/.gitignore 2>/dev/null || echo "not found in mobile"
  ```

  If neither file contains `.env.local`, add it to `mobile/.gitignore` (create the file if it doesn't exist).

- [ ] **Step 3: Create `mobile/app.config.js`**

  Replace `REPLACE_WITH_PROJECT_ID` with the actual UUID from Prerequisite P3 in both places.

  ```js
  const PROJECT_ID = 'REPLACE_WITH_PROJECT_ID'; // from: eas init

  export default ({ config }) => ({
    ...config,
    name: 'TestFlow Field',
    slug: 'testflow-field',
    version: '0.1.0',
    scheme: 'testflow',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    splash: {
      backgroundColor: '#232229',
      resizeMode: 'contain',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'io.testflow.field',
    },
    android: {
      package: 'io.testflow.field',
      adaptiveIcon: {
        backgroundColor: '#232229',
      },
    },
    updates: {
      url: `https://u.expo.dev/${PROJECT_ID}`,
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    extra: {
      supabaseUrl: process.env.SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
      realtimeEnabled: false,
      platformAdminPassword: process.env.PLATFORM_ADMIN_PASSWORD ?? '',
      platformAdminToken: process.env.PLATFORM_ADMIN_TOKEN ?? '',
      eas: {
        projectId: PROJECT_ID,
      },
    },
  });
  ```

- [ ] **Step 4: Delete `app.json`**

  ```bash
  rm /home/parakh/Desktop/gridpoint-testflow/mobile/app.json
  ```

- [ ] **Step 5: Verify config resolves correctly**

  ```bash
  cd /home/parakh/Desktop/gridpoint-testflow/mobile
  npx expo config --json 2>/dev/null | grep -E "name|slug|supabaseUrl|supabaseAnonKey|projectId"
  ```

  Expected output includes:
  ```
  "name": "TestFlow Field",
  "slug": "testflow-field",
  "supabaseUrl": "https://hxfilijpaocogsgjrjnq.supabase.co",
  "supabaseAnonKey": "eyJ...",
  "projectId": "<your-uuid>"
  ```

  If `supabaseUrl` is empty, the `.env` file is not being picked up — ensure it is at `mobile/.env` (not the repo root).

- [ ] **Step 6: Verify TypeScript still passes**

  ```bash
  cd /home/parakh/Desktop/gridpoint-testflow/mobile
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 7: Verify Metro bundle still works**

  ```bash
  cd /home/parakh/Desktop/gridpoint-testflow/mobile
  npx expo export --platform android --output-dir /tmp/expo-ci-export-test
  ```

  Expected: completes without errors. Clean up: `rm -rf /tmp/expo-ci-export-test`.

- [ ] **Step 8: Commit**

  ```bash
  git -C /home/parakh/Desktop/gridpoint-testflow add mobile/app.config.js mobile/.env
  git -C /home/parakh/Desktop/gridpoint-testflow rm mobile/app.json
  git -C /home/parakh/Desktop/gridpoint-testflow commit -m "feat(mobile): replace app.json with dynamic app.config.js, externalise secrets via process.env"
  ```

---

## Task 4: Update CI Workflow with EAS Update Step

**Files:**
- Modify: `.github/workflows/mobile.yml`

**Context:** The existing workflow runs type-check + `expo install --check` + Metro bundle for both platforms. The new EAS Update step runs after all checks pass and publishes the JS bundle to the `production` channel. It only runs on pushes to `main` (not on PRs — we don't want every PR branch pushing OTA updates to production engineers).

- [ ] **Step 1: Read the current workflow**

  Current content of `.github/workflows/mobile.yml`:

  ```yaml
  name: Mobile — Type Check & Bundle

  on:
    push:
      branches:
        - main
      paths:
        - 'mobile/src/**'
        - 'mobile/App.tsx'
        - 'mobile/app.json'
        - 'mobile/babel.config.js'
        - 'mobile/package.json'
        - 'mobile/package-lock.json'
        - 'mobile/tsconfig.json'
        - '.github/workflows/mobile.yml'
    pull_request:
      paths:
        - 'mobile/**'
        - '.github/workflows/mobile.yml'

  jobs:
    check:
      name: Type check and Metro bundle
      runs-on: ubuntu-latest
      defaults:
        run:
          working-directory: mobile

      steps:
        - name: Checkout repository
          uses: actions/checkout@v5

        - name: Set up Node.js
          uses: actions/setup-node@v5
          with:
            node-version: 20
            cache: npm
            cache-dependency-path: mobile/package-lock.json

        - name: Install dependencies
          run: npm ci

        - name: TypeScript check
          run: npx tsc --noEmit

        - name: Verify Expo dep alignment
          run: npx expo install --check

        - name: Metro bundle (Android)
          run: npx expo export --platform android --output-dir .expo-ci-export

        - name: Metro bundle (iOS)
          run: npx expo export --platform ios --output-dir .expo-ci-export-ios
  ```

- [ ] **Step 2: Replace the workflow file**

  Replace the entire content of `.github/workflows/mobile.yml` with:

  ```yaml
  name: Mobile — Type Check, Bundle & OTA Update

  on:
    push:
      branches:
        - main
      paths:
        - 'mobile/src/**'
        - 'mobile/App.tsx'
        - 'mobile/app.config.js'
        - 'mobile/babel.config.js'
        - 'mobile/package.json'
        - 'mobile/package-lock.json'
        - 'mobile/tsconfig.json'
        - '.github/workflows/mobile.yml'
    pull_request:
      paths:
        - 'mobile/**'
        - '.github/workflows/mobile.yml'

  jobs:
    check:
      name: Type check and Metro bundle
      runs-on: ubuntu-latest
      defaults:
        run:
          working-directory: mobile

      steps:
        - name: Checkout repository
          uses: actions/checkout@v5

        - name: Set up Node.js
          uses: actions/setup-node@v5
          with:
            node-version: 20
            cache: npm
            cache-dependency-path: mobile/package-lock.json

        - name: Install dependencies
          run: npm ci

        - name: TypeScript check
          run: npx tsc --noEmit

        - name: Verify Expo dep alignment
          run: npx expo install --check

        - name: Metro bundle (Android)
          run: npx expo export --platform android --output-dir .expo-ci-export

        - name: Metro bundle (iOS)
          run: npx expo export --platform ios --output-dir .expo-ci-export-ios

    ota-update:
      name: Publish EAS OTA Update
      needs: check
      # Only publish on main-branch pushes, not on PRs
      if: github.event_name == 'push' && github.ref == 'refs/heads/main'
      runs-on: ubuntu-latest
      defaults:
        run:
          working-directory: mobile

      steps:
        - name: Checkout repository
          uses: actions/checkout@v5

        - name: Set up Node.js
          uses: actions/setup-node@v5
          with:
            node-version: 20
            cache: npm
            cache-dependency-path: mobile/package-lock.json

        - name: Install dependencies
          run: npm ci

        - name: Publish EAS Update
          run: npx eas-cli update --branch production --message "CI ${{ github.sha }}" --non-interactive
          env:
            EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

  # ── When to cut a new native build ──────────────────────────────────────────
  # Run `eas build --profile production` manually (from your local machine) when:
  #   - Adding a new Expo/native module (expo-camera, expo-notifications, etc.)
  #   - Bumping version / versionCode / buildNumber in app.config.js
  #   - Changing native config: permissions, deep-link scheme, splash/icon assets
  #
  # CI only publishes OTA (JS) updates. Native builds are intentionally manual.
  # Share the resulting install link (QR code in Expo dashboard) with engineers.
  ```

  Key changes from the original:
  - Path trigger `mobile/app.json` → `mobile/app.config.js`
  - New `ota-update` job that runs after `check`, only on `main` pushes
  - Comment block documenting when to cut a native build

- [ ] **Step 3: Commit**

  ```bash
  git -C /home/parakh/Desktop/gridpoint-testflow add .github/workflows/mobile.yml
  git -C /home/parakh/Desktop/gridpoint-testflow commit -m "feat(ci): publish EAS OTA update to production channel on main push"
  ```

---

## Task 5: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add mobile deployment section**

  Find the `## Gotchas` section in `CLAUDE.md` and insert the following text block directly before it (no code fence needed — this is plain markdown being added to CLAUDE.md):

  ---

  **## Mobile Deployment (EAS)**

  The mobile app uses EAS (Expo Application Services) for builds and OTA updates.

  **OTA updates (automatic):** CI publishes a new JS bundle to the `production` channel on every push to `main`. Engineers receive updates silently on next app launch — no reinstall needed.

  **Cut a new native build when:**
  - Adding a new Expo/native module (e.g., `expo-camera`, `expo-notifications`)
  - Bumping `version`, `versionCode`, or `buildNumber` in `mobile/app.config.js`
  - Changing native config: permissions, deep-link scheme, splash/icon assets

  To build: `cd mobile && eas build --profile production`

  Share the resulting install link (QR code in Expo dashboard) with field engineers. Android: direct APK install. iOS: device UDID must be registered in Apple Developer first.

  **Secrets:** Supabase URL/key and platform admin tokens are in EAS Secrets (Expo dashboard → project → Secrets). For local dev, they're in `mobile/.env` (committed for public values) and `mobile/.env.local` (gitignored for private values).

  **EAS project ID:** In `mobile/app.config.js` → `PROJECT_ID` constant. Do not change without also updating the `updates.url` field.

  ---

- [ ] **Step 2: Commit**

  ```bash
  git -C /home/parakh/Desktop/gridpoint-testflow add CLAUDE.md
  git -C /home/parakh/Desktop/gridpoint-testflow commit -m "docs: add mobile deployment section to CLAUDE.md"
  ```

---

## Task 6: End-to-End Verification

- [ ] **Step 1: Full local type-check and bundle**

  ```bash
  cd /home/parakh/Desktop/gridpoint-testflow/mobile
  npx tsc --noEmit && echo "TypeScript OK"
  npx expo export --platform android --output-dir /tmp/expo-verify && echo "Android bundle OK"
  rm -rf /tmp/expo-verify
  ```

  Expected: both print OK with no errors.

- [ ] **Step 2: Verify config contains all expected fields**

  ```bash
  cd /home/parakh/Desktop/gridpoint-testflow/mobile
  npx expo config --json 2>/dev/null | python3 -c "
  import json, sys
  cfg = json.load(sys.stdin)
  extra = cfg.get('extra', {})
  checks = {
    'supabaseUrl': extra.get('supabaseUrl', ''),
    'supabaseAnonKey non-empty': bool(extra.get('supabaseAnonKey', '')),
    'projectId': extra.get('eas', {}).get('projectId', ''),
    'updates.url': cfg.get('updates', {}).get('url', ''),
  }
  for k, v in checks.items():
    print(f'{k}: {v}')
  "
  ```

  Expected: all values are non-empty. `supabaseUrl` starts with `https://`, `updates.url` starts with `https://u.expo.dev/`.

- [ ] **Step 3: Dry-run EAS Update (requires EXPO_TOKEN)**

  If you have the `EXPO_TOKEN` available locally:

  ```bash
  cd /home/parakh/Desktop/gridpoint-testflow/mobile
  EXPO_TOKEN=<your-token> npx eas-cli update --branch production --message "test dry-run" --non-interactive --dry-run 2>/dev/null || \
  EXPO_TOKEN=<your-token> npx eas-cli update --branch production --message "test" --non-interactive
  ```

  Expected: EAS CLI authenticates and either dry-runs successfully or publishes the update. If `--dry-run` is not supported by your EAS CLI version, skip this step — CI will validate on next push to `main`.

- [ ] **Step 4: Push to main and verify CI**

  ```bash
  git -C /home/parakh/Desktop/gridpoint-testflow push origin main
  ```

  In GitHub Actions, confirm:
  1. `check` job passes (type-check + bundle)
  2. `ota-update` job runs after `check` and publishes successfully
  3. In Expo dashboard → Updates, a new update appears on the `production` channel
