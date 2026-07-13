"use client";

import { useCallback, useRef, useState } from "react";

type Options = {
  roomId: string;
};

export function useLiveGameConsume({ roomId }: Options) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const consumeBread = useCallback(async (): Promise<boolean> => {
    if (inFlightRef.current) return false;
    inFlightRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/live-game/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, item: "bread" }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not eat bread.");
      }
      return true;
    } catch (consumeError) {
      setError(consumeError instanceof Error ? consumeError.message : "Could not eat bread.");
      return false;
    } finally {
      inFlightRef.current = false;
      setIsSubmitting(false);
    }
  }, [roomId]);

  return { consumeBread, isSubmitting, error };
}
