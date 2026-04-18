import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";

import { PassphraseGate } from "../components/PassphraseGate";
import { useWallet } from "../context/useWallet";
import { createAuthRequest, SUPPORTED_IDPS } from "@lib/api/keycloak";
import { getAllCredentials } from "@lib/credential-store";
import { fetchBitstring } from "@lib/api/bitstring";
import { generateRevocationProof } from "@lib/revocation-proof";
import { revokeCredential } from "@lib/api/revocation";
import type { VerifiableCredential } from "@lib/types";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Modal } from "../components/Modal";
import {
  CheckCircle,
  XCircle,
  Calendar,
  Building,
  AlertCircle,
} from "lucide-react";

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

function StatusBadge({ status }: { status: CredentialStatus }) {
  if (status === "loading") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        Checking...
      </span>
    );
  }

  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="size-3" />
        Active
      </span>
    );
  }

  if (status === "revoked") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircle className="size-3" />
        Revoked
      </span>
    );
  }

  if (status === "expired") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <AlertCircle className="size-3" />
        Expired
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      Status unavailable
    </span>
  );
}

export function WalletHome() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { key } = useWallet();

  const [showIssuedModal, setShowIssuedModal] = useState(
    state?.issued === true,
  );
  const [credentials, setCredentials] = useState<VerifiableCredential[]>([]);
  const [statuses, setStatuses] = useState<Map<string, CredentialStatus>>(
    new Map(),
  );
  const [revoking, setRevoking] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loading = key !== null && !loaded;
  const hasCredentials = credentials.length > 0;

  useEffect(() => {
    if (!key) return;

    const controller = new AbortController();

    getAllCredentials(key).then((result) => {
      if (controller.signal.aborted) return;

      result.match(
        (creds) => {
          setCredentials(creds);
          setLoaded(true);
          setStatuses(
            new Map(creds.map((c) => [c.id, "loading" as CredentialStatus])),
          );

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

  async function handleRevoke(credential: VerifiableCredential) {
    if (!key) return;

    setRevoking((prev) => new Set(prev).add(credential.id));
    setError(null);

    const credentialID = credential.id.replace("urn:uuid:", "");
    const subjectID = credential.credentialSubject.id;

    const result = await generateRevocationProof(credential).andThen((proof) =>
      revokeCredential(subjectID, credentialID, proof),
    );

    result.match(
      () => {
        setStatuses((prev) => new Map(prev).set(credential.id, "revoked"));
      },
      (err) => setError(err.message),
    );

    setRevoking((prev) => {
      const next = new Set(prev);
      next.delete(credential.id);
      return next;
    });
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
    <div className="min-h-[calc(100vh-145px)] bg-white">
      {showIssuedModal && (
        <Modal>
          <div className="text-center">
            <div className="inline-flex items-center justify-center size-16 rounded-full bg-green-50 mb-4">
              <CheckCircle className="size-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Credential issued!
            </h2>
            <p className="text-gray-600 mb-6">
              Your credential has been encrypted and saved to your wallet.
            </p>
            <Button
              onClick={() => setShowIssuedModal(false)}
              className="w-full zeroverify-gradient hover:opacity-90 text-white"
            >
              Done
            </Button>
          </div>
        </Modal>
      )}
      <div className="max-w-4xl mx-auto px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            ZeroVerify Wallet
          </h1>
          {hasCredentials && (
            <Button
              onClick={handleGetCredential}
              className="zeroverify-gradient hover:opacity-90 text-white"
            >
              Get Credential
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-600">Loading credentials...</p>
        ) : !hasCredentials ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center size-20 rounded-full bg-gray-100 mb-6">
              <Building className="size-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              No credentials found.
            </h2>
            <p className="text-base text-gray-600 mb-8">
              Get one to get started!
            </p>
            <Button
              onClick={handleGetCredential}
              size="lg"
              className="zeroverify-gradient hover:opacity-90 text-white"
            >
              Get Credential
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {credentials.map((cred) => {
              const status = statuses.get(cred.id) ?? "loading";

              return (
                <Card
                  key={cred.id}
                  className="p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {credentialLabel(cred.type)}
                        </h3>
                        <StatusBadge status={status} />
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Building className="size-4" />
                          <span>Issued by: {issuerLabel(cred.issuer)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="size-4" />
                          <span>
                            Issued on:{" "}
                            {new Date(cred.issuanceDate).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="size-4" />
                          <span>
                            Expires on:{" "}
                            {new Date(cred.expirationDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      {status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevoke(cred)}
                          disabled={revoking.has(cred.id)}
                        >
                          {revoking.has(cred.id) ? "Revoking…" : "Revoke"}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
