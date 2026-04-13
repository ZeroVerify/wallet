import { useState, useEffect } from "react";
import { PassphraseGate } from "../components/PassphraseGate";
import { useWallet } from "../context/useWallet";
import { createAuthRequest, SUPPORTED_IDPS } from "@lib/api/keycloak";
import { getAllCredentials } from "@lib/credential-store";
import { fetchBitstring } from "@lib/api/bitstring";
import type { VerifiableCredential } from "@lib/types";

type RevocationStatus = "loading" | "active" | "revoked" | "unavailable";

function checkBit(bitstring: Uint8Array, index: number): boolean {
  const byteIndex = Math.floor(index / 8);
  const bitIndex = 7 - (index % 8);
  return ((bitstring[byteIndex] >> bitIndex) & 1) === 1;
}

async function resolveRevocationStatuses(
  creds: VerifiableCredential[],
  signal: AbortSignal,
): Promise<Map<string, RevocationStatus>> {
  const byUrl = new Map<string, VerifiableCredential[]>();
  for (const cred of creds) {
    const url = cred.credentialStatus.statusListCredential;
    const group = byUrl.get(url) ?? [];
    group.push(cred);
    byUrl.set(url, group);
  }

  const result = new Map<string, RevocationStatus>();

  await Promise.all(
    Array.from(byUrl.entries()).map(async ([url, group]) => {
      const bitstringResult = await fetchBitstring(url, signal);
      for (const cred of group) {
        const index = parseInt(cred.credentialStatus.statusListIndex, 10);
        result.set(
          cred.id,
          bitstringResult.match(
            (bitstring) => (checkBit(bitstring, index) ? "revoked" : "active"),
            () => "unavailable",
          ),
        );
      }
    }),
  );

  return result;
}

const STATUS_STYLES: Record<
  RevocationStatus,
  { label: string; bg: string; color: string }
> = {
  loading: { label: "Checking...", bg: "#e0e0e0", color: "#555" },
  active: { label: "Active", bg: "#d4f5d4", color: "#1a7f37" },
  revoked: { label: "Revoked", bg: "#ffd4d4", color: "#cb2431" },
  unavailable: { label: "Status unavailable", bg: "#f5f5f5", color: "#888" },
};

function StatusBadge({ status }: { status: RevocationStatus }) {
  const { label, bg, color } = STATUS_STYLES[status];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "0.8rem",
        fontWeight: 600,
        background: bg,
        color,
      }}
    >
      {label}
    </span>
  );
}

export function WalletHome() {
  const { key } = useWallet();
  const [credentials, setCredentials] = useState<VerifiableCredential[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Map<string, RevocationStatus>>(
    new Map(),
  );

  const loading = key !== null && !loaded;

  useEffect(() => {
    if (!key) return;

    const controller = new AbortController();

    getAllCredentials(key).then((result) => {
      if (controller.signal.aborted) return;
      result.match(
        (creds) => {
          setCredentials(creds);
          setLoaded(true);
          setStatuses(new Map(creds.map((c) => [c.id, "loading"])));

          resolveRevocationStatuses(creds, controller.signal).then(
            (resolved) => {
              if (controller.signal.aborted) return;
              setStatuses(resolved);
            },
          );
        },
        (err) => {
          setError(`Failed to load credentials: ${err.message}`);
          setLoaded(true);
        },
      );
    });

    return () => {
      controller.abort();
    };
  }, [key]);

  if (!key) {
    return <PassphraseGate />;
  }

  async function handleGetCredential() {
    try {
      const idp = SUPPORTED_IDPS[0];
      const { url, codeVerifier, state } = await createAuthRequest(idp);
      sessionStorage.setItem("pkce_verifier", codeVerifier);
      sessionStorage.setItem("oauth_state", state);
      window.location.href = url;
    } catch {
      setError("Failed to start authentication. Please try again.");
    }
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <strong>
                  {cred.type
                    .filter((t) => t !== "VerifiableCredential")
                    .join(", ") || "VerifiableCredential"}
                </strong>
                <StatusBadge status={statuses.get(cred.id)!} />
              </div>
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
