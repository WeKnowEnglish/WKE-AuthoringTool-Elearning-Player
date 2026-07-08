"use client";

import { useBoardGameKeyboard } from "@/components/board-game/useBoardGameKeyboard";
import {
  BoardLayoutContext,
  useBoardLayoutRegistry,
} from "@/components/board-game/BoardLayoutContext";
import { GameBoard } from "@/components/board-game/GameBoard";
import {
  CelebrationOverlay,
  EffectFeedbackModal,
  TurnTransitionOverlay,
} from "@/components/board-game/GameOverlays";
import { QuestionModal, DiceRollOverlay } from "@/components/board-game/QuestionModal";
import { PlayerStrip } from "@/components/board-game/PlayerStrip";
import {
  FloatingPointGain,
  WinCelebrationModal,
} from "@/components/board-game/WinCelebrationModal";
import { SoundMuteButton } from "@/components/kid-ui/SoundMuteButton";
import { KidButton } from "@/components/kid-ui/KidButton";
import { boardLengthForSetup, formatMapMeta, resolveMapForSetup } from "@/lib/board-game/map/resolve-map";
import { useBoardGamePresentation } from "@/lib/board-game/use-board-game-presentation";
import type { BoardGameInteractMode, CommitRuntime } from "@/lib/board-game/presentation/types";
import type { GameRuntime, GameSetup } from "@/lib/board-game/types";

type Props = {
  setup: GameSetup;
  runtime: GameRuntime;
  commitRuntime: CommitRuntime;
  onBackToSetup: () => void;
  onRestart: () => void;
  interactMode?: BoardGameInteractMode;
};

function BoardGameInner({
  setup,
  runtime,
  commitRuntime,
  onBackToSetup,
  onRestart,
  interactMode = "host",
}: Props) {
  const {
    uiPhase,
    displayPositions,
    diceOverlayOpen,
    diceSpinning,
    diceValue,
    highlightedSpace,
    effectFeedback,
    turnHandoffPlayer,
    showPointGain,
    celebrationMessage,
    pointGainLabel,
    celebrationTitle,
    movingPlayerIndex,
    travelHop,
    canRoll,
    handleRoll,
    handleCorrect,
    handleIncorrect,
    handleSkip,
  } = useBoardGamePresentation(setup, runtime, { commitRuntime, interactMode });

  const map = resolveMapForSetup(setup);
  const boardLength = boardLengthForSetup(setup);
  const isSpectator = interactMode === "spectator";

  useBoardGameKeyboard({
    canRoll,
    uiPhase,
    onRoll: () => void handleRoll(),
    onCorrect: () => void handleCorrect(),
    onIncorrect: () => void handleIncorrect(),
    onSkip: () => void handleSkip(),
    disabled: isSpectator,
  });

  return (
    <div className="fixed inset-0 h-dvh w-dvw overflow-hidden overscroll-none bg-[var(--background)]">
      <div className="absolute inset-x-0 bottom-28 top-16 md:bottom-32 md:top-[4.75rem]">
        <GameBoard
          map={map}
          runtime={runtime}
          highlightedSpace={highlightedSpace}
          players={setup.players}
          displayPositions={displayPositions}
          currentPlayerIndex={runtime.currentPlayerIndex}
          landingBounce={uiPhase === "landing"}
          movingPlayerIndex={movingPlayerIndex}
          travelHop={travelHop}
          fitViewport
        />
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 p-2 md:p-3">
        <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 rounded-xl border-4 border-kid-ink/80 bg-kid-panel/90 px-3 py-2 shadow-[4px_4px_0_0_var(--kid-shadow)] backdrop-blur-sm md:px-4">
          <div className="min-w-0">
            <h1 className="truncate text-base font-extrabold text-kid-ink md:text-lg">
              {isSpectator ? "Watching ESL Board Game" : "ESL Board Game"}
            </h1>
            <p className="truncate text-xs font-semibold text-kid-ink/60 md:text-sm">
              {map.title} · {formatMapMeta(map)}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <SoundMuteButton />
            {!isSpectator ?
              <>
                <KidButton variant="secondary" onClick={onBackToSetup}>
                  Setup
                </KidButton>
                <KidButton variant="secondary" onClick={onRestart}>
                  Restart
                </KidButton>
              </>
            : null}
          </div>
        </div>
      </header>

      <PlayerStrip
        variant="overlay"
        players={setup.players}
        runtime={runtime}
        boardLength={boardLength}
        currentPlayerIndex={runtime.currentPlayerIndex}
        lastRoll={runtime.lastDiceRoll}
        canRoll={canRoll}
        onRoll={() => void handleRoll()}
        idleBounce={uiPhase === "ready"}
      />

      <QuestionModal
        open={uiPhase === "question"}
        question={runtime.currentQuestion}
        readOnly={isSpectator}
        onCorrect={() => void handleCorrect()}
        onIncorrect={() => void handleIncorrect()}
        onSkip={() => void handleSkip()}
      />

      <DiceRollOverlay open={diceOverlayOpen} value={diceValue} spinning={diceSpinning} />
      <CelebrationOverlay
        open={uiPhase === "celebrating"}
        title={celebrationTitle}
        message={celebrationMessage}
      />
      <EffectFeedbackModal
        open={
          (uiPhase === "penalty" || uiPhase === "luckySpace" || uiPhase === "shortcut") &&
          effectFeedback !== null
        }
        feedback={effectFeedback}
      />
      <TurnTransitionOverlay
        open={uiPhase === "turnHandoff" && turnHandoffPlayer !== null}
        playerName={turnHandoffPlayer?.name ?? ""}
        playerColor={turnHandoffPlayer?.color ?? "#3b82f6"}
      />
      <FloatingPointGain show={showPointGain} label={pointGainLabel} />
      <WinCelebrationModal
        open={uiPhase === "victory"}
        setup={setup}
        runtime={runtime}
        onPlayAgain={isSpectator ? () => {} : onRestart}
        onBackToSetup={isSpectator ? () => {} : onBackToSetup}
      />
    </div>
  );
}

export function BoardGame(props: Props) {
  const layout = useBoardLayoutRegistry();
  return (
    <BoardLayoutContext.Provider value={layout}>
      <BoardGameInner {...props} />
    </BoardLayoutContext.Provider>
  );
}
