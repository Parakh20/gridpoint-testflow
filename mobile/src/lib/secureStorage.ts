import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// SecureStore caps values at ~2KB on iOS/Android. Supabase session JWTs can exceed
// that, so we chunk. Web has no SecureStore; fall back to AsyncStorage there.
const CHUNK_SIZE = 1800;
const isWeb = Platform.OS === 'web';

async function removeChunks(key: string, knownCount?: number) {
  const countStr = await SecureStore.getItemAsync(`${key}::count`);
  const count = knownCount ?? (countStr ? parseInt(countStr, 10) : 0);
  await SecureStore.deleteItemAsync(`${key}::count`);
  for (let i = 0; i < (Number.isFinite(count) ? count : 0); i++) {
    await SecureStore.deleteItemAsync(`${key}::${i}`);
  }
}

async function setItem(key: string, value: string) {
  if (isWeb) {
    await AsyncStorage.setItem(key, value);
    return;
  }
  // Always clear prior chunks first so a smaller new value doesn't leave orphans.
  await removeChunks(key);
  const chunks = Math.ceil(value.length / CHUNK_SIZE);
  for (let i = 0; i < chunks; i++) {
    const slice = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    await SecureStore.setItemAsync(`${key}::${i}`, slice);
  }
  // Write count LAST — if we crash mid-write, getItem will see no count and return null
  // (treats as missing, which triggers re-auth rather than half-corrupt session).
  await SecureStore.setItemAsync(`${key}::count`, String(chunks));
}

async function getItem(key: string): Promise<string | null> {
  if (isWeb) return AsyncStorage.getItem(key);
  const countStr = await SecureStore.getItemAsync(`${key}::count`);
  if (!countStr) return null;
  const count = parseInt(countStr, 10);
  if (!Number.isFinite(count) || count < 1) return null;
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const part = await SecureStore.getItemAsync(`${key}::${i}`);
    if (part === null) {
      // Partial write detected — clean up and return null so we treat as no session.
      await removeChunks(key, count);
      return null;
    }
    parts.push(part);
  }
  return parts.join('');
}

async function removeItem(key: string) {
  if (isWeb) {
    await AsyncStorage.removeItem(key);
    return;
  }
  await removeChunks(key);
}

export const secureStorage = {
  getItem,
  setItem,
  removeItem,
};
