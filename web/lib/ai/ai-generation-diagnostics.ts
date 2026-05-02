/** Serializable AI screen-generation diagnostics (API + lesson editor UI). */

import { ZodError } from "zod";

/** One Zod (or generic) issue for teacher-facing diagnostics. */
export type AiScreenParseIssue = {
  path: string;
  message: string;
  code?: string;
};

/**
 * A model-emitted screen row that did not pass validation — not saved to `lesson_screens`.
 * Lets teachers inspect raw payload + structured issues instead of only a warning string.
 */
export type FailedScreenCandidate = {
  /** Index in the model's `screens` JSON array. */
  modelIndex: number;
  screen_type: string;
  /** Raw model payload when present (may be invalid). */
  payload: unknown;
  /** Short human summary (often Zod message prefix). */
  summary: string;
  issues: AiScreenParseIssue[];
  /** Present when using Story-First materialization order. */
  storyFirstContext?: {
    stepIndex: number;
    stepKind: "story" | "reinforcement";
    beatId?: string;
    expectedSubtype?: string;
  };
};

export function parseIssuesFromError(e: unknown): {
  issues: AiScreenParseIssue[];
  summary: string;
} {
  if (e instanceof ZodError) {
    return {
      issues: e.issues.map((issue) => ({
        path: issue.path.length ? issue.path.map(String).join(".") : "(root)",
        message: issue.message,
        code: issue.code,
      })),
      summary: e.message.slice(0, 2_000),
    };
  }
  const msg = e instanceof Error ? e.message : String(e);
  return { issues: [], summary: msg.slice(0, 2_000) };
}

export type AiGenerationDiagnosticsV1 = {
  modelScreensArrayLength: number;
  validatedScreenCount: number;
  returnedScreenCount: number;
  openingStartScreensStripped: number;
  parseWarningCount: number;
  parseWarnings: string[];
  failedScreenCount: number;
  failedScreens: FailedScreenCandidate[];
};

export function buildAiGenerationDiagnostics(input: {
  modelScreensArrayLength: number;
  validatedScreenCount: number;
  returnedScreenCount: number;
  parseWarnings: string[];
  failedScreens?: FailedScreenCandidate[];
}): AiGenerationDiagnosticsV1 {
  const failedScreens = input.failedScreens ?? [];
  return {
    modelScreensArrayLength: input.modelScreensArrayLength,
    validatedScreenCount: input.validatedScreenCount,
    returnedScreenCount: input.returnedScreenCount,
    openingStartScreensStripped:
      input.validatedScreenCount - input.returnedScreenCount,
    parseWarningCount: input.parseWarnings.length,
    parseWarnings: [...input.parseWarnings],
    failedScreenCount: failedScreens.length,
    failedScreens: [...failedScreens],
  };
}
