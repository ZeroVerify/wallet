import { LocalStorageCache, jsonSerializer } from "./cache";

export const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

const SESSION_STORAGE_KEY = "wallet_session_key";

let _sessionKey: CryptoKey | null = null;

const sessionCache = new LocalStorageCache<JsonWebKey>(
  SESSION_TTL_MS,
  jsonSerializer<JsonWebKey>(),
);

export function setSessionKey(key: CryptoKey): void {
  _sessionKey = key;
}

export function getSessionKey(): CryptoKey | null {
  return _sessionKey;
}

export function clearSessionKey(): void {
  _sessionKey = null;
}

export function isUnlocked(): boolean {
  return _sessionKey !== null;
}

export async function persistSession(key: CryptoKey): Promise<void> {
  const jwk = await crypto.subtle.exportKey("jwk", key);
  sessionCache.set(SESSION_STORAGE_KEY, jwk);
}

export async function restoreSession(): Promise<{
  key: CryptoKey;
  remainingMs: number;
} | null> {
  const jwk = sessionCache.get(SESSION_STORAGE_KEY);
  if (!jwk) return null;

  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  const remainingMs = raw
    ? Math.max(
        0,
        (JSON.parse(raw) as { expiresAt: number }).expiresAt - Date.now(),
      )
    : SESSION_TTL_MS;

  try {
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"],
    );
    return { key, remainingMs };
  } catch {
    sessionCache.delete(SESSION_STORAGE_KEY);
    return null;
  }
}

export function clearSession(): void {
  _sessionKey = null;
  sessionCache.delete(SESSION_STORAGE_KEY);
}
