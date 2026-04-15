import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { groth16 } from "snarkjs";
import { buildEddsa } from "circomlibjs";
import { getAllCredentials } from "@lib/credential-store";
import { fetchZkey, fetchWasm } from "@lib/api/proving-keys";
import { ISSUER_PUBLIC_KEY_URL } from "@lib/api/config";
import { ProofType } from "@lib/types";
import type { Groth16Proof } from "@lib/types";

const ENROLLMENT_STATUS_STUDENT =
  "906954226396135619011145686687621910857321037597927521422477382836222528533";

const BABY_JUB_SUB_ORDER = BigInt(
  "2736030358979909402780800718157159386076813972158567259200215660948447373041",
);

function subjectPseudonymFE(hexSubjectID: string): string {
  const bytes = Uint8Array.from(
    hexSubjectID.match(/.{2}/g)!.map((b) => parseInt(b, 16)),
  );
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return (BigInt("0x" + hex) % BABY_JUB_SUB_ORDER).toString();
}

async function fetchIssuerPublicKey(): Promise<string> {
  const res = await fetch(ISSUER_PUBLIC_KEY_URL);
  if (!res.ok)
    throw new Error(`Failed to fetch issuer public key: ${res.status}`);
  const { publicKeyHex } = await res.json();
  return publicKeyHex;
}

export interface VerificationRequest {
  proof_type: ProofType;
  verifier_id: string;
  challenge: string;
  callback: string;
}

export interface ProofError {
  message: string;
}

export function parseVerificationRequest(
  search: string,
): VerificationRequest | null {
  const params = new URLSearchParams(search);
  const proof_type = params.get("proof_type");
  const verifier_id = params.get("verifier_id");
  const challenge = params.get("challenge");
  const callback = params.get("callback");

  if (!proof_type || !verifier_id || !challenge || !callback) return null;

  const validProofTypes = Object.values(ProofType) as string[];
  if (!validProofTypes.includes(proof_type)) return null;

  return {
    proof_type: proof_type as ProofType,
    verifier_id,
    challenge,
    callback,
  };
}

export function generateProof(
  request: VerificationRequest,
  key: CryptoKey,
): ResultAsync<Groth16Proof, ProofError> {
  return getAllCredentials(key)
    .mapErr((e) => ({ message: e.message }))
    .andThen((credentials) => {
      if (credentials.length === 0) {
        return errAsync({ message: "No credential found in wallet" });
      }
      return okAsync(credentials[0]);
    })
    .andThen((credential) => {
      const studentSigB64 =
        credential.proof.circuitSignatures?.["student_status"];
      if (!studentSigB64) {
        return errAsync({
          message: "Credential missing student_status circuit signature",
        });
      }

      return ResultAsync.combine([
        fetchZkey(request.proof_type).mapErr(() => ({
          message:
            "Failed to load verification circuit, check internet connection",
        })),
        fetchWasm(request.proof_type).mapErr(() => ({
          message:
            "Failed to load verification circuit, check internet connection",
        })),
        ResultAsync.fromPromise(
          fetchIssuerPublicKey(),
          (): ProofError => ({ message: "Failed to fetch issuer public key" }),
        ),
        ResultAsync.fromPromise(
          buildEddsa(),
          (): ProofError => ({ message: "Failed to initialise EdDSA" }),
        ),
      ]).andThen(([zkeyBuffer, wasmBuffer, publicKeyHex, eddsa]) => {
        const F = eddsa.F;

        const pubKeyBytes = Uint8Array.from(
          publicKeyHex.match(/.{2}/g)!.map((b: string) => parseInt(b, 16)),
        );
        const [axRaw, ayRaw] = eddsa.babyJub.unpackPoint(pubKeyBytes);
        const ax = F.toObject(axRaw).toString();
        const ay = F.toObject(ayRaw).toString();

        const sigBytes = Uint8Array.from(atob(studentSigB64), (c) =>
          c.charCodeAt(0),
        );
        const {
          R8: [r8xRaw, r8yRaw],
          S,
        } = eddsa.unpackSignature(sigBytes);
        const r8x = F.toObject(r8xRaw).toString();
        const r8y = F.toObject(r8yRaw).toString();
        const s = S.toString();

        const witness = {
          enrollment_status: ENROLLMENT_STATUS_STUDENT,
          issued_at: Math.floor(
            new Date(credential.issuanceDate).getTime() / 1000,
          ).toString(),
          expires_at: Math.floor(
            new Date(credential.expirationDate).getTime() / 1000,
          ).toString(),
          Ax: ax,
          Ay: ay,
          R8x: r8x,
          R8y: r8y,
          S: s,
          subject_pseudonym: subjectPseudonymFE(
            credential.credentialSubject.id,
          ),
          challenge_nonce: request.challenge,
          now: Math.floor(Date.now() / 1000).toString(),
        };

        return ResultAsync.fromPromise(
          groth16.fullProve(
            witness,
            { type: "mem", data: new Uint8Array(wasmBuffer) },
            { type: "mem", data: new Uint8Array(zkeyBuffer) },
          ) as Promise<Groth16Proof>,
          () => ({
            message:
              "Proof generation failed, your credential may not support this request",
          }),
        );
      });
    });
}

export function submitProofToVerifier(
  proof: Groth16Proof,
  callbackUrl: string,
): ResultAsync<void, ProofError> {
  return ResultAsync.fromPromise(
    fetch(callbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ZeroVerify-Version": "1.0",
      },
      body: JSON.stringify(proof),
    }),
    (): ProofError => ({
      message: "Could not reach verifier, check your connection",
    }),
  ).andThen((res) => {
    if (!res.ok)
      return errAsync({
        message: `Verifier rejected proof: ${res.statusText}`,
      });
    return okAsync(undefined);
  });
}
