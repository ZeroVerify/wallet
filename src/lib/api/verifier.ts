import { ResultAsync } from "neverthrow";
import type { Groth16Proof } from "@lib/types";

export interface VerifierError {
  message: string;
}

const ZK_VERSION = "1.0";

export function submitProof(
  proof: Groth16Proof,
  callbackUrl: string,
): ResultAsync<void, VerifierError> {
  return ResultAsync.fromPromise(
    fetch(callbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ZeroVerify-Version": ZK_VERSION,
      },
      body: JSON.stringify(proof),
    }).then((res) => {
      if (!res.ok)
        throw new Error(`Verifier rejected proof: ${res.statusText}`);
    }),
    (e) => ({ message: e instanceof Error ? e.message : "Network error" }),
  );
}
