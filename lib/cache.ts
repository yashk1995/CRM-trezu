type Entry<T> = { data: T; ts: number };

const store = new Map<string, Entry<unknown>>();

// Always returns cached data regardless of age — stale-while-revalidate.
// Loading states are only shown on the very first fetch (no entry at all).
// Mutations call cacheInvalidate/cacheClearPrefix to force fresh fetches.
export function cacheGet<T>(key: string): T | null {
  const e = store.get(key);
  return e ? (e.data as T) : null;
}

export function cacheSet<T>(key: string, data: T): void {
  store.set(key, { data, ts: Date.now() });
}

export function cacheInvalidate(...keys: string[]): void {
  keys.forEach((k) => store.delete(k));
}

export function cacheClearPrefix(prefix: string): void {
  Array.from(store.keys()).forEach((key) => {
    if (key.startsWith(prefix)) store.delete(key);
  });
}
