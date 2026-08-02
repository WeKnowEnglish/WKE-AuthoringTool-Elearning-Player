/** Standalone cloze-with-choices authoring document (Activity Bank + homework freeze). */

export type ClozeChoiceTextSegment = {
  type: "text";
  id: string;
  text: string;
};

export type ClozeChoiceGapSegment = {
  type: "gap";
  id: string;
  options: string[];
  correctAnswer: string;
};

export type ClozeChoiceSegment = ClozeChoiceTextSegment | ClozeChoiceGapSegment;

export type ClozeChoiceDocument = {
  version: 1;
  kind: "cloze-choice";
  id: string;
  title: string;
  instructions: string;
  passageTitle?: string;
  segments: ClozeChoiceSegment[];
  shuffleOptions: boolean;
};

/** Playable slice for the dedicated student player. */
export type ClozeChoicePlayable = {
  title: string;
  instructions: string;
  passageTitle?: string;
  segments: ClozeChoiceSegment[];
  shuffleOptions: boolean;
};

export const CLOZE_CHOICE_KIND = "cloze-choice" as const;
export const DEFAULT_CLOZE_CHOICE_INSTRUCTIONS =
  "Read the passage and choose the best word for each gap.";

export function listClozeChoiceGaps(
  segments: readonly ClozeChoiceSegment[],
): ClozeChoiceGapSegment[] {
  return segments.filter((segment): segment is ClozeChoiceGapSegment => segment.type === "gap");
}
