"use client";

import { useEffect } from "react";
import { IDLE_LOGOUT_MS, remainingIdleSessionMs } from "@/lib/auth/idle-session";
import { createClient } from "@/lib/supabase/client";

const LAST_ACTIVITY_KEY = "wke:last-authenticated-activity";
const ACTIVITY_WRITE_THROTTLE_MS = 1_000;

export function IdleSessionLogout() {
  useEffect(() => {
    const supabase = createClient();
    let authenticated = false;
    let lastActivityAt = Date.now();
    let lastPersistedAt = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let signingOut = false;

    const readStoredActivity = () => {
      const stored = Number(window.localStorage.getItem(LAST_ACTIVITY_KEY));
      return Number.isFinite(stored) && stored > 0 ? stored : null;
    };

    const scheduleLogout = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (!authenticated || signingOut) return;

      timeoutId = setTimeout(() => {
        void signOutForInactivity();
      }, remainingIdleSessionMs(lastActivityAt, Date.now(), IDLE_LOGOUT_MS));
    };

    const recordActivity = () => {
      if (!authenticated || signingOut) return;
      const now = Date.now();
      lastActivityAt = now;
      scheduleLogout();
      if (now - lastPersistedAt >= ACTIVITY_WRITE_THROTTLE_MS) {
        lastPersistedAt = now;
        window.localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      }
    };

    const signOutForInactivity = async () => {
      if (!authenticated || signingOut) return;
      const sharedActivity = readStoredActivity();
      if (sharedActivity && sharedActivity > lastActivityAt) {
        lastActivityAt = sharedActivity;
        scheduleLogout();
        return;
      }

      signingOut = true;
      window.localStorage.removeItem(LAST_ACTIVITY_KEY);
      await supabase.auth.signOut({ scope: "global" });
      window.location.assign("/login?reason=idle");
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== LAST_ACTIVITY_KEY || !event.newValue || !authenticated) return;
      const sharedActivity = Number(event.newValue);
      if (Number.isFinite(sharedActivity) && sharedActivity > lastActivityAt) {
        lastActivityAt = sharedActivity;
        scheduleLogout();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible" || !authenticated) return;
      const sharedActivity = readStoredActivity();
      if (sharedActivity && sharedActivity > lastActivityAt) lastActivityAt = sharedActivity;
      scheduleLogout();
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "touchstart",
      "scroll",
    ];
    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, recordActivity, { passive: true }),
    );
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibilityChange);

    void supabase.auth.getSession().then(({ data: { session } }) => {
      authenticated = Boolean(session);
      if (authenticated) recordActivity();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      authenticated = Boolean(session);
      if (authenticated) {
        recordActivity();
      } else {
        if (timeoutId) clearTimeout(timeoutId);
        window.localStorage.removeItem(LAST_ACTIVITY_KEY);
      }
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, recordActivity));
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
