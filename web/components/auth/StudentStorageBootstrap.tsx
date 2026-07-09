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

/** Hydrates auth-scoped LocalStorage namespace on student routes. */
export function StudentStorageBootstrap() {
  useEffect(() => {
    const supabase = createClient();

    const sync = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        setStudentStorageIdCache(user.id);
        await ensureMasteryHydratedForCurrentStudent();
      } else {
        clearStudentStorageIdCache();
        resetMasteryHydrationMemo();
      }
    };

    void sync();

    const onOnline = () => {
      void flushMasterySyncQueueForCurrentStudent();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void flushMasterySyncQueueForCurrentStudent();
      }
    };

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id ?? null;
      if (userId) {
        setStudentStorageIdCache(userId);
        void ensureMasteryHydratedForCurrentStudent();
      } else {
        clearStudentStorageIdCache();
        resetMasteryHydrationMemo();
      }
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
