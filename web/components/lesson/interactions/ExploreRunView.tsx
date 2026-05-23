"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { ExploreEncounterPanel } from "@/components/lesson/interactions/ExploreEncounterPanel";
import { ExploreGatePanel } from "@/components/lesson/interactions/ExploreGatePanel";
import { ExploreRunStage } from "@/components/lesson/interactions/ExploreRunStage";
import { playSfx } from "@/lib/audio/sfx";
import {
  beginGateResolve,
  buildExploreRunConfig,
  completeExploreSegment,
  createExploreRunState,
  type ExploreRunMode,
  type ExploreRunState,
} from "@/lib/explore/explore-run-engine";
import { buildExploreWordPool } from "@/lib/explore/explore-word-pool";
import {
  mergeExploreRunState,
  resolveExploreMode,
} from "@/lib/explore/explore-run-modes";
import { resolveExplorePresentation } from "@/lib/explore/resolve-explore-presentation";
import type { ExploreEncounterRollResult } from "@/lib/explore/explore-encounter-roll";
import type { ExplorePayload } from "@/lib/lesson-schemas";

type Props = {
  parsed: ExplorePayload;
  muted: boolean;
  passed: boolean;
  lessonId: string;
  screenId: string;
  isPreview?: boolean;
  /** When set, encounter loot is drawn from this pool (supports multi-run area discovery). */
  encounterWordPool?: string[];
  onPass: () => void;
  onWrong?: () => void;
  onEconomyChange?: () => void;
  onEncounterGranted?: (roll: ExploreEncounterRollResult) => void;
};

