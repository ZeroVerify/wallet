import { ResultAsync } from "neverthrow";

export interface CryptoError {
  message: string;
}

export interface EncryptedData {
  ciphertext: ArrayBuffer;
  iv: Uint8Array<ArrayBuffer>;
}

/**
 * Encrypts data using AES-GCM with the provided key
 */
export function encrypt(
  key: CryptoKey,
  data: string,
): ResultAsync<EncryptedData, CryptoError> {
  return ResultAsync.fromPromise(
    (async () => {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encodedData = new TextEncoder().encode(data);
      const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        encodedData,
      );
      return { ciphertext, iv };
    })(),
    (e) => ({
      message: e instanceof Error ? e.message : "Encryption failed",
    }),
  );
}

/**
 * Decrypts AES-GCM encrypted data using the provided key
 */
export function decrypt(
  key: CryptoKey,
  encryptedData: EncryptedData,
): ResultAsync<string, CryptoError> {
  return ResultAsync.fromPromise(
    (async () => {
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: encryptedData.iv },
        key,
        encryptedData.ciphertext,
      );
      return new TextDecoder().decode(decrypted);
    })(),
    (e) => ({
      message: e instanceof Error ? e.message : "Decryption failed",
    }),
  );
}
