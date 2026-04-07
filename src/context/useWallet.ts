import { createContext, useContext } from "react";

export interface WalletContextValue {
  key: CryptoKey | null;
  unlock: (key: CryptoKey) => void;
  lock: () => void;
}

export const WalletContext = createContext<WalletContextValue | null>(null);

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
