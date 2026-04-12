import { useState, useEffect } from "react";
import { PassphraseGate } from "../components/PassphraseGate";
import { useWallet } from "../context/useWallet";
import { createAuthRequest, SUPPORTED_IDPS } from "@lib/api/keycloak";
import { getAllCredentials } from "@lib/credential-store";
import { fetchBitstring } from "@lib/api/bitstring";
import type { VerifiableCredential } from "@lib/types";

type CredentialStatus =
  | "loading"
  | "active"
  | "revoked"
  | "expired"
  | "unavailable";

function checkBit(bitstring: Uint8Array, index: number): boolean {
  const byteIndex = Math.floor(index / 8);
  const bitPos = 7 - (index % 8);
  return ((bitstring[byteIndex] >> bitPos) & 1) === 1;
}

async function resolveStatus(
  cred: VerifiableCredential,
): Promise<CredentialStatus> {
  const bitstringResult = await fetchBitstring(
    cred.credentialStatus.statusListCredential,
  );
  if (bitstringResult.isErr()) return "unavailable";
  const index = parseInt(cred.credentialStatus.statusListIndex, 10);
  if (checkBit(bitstringResult.value, index)) return "revoked";
  if (new Date(cred.expirationDate) < new Date()) return "expired";
  return "active";
}

const STATUS_STYLES: Record<
  CredentialStatus,
  { label: string; color: string; bg: string }
> = {
  loading: { label: "Checking...", color: "#888", bg: "#f0f0f0" },
  active: { label: "Active", color: "#fff", bg: "#22863a" },
  revoked: { label: "Revoked", color: "#fff", bg: "#cb2431" },
  expired: { label: "Expired", color: "#fff", bg: "#b08800" },
  unavailable: { label: "Status unavailable", color: "#888", bg: "#e0e0e0" },
};

function StatusBadge({ status }: { status: CredentialStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "12px",
        fontSize: "0.78rem",
        fontWeight: 600,
        letterSpacing: "0.04em",
        color: s.color,
        backgroundColor: s.bg,
      }}
    >
      {s.label}
    </span>
  );
}

function credentialLabel(type: string[]): string {
  const meaningful = type.filter((t) => t !== "VerifiableCredential");
  return meaningful.length > 0
    ? meaningful.join(", ")
    : "Verifiable Credential";
}

function issuerLabel(issuer: string): string {
  try {
    return new URL(issuer).hostname;
  } catch {
    return issuer;
  }
}

export function WalletHome() {
  const { key } = useWallet();
  const [credentials, setCredentials] = useState<VerifiableCredential[]>([]);
  const [statuses, setStatuses] = useState<Map<string, CredentialStatus>>(
    new Map(),
  );
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loading = key !== null && !loaded;

  useEffect(() => {
    if (!key) return;

    let cancelled = false;

    getAllCredentials(key).then((result) => {
      if (cancelled) return;
      result.match(
        (creds) => {
          setCredentials(creds);
          setLoaded(true);

          const initial = new Map<string, CredentialStatus>(
            creds.map((c) => [c.id, "loading"]),
          );
          setStatuses(initial);

          creds.forEach((cred) => {
            resolveStatus(cred).then((status) => {
              if (cancelled) return;
              setStatuses((prev) => new Map(prev).set(cred.id, status));
            });
          });
        },
        (err) => {
          setError(`Failed to load credentials: ${err.message}`);
          setLoaded(true);
        },
      );
    });

    return () => {
      cancelled = true;
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
          {credentials.map((cred) => {
            const status = statuses.get(cred.id) ?? "loading";
            return (
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
                    alignItems: "flex-start",
                    marginBottom: "0.5rem",
                  }}
                >
                  <strong style={{ fontSize: "1rem" }}>
                    {credentialLabel(cred.type)}
                  </strong>
                  <StatusBadge status={status} />
                </div>
                <p style={{ margin: "0.25rem 0" }}>
                  <strong>Institution:</strong> {issuerLabel(cred.issuer)}
                </p>
                <p style={{ margin: "0.25rem 0" }}>
                  <strong>Issued:</strong>{" "}
                  {new Date(cred.issuanceDate).toLocaleDateString()}
                </p>
                <p style={{ margin: "0.25rem 0" }}>
                  <strong>Expires:</strong>{" "}
                  {new Date(cred.expirationDate).toLocaleDateString()}
                </p>
              </div>
            );
          })}
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
