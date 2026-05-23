"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import {
  tickExploreRun,
  type ExploreRunConfig,
  type ExploreRunMode,
  type ExploreRunState,
} from "@/lib/explore/explore-run-engine";
import type { ExplorePresentation } from "@/lib/explore/resolve-explore-presentation";
import { ExploreRunLoopCanvas } from "@/components/lesson/interactions/ExploreRunLoopCanvas";

type Props = {
  presentation: ExplorePresentation;
  config: ExploreRunConfig;
  mode: ExploreRunMode;
  state: ExploreRunState;
  onStateChange: (state: ExploreRunState) => void;
  onGateTriggered: (gateIndex: number) => void;
  className?: string;
};

/** Engine tick + run loop canvas (quiz loop 1 or obstacle loop 2). */
export function ExploreRunStage({
  presentation,
  config,
  mode,
  state,
  onStateChange,
  onGateTriggered,
  className,
}: Props) {
  const stateRef = useRef(state);
  const propStateRef = useRef(state);
  propStateRef.current = state;
  const modeRef = useRef(mode);
  const configRef = useRef(config);
  const onStateChangeRef = useRef(onStateChange);
  const onGateTriggeredRef = useRef(onGateTriggered);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    configRef.current = config;
  }, [config]);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
    onGateTriggeredRef.current = onGateTriggered;
  }, [onStateChange, onGateTriggered]);

  const tick = useCallback((ts: number) => {
    const currentMode = modeRef.current;
    if (
      currentMode === "running" ||
      currentMode === "gateQuiz" ||
      currentMode === "gateResolve"
    ) {
      const last = lastTsRef.current;
      lastTsRef.current = ts;
      const dtSec = last == null ? 0 : Math.min(0.05, (ts - last) / 1000);
      const propState = propStateRef.current;
      const inputState =
        currentMode === "gateResolve" && propState.mode === "gateResolve" ?
          propState
        : stateRef.current;
      const result = tickExploreRun({
        dtSec,
        nowMs: ts,
        config: configRef.current,
        state: inputState,
      });
      if (
        currentMode === "gateResolve" &&
        result.state.mode === "gateQuiz" &&
        result.state.gatesCleared <= inputState.gatesCleared
      ) {
        result.state = inputState;
      }
      stateRef.current = result.state;
      onStateChangeRef.current(result.state);
      if (result.gateTriggered != null) {
        onGateTriggeredRef.current(result.gateTriggered);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (mode === "encounter" || mode === "complete") {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTsRef.current = null;
      return;
    }
    lastTsRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
  }, [mode, tick]);

  const gateScene = presentation.gateScenes[state.activeGateIndex];
  const obstacleKind = gateScene?.obstacleKind ?? "spike";

  return (
    <div className={className ?? "relative h-full min-h-0 w-full"}>
      <ExploreRunLoopCanvas
        template={presentation.template}
        mode={mode}
        state={state}
        scrollSpeedPxPerSec={config.scrollSpeedPxPerSec}
        obstacleKind={obstacleKind}
        backgroundUrl={presentation.runBackgroundUrl}
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}
