"use client";

import { recordAppDiagnostic } from "@/lib/app-diagnostics/client";
import type {
  HomeworkFinalizationFormat,
  HomeworkFinalizationReceipt,
} from "@/lib/homework-finalization/receipt";

type Outcome =
  | { ok: false }
  | { ok: true; receipt?: HomeworkFinalizationReceipt };

export function homeworkFinalizationDiagnosticName(outcome: Outcome) {
  if (!outcome.ok) return "submit_failed" as const;
  if (outcome.receipt?.reconciled) return "reconciliation_succeeded" as const;
  if (outcome.receipt?.duplicate) return "duplicate_prevented" as const;
  return "submit_succeeded" as const;
}

export function recordHomeworkFinalizationStarted(
  homeworkId: string,
  format: HomeworkFinalizationFormat,
) {
  recordAppDiagnostic(
    "student",
    "homework_finalization",
    "submit_started",
    { format },
    { homeworkId, status: "started" },
  );
}

export function recordHomeworkFinalizationOutcome(
  homeworkId: string,
  format: HomeworkFinalizationFormat,
  outcome: Outcome,
) {
  const name = homeworkFinalizationDiagnosticName(outcome);
  recordAppDiagnostic(
    "student",
    "homework_finalization",
    name,
    {
      format,
      duplicate: outcome.ok ? Boolean(outcome.receipt?.duplicate) : false,
      reconciled: outcome.ok ? Boolean(outcome.receipt?.reconciled) : false,
    },
    {
      homeworkId,
      status: outcome.ok ? "succeeded" : "failed",
      ...(outcome.ok ? {} : { errorCode: "homework_finalization_failed" }),
    },
  );
}
