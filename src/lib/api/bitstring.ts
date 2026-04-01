import { ResultAsync } from "neverthrow";

export interface BitstringError {
  message: string;
}

export function fetchBitstring(
  url: string,
): ResultAsync<Uint8Array, BitstringError> {
  return ResultAsync.fromPromise(
    fetch(url)
      .then((res) => {
        if (!res.ok)
          throw new Error(
            `Failed to fetch revocation bitstring: ${res.status}`,
          );
        return res
          .body!.pipeThrough(new DecompressionStream("gzip"))
          .getReader();
      })
      .then(async (reader) => {
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
        const decompressed = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          decompressed.set(chunk, offset);
          offset += chunk.length;
        }
        const base64 = new TextDecoder().decode(decompressed);
        const binary = atob(base64);
        const bitstring = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++)
          bitstring[i] = binary.charCodeAt(i);
        return bitstring;
      }),
    (e): BitstringError => ({
      message: e instanceof Error ? e.message : "Network error",
    }),
  );
}
