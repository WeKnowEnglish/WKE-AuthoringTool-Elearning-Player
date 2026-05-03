export const SOFT_CHROME_PRESETS = [
  {
    id: "cream",
    label: "Warm cream background",
    page: "#faf8f5",
    header: "#f0ebe3",
  },
  {
    id: "mist",
    label: "Soft blue-gray background",
    page: "#f3f6fa",
    header: "#e6ecf4",
  },
  {
    id: "sage",
    label: "Soft sage background",
    page: "#f4f8f5",
    header: "#e5ede8",
  },
] as const;

export type SoftChromePresetId = (typeof SOFT_CHROME_PRESETS)[number]["id"];

export function getSoftChromePreset(
  id: string,
): (typeof SOFT_CHROME_PRESETS)[number] {
  const found = SOFT_CHROME_PRESETS.find((p) => p.id === id);
  return found ?? SOFT_CHROME_PRESETS[0];
}

export type SoftChromePresetStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => SoftChromePresetId;
  getServerSnapshot: () => SoftChromePresetId;
  persist: (id: SoftChromePresetId) => void;
};

export function createSoftChromePresetStore(
  storageKey: string,
): SoftChromePresetStore {
  const listeners = new Set<() => void>();

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey || e.key === null) listener();
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

  function bump() {
    for (const l of listeners) l();
  }

  function read(): SoftChromePresetId {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw && SOFT_CHROME_PRESETS.some((p) => p.id === raw)) {
        return raw as SoftChromePresetId;
      }
    } catch {
      /* ignore */
    }
    return SOFT_CHROME_PRESETS[0].id;
  }

  function getSnapshot(): SoftChromePresetId {
    if (typeof window === "undefined") return SOFT_CHROME_PRESETS[0].id;
    return read();
  }

  function getServerSnapshot(): SoftChromePresetId {
    return SOFT_CHROME_PRESETS[0].id;
  }

  function persist(id: SoftChromePresetId) {
    try {
      localStorage.setItem(storageKey, id);
    } catch {
      /* ignore */
    }
    bump();
  }

  return { subscribe, getSnapshot, getServerSnapshot, persist };
}

/** Teacher app chrome (separate from learner so each area remembers its own choice). */
export const teacherSoftChromeStore = createSoftChromePresetStore(
  "teacher-chrome-bg",
);

/** Student / learner shell chrome. */
export const studentSoftChromeStore = createSoftChromePresetStore(
  "student-chrome-bg",
);
