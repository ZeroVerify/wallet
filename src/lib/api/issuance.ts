import { ResultAsync } from "neverthrow";
import type { VerifiableCredential } from "@lib/types";
import { ISSUE_URL } from "@lib/api/config";

export interface IssuanceError {
  status: number;
  message: string;
}

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestCredential(
  authorizationCode: string,
  codeVerifier: string,
): Promise<VerifiableCredential> {
  const res = await fetch(ISSUE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      authorization_code: authorizationCode,
      code_verifier: codeVerifier,
    }),
  });
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
}

// The backend answers 503 when it is throttled (for example a burst of simultaneous sign-ups).
// A throttled request never ran, so the authorization code is still unused and retrying is safe.
async function requestWithRetry(
  authorizationCode: string,
  codeVerifier: string,
): Promise<VerifiableCredential> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await requestCredential(authorizationCode, codeVerifier);
    } catch (e) {
      const isThrottled = (e as IssuanceError).status === 503;
      if (!isThrottled || attempt >= MAX_ATTEMPTS) throw e;
      const jitter = 0.5 + Math.random();
      await sleep(BASE_DELAY_MS * 2 ** (attempt - 1) * jitter);
    }
  }
}

export function issueCredential(
  authorizationCode: string,
  codeVerifier: string,
): ResultAsync<VerifiableCredential, IssuanceError> {
  return ResultAsync.fromPromise(
    requestWithRetry(authorizationCode, codeVerifier),
    (e) => e as IssuanceError,
  );
}
