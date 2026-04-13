import { ResultAsync, errAsync } from "neverthrow";
import { buildEddsa } from "circomlibjs";
import { groth16 } from "snarkjs";
import { fetchZkey, fetchWasm } from "@lib/api/proving-keys";
import { ProofType } from "@lib/types";
import type { VerifiableCredential, Groth16ProofData } from "@lib/types";
import { ISSUER_PUBLIC_KEY_URL } from "@lib/api/config";

export interface RevocationProofError {
  message: string;
}

const BABY_JUB_SUB_ORDER = BigInt(
  "2736030358979909402780800718157159386076813972158567259200215660948447373041",
);

async function fieldElement(value: string): Promise<bigint> {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return BigInt("0x" + hex) % BABY_JUB_SUB_ORDER;
}

async function fetchIssuerPublicKey(): Promise<string> {
  const res = await fetch(ISSUER_PUBLIC_KEY_URL);
  if (!res.ok)
    throw new Error(`Failed to fetch issuer public key: ${res.status}`);
  const { publicKeyHex } = await res.json();
  return publicKeyHex;
}

export function generateRevocationProof(
  credential: VerifiableCredential,
): ResultAsync<Groth16ProofData, RevocationProofError> {
  const revocationSigB64 =
    credential.proof.circuitSignatures?.credential_revocation;
  if (!revocationSigB64) {
    return errAsync({
      message: "Credential does not contain a revocation signature",
    });
  }

  const credentialID = credential.id.replace("urn:uuid:", "");

  return ResultAsync.combine([
    fetchZkey(ProofType.CredentialRevocation).mapErr((e) => ({
      message: e.message,
    })),
    fetchWasm(ProofType.CredentialRevocation).mapErr((e) => ({
      message: e.message,
    })),
    ResultAsync.fromPromise(
      fetchIssuerPublicKey(),
      (): RevocationProofError => ({
        message: "Failed to fetch issuer public key",
      }),
    ),
    ResultAsync.fromPromise(
      buildEddsa(),
      (): RevocationProofError => ({ message: "Failed to initialise EdDSA" }),
    ),
    ResultAsync.fromPromise(
      fieldElement(credentialID),
      (): RevocationProofError => ({
        message: "Failed to compute credential field element",
      }),
    ),
  ]).andThen(
    ([zkeyBuffer, wasmBuffer, publicKeyHex, eddsa, credentialIDFE]) => {
      const F = eddsa.F;

      const pubKeyBytes = Uint8Array.from(
        publicKeyHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)),
      );
      const [axRaw, ayRaw] = eddsa.babyJub.unpackPoint(pubKeyBytes);
      const ax = F.toObject(axRaw).toString();
      const ay = F.toObject(ayRaw).toString();

      const sigBytes = Uint8Array.from(atob(revocationSigB64), (c) =>
        c.charCodeAt(0),
      );
      const {
        R8: [r8xRaw, r8yRaw],
        S,
      } = eddsa.unpackSignature(sigBytes);
      const r8x = F.toObject(r8xRaw).toString();
      const r8y = F.toObject(r8yRaw).toString();
      const s = S.toString();

      const inputs = {
        credential_id: credentialIDFE.toString(),
        Ax: ax,
        Ay: ay,
        field_hash: credentialIDFE.toString(),
        R8x: r8x,
        R8y: r8y,
        S: s,
      };

      return ResultAsync.fromPromise(
        groth16
          .fullProve(
            inputs,
            { type: "mem", data: new Uint8Array(wasmBuffer) },
            { type: "mem", data: new Uint8Array(zkeyBuffer) },
          )
          .then((result) => (result as { proof: Groth16ProofData }).proof),
        (): RevocationProofError => ({ message: "Proof generation failed" }),
      );
    },
  );
}
