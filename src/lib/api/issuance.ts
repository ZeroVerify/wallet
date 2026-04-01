import { ResultAsync } from "neverthrow";
import type { VerifiableCredential } from "@lib/types";
import { ISSUE_URL } from "@lib/api/config";

export interface IssuanceError {
  status: number;
  message: string;
}

export function issueCredential(
  authorizationCode: string,
  codeVerifier: string,
): ResultAsync<VerifiableCredential, IssuanceError> {
  return ResultAsync.fromPromise(
    fetch(ISSUE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authorization_code: authorizationCode,
        code_verifier: codeVerifier,
      }),
    }).then(async (res) => {
      if (res.status === 401)
        throw {
          status: 401,
          message: "Unauthorized: invalid or expired token",
        };
      if (res.status === 409)
        throw { status: 409, message: "Credential already issued" };
      if (res.status === 503)
        throw { status: 503, message: "Service unavailable, try again later" };
      if (!res.ok)
        throw { status: res.status, message: `Issuance failed: ${res.status}` };
      const data = (await res.json()) as { credential: VerifiableCredential };
      return data.credential;
    }),
    (e) => e as IssuanceError,
  );
}
