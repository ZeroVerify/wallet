import { useState, useEffect, useRef, useCallback } from "react";
import { WalletContext } from "./useWallet";
import {
  setSessionKey,
  clearSession,
  persistSession,
  restoreSession,
  SESSION_TTL_MS,
} from "../lib/session";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [key, setKey] = useState<CryptoKey | null>(null);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleExpiry = useCallback((ms: number) => {
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    expiryTimer.current = setTimeout(() => {
      clearSession();
      setKey(null);
    }, ms);
  }, []);

  useEffect(() => {
    restoreSession().then((session) => {
      if (!session) return;
      setSessionKey(session.key);
      setKey(session.key);
      scheduleExpiry(session.remainingMs);
    });

    return () => {
      if (expiryTimer.current) clearTimeout(expiryTimer.current);
    };
  }, [scheduleExpiry]);

  function unlock(cryptoKey: CryptoKey) {
    setSessionKey(cryptoKey);
    setKey(cryptoKey);
    persistSession(cryptoKey);
    scheduleExpiry(SESSION_TTL_MS);
  }

  function lock() {
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    clearSession();
    setKey(null);
  }

  return (
    <WalletContext.Provider value={{ key, unlock, lock }}>
      {children}
    </WalletContext.Provider>
  );
}
