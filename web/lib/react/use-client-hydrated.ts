"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/** True only on the client after hydration — false during SSR and the first client pass. */
export function useClientHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
