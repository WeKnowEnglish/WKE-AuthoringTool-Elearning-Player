const ACTIVE_CLASS_STORAGE_KEY = "wke-student-active-class-id";
const ACTIVE_CLASS_CHANGED_EVENT = "wke-student-active-class-changed";

export function readActiveStudentClassId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(ACTIVE_CLASS_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeActiveStudentClassId(classId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ACTIVE_CLASS_STORAGE_KEY, classId);
    window.dispatchEvent(new Event(ACTIVE_CLASS_CHANGED_EVENT));
  } catch {
    // ignore quota / private mode
  }
}

export function clearActiveStudentClassId(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(ACTIVE_CLASS_STORAGE_KEY);
    window.dispatchEvent(new Event(ACTIVE_CLASS_CHANGED_EVENT));
  } catch {
    // ignore
  }
}

export function subscribeActiveStudentClassId(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === ACTIVE_CLASS_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(ACTIVE_CLASS_CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(ACTIVE_CLASS_CHANGED_EVENT, onChange);
  };
}
