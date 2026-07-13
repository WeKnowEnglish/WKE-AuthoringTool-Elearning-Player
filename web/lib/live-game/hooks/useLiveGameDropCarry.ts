"use client";

import { useCallback, useRef, useState } from "react";

type Options = {
  roomId: string;
};

export function useLiveGameDropCarry({ roomId }: Options) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const dropCarry = useCallback(async (): Promise<boolean> => {
    if (inFlightRef.current) return false;
    inFlightRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/live-game/drop-carry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not drop item.");
      }
      return true;
    } catch (dropError) {
      setError(dropError instanceof Error ? dropError.message : "Could not drop item.");
      return false;
    } finally {
      inFlightRef.current = false;
      setIsSubmitting(false);
    }
  }, [roomId]);

  return { dropCarry, isSubmitting, error };
}
