"use client";

import { useEffect } from "react";
import { useAudioMuted } from "@/lib/audio/use-audio-muted";
import { isKeyboardGameplayBlocked } from "@/lib/board-game/keyboard-shortcuts";
import type { UiPhase } from "@/lib/board-game/types";

type Handlers = {
  canRoll: boolean;
  uiPhase: UiPhase;
  onRoll: () => void;
  onCorrect: () => void;
  onIncorrect: () => void;
  onSkip: () => void;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return true;
  return target.isContentEditable;
}

export function useBoardGameKeyboard({
  canRoll,
  uiPhase,
  onRoll,
  onCorrect,
  onIncorrect,
  onSkip,
}: Handlers) {
  const { toggleMuted } = useAudioMuted();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;

      const key = event.key.toLowerCase();

      if (key === "m") {
        event.preventDefault();
        toggleMuted();
        return;
      }

      if (isKeyboardGameplayBlocked(uiPhase)) return;

      if (event.code === "Space") {
        event.preventDefault();
        if (canRoll) {
          onRoll();
        }
        return;
      }

      if (uiPhase !== "question") return;

      if (event.key === "Enter") {
        event.preventDefault();
        onCorrect();
        return;
      }

      if (event.key === "Backspace" || key === "x") {
        event.preventDefault();
        onIncorrect();
        return;
      }

      if (key === "s" || key === "n") {
        event.preventDefault();
        onSkip();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canRoll, onCorrect, onIncorrect, onRoll, onSkip, toggleMuted, uiPhase]);
}
