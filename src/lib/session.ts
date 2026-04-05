let _sessionKey: CryptoKey | null = null;

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
