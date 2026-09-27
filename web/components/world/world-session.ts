import { landmassById } from "./world-landmasses";

const SHARED_KEY = "wke-world-last-hub";

function storageKey(studentKey?: string | null): string {
  return studentKey ? `${SHARED_KEY}:${studentKey}` : SHARED_KEY;
}

function readStore(key: string): string | null {
  try {
    const local = window.localStorage.getItem(key);
    if (local && landmassById(local)) return local;
  } catch {
    /* private mode */
  }
  try {
    const session = window.sessionStorage.getItem(key);
    if (session && landmassById(session)) return session;
  } catch {
    /* private mode */
  }
  return null;
}

export function readLastHubId(studentKey?: string | null): string | null {
  if (typeof window === "undefined") return null;
  if (studentKey) {
    const keyed = readStore(storageKey(studentKey));
    if (keyed) return keyed;
  }
  return readStore(SHARED_KEY);
}

export function writeLastHubId(id: string, studentKey?: string | null): void {
  if (typeof window === "undefined") return;
  if (!landmassById(id)) return;
  const key = storageKey(studentKey);
  try {
    window.localStorage.setItem(key, id);
    window.localStorage.setItem(SHARED_KEY, id);
  } catch {
    /* private mode */
  }
  try {
    window.sessionStorage.setItem(SHARED_KEY, id);
  } catch {
    /* private mode */
  }
}
