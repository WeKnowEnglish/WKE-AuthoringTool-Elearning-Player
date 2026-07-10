"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  mergeSwapQueue,
  popSwapQueue,
  shouldOpenSwapModal,
} from "@/lib/secondary/secondary-focus-word-swap-queue-logic";
import {
  detectNewFocusWordSwaps,
  type SecondaryFocusWordSwap,
} from "@/lib/secondary/secondary-session-swap-detect";
import {
  filterUnannouncedSwaps,
  getAnnouncedSwapKeys,
  markSwapAnnounced,
} from "@/lib/secondary/secondary-swap-announcement";
import type { SecondaryTodaySession } from "@/lib/secondary/types";

type Options = {
  todaySession: SecondaryTodaySession | null;
  sessionRevision: number;
  studentId: string;
  introOpen: boolean;
  enabled?: boolean;
};

export function useSecondaryFocusWordSwapQueue({
  todaySession,
  sessionRevision,
  studentId,
  introOpen,
  enabled = true,
}: Options) {
  const previousSessionRef = useRef<SecondaryTodaySession | null>(null);
  const hasHydratedSessionRef = useRef(false);
  const scopeKeyRef = useRef("");
  const [queue, setQueue] = useState<SecondaryFocusWordSwap[]>([]);
  const [swapModalOpen, setSwapModalOpen] = useState(false);

  const dateKey = todaySession?.dateKey ?? "";
  const scopeKey = `${studentId}:${dateKey}`;

  useEffect(() => {
    if (!scopeKey || scopeKey === ":") return;
    if (scopeKeyRef.current === scopeKey) return;

    scopeKeyRef.current = scopeKey;
    previousSessionRef.current = null;
    hasHydratedSessionRef.current = false;
    setQueue([]);
    setSwapModalOpen(false);
  }, [scopeKey]);

  useEffect(() => {
    if (!enabled || !todaySession) return;

    if (!hasHydratedSessionRef.current) {
      previousSessionRef.current = todaySession;
      hasHydratedSessionRef.current = true;
      return;
    }

    const detected = detectNewFocusWordSwaps(previousSessionRef.current, todaySession);
    previousSessionRef.current = todaySession;

    if (detected.length === 0) return;

    const announced = getAnnouncedSwapKeys(studentId, dateKey);
    const unannounced = filterUnannouncedSwaps(detected, announced);
    if (unannounced.length === 0) return;

    setQueue((current) => mergeSwapQueue(current, unannounced));
  }, [enabled, todaySession, sessionRevision, studentId, dateKey]);

  useEffect(() => {
    setSwapModalOpen(shouldOpenSwapModal(introOpen, queue.length));
  }, [introOpen, queue.length]);

  const currentSwap = swapModalOpen && queue.length > 0 ? queue[0]! : null;

  const acknowledgeCurrentSwap = useCallback(() => {
    if (!dateKey || queue.length === 0) {
      setSwapModalOpen(false);
      return;
    }

    const { head, rest } = popSwapQueue(queue);
    if (!head) {
      setSwapModalOpen(false);
      return;
    }

    markSwapAnnounced(studentId, dateKey, head);
    setQueue(rest);
    setSwapModalOpen(shouldOpenSwapModal(introOpen, rest.length));
  }, [queue, studentId, dateKey, introOpen]);

  return {
    currentSwap,
    swapModalOpen,
    acknowledgeCurrentSwap,
  };
}
