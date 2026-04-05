import { ResultAsync } from "neverthrow";
import type { VerifiableCredential } from "@lib/types";
import { encrypt, decrypt, type EncryptedData } from "@lib/crypto";

export interface CredentialStoreError {
  message: string;
}

const DB_NAME = "zeroverify-wallet";
const DB_VERSION = 1;
const STORE_NAME = "credentials";

interface StoredCredential {
  id: string;
  ciphertext: ArrayBuffer;
  iv: ArrayBuffer;
  encrypted: boolean;
  stored_at: string;
}

function openDatabase(): ResultAsync<IDBDatabase, CredentialStoreError> {
  return ResultAsync.fromPromise(
    new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(new Error("Failed to open database"));

      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("stored_at", "stored_at", { unique: false });
        }
      };
    }),
    (e) => ({
      message: e instanceof Error ? e.message : "Database error",
    }),
  );
}

export function storeCredential(
  credential: VerifiableCredential,
  key: CryptoKey,
): ResultAsync<void, CredentialStoreError> {
  const credentialJson = JSON.stringify(credential);

  return encrypt(key, credentialJson)
    .mapErr(
      (e): CredentialStoreError => ({
        message: `Encryption failed: ${e.message}`,
      }),
    )
    .andThen((encrypted) =>
      openDatabase().andThen((db) =>
        ResultAsync.fromPromise(
          new Promise<void>((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], "readwrite");
            const store = transaction.objectStore(STORE_NAME);

            const storedCredential: StoredCredential = {
              id: credential.id,
              ciphertext: encrypted.ciphertext,
              iv: encrypted.iv.buffer as ArrayBuffer,
              encrypted: true,
              stored_at: new Date().toISOString(),
            };

            const request = store.put(storedCredential);

            request.onsuccess = () => {
              db.close();
              resolve();
            };

            request.onerror = () => {
              db.close();
              reject(new Error("Failed to store credential"));
            };
          }),
          (e) => ({
            message: e instanceof Error ? e.message : "Storage error",
          }),
        ),
      ),
    );
}

export function getAllCredentials(
  key: CryptoKey,
): ResultAsync<VerifiableCredential[], CredentialStoreError> {
  return openDatabase().andThen((db) =>
    ResultAsync.fromPromise(
      new Promise<StoredCredential[]>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          db.close();
          resolve(request.result);
        };

        request.onerror = () => {
          db.close();
          reject(new Error("Failed to retrieve credentials"));
        };
      }),
      (e) => ({
        message: e instanceof Error ? e.message : "Retrieval error",
      }),
    ).andThen((stored) => {
      const decryptPromises = stored.map((item) => {
        const encryptedData: EncryptedData = {
          ciphertext: item.ciphertext,
          iv: new Uint8Array(item.iv),
        };
        return decrypt(key, encryptedData)
          .map((json) => JSON.parse(json) as VerifiableCredential)
          .mapErr(
            (e): CredentialStoreError => ({
              message: `Decryption failed: ${e.message}`,
            }),
          );
      });

      return ResultAsync.combine(decryptPromises);
    }),
  );
}

export function getCredential(
  id: string,
  key: CryptoKey,
): ResultAsync<VerifiableCredential | null, CredentialStoreError> {
  return openDatabase().andThen((db) =>
    ResultAsync.fromPromise(
      new Promise<StoredCredential | undefined>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
          db.close();
          resolve(request.result);
        };

        request.onerror = () => {
          db.close();
          reject(new Error("Failed to retrieve credential"));
        };
      }),
      (e) => ({
        message: e instanceof Error ? e.message : "Retrieval error",
      }),
    ).andThen((stored) => {
      if (!stored) {
        return ResultAsync.fromSafePromise(Promise.resolve(null));
      }

      const encryptedData: EncryptedData = {
        ciphertext: stored.ciphertext,
        iv: new Uint8Array(stored.iv),
      };

      return decrypt(key, encryptedData)
        .map((json) => JSON.parse(json) as VerifiableCredential)
        .mapErr(
          (e): CredentialStoreError => ({
            message: `Decryption failed: ${e.message}`,
          }),
        );
    }),
  );
}

export function deleteCredential(
  id: string,
): ResultAsync<void, CredentialStoreError> {
  return openDatabase().andThen((db) =>
    ResultAsync.fromPromise(
      new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => {
          db.close();
          resolve();
        };

        request.onerror = () => {
          db.close();
          reject(new Error("Failed to delete credential"));
        };
      }),
      (e) => ({
        message: e instanceof Error ? e.message : "Deletion error",
      }),
    ),
  );
}

export function clearAllCredentials(): ResultAsync<void, CredentialStoreError> {
  return openDatabase().andThen((db) =>
    ResultAsync.fromPromise(
      new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          db.close();
          resolve();
        };

        request.onerror = () => {
          db.close();
          reject(new Error("Failed to clear credentials"));
        };
      }),
      (e) => ({
        message: e instanceof Error ? e.message : "Clear error",
      }),
    ),
  );
}
