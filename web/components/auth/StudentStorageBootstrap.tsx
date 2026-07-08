"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  clearStudentStorageIdCache,
  setStudentStorageIdCache,
} from "@/lib/auth/student-storage-id";

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
      } else {
        clearStudentStorageIdCache();
      }
    };

    void sync();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id ?? null;
      if (userId) {
        setStudentStorageIdCache(userId);
      } else {
        clearStudentStorageIdCache();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
