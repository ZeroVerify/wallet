import { useState } from "react";
import { deriveKey } from "@lib/crypto";
import { getOrCreateSalt } from "@lib/credential-store";
import { useWallet } from "../context/useWallet";

export function PassphraseGate() {
  const { unlock } = useWallet();
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!passphrase) return;
    setLoading(true);
    setError(null);

    const result = await getOrCreateSalt().andThen((salt) =>
      deriveKey(passphrase, salt),
    );

    result.match(
      (key) => unlock(key),
      () => setError("Failed to unlock wallet. Please try again."),
    );

    setLoading(false);
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
