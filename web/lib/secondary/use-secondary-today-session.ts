"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ensureMasteryHydratedForCurrentStudent } from "@/lib/mastery/supabase-sync";
import { SECONDARY_SESSION_CHANGED_EVENT } from "@/lib/secondary/secondary-session-events";
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
  const [sessionRevision, setSessionRevision] = useState(0);
  const refreshInFlightRef = useRef(false);

  const refresh = useCallback(() => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    try {
      const now = new Date();
      const nextSession = getOrCreateSecondaryTodaySession(now);
      setTodaySession((previous) => {
        const unchanged =
          previous !== null && JSON.stringify(previous) === JSON.stringify(nextSession);
        if (!unchanged) {
          setSessionRevision((revision) => revision + 1);
        }
        return unchanged ? previous : nextSession;
      });
      setCompletion(getSecondaryTodayCompletion(now));
    } finally {
      refreshInFlightRef.current = false;
    }
  }, []);

  const refreshAfterHydrate = useCallback(async () => {
    await ensureMasteryHydratedForCurrentStudent();
    refresh();
  }, [refresh]);

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

    const onSessionChanged = () => {
      void refreshAfterHydrate();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshAfterHydrate();
      }
    };
    const onWindowFocus = () => {
      void refreshAfterHydrate();
    };

    window.addEventListener(SECONDARY_SESSION_CHANGED_EVENT, onSessionChanged);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onWindowFocus);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener(SECONDARY_SESSION_CHANGED_EVENT, onSessionChanged);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [refresh, refreshAfterHydrate]);

  return { todaySession, completion, hydrated, sessionRevision, refresh };
}
