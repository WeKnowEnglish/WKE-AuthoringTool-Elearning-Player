"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ensureMasteryHydratedForCurrentStudent } from "@/lib/mastery/supabase-sync";
import {
  getOrCreateSecondaryTodaySession,
  getSecondaryTodayCompletion,
} from "@/lib/secondary/secondary-today-session";
import type { SecondaryTodayCompletion, SecondaryTodaySession } from "@/lib/secondary/types";

/** Loads today's secondary session after account-scoped storage is ready. */
export function useSecondaryTodaySession() {
  const [todaySession, setTodaySession] = useState<SecondaryTodaySession | null>(null);
  const [completion, setCompletion] = useState<SecondaryTodayCompletion>({});
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => {
    const now = new Date();
    setTodaySession(getOrCreateSecondaryTodaySession(now));
    setCompletion(getSecondaryTodayCompletion(now));
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await ensureMasteryHydratedForCurrentStudent();
      if (cancelled) return;
      refresh();
      setHydrated(true);
    })();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user?.id) return;
      void (async () => {
        await ensureMasteryHydratedForCurrentStudent();
        if (cancelled) return;
        refresh();
      })();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [refresh]);

  return { todaySession, completion, hydrated, refresh };
}
