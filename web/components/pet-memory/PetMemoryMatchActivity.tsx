"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { AnimatedPet } from "@/components/pet/AnimatedPet";
import { MemoryCardGrid } from "@/components/pet-memory/MemoryCardGrid";
import { PetMemoryResultsScreen } from "@/components/pet-memory/PetMemoryResultsScreen";
import { PetMemoryTurnBubble } from "@/components/pet-memory/PetMemoryTurnBubble";
import { playSfx } from "@/lib/audio/sfx";
import { speakText } from "@/lib/audio/tts";
import {
  MEMORY_MINIGAME_PET_DISPLAY_SCALE,
  MEMORY_MINIGAME_PET_LAYOUT,
} from "@/lib/pet/animated-pet";
import { pickPetFlipIndices } from "@/lib/memory/memory-pet-turn";
import type { MemoryPlayOutcome } from "@/lib/pet/care-actions";
import {
  computeMemoryGoldBonus,
  createMemorySession,
  flipCard,
  isSessionComplete,
  resolveTurn,
  type MemorySession,
} from "@/lib/memory/memory-session";
import { awardRewards } from "@/lib/progress/rewards";

type Phase = "playerTurn" | "petThinking" | "resolving" | "results";

type Props = {
  muted: boolean;
  onComplete: (outcome: MemoryPlayOutcome, playerMatches: number) => void;
  onCancel: () => void;
  onPlayAgain: () => void;
};

