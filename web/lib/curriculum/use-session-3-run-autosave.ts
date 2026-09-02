"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { saveMyGrade4Session3Run } from "@/lib/actions/course-session-run";

export function useGrade4Session3Autosave(input: { enabled: boolean; status: "in_progress" | "completed"; activeStepId: string; progress: unknown; delayMs?: number }) {
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const revisionRef = useRef(0);
  const serializedProgress = useMemo(() => JSON.stringify(input.progress), [input.progress]);

  useEffect(() => {
    if (!input.enabled) return;
    const revision = ++revisionRef.current;
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      void saveMyGrade4Session3Run({ status: input.status, activeStepId: input.activeStepId, progress: JSON.parse(serializedProgress) as unknown }).then((result) => {
        if (revisionRef.current !== revision) return;
        setSaveState(result.ok ? "saved" : "error");
      });
    }, input.delayMs ?? 500);
    return () => window.clearTimeout(timer);
  }, [input.activeStepId, input.delayMs, input.enabled, input.status, serializedProgress]);

  return saveState;
}
