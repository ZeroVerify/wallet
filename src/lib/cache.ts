export interface Cache<T> {
  get(key: string): T | null;
  set(key: string, value: T): void;
  delete(key: string): void;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class InMemoryCache<T> implements Cache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private ttlMs: number;

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }
}

export interface Serializer<T> {
  serialize: (value: T) => string;
  deserialize: (raw: string) => T;
}

export function jsonSerializer<T>(): Serializer<T> {
  return {
    serialize: (value) => JSON.stringify(value),
    deserialize: (raw) => JSON.parse(raw) as T,
  };
}

export const binarySerializer: Serializer<ArrayBuffer> = {
  serialize: (buf) => {
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++)
      binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  },
  deserialize: (raw) => {
    const binary = atob(raw);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
    return buffer.buffer;
  },
};

interface LocalStorageEntry {
  data: string;
  expiresAt: number;
}

export class LocalStorageCache<T> implements Cache<T> {
  private ttlMs: number;
  private serializer: Serializer<T>;

  constructor(ttlMs: number, serializer: Serializer<T>) {
    this.ttlMs = ttlMs;
    this.serializer = serializer;
  }

  get(key: string): T | null {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as LocalStorageEntry;
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    return this.serializer.deserialize(entry.data);
  }

  set(key: string, value: T): void {
    const entry: LocalStorageEntry = {
      data: this.serializer.serialize(value),
      expiresAt: Date.now() + this.ttlMs,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  }

  delete(key: string): void {
    localStorage.removeItem(key);
  }
}
