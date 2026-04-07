import { ok, err, ResultAsync } from "neverthrow";
import type { VerifiableCredential } from "@lib/types";
import { encrypt, decrypt, type EncryptedData } from "@lib/crypto";

export interface CredentialStoreError {
  message: string;
}

const DB_NAME = "zeroverify-wallet";
const DB_VERSION = 1;
const STORE_NAME = "credentials";
const METADATA_STORE_NAME = "metadata";

interface StoredCredential {
  id: string;
  ciphertext: ArrayBuffer;
  iv: ArrayBuffer;
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
        if (!db.objectStoreNames.contains(METADATA_STORE_NAME)) {
          db.createObjectStore(METADATA_STORE_NAME, { keyPath: "key" });
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
          .mapErr(
            (e): CredentialStoreError => ({
              message: `Decryption failed: ${e.message}`,
            }),
          )
          .andThen((json) => {
            try {
              return ok(JSON.parse(json) as VerifiableCredential);
            } catch {
              return err<VerifiableCredential, CredentialStoreError>({
                message: "Failed to parse credential data",
              });
            }
          });
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
        .mapErr(
          (e): CredentialStoreError => ({
            message: `Decryption failed: ${e.message}`,
          }),
        )
        .andThen((json) => {
          try {
            return ok(JSON.parse(json) as VerifiableCredential);
          } catch {
            return err<VerifiableCredential, CredentialStoreError>({
              message: "Failed to parse credential data",
            });
          }
        });
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

export function getOrCreateSalt(): ResultAsync<
  Uint8Array<ArrayBuffer>,
  CredentialStoreError
> {
  return openDatabase().andThen((db) =>
    ResultAsync.fromPromise(
      new Promise<Uint8Array<ArrayBuffer>>((resolve, reject) => {
        const transaction = db.transaction([METADATA_STORE_NAME], "readwrite");
        const store = transaction.objectStore(METADATA_STORE_NAME);
        const getRequest = store.get("pbkdf2_salt");

        getRequest.onsuccess = () => {
          if (getRequest.result) {
            db.close();
            resolve(new Uint8Array(getRequest.result.value as ArrayBuffer));
            return;
          }

          const salt = crypto.getRandomValues(
            new Uint8Array(16) as Uint8Array<ArrayBuffer>,
          );
          const putRequest = store.put({
            key: "pbkdf2_salt",
            value: salt.buffer,
          });

          putRequest.onsuccess = () => {
            db.close();
            resolve(salt);
          };

          putRequest.onerror = () => {
            db.close();
            reject(new Error("Failed to store salt"));
          };
        };

        getRequest.onerror = () => {
          db.close();
          reject(new Error("Failed to retrieve salt"));
        };
      }),
      (e) => ({
        message: e instanceof Error ? e.message : "Salt error",
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
