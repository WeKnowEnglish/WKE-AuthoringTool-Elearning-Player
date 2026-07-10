import { useCallback, useRef } from "react";

type GuardState = {
  finished: boolean;
  initializedKey: string | null;
};

/** Prevents activity init effects from wiping done/in-progress state after session refresh. */
export function useSecondaryActivityResetGuard() {
  const guardRef = useRef<GuardState>({
    finished: false,
    initializedKey: null,
  });

  const shouldSkipInit = useCallback((sessionKey: string): boolean => {
    const guard = guardRef.current;
    if (guard.finished) return true;
    if (guard.initializedKey === sessionKey) return true;
    return false;
  }, []);

  const noteInitialized = useCallback((sessionKey: string) => {
    guardRef.current.initializedKey = sessionKey;
  }, []);

  const markFinished = useCallback(() => {
    guardRef.current.finished = true;
  }, []);

  const clearFinished = useCallback(() => {
    guardRef.current.finished = false;
    guardRef.current.initializedKey = null;
  }, []);

  return {
    shouldSkipInit,
    noteInitialized,
    markFinished,
    clearFinished,
  };
}
