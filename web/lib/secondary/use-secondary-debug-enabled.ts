"use client";

import { useEffect, useState } from "react";

/** True when `?secondaryDebug` is present (staff preview of selection reasons). */
export function useSecondaryDebugEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const read = () => {
      setEnabled(new URLSearchParams(window.location.search).has("secondaryDebug"));
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);

  return enabled;
}
