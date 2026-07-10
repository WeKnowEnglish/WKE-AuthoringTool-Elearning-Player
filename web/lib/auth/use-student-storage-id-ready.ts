"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  clearStudentStorageIdCache,
  resolveStudentStorageIdSync,
  setStudentStorageIdCache,
} from "@/lib/auth/student-storage-id";

/** True after auth has been checked and student storage id is stable for this tab. */
export function useStudentStorageIdReady(): {
  ready: boolean;
  studentId: string;
} {
  const [ready, setReady] = useState(false);
  const [studentId, setStudentId] = useState("");

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const applyResolvedId = () => {
      if (cancelled) return;
      const id = resolveStudentStorageIdSync();
      setStudentId(id);
      setReady(true);
    };

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      if (user?.id) {
        setStudentStorageIdCache(user.id);
      } else {
        clearStudentStorageIdCache();
      }
      applyResolvedId();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id ?? null;
      if (userId) {
        setStudentStorageIdCache(userId);
      } else {
        clearStudentStorageIdCache();
      }
      applyResolvedId();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { ready, studentId };
}
