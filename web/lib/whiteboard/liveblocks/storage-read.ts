/** Helpers for reading Liveblocks useStorage snapshots (ToJson = plain objects). */

export function readStorageMapValue<T>(map: unknown, key: string): T | undefined {
  if (map == null || typeof map !== "object") return undefined;
  if (typeof (map as { get?: unknown }).get === "function") {
    return (map as { get: (k: string) => T | undefined }).get(key);
  }
  return (map as Record<string, T>)[key];
}

export function readStorageMapKeys(map: unknown): string[] {
  if (map == null || typeof map !== "object") return [];
  if (typeof (map as { keys?: unknown }).keys === "function") {
    return [...(map as { keys: () => IterableIterator<string> }).keys()];
  }
  return Object.keys(map as Record<string, unknown>);
}

export function readStorageMapEntries<T>(map: unknown): [string, T][] {
  if (map == null || typeof map !== "object") return [];
  if (typeof (map as { entries?: unknown }).entries === "function") {
    return [...(map as { entries: () => IterableIterator<[string, T]> }).entries()];
  }
  return Object.entries(map as Record<string, T>);
}

export function readLiveObjectField<T>(
  node: unknown,
  key: string,
): T | undefined {
  if (node == null || typeof node !== "object") return undefined;
  if (typeof (node as { get?: unknown }).get === "function") {
    return (node as { get: (k: string) => T | undefined }).get(key);
  }
  return (node as Record<string, T>)[key];
}

/** Normalize LiveMap / plain-object element bags for rendering. */
export function asElementLookup(
  value: unknown,
): { get: (id: string) => unknown } {
  if (value != null && typeof value === "object" && typeof (value as { get?: unknown }).get === "function") {
    return value as { get: (id: string) => unknown };
  }
  const record = (value ?? {}) as Record<string, unknown>;
  return {
    get: (id: string) => record[id],
  };
}
