/**
 * Admin-only client preference: preview the teacher chrome as Teacher Light.
 * Persisted in localStorage so it survives navigation within the session.
 */

const STORAGE_KEY = "wke.teacher.preview.light.v1";

function readPreviewAsTeacherLight(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writePreviewAsTeacherLight(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

type AdminTeacherPreviewStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => boolean;
  getServerSnapshot: () => boolean;
  setPreviewAsTeacherLight: (enabled: boolean) => void;
};

function createAdminTeacherPreviewStore(): AdminTeacherPreviewStore {
  const listeners = new Set<() => void>();
  let cached: boolean | null = null;

  function bump() {
    cached = null;
    for (const listener of listeners) listener();
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) bump();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", onStorage);
    }
    return () => {
      listeners.delete(listener);
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", onStorage);
      }
    };
  }

  function getSnapshot(): boolean {
    if (typeof window === "undefined") return false;
    if (cached == null) cached = readPreviewAsTeacherLight();
    return cached;
  }

  function getServerSnapshot(): boolean {
    return false;
  }

  function setPreviewAsTeacherLight(enabled: boolean) {
    writePreviewAsTeacherLight(enabled);
    bump();
  }

  return {
    subscribe,
    getSnapshot,
    getServerSnapshot,
    setPreviewAsTeacherLight,
  };
}

export const adminTeacherPreviewStore = createAdminTeacherPreviewStore();