const PET_THINK_MS = 600;
const FLIP_GAP_MS = 550;
const REVEAL_MS = 850;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function PetMemoryMatchActivity({
  muted,
  onComplete,
  onCancel,
  onPlayAgain,
}: Props) {
  const [session, setSession] = useState<MemorySession>(() => createMemorySession());
  const [phase, setPhase] = useState<Phase>(() =>
    session.activeSide === "player" ? "playerTurn" : "petThinking",
  );
  const [outcome, setOutcome] = useState<MemoryPlayOutcome | null>(null);
  const [goldEarned, setGoldEarned] = useState(0);
  const [petHighlight, setPetHighlight] = useState<number[]>([]);
  const sessionRef = useRef(session);
  const resultsAppliedRef = useRef(false);
  const petTurnRunningRef = useRef(false);
  const initialPetScheduledRef = useRef(false);

  sessionRef.current = session;

  const showResults = useCallback(
    (result: MemoryPlayOutcome, finalSession: MemorySession) => {
      setOutcome(result);
      setPhase("results");
      const gold =
        result === "completed" ? computeMemoryGoldBonus(finalSession.playerMatches) : 0;
      setGoldEarned(gold);
      if (!resultsAppliedRef.current) {
        resultsAppliedRef.current = true;
        if (result === "completed" && gold > 0) {
          awardRewards({
            goldDelta: gold,
            experienceDelta: 0,
            eventId: `pet-play-memory:${finalSession.sessionId}`,
          });
        }
        onComplete(result, finalSession.playerMatches);
      }
    },
    [onComplete],
  );

  const schedulePetTurnRef = useRef<() => void>(() => {});

  const finishResolve = useCallback(
    (afterReveal: MemorySession) => {
      const matchedWord =
        afterReveal.pendingFirstIndex != null ?
          afterReveal.cards[afterReveal.pendingFirstIndex]?.word
        : undefined;

      const resolved = resolveTurn(afterReveal);
      setSession(resolved.session);
      sessionRef.current = resolved.session;
      setPetHighlight([]);

      if (resolved.completed) {
        playSfx("complete", muted);
        showResults("completed", resolved.session);
        petTurnRunningRef.current = false;
        return;
      }

      if (resolved.matched) {
        playSfx("correct", muted);
        if (matchedWord && resolved.session.activeSide === "player") {
          speakText(matchedWord, { muted });
        }
      } else {
        playSfx("wrong", muted);
      }

      if (resolved.keepTurn && resolved.session.activeSide === "pet") {
        petTurnRunningRef.current = false;
        schedulePetTurnRef.current();
        return;
      }

      petTurnRunningRef.current = false;
      if (resolved.session.activeSide === "player") {
        setPhase("playerTurn");
      } else {
        schedulePetTurnRef.current();
      }
    },
    [muted, showResults],
  );

  const runPetTurnSequence = useCallback(
    async (start: MemorySession) => {
      if (isSessionComplete(start)) {
        showResults("completed", start);
        return;
      }
      if (start.activeSide !== "pet") {
        setPhase("playerTurn");
        petTurnRunningRef.current = false;
        return;
      }

      petTurnRunningRef.current = true;
      setPhase("petThinking");
      await delay(PET_THINK_MS);

      let current = sessionRef.current;
      if (current.activeSide !== "pet") {
        petTurnRunningRef.current = false;
        setPhase("playerTurn");
        return;
      }

      const indices = pickPetFlipIndices(current);
      if (!indices) {
        petTurnRunningRef.current = false;
        setPhase("playerTurn");
        return;
      }

      const [first, second] = indices;
      setPetHighlight([first]);
      const r1 = flipCard(current, first);
      if (!r1.ok) {
        petTurnRunningRef.current = false;
        setPhase("playerTurn");
        return;
      }
      current = r1.session;
      setSession(current);
      sessionRef.current = current;
      playSfx("tap", muted);

      await delay(FLIP_GAP_MS);
      setPetHighlight([first, second]);
      const r2 = flipCard(current, second);
      if (!r2.ok) {
        petTurnRunningRef.current = false;
        setPhase("playerTurn");
        setPetHighlight([]);
        return;
      }
      current = r2.session;
      setSession(current);
      sessionRef.current = current;
      playSfx("tap", muted);

      setPhase("resolving");
      await delay(REVEAL_MS);
      finishResolve(current);
    },
    [finishResolve, muted, showResults],
  );

  const schedulePetTurn = useCallback(() => {
    if (petTurnRunningRef.current) return;
    void runPetTurnSequence(sessionRef.current);
  }, [runPetTurnSequence]);

  schedulePetTurnRef.current = schedulePetTurn;

  useEffect(() => {
    if (initialPetScheduledRef.current) return;
    if (session.activeSide !== "pet" || phase !== "petThinking") return;
    initialPetScheduledRef.current = true;
    schedulePetTurn();
  }, [session.activeSide, phase, schedulePetTurn]);

  const onCardClick = (index: number) => {
    if (phase !== "playerTurn" || session.activeSide !== "player") return;
    if (!session.states[index] || session.states[index] !== "down") return;

    playSfx("tap", muted);
    const result = flipCard(session, index);
    if (!result.ok) return;

    setSession(result.session);
    sessionRef.current = result.session;

    if (!result.needsResolve) return;

    setPhase("resolving");
    window.setTimeout(() => {
      finishResolve(result.session);
    }, REVEAL_MS);
  };

  const onCancelClick = () => {
    if (phase === "results") {
      onCancel();
      return;
    }
    const ok = window.confirm("Stop playing? You can come back anytime.");
    if (!ok) return;
    showResults("gave_up", sessionRef.current);
  };

  if (phase === "results" && outcome) {
    return (
      <PetMemoryResultsScreen
        outcome={outcome}
        playerMatches={session.playerMatches}
        petMatches={session.petMatches}
        goldEarned={goldEarned}
        muted={muted}
        onReturn={onCancel}
        onPlayAgain={onPlayAgain}
      />
    );
  }

  const gridDisabled =
    phase !== "playerTurn" || session.activeSide !== "player";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <PetMemoryTurnBubble
        activeSide={session.activeSide}
        pairsRemaining={session.pairsRemaining}
        playerMatches={session.playerMatches}
        petThinking={phase === "petThinking"}
        resolving={phase === "resolving"}
      />

      <div className="relative min-h-0 flex-1 overflow-y-auto py-1">
        <MemoryCardGrid
          cards={session.cards}
          states={session.states}
          disabled={gridDisabled}
          highlightIndices={petHighlight}
          onCardClick={onCardClick}
        />
        <div
          className="pointer-events-none absolute z-10"
          style={{
            right: MEMORY_MINIGAME_PET_LAYOUT.rightPx,
            bottom: MEMORY_MINIGAME_PET_LAYOUT.bottomPx,
            transform: `translate(${MEMORY_MINIGAME_PET_LAYOUT.translateXPx}px, ${MEMORY_MINIGAME_PET_LAYOUT.translateYPx}px)`,
          }}
        >
          <AnimatedPet
            mood={phase === "petThinking" ? "playful" : "normal"}
            size="md"
            displayScale={MEMORY_MINIGAME_PET_DISPLAY_SCALE}
            displayAnchor="bottom"
          />
        </div>
      </div>

      <div className="shrink-0">
        <KidButton
          type="button"
          variant="secondary"
          className="w-full !py-2 text-sm"
          onClick={onCancelClick}
        >
          Cancel
        </KidButton>
      </div>
    </div>
  );
}
