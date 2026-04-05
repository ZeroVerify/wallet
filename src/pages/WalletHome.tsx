import { useState, useEffect } from "react";
import { PassphraseGate } from "../components/PassphraseGate";
import { isUnlocked, getSessionKey } from "../lib/session";
import { createAuthRequest, SUPPORTED_IDPS } from "@lib/api/keycloak";
import { getAllCredentials } from "@lib/credential-store";
import type { VerifiableCredential } from "@lib/types";

export function WalletHome() {
  const [unlocked, setUnlocked] = useState(isUnlocked());
  const [credentials, setCredentials] = useState<VerifiableCredential[]>([]);
  const [loading, setLoading] = useState(isUnlocked());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!unlocked) return;

    const key = getSessionKey();
    if (!key) return;

    let cancelled = false;

    getAllCredentials(key).then((result) => {
      if (cancelled) return;

      result.match(
        (creds) => {
          setCredentials(creds);
          setLoading(false);
        },
        (err) => {
          setError(`Failed to load credentials: ${err.message}`);
          setLoading(false);
        },
      );
    });

    return () => {
      cancelled = true;
    };
  }, [unlocked]);

  if (!unlocked) {
    return <PassphraseGate onUnlock={() => setUnlocked(true)} />;
  }

  async function handleGetCredential() {
    const idp = SUPPORTED_IDPS[0];
    const { url, codeVerifier, state } = await createAuthRequest(idp);
    sessionStorage.setItem("pkce_verifier", codeVerifier);
    sessionStorage.setItem("oauth_state", state);
    window.location.href = url;
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "480px", margin: "0 auto" }}>
      <h1>ZeroVerify Wallet</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading ? (
        <p>Loading credentials...</p>
      ) : credentials.length > 0 ? (
        <div>
          <h2>Your Credentials</h2>
          {credentials.map((cred) => (
            <div
              key={cred.id}
              style={{
                border: "1px solid #ccc",
                borderRadius: "4px",
                padding: "1rem",
                marginBottom: "1rem",
              }}
            >
              <p>
                <strong>Type:</strong> {cred.type.join(", ")}
              </p>
              <p>
                <strong>Issuer:</strong> {cred.issuer}
              </p>
              <p>
                <strong>Subject:</strong>
              </p>
              <ul style={{ marginLeft: "1.5rem" }}>
                <li>
                  Name: {cred.credentialSubject.given_name}{" "}
                  {cred.credentialSubject.family_name}
                </li>
                <li>Email: {cred.credentialSubject.email}</li>
                <li>Status: {cred.credentialSubject.enrollment_status}</li>
              </ul>
              <p>
                <strong>Issued:</strong>{" "}
                {new Date(cred.issuanceDate).toLocaleDateString()}
              </p>
              <p>
                <strong>Expires:</strong>{" "}
                {new Date(cred.expirationDate).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p>No credentials found. Get one to get started!</p>
      )}

      <button onClick={handleGetCredential} style={{ marginTop: "1rem" }}>
        Get Credential
      </button>
    </div>
  );
}
