import { ResultAsync } from "neverthrow";

export interface CryptoError {
  message: string;
}

export interface EncryptedData {
  ciphertext: ArrayBuffer;
  iv: Uint8Array<ArrayBuffer>;
}

export function deriveKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
): ResultAsync<CryptoKey, CryptoError> {
  return ResultAsync.fromPromise(
    (async () => {
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(passphrase),
        "PBKDF2",
        false,
        ["deriveKey"],
      );
      return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 310_000, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
      );
    })(),
    (e) => ({
      message: e instanceof Error ? e.message : "Key derivation failed",
    }),
  );
}

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
