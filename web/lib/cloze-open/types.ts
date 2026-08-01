/** Standalone open-cloze authoring document (Activity Bank + homework freeze). */

export type ClozeOpenTextSegment = {
  type: "text";
  id: string;
  text: string;
};

export type ClozeOpenGapSegment = {
  type: "gap";
  id: string;
  correctAnswers: string[];
  hint?: string;
};

export type ClozeOpenSegment = ClozeOpenTextSegment | ClozeOpenGapSegment;

export type ClozeOpenDocument = {
  version: 1;
  kind: "cloze-open";
  id: string;
  title: string;
  instructions: string;
  passageTitle?: string;
  segments: ClozeOpenSegment[];
  caseSensitive: boolean;
  punctuationSensitive: boolean;
};

/** Playable slice for the dedicated student player. */
export type ClozeOpenPlayable = {
  title: string;
  instructions: string;
  passageTitle?: string;
  segments: ClozeOpenSegment[];
  caseSensitive: boolean;
  punctuationSensitive: boolean;
};

export const CLOZE_OPEN_KIND = "cloze-open" as const;
export const DEFAULT_CLOZE_OPEN_INSTRUCTIONS =
  "Read the passage and type the missing words.";

export function listClozeOpenGaps(
  segments: readonly ClozeOpenSegment[],
): ClozeOpenGapSegment[] {
  return segments.filter((segment): segment is ClozeOpenGapSegment => segment.type === "gap");
}
