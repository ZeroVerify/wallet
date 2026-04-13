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

async function resolveRevocationStatuses(
  creds: VerifiableCredential[],
  signal: AbortSignal,
): Promise<Map<string, CredentialStatus>> {
  const byUrl = new Map<string, VerifiableCredential[]>();
  for (const cred of creds) {
    const url = cred.credentialStatus.statusListCredential;
    const group = byUrl.get(url) ?? [];
    group.push(cred);
    byUrl.set(url, group);
  }

  const result = new Map<string, CredentialStatus>();

  await Promise.all(
    Array.from(byUrl.entries()).map(async ([url, group]) => {
      const bitstringResult = await fetchBitstring(url, signal);
      for (const cred of group) {
        const index = parseInt(cred.credentialStatus.statusListIndex, 10);
        result.set(
          cred.id,
          bitstringResult.match(
            (bitstring) => {
              if (checkBit(bitstring, index)) return "revoked";
              if (new Date(cred.expirationDate) < new Date()) return "expired";
              return "active";
            },
            () => "unavailable",
          ),
        );
      }
    }),
  );

  return result;
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
