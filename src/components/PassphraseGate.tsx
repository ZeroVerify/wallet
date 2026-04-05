import { useState } from "react";
import { setSessionKey } from "../lib/session";

interface Props {
  onUnlock: () => void;
}

async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  const salt = new TextEncoder().encode("#4 placeholder-salt"); //will replaced one #4 is done
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 310_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function PassphraseGate({ onUnlock }: Props) {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!passphrase) return;
    setLoading(true);
    setError(null);
    try {
      const key = await deriveKey(passphrase);
      setSessionKey(key);
      onUnlock();
    } catch {
      setError("Failed to unlock wallet. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "360px", margin: "4rem auto" }}>
      <h2>Unlock Wallet</h2>
      <p>Enter your passphrase to continue.</p>
      <input
        type="password"
        value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="Passphrase"
        style={{ width: "100%", marginBottom: "1rem" }}
      />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? "Unlocking…" : "Unlock"}
      </button>
    </div>
  );
}
