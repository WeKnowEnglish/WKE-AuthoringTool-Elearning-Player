"use client";

import { clsx } from "clsx";
import { useCallback, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { AnimatedPet } from "@/components/pet/AnimatedPet";
import { PetScrabbleBoard } from "@/components/pet-scrabble/PetScrabbleBoard";
import { PetScrabbleRack } from "@/components/pet-scrabble/PetScrabbleRack";
import { PetScrabbleResultsScreen } from "@/components/pet-scrabble/PetScrabbleResultsScreen";
import { PetScrabbleTurnBubble } from "@/components/pet-scrabble/PetScrabbleTurnBubble";
import { playSfx } from "@/lib/audio/sfx";
import {
  SCRABBLE_MINIGAME_PET_DISPLAY_SCALE,
  SCRABBLE_MINIGAME_PET_LAYOUT,
} from "@/lib/pet/animated-pet";
import type { ScrabblePlayOutcome } from "@/lib/pet/care-actions";
import type { Direction } from "@/lib/scrabble/scrabble-board";
import {
  computeGoldBonus,
  createScrabbleSession,
  isSessionComplete,
  runPetTurn,
  tryPlayerPlay,
  type ScrabbleSession,
} from "@/lib/scrabble/scrabble-session";
import { awardRewards } from "@/lib/progress/rewards";

type Phase = "playerTurn" | "petThinking" | "results";

type StagingSlot = { letter: string; rackIndex: number };

type Props = {
  muted: boolean;
  onComplete: (outcome: ScrabblePlayOutcome, playerScore: number) => void;
  onCancel: () => void;
  onPlayAgain: () => void;
};

const PET_THINK_MS = 1100;

export function PetScrabblePlayActivity({
  muted,
  onComplete,
  onCancel,
  onPlayAgain,
}: Props) {
  const [session, setSession] = useState<ScrabbleSession>(() => createScrabbleSession());
  const [phase, setPhase] = useState<Phase>(() =>
    session.activeSide === "player" ? "playerTurn" : "petThinking",
  );
  const [direction, setDirection] = useState<Direction>("across");
  const [placementStart, setPlacementStart] = useState<{ row: number; col: number } | null>(
    null,
  );
  const [staging, setStaging] = useState<StagingSlot[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<ScrabblePlayOutcome | null>(null);
  const [goldEarned, setGoldEarned] = useState(0);
  const resultsAppliedRef = useRef(false);
  const petTurnRunningRef = useRef(false);

  const stagingWord = staging.map((s) => s.letter);
  const usedRackIndices = new Set(staging.map((s) => s.rackIndex));

  const showResults = useCallback(
    (result: ScrabblePlayOutcome, finalSession: ScrabbleSession) => {
      setOutcome(result);
      setPhase("results");
      const gold =
        result === "completed" ? computeGoldBonus(finalSession.playerScore) : 0;
      setGoldEarned(gold);
      if (!resultsAppliedRef.current) {
        resultsAppliedRef.current = true;
        if (result === "completed" && gold > 0) {
          awardRewards({
            goldDelta: gold,
            experienceDelta: 0,
            eventId: `pet-play-scrabble:${finalSession.sessionId}`,
          });
        }
        onComplete(result, finalSession.playerScore);
      }
    },
    [onComplete],
  );

  const resetStaging = useCallback(() => {
    setStaging([]);
    setPlacementStart(null);
    setErrorMessage(null);
  }, []);

  const schedulePetTurn = useCallback(() => {
    if (petTurnRunningRef.current) return;
    petTurnRunningRef.current = true;
    setPhase("petThinking");
    window.setTimeout(() => {
      setSession((prev) => {
        const next = runPetTurn(prev);
        if (isSessionComplete(next)) {
          showResults("completed", next);
        } else {
          setPhase("playerTurn");
          resetStaging();
        }
        return next;
      });
      petTurnRunningRef.current = false;
    }, PET_THINK_MS);
  }, [showResults, resetStaging]);

  const onLetterClick = (rackIndex: number) => {
    if (phase !== "playerTurn") return;
    const letter = session.playerRack[rackIndex];
    if (!letter || usedRackIndices.has(rackIndex)) return;
    playSfx("tap", muted);
    setStaging((prev) => [...prev, { letter, rackIndex }]);
    setErrorMessage(null);
  };

  const onSubmit = () => {
    if (phase !== "playerTurn" || staging.length < 2) {
      setErrorMessage("Pick at least 2 letters for your word.");
      return;
    }
    if (!placementStart) {
      setErrorMessage("Tap the board where your word starts.");
      return;
    }
    const word = stagingWord.join("");
    const result = tryPlayerPlay(session, {
      row: placementStart.row,
      col: placementStart.col,
      direction,
      word,
    });
    if (!result.ok) {
      playSfx("wrong", muted);
      setErrorMessage(result.reason);
      return;
    }
    playSfx("correct", muted);
    resetStaging();
    const next = result.session;
    setSession(next);
    if (isSessionComplete(next)) {
      showResults("completed", next);
    } else if (next.activeSide === "pet") {
      schedulePetTurn();
    } else {
      setPhase("playerTurn");
    }
  };

  const onCancelClick = () => {
    if (phase === "results") {
      onCancel();
      return;
    }
    const ok = window.confirm("Stop playing? You can come back anytime.");
    if (!ok) return;
    showResults("gave_up", session);
  };

  if (phase === "results" && outcome) {
    return (
      <PetScrabbleResultsScreen
        outcome={outcome}
        playerScore={session.playerScore}
        petScore={session.petScore}
        goldEarned={goldEarned}
        muted={muted}
        onReturn={onCancel}
        onPlayAgain={onPlayAgain}
      />
    );
  }

  const playerActive = phase === "playerTurn" && session.activeSide === "player";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <PetScrabbleTurnBubble
        activeSide={session.activeSide}
        wordsPlayed={session.wordsPlayed}
        playerScore={session.playerScore}
        petThinking={phase === "petThinking"}
        message={errorMessage}
      />

      <div className="relative min-h-0 flex-1 overflow-y-auto">
        <PetScrabbleBoard
          board={session.board}
          direction={direction}
          placementStart={placementStart}
          stagingWord={stagingWord.join("")}
          onCellClick={(row, col) => {
            if (!playerActive) return;
            playSfx("tap", muted);
            setPlacementStart({ row, col });
            setErrorMessage(null);
          }}
        />
        <div
          className="pointer-events-none absolute z-10"
          style={{
            right: SCRABBLE_MINIGAME_PET_LAYOUT.rightPx,
            bottom: SCRABBLE_MINIGAME_PET_LAYOUT.bottomPx,
            transform: `translate(${SCRABBLE_MINIGAME_PET_LAYOUT.translateXPx}px, ${SCRABBLE_MINIGAME_PET_LAYOUT.translateYPx}px)`,
          }}
        >
          <AnimatedPet
            mood={phase === "petThinking" ? "playful" : "normal"}
            size="md"
            displayScale={SCRABBLE_MINIGAME_PET_DISPLAY_SCALE}
            displayAnchor="bottom"
          />
        </div>
      </div>

      <div className="flex shrink-0 justify-center gap-2">
        <KidButton
          type="button"
          variant={direction === "across" ? "accent" : "secondary"}
          className="!min-h-9 !px-3 !py-1 text-xs"
          disabled={!playerActive}
          onClick={() => setDirection("across")}
        >
          Across
        </KidButton>
        <KidButton
          type="button"
          variant={direction === "down" ? "accent" : "secondary"}
          className="!min-h-9 !px-3 !py-1 text-xs"
          disabled={!playerActive}
          onClick={() => setDirection("down")}
        >
          Down
        </KidButton>
        <KidButton
          type="button"
          variant="secondary"
          className="!min-h-9 !px-3 !py-1 text-xs"
          disabled={!playerActive || staging.length === 0}
          onClick={resetStaging}
        >
          Clear
        </KidButton>
      </div>

      <PetScrabbleRack
        rack={session.playerRack}
        stagingWord={stagingWord}
        usedStagingIndices={usedRackIndices}
        onLetterClick={onLetterClick}
        disabled={!playerActive}
      />

      <div className="grid shrink-0 grid-cols-2 gap-2">
        <KidButton type="button" variant="secondary" className="!py-2 text-sm" onClick={onCancelClick}>
          Cancel
        </KidButton>
        <KidButton
          type="button"
          variant="accent"
          className="!py-2 text-sm"
          disabled={!playerActive}
          onClick={onSubmit}
        >
          Submit word
        </KidButton>
      </div>
    </div>
  );
}
