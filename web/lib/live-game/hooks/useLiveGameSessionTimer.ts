"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  computeSessionRemainingMs,
  detectSessionTimerFlashCrossing,
  formatSessionTimeRemaining,
  getFinalCountdownDigit,
  getSessionRemainingSecondsFloor,
  getSessionTimerAlertPhase,
  isUnlimitedSessionTimer,
  type SessionTimerAlertPhase,
  type SessionTimerFlashKind,
} from "@/lib/live-game/session-timer";

const FLASH_DURATION_MS = 2000;

export type LiveGameSessionTimerState = {
  isUnlimited: boolean;
  label: string;
  remainingMs: number;
  remainingSecFloor: number;
  isExpired: boolean;
  alertPhase: SessionTimerAlertPhase;
  finalCountdownDigit: number | null;
  activeFlash: SessionTimerFlashKind | null;
};

export function useLiveGameSessionTimer(input: {
  endsAt: number | null;
  enabled: boolean;
  showStudentFlashes?: boolean;
}): LiveGameSessionTimerState | null {
  const { endsAt, enabled, showStudentFlashes = false } = input;
  const [now, setNow] = useState(() => Date.now());
  const [activeFlash, setActiveFlash] = useState<SessionTimerFlashKind | null>(null);
  const previousSecFloorRef = useRef<number | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);

  const isUnlimited = isUnlimitedSessionTimer(endsAt);

  useEffect(() => {
    if (!enabled || isUnlimited) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [enabled, isUnlimited]);

  useEffect(() => {
    if (!enabled || isUnlimited) {
      previousSecFloorRef.current = null;
      setActiveFlash(null);
      if (flashTimeoutRef.current) {
        window.clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = null;
      }
    }
  }, [enabled, isUnlimited, endsAt]);

  const remainingMs = useMemo(() => {
    if (!enabled || isUnlimited) return null;
    return computeSessionRemainingMs(endsAt, now) ?? 0;
  }, [enabled, endsAt, isUnlimited, now]);

  useEffect(() => {
    if (!showStudentFlashes || remainingMs == null) return;

    const currentSecFloor = getSessionRemainingSecondsFloor(remainingMs);
    const crossing = detectSessionTimerFlashCrossing(previousSecFloorRef.current, currentSecFloor);
    previousSecFloorRef.current = currentSecFloor;

    if (!crossing) return;

    setActiveFlash(crossing);
    if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = window.setTimeout(() => {
      setActiveFlash(null);
      flashTimeoutRef.current = null;
    }, FLASH_DURATION_MS);
  }, [remainingMs, showStudentFlashes]);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  return useMemo(() => {
    if (!enabled || isUnlimited || remainingMs == null) return null;

    const remainingSecFloor = getSessionRemainingSecondsFloor(remainingMs);

    return {
      isUnlimited: false,
      label: formatSessionTimeRemaining(remainingMs),
      remainingMs,
      remainingSecFloor,
      isExpired: remainingMs <= 0,
      alertPhase: getSessionTimerAlertPhase(remainingSecFloor),
      finalCountdownDigit: getFinalCountdownDigit(remainingMs),
      activeFlash: showStudentFlashes ? activeFlash : null,
    };
  }, [activeFlash, enabled, isUnlimited, remainingMs, showStudentFlashes]);
}
