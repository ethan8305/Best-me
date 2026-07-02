import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Supabase auth storage backed by the OS keychain (iOS Keychain / Android
 * Keystore via expo-secure-store) instead of plaintext AsyncStorage, so a
 * stolen or backed-up device doesn't leak the refresh token.
 *
 * SecureStore caps values at ~2KB and a Supabase session JSON can exceed
 * that, so values are split into indexed chunks under `<key>.<i>` with a
 * `<key>.count` marker. On web (where SecureStore is unavailable) it falls
 * back to in-memory storage: sessions simply don't persist across reloads
 * rather than landing in localStorage.
 */

const CHUNK_SIZE = 1800; // stay safely under SecureStore's ~2KB value limit

// SecureStore keys must be alphanumeric plus ".", "-", "_".
const safe = (key: string) => key.replace(/[^\w.-]/g, "_");

const memory = new Map<string, string>();
const isNative = Platform.OS === "ios" || Platform.OS === "android";

async function chunkCount(key: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(`${key}.count`);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function removeChunks(key: string): Promise<void> {
  const count = await chunkCount(key);
  const deletions: Promise<void>[] = [];
  for (let i = 0; i < count; i++) {
    deletions.push(SecureStore.deleteItemAsync(`${key}.${i}`));
  }
  deletions.push(SecureStore.deleteItemAsync(`${key}.count`));
  await Promise.all(deletions);
}

export const secureStorage = {
  async getItem(rawKey: string): Promise<string | null> {
    if (!isNative) return memory.get(rawKey) ?? null;
    const key = safe(rawKey);
    const count = await chunkCount(key);
    if (count === 0) return null;
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`))
    );
    if (chunks.some((c) => c == null)) return null; // corrupted → treat as signed out
    return chunks.join("");
  },

  async setItem(rawKey: string, value: string): Promise<void> {
    if (!isNative) {
      memory.set(rawKey, value);
      return;
    }
    const key = safe(rawKey);
    await removeChunks(key); // clear any longer previous value first
    const count = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
    const writes: Promise<void>[] = [];
    for (let i = 0; i < count; i++) {
      writes.push(
        SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE))
      );
    }
    writes.push(SecureStore.setItemAsync(`${key}.count`, String(count)));
    await Promise.all(writes);
  },

  async removeItem(rawKey: string): Promise<void> {
    if (!isNative) {
      memory.delete(rawKey);
      return;
    }
    await removeChunks(safe(rawKey));
  },
};
