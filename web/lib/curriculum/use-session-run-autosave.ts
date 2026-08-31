"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { saveMyGrade4Session1Run } from "@/lib/actions/course-session-run";
import type {
  CourseSessionRunPhase,
  CourseSessionRunStatus,
} from "@/lib/curriculum/session-run";

export type SessionRunSaveState =
  | { status: "idle" | "saving" | "saved"; error: null }
  | { status: "error"; error: string };

export function useGrade4Session1Autosave(input: {
  enabled: boolean;
  phase: CourseSessionRunPhase;
  status: CourseSessionRunStatus;
  activeStepId: string;
  progress: unknown;
  delayMs?: number;
}) {
  const [saveState, setSaveState] = useState<SessionRunSaveState>({
    status: "idle",
    error: null,
  });
  const revisionRef = useRef(0);
  const serializedProgress = useMemo(
    () => JSON.stringify(input.progress),
    [input.progress],
  );

  useEffect(() => {
    if (!input.enabled) return;
    const revision = ++revisionRef.current;
    setSaveState({ status: "saving", error: null });
    const timer = window.setTimeout(() => {
      void saveMyGrade4Session1Run({
        phase: input.phase,
        status: input.status,
        activeStepId: input.activeStepId,
        progress: JSON.parse(serializedProgress) as unknown,
      }).then((result) => {
        if (revisionRef.current !== revision) return;
        setSaveState(
          result.ok
            ? { status: "saved", error: null }
            : { status: "error", error: result.error },
        );
      });
    }, input.delayMs ?? 500);
    return () => window.clearTimeout(timer);
  }, [
    input.activeStepId,
    input.delayMs,
    input.enabled,
    input.phase,
    input.status,
    serializedProgress,
  ]);

  return saveState;
}
