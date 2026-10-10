import { ResultAsync } from "neverthrow";
import { ARTIFACTS_BASE_URL } from "@lib/api/config";
import type { ProofType } from "@lib/types";

export interface ProvingKeyError {
  message: string;
}

const cache = new Map<string, ArrayBuffer>();

// The circuit files are served with a 24 hour max-age. A browser that fetched the old circuit would keep using it for a
// day after a new trusted setup and produce proofs with the wrong number of public signals. "no-cache" makes the
// browser revalidate with the server (a cheap 304 when nothing changed), so a new circuit is picked up immediately.
function fetchBinary(url: string): ResultAsync<ArrayBuffer, ProvingKeyError> {
  return ResultAsync.fromPromise(
    fetch(url, { cache: "no-cache" }).then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
      return res.arrayBuffer();
    }),
    (e) => ({ message: e instanceof Error ? e.message : "Network error" }),
  );
}

export function fetchZkey(
  proofType: ProofType,
): ResultAsync<ArrayBuffer, ProvingKeyError> {
  const cacheKey = `zkey_${proofType}`;
  const cached = cache.get(cacheKey);
  if (cached) return ResultAsync.fromSafePromise(Promise.resolve(cached));
  return fetchBinary(
    `${ARTIFACTS_BASE_URL}/circuit/${proofType}/proving_key.zkey`,
  ).map((buf) => {
    cache.set(cacheKey, buf);
    return buf;
  });
}

export function fetchWasm(
  proofType: ProofType,
): ResultAsync<ArrayBuffer, ProvingKeyError> {
  const cacheKey = `wasm_${proofType}`;
  const cached = cache.get(cacheKey);
  if (cached) return ResultAsync.fromSafePromise(Promise.resolve(cached));
  return fetchBinary(
    `${ARTIFACTS_BASE_URL}/circuit/${proofType}/circuit.wasm`,
  ).map((buf) => {
    cache.set(cacheKey, buf);
    return buf;
  });
}
