import {
  createSamInferenceSession,
  type SamInferenceSession,
} from "./infer";
import type { SamModelStatus } from "./types";

let sessionPromise: Promise<SamInferenceSession> | null = null;
let activeSession: SamInferenceSession | null = null;
const loadListeners = new Set<(status: SamModelStatus) => void>();
let lastStatus: SamModelStatus = { state: "idle", progress: 0, error: null };

function emit(status: SamModelStatus) {
  lastStatus = status;
  for (const listener of loadListeners) listener(status);
}

export function subscribeSamModelStatus(
  listener: (status: SamModelStatus) => void,
): () => void {
  listener(lastStatus);
  loadListeners.add(listener);
  return () => loadListeners.delete(listener);
}

export function getSamModelStatus(): SamModelStatus {
  return lastStatus;
}

export async function ensureSamSession(
  onProgress?: (progress: number) => void,
): Promise<SamInferenceSession> {
  if (sessionPromise) return sessionPromise;

  emit({ state: "loading", progress: 0.05, error: null });
  onProgress?.(0.05);

  sessionPromise = (async () => {
    try {
      emit({ state: "loading", progress: 0.2, error: null });
      onProgress?.(0.2);
      const session = await createSamInferenceSession();
      activeSession = session;
      emit({ state: "ready", progress: 1, error: null });
      onProgress?.(1);
      return session;
    } catch (err) {
      const message = (err as Error).message;
      emit({ state: "error", progress: 0, error: message });
      sessionPromise = null;
      activeSession = null;
      throw err;
    }
  })();

  return sessionPromise;
}

export function resetSamSession(): void {
  activeSession?.dispose();
  activeSession = null;
  sessionPromise = null;
  emit({ state: "idle", progress: 0, error: null });
}
