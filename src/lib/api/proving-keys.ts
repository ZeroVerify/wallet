import { ResultAsync } from "neverthrow";
import { ARTIFACTS_BASE_URL } from "@lib/api/config";
import type { ProofType } from "@lib/types";

export interface ProvingKeyError {
  message: string;
}

const cache = new Map<string, ArrayBuffer>();

function fetchBinary(url: string): ResultAsync<ArrayBuffer, ProvingKeyError> {
  return ResultAsync.fromPromise(
    fetch(url).then((res) => {
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
