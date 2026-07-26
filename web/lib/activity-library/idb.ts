import {
  ACTIVITY_LIBRARY_DB,
  ACTIVITY_LIBRARY_STORE,
  ACTIVITY_LIBRARY_VERSION,
  type ActivityLibraryEntry,
  type ActivityLibraryFormat,
} from "./types";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }
    const request = indexedDB.open(ACTIVITY_LIBRARY_DB, ACTIVITY_LIBRARY_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Could not open activity library."));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ACTIVITY_LIBRARY_STORE)) {
        const store = db.createObjectStore(ACTIVITY_LIBRARY_STORE, { keyPath: "id" });
        store.createIndex("by_format", "format", { unique: false });
        store.createIndex("by_updatedAt", "updatedAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Activity library request failed."));
  });
}

export function newActivityLibraryId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `lib-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function putActivityLibraryEntry(
  entry: ActivityLibraryEntry,
): Promise<ActivityLibraryEntry> {
  const db = await openDb();
  try {
    const tx = db.transaction(ACTIVITY_LIBRARY_STORE, "readwrite");
    await req(tx.objectStore(ACTIVITY_LIBRARY_STORE).put(entry));
    return entry;
  } finally {
    db.close();
  }
}

export async function getActivityLibraryEntry(
  id: string,
): Promise<ActivityLibraryEntry | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(ACTIVITY_LIBRARY_STORE, "readonly");
    const value = await req(tx.objectStore(ACTIVITY_LIBRARY_STORE).get(id));
    return (value as ActivityLibraryEntry | undefined) ?? null;
  } finally {
    db.close();
  }
}

export async function listActivityLibraryEntries(
  format?: ActivityLibraryFormat,
): Promise<ActivityLibraryEntry[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(ACTIVITY_LIBRARY_STORE, "readonly");
    const store = tx.objectStore(ACTIVITY_LIBRARY_STORE);
    const all = (await req(store.getAll())) as ActivityLibraryEntry[];
    const filtered = format ? all.filter((entry) => entry.format === format) : all;
    return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } finally {
    db.close();
  }
}

export async function deleteActivityLibraryEntry(id: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(ACTIVITY_LIBRARY_STORE, "readwrite");
    await req(tx.objectStore(ACTIVITY_LIBRARY_STORE).delete(id));
  } finally {
    db.close();
  }
}
