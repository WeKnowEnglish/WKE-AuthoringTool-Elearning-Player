"use client";

import { useEffect, useState } from "react";

/** True when `?masterySyncDebug=1` is present (D1 gate — URL param only). */
export function useMasterySyncDebugEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const read = () => {
      setEnabled(new URLSearchParams(window.location.search).has("masterySyncDebug"));
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);

  return enabled;
}
