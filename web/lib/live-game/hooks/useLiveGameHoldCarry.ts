"use client";

import { useCallback, useState } from "react";

type Options = {
  roomId: string;
};

export function useLiveGameHoldCarry({ roomId }: Options) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const holdSlot = useCallback(
    async (slotIndex: number): Promise<boolean> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const response = await fetch("/api/live-game/hold-carry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, slotIndex }),
        });
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) {
          setError(payload?.error ?? "Could not hold that item.");
          return false;
        }
        return true;
      } catch {
        setError("Could not hold that item.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [roomId],
  );

  return { holdSlot, isSubmitting, error };
}
