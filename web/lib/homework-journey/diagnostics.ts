"use client";

import { useEffect, useRef } from "react";
import { recordAppDiagnostic } from "@/lib/app-diagnostics/client";
import type { AppDiagnosticSurface } from "@/lib/app-diagnostics/types";

export type HomeworkJourneyEventName =
  | "assignment_created"
  | "homework_opened"
  | "save_settled"
  | "submit_settled"
  | "teacher_result_opened";

export function recordHomeworkJourneyEvent(input: {
  surface: AppDiagnosticSurface;
  name: HomeworkJourneyEventName;
  homeworkId: string;
  classId?: string;
  status: string;
  durationMs?: number;
  synthetic?: boolean;
}) {
  return recordAppDiagnostic(
    input.surface,
    "homework_journey",
    input.name,
    {
      correlation: "homework_id",
      synthetic: Boolean(input.synthetic),
    },
    {
      kind: input.durationMs == null ? "mark" : "span",
      durationMs: input.durationMs,
      homeworkId: input.homeworkId,
      classId: input.classId,
      status: input.status,
    },
  );
}

export function HomeworkJourneyOpenedBeacon(input: {
  surface: "student" | "teacher";
  name: "homework_opened" | "teacher_result_opened";
  homeworkId: string;
  classId?: string;
  synthetic?: boolean;
}) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    recordHomeworkJourneyEvent({ ...input, status: "opened" });
  }, [input]);
  return null;
}
