type Entry<T> = { data: T; ts: number };

const store = new Map<string, Entry<unknown>>();

export function cacheGet<T>(key: string, ttlMs = 30_000): T | null {
  const e = store.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > ttlMs) { store.delete(key); return null; }
  return e.data as T;
}

export function cacheSet<T>(key: string, data: T): void {
  store.set(key, { data, ts: Date.now() });
}

export function cacheInvalidate(...keys: string[]): void {
  keys.forEach((k) => store.delete(k));
}
