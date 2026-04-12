import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { groth16 } from "snarkjs";
import { getAllCredentials } from "@lib/credential-store";
import { fetchZkey, fetchWasm } from "@lib/api/proving-keys";
import { ProofType } from "@lib/types";
import type { Groth16Proof } from "@lib/types";

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
    .andThen((credential) =>
      ResultAsync.combine([
        fetchZkey(request.proof_type).mapErr(() => ({
          message:
            "Failed to load verification circuit, check internet connection",
        })),
        fetchWasm(request.proof_type).mapErr(() => ({
          message:
            "Failed to load verification circuit, check internet connection",
        })),
      ]).andThen(([zkeyBuffer, wasmBuffer]) => {
        const witness = {
          enrollment_status:
            credential.credentialSubject.enrollment_status === "student"
              ? "1"
              : "0",
          issued_at: Math.floor(
            new Date(credential.issuanceDate).getTime() / 1000,
          ).toString(),
          expires_at: Math.floor(
            new Date(credential.expirationDate).getTime() / 1000,
          ).toString(),
          Ax: credential.proof.fieldSignatures["Ax"] ?? "0",
          Ay: credential.proof.fieldSignatures["Ay"] ?? "0",
          R8x: credential.proof.fieldSignatures["R8x"] ?? "0",
          R8y: credential.proof.fieldSignatures["R8y"] ?? "0",
          S: credential.proof.fieldSignatures["S"] ?? "0",
          subject_pseudonym: credential.credentialSubject.id,
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
      }),
    );
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