export function ExploreRunView({
  parsed,
  muted,
  passed,
  lessonId,
  screenId,
  isPreview = false,
  encounterWordPool: encounterWordPoolProp,
  onPass,
  onEconomyChange,
  onEncounterGranted,
}: Props) {
  const config = useMemo(() => buildExploreRunConfig(parsed), [parsed]);
  const presentation = useMemo(() => resolveExplorePresentation(parsed), [parsed]);
  const encounterWordPool = useMemo(
    () =>
      encounterWordPoolProp && encounterWordPoolProp.length > 0 ?
        encounterWordPoolProp
      : buildExploreWordPool(parsed.gates),
    [encounterWordPoolProp, parsed.gates],
  );
  const encounterRollSeed = `${lessonId}:${screenId}:explore:encounter`;
  const [runState, setRunState] = useState<ExploreRunState>(() => createExploreRunState());
  const [mode, setMode] = useState<ExploreRunMode>("running");
  const configRef = useRef(config);
  configRef.current = config;
  const segmentCompleteRef = useRef(false);
  const gateResolvedRef = useRef(false);
  const runStateRef = useRef(runState);
  runStateRef.current = runState;

  const shuffleSeedBase = `${lessonId}:${screenId}`;

  const handleStateChange = useCallback((next: ExploreRunState) => {
    const merged = mergeExploreRunState(runStateRef.current, next);
    if (
      merged.mode === runStateRef.current.mode &&
      merged.playerX === runStateRef.current.playerX &&
      merged.activeGateIndex === runStateRef.current.activeGateIndex &&
      merged.gatesCleared === runStateRef.current.gatesCleared &&
      merged.gateOutcome === runStateRef.current.gateOutcome &&
      merged.resolveStartedAtMs === runStateRef.current.resolveStartedAtMs
    ) {
      return;
    }
    runStateRef.current = merged;
    setRunState(merged);
    setMode((prev) => resolveExploreMode(prev, merged.mode));
  }, []);

  const handleGateTriggered = useCallback(
    (gateIndex: number) => {
      playSfx("tap", muted);
      gateResolvedRef.current = false;
      const quiz = {
        ...runStateRef.current,
        mode: "gateQuiz" as const,
        activeGateIndex: gateIndex,
      };
      runStateRef.current = quiz;
      setMode("gateQuiz");
      setRunState(quiz);
    },
    [muted],
  );

  const finishGateSprint = useCallback(
    (_wordsCorrect: number, outcome: "dodge" | "hit") => {
      if (gateResolvedRef.current) return;
      gateResolvedRef.current = true;
      playSfx(outcome === "dodge" ? "correct" : "wrong", muted);
      const now = performance.now();
      const resolved = beginGateResolve(runStateRef.current, outcome, now);
      runStateRef.current = resolved;
      setRunState(resolved);
      setMode("gateResolve");
    },
    [muted],
  );

  const handleEncounterComplete = useCallback(() => {
    if (segmentCompleteRef.current || passed) return;
    segmentCompleteRef.current = true;
    setRunState((s) => completeExploreSegment(s));
    setMode("complete");
    onPass();
  }, [onPass, passed]);

  const activeGate = config.gates[runState.activeGateIndex];
  const showRunStage =
    mode === "running" ||
    mode === "gateQuiz" ||
    mode === "gateResolve" ||
    mode === "encounter";

  const statusLabel =
    mode === "gateQuiz" ? "Gate ahead — get ready!"
    : mode === "gateResolve" ?
      runState.gateOutcome === "dodge" ?
        "Jump clear!"
      : "Ouch — keep going!"
    : mode === "running" ? "Running…"
    : mode === "encounter" ? presentation.template.label
    : null;

  return (
    <div
      className={clsx(
        "flex h-full min-h-[min(72dvh,560px)] w-full flex-col overflow-hidden rounded-xl border-4 border-kid-ink",
        passed && "opacity-90",
      )}
    >
      {showRunStage ?
        <div className="relative min-h-0 flex-1 bg-sky-200">
          <ExploreRunStage
            presentation={presentation}
            config={configRef.current}
            mode={mode}
            state={runState}
            onStateChange={handleStateChange}
            onGateTriggered={handleGateTriggered}
            className="absolute inset-0"
          />

          {mode === "gateQuiz" && activeGate ?
            <ExploreGatePanel
              key={activeGate.id}
              gate={activeGate}
              gates={parsed.gates}
              gateIndex={runState.activeGateIndex}
              gateCount={config.gates.length}
              shuffleSeed={`${shuffleSeedBase}:${activeGate.id}`}
              muted={muted}
              locked={passed}
              overlayOnRun
              onSprintComplete={finishGateSprint}
            />
          : null}

          {mode === "gateResolve" ?
            <p
              className="pointer-events-none absolute bottom-4 left-0 right-0 z-20 text-center text-lg font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
              role="status"
            >
              {runState.gateOutcome === "dodge" ? "Jump clear!" : "Ouch — keep going!"}
            </p>
          : null}

          {mode === "encounter" ?
            <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-black/35 via-transparent to-transparent p-3 sm:p-4">
              <div className="pointer-events-auto mx-auto w-full max-w-md rounded-xl border-4 border-kid-ink bg-white/95 p-3 shadow-lg sm:p-4">
                <ExploreEncounterPanel
                  encounter={parsed.encounter}
                  rollSeed={encounterRollSeed}
                  wordPool={encounterWordPool}
                  muted={muted}
                  isPreview={isPreview}
                  completionEventId={`${lessonId}:${screenId}:explore`}
                  onComplete={handleEncounterComplete}
                  onEconomyChange={onEconomyChange}
                  onEncounterGranted={onEncounterGranted}
                  sceneMode
                />
              </div>
            </div>
          : null}

          {statusLabel && mode !== "gateResolve" && mode !== "encounter" ?
            <p className="pointer-events-none absolute left-3 top-2 z-30 rounded-full border-2 border-kid-ink bg-white/90 px-3 py-1 text-xs font-bold text-kid-ink shadow-sm">
              {statusLabel}
            </p>
          : null}

          {mode === "running" && runState.gatesCleared === 0 ?
            <p className="pointer-events-none absolute bottom-3 left-0 right-0 z-10 px-4 text-center text-sm font-semibold text-kid-ink drop-shadow-sm">
              Keep running — spell as many cloud words as you can at each gate!
            </p>
          : null}
        </div>
      : null}

      {passed || mode === "complete" ?
        <p className="shrink-0 border-t-4 border-kid-ink bg-white py-4 text-center text-lg font-extrabold text-kid-ink">
          Explore complete!
        </p>
      : null}
    </div>
  );
}
