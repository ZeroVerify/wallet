import { ResultAsync } from "neverthrow";
import { REVOKE_URL } from "@lib/api/config";
import type { Groth16ProofData } from "@lib/types";

export interface RevocationError {
  status: number;
  message: string;
}

export function revokeCredential(
  subjectId: string,
  credentialId: string,
  proof: Groth16ProofData,
): ResultAsync<void, RevocationError> {
  return ResultAsync.fromPromise(
    fetch(REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, credentialId, proofJson: proof }),
    }).then(async (res) => {
      if (res.status === 409)
        throw { status: 409, message: "Credential is already revoked" };
      if (res.status === 400) throw { status: 400, message: "Invalid proof" };
      if (!res.ok)
        throw {
          status: res.status,
          message: `Revocation failed: ${res.status}`,
        };
    }),
    (e) => e as RevocationError,
  );
}
