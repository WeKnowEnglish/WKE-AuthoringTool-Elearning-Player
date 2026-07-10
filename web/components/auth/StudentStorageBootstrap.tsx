"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  clearStudentStorageIdCache,
  setStudentStorageIdCache,
} from "@/lib/auth/student-storage-id";
import {
  ensureMasteryHydratedForCurrentStudent,
  flushMasterySyncQueueForCurrentStudent,
  resetMasteryHydrationMemo,
} from "@/lib/mastery/supabase-sync";

function isBenignAuthLockError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  if (error.name !== "AbortError") return false;
  return error.message.includes("Lock broken by another request");
}

async function runStudentStorageSideEffect(task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch (error) {
    if (isBenignAuthLockError(error)) return;
    console.warn("[student-storage] side effect failed", error);
  }
}

/** Hydrates auth-scoped LocalStorage namespace on student routes. */
export function StudentStorageBootstrap() {
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const applyUserId = (userId: string | null) => {
      if (cancelled) return;
      if (userId) {
        setStudentStorageIdCache(userId);
        void runStudentStorageSideEffect(() => ensureMasteryHydratedForCurrentStudent());
      } else {
        clearStudentStorageIdCache();
        resetMasteryHydrationMemo();
      }
    };

    const onOnline = () => {
      void runStudentStorageSideEffect(() => flushMasterySyncQueueForCurrentStudent());
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void runStudentStorageSideEffect(() => flushMasterySyncQueueForCurrentStudent());
      }
    };

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUserId(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
