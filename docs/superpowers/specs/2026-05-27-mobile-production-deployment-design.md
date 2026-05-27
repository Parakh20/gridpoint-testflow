# Mobile Production Deployment Design

**Date:** 2026-05-27
**Scope:** TestFlow Field (Expo/React Native) — production build, distribution, and OTA update pipeline

## Summary

Internal distribution via EAS (Expo Application Services). No App Store submission. JS updates ship via EAS Update on every push to `main`; full native builds are run manually on demand.

## 1. EAS Project Setup & Config Management

### Problem
`app.json` currently hardcodes the Supabase URL and anon key. Config must be externalised before production use.

### Solution
Replace `app.json` with a dynamic `app.config.js` that reads secrets from `process.env` at build/update time and injects them into `expo.extra`. Runtime code reads them via `expo-constants` (`Constants.expoConfig.extra`).

**EAS secrets to set in Expo dashboard:**
| Secret | Value |
|---|---|
| `SUPABASE_URL` | `https://hxfilijpaocogsgjrjnq.supabase.co` |
| `SUPABASE_ANON_KEY` | current anon key from `app.json` |
| `PLATFORM_ADMIN_PASSWORD` | current `platformAdminPassword` value |
| `PLATFORM_ADMIN_TOKEN` | current `platformAdminToken` value |

**`expo-updates`** is added as a dependency and configured with the EAS project ID and update channel `"production"`.

All existing `app.json` fields (name, slug, bundle identifiers, deep-link scheme, icon config) are preserved verbatim.

## 2. Build Profiles (`eas.json`)

Three profiles, all using internal distribution:

| Profile | Purpose | Platform | Notes |
|---|---|---|---|
| `development` | Local dev with Expo Dev Client | Android + iOS | Not distributed |
| `preview` | Ad-hoc pre-production testing | Android APK + iOS simulator | Internal EAS link |
| `production` | Live field engineer builds | Android APK + iOS IPA | Internal EAS link; `channel: "production"` |

No App Store or Play Store submission. EAS hosts the install links (QR code in Expo dashboard).

iOS production builds require device UDIDs registered in the Apple Developer account before install.

## 3. CI Pipeline (`mobile.yml`)

**Existing steps remain:** type-check (`tsc --noEmit`), dependency alignment (`expo install --check`), Metro bundle (Android + iOS).

**New step added:** EAS Update, runs after existing checks pass.

```
eas update --branch production --message "CI: ${{ github.sha }}"
```

Requires `EXPO_TOKEN` added as a GH Actions secret.

Full `eas build` is **not** run in CI — it runs manually from a developer machine. A comment in `mobile.yml` documents the triggers for cutting a new native build.

## 4. Internal Distribution & Update Flow

### Initial Install (one-time per device)
1. Run `eas build --profile production` locally
2. Expo builds the APK/IPA and hosts it on EAS servers
3. Share the EAS install link (QR code from Expo dashboard) with field engineers
4. Android: tap link → install APK. iOS: register device UDID in Apple Developer first, then install via link

### Ongoing Updates (every `main` push)
1. CI pushes a new JS bundle to the `production` channel via EAS Update
2. On next app launch, `expo-updates` checks for a new bundle and downloads it in the background
3. The update applies on the following app launch — no interruption to the current session
4. Engineers never reinstall; updates are invisible

### When to Cut a New Native Build
A new `eas build --profile production` is required when:
- Adding a new Expo/native module (e.g., `expo-camera`, `expo-notifications`)
- Bumping `version`, `versionCode`, or `buildNumber` in `app.config.js`
- Changing native config: permissions, deep-link scheme, splash/icon assets

This is expected to happen infrequently (roughly once per major feature cycle).

## 5. Files Changed

| File | Change |
|---|---|
| `mobile/app.json` | Replaced by `mobile/app.config.js` |
| `mobile/app.config.js` | New — dynamic config reading `process.env` secrets |
| `mobile/eas.json` | New — three build profiles |
| `mobile/package.json` | Add `expo-updates` dependency |
| `mobile/src/lib/supabase.ts` | Read URL/key from `Constants.expoConfig.extra` instead of hardcoded strings |
| `.github/workflows/mobile.yml` | Add EAS Update step + `EXPO_TOKEN` secret reference |
| `CLAUDE.md` | Add note on when to cut a new native build |

## 6. Prerequisites (Before Implementation)

1. Create an Expo account at expo.dev (if not already done)
2. Run `eas init` in `mobile/` to get a project ID — this links the repo to the EAS project
3. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in EAS dashboard (Secrets tab)
4. Add `EXPO_TOKEN` to GH Actions secrets (generate from expo.dev → Account Settings → Access Tokens)
5. For iOS production builds: enroll in Apple Developer Program ($99/yr) and register engineer device UDIDs
