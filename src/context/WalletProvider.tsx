import { useState } from "react";
import { WalletContext } from "./useWallet";
import { setSessionKey, clearSessionKey } from "../lib/session";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [key, setKey] = useState<CryptoKey | null>(null);

  function unlock(cryptoKey: CryptoKey) {
    setSessionKey(cryptoKey);
    setKey(cryptoKey);
  }

  function lock() {
    clearSessionKey();
    setKey(null);
  }

  return (
    <WalletContext.Provider value={{ key, unlock, lock }}>
      {children}
    </WalletContext.Provider>
  );
}
