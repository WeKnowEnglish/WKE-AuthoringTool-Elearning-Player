/** Document activity domain — Chunk 1 shell + shared ids. */

import { getVcActivity } from "@/lib/activity-runtime/registry";
import type {
  DocumentParticipationMode,
  DocumentRuntimePhase,
  DocumentTemplateType,
  DocumentWorkStatus,
} from "@/lib/document-activity/types";

export type {
  DocumentParticipationMode,
  DocumentRuntimePhase,
  DocumentTemplateType,
  DocumentWorkStatus,
  DocumentRoundMeta,
} from "@/lib/document-activity/types";

export {
  DOCUMENT_ROOM_PREFIX,
  parseDocumentRoomId,
  toDocumentRoomId,
} from "@/lib/activity-runtime/activity-types";

export {
  documentIdForGroup,
  documentIdForStudent,
  documentIdForWholeClass,
} from "@/lib/activity-runtime/group-adapter";

export { getVcActivity };

export type DocumentPrompt = {
  title: string;
  instructions: string;
  successCriteria: string;
  /** Stem / short reading text. Teacher-facing label deferred. */
  stimulus?: string;
};

export type DocumentScaffolds = {
  wordBank: string[];
  sentenceStarters: string[];
};

export type DocumentGroupSubmitPolicy = "any_member" | "leader_only" | "everyone_ready";

export type DocumentRoundSettings = {
  defaultTimerMs: number;
  anonymousCompareDefault: boolean;
  allowEarlySubmit: boolean;
  groupSubmitPolicy: DocumentGroupSubmitPolicy;
};

export const DEFAULT_DOCUMENT_PROMPT: DocumentPrompt = {
  title: "Write a paragraph",
  instructions: "Write 4–6 sentences about the topic. Wait for your teacher to open writing.",
  successCriteria: "Clear topic sentence and at least three supporting details.",
};

export const DEFAULT_DOCUMENT_SCAFFOLDS: DocumentScaffolds = {
  wordBank: ["first", "then", "also", "because", "finally"],
  sentenceStarters: ["I think…", "One reason is…", "For example…"],
};

export const DOCUMENT_TEMPLATE_OPTIONS: {
  value: DocumentTemplateType;
  label: string;
}[] = [
  { value: "paragraph", label: "Paragraph" },
  { value: "story_continuation", label: "Story continuation" },
  { value: "reading_response", label: "Reading response" },
  { value: "dialogue", label: "Dialogue" },
];

export const DEFAULT_DOCUMENT_SETTINGS: DocumentRoundSettings = {
  defaultTimerMs: 5 * 60 * 1000,
  anonymousCompareDefault: true,
  allowEarlySubmit: true,
  groupSubmitPolicy: "any_member",
};

/** Split launch UI lists (comma or newline). */
export function parseScaffoldList(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function defaultScaffoldsForTemplate(template: DocumentTemplateType): DocumentScaffolds {
  switch (template) {
    case "story_continuation":
      return {
        wordBank: ["suddenly", "meanwhile", "after that", "because", "finally"],
        sentenceStarters: ["Then…", "The next day…", "But then…"],
      };
    case "reading_response":
      return {
        wordBank: ["because", "according to", "the text says", "for example", "therefore"],
        sentenceStarters: ["The answer is…", "In the text…", "I know this because…"],
      };
    case "dialogue":
      return {
        wordBank: ["hello", "please", "sorry", "really", "goodbye"],
        sentenceStarters: ["A: …", "B: …", "A: …"],
      };
    case "paragraph":
    default:
      return {
        wordBank: [...DEFAULT_DOCUMENT_SCAFFOLDS.wordBank],
        sentenceStarters: [...DEFAULT_DOCUMENT_SCAFFOLDS.sentenceStarters],
      };
  }
}

export function createRoundId(): string {
  return `docr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Activity kind registration check (Chunk 0.5). */
export function isDocumentActivityRegistered(): boolean {
  return getVcActivity("document")?.enabled === true;
}

/** True when the launch UI should show a stimulus field for this template. */
export function templateUsesStimulus(template: DocumentTemplateType): boolean {
  return template === "story_continuation" || template === "reading_response";
}

export function defaultPromptForTemplate(template: DocumentTemplateType): DocumentPrompt {
  switch (template) {
    case "story_continuation":
      return {
        title: "Continue the story",
        instructions: "Read the start. Write what happens next in 5–8 sentences.",
        successCriteria: "Your ending connects to the start and uses past tense.",
        stimulus:
          "Mia opened the classroom door and stopped. On her desk sat a small wooden box she had never seen before. A note on top said: Open me at break time.",
      };
    case "reading_response":
      return {
        title: "Reading response",
        instructions: "Why did the class choose the library? Answer in a short paragraph.",
        successCriteria: "You answer the question and give one reason from the text.",
        stimulus:
          "On Monday, Class 5B voted on their Friday activity. Some students wanted football. Others wanted art. In the end, they chose the library because many students needed quiet time to finish their reading logs.",
      };
    case "dialogue":
      return {
        title: "Write a short dialogue",
        instructions: "Write a short conversation between two people (6–10 lines).",
        successCriteria: "Both speakers take turns and the conversation makes sense.",
        stimulus: "",
      };
    case "paragraph":
    default:
      return { ...DEFAULT_DOCUMENT_PROMPT, stimulus: "" };
  }
}
