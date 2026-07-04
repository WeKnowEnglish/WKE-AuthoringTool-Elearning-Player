"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DEFAULT_DAILY_LEARNING_LOOP_CONFIG,
  createLearningLoopCompletedEvent,
  createLearningLoopPhaseCompletedEvent,
  createLearningLoopPhaseStartedEvent,
  firstLearningLoopPhase,
  getLearningLoopPhaseConfig,
  nextLearningLoopPhase,
  type LearningLoopConfig,
  type LearningLoopPhase,
  type LearningLoopPhaseEvent,
} from "@/lib/learning-loop";

export type LearningLoopPhaseRenderProps = {
  phase: LearningLoopPhase;
  phaseConfig: NonNullable<ReturnType<typeof getLearningLoopPhaseConfig>>;
  onComplete: (input?: { evidenceCount?: number }) => void;
};

export type LearningLoopRouterProps = {
  sessionId: string;
  config?: LearningLoopConfig;
  onEvent?: (event: LearningLoopPhaseEvent) => void;
  onComplete?: (event: Extract<LearningLoopPhaseEvent, { type: "learning_loop_completed" }>) => void;
  renderPhase: (props: LearningLoopPhaseRenderProps) => ReactNode;
  renderComplete?: () => ReactNode;
};

export function LearningLoopRouter({
  sessionId,
  config = DEFAULT_DAILY_LEARNING_LOOP_CONFIG,
  onEvent,
  onComplete,
  renderPhase,
  renderComplete,
}: LearningLoopRouterProps) {
  const [phase, setPhase] = useState<LearningLoopPhase>(() => firstLearningLoopPhase(config));
  const loopStartedAtRef = useRef(Date.now());
  const phaseStartedAtRef = useRef(Date.now());
  const startedPhaseRef = useRef<LearningLoopPhase | null>(null);
  const phaseConfig = useMemo(() => getLearningLoopPhaseConfig(config, phase), [config, phase]);

  useEffect(() => {
    setPhase(firstLearningLoopPhase(config));
    loopStartedAtRef.current = Date.now();
    phaseStartedAtRef.current = Date.now();
    startedPhaseRef.current = null;
  }, [config, sessionId]);

  useEffect(() => {
    if (!phaseConfig || startedPhaseRef.current === phase) return;
    phaseStartedAtRef.current = Date.now();
    startedPhaseRef.current = phase;
    onEvent?.(
      createLearningLoopPhaseStartedEvent({
        config,
        sessionId,
        phase,
      }),
    );
  }, [config, onEvent, phase, phaseConfig, sessionId]);

  const completeCurrentPhase = useCallback(
    (input?: { evidenceCount?: number; completionReason?: "task" | "time" | "manual" }) => {
      if (!phaseConfig) return;
      const now = Date.now();
      const phaseCompleted = createLearningLoopPhaseCompletedEvent({
        config,
        sessionId,
        phase,
        elapsedMs: now - phaseStartedAtRef.current,
        evidenceCount: input?.evidenceCount,
        completionReason: input?.completionReason ?? "task",
      });
      onEvent?.(phaseCompleted);

      const nextPhase = nextLearningLoopPhase(config, phase);
      if (nextPhase === "COMPLETE") {
        const completed = createLearningLoopCompletedEvent({
          config,
          sessionId,
          elapsedMs: now - loopStartedAtRef.current,
        });
        onEvent?.(completed);
        onComplete?.(completed);
      }
      setPhase(nextPhase);
    },
    [config, onComplete, onEvent, phase, phaseConfig, sessionId],
  );

  useEffect(() => {
    if (!phaseConfig || phaseConfig.completionMode === "task") return;
    const timeout = window.setTimeout(() => {
      completeCurrentPhase({ completionReason: "time" });
    }, phaseConfig.targetDurationSec * 1000);
    return () => window.clearTimeout(timeout);
  }, [completeCurrentPhase, phaseConfig]);

  if (phase === "COMPLETE" || !phaseConfig) {
    return renderComplete?.() ?? null;
  }

  return (
    <>
      {renderPhase({
        phase,
        phaseConfig,
        onComplete: completeCurrentPhase,
      })}
    </>
  );
}
