import type { ClozeChoicePlayable } from "@/lib/cloze-choice";
import type { ClozeOpenPlayable } from "@/lib/cloze-open";
import type { DefinitionMatchPlayable } from "@/lib/definition-match";
import type { ReadAndAnswerPlayable } from "@/lib/read-and-answer";

export type AssessmentPartBase = {
  id: string;
  partNumber: number;
  title: string;
  instructions: string;
};

export type AssessmentPart =
  | (AssessmentPartBase & {
      kind: "definition_match";
      activity: DefinitionMatchPlayable;
      extraWords?: Array<{ id: string; word: string }>;
    })
  | (AssessmentPartBase & {
      kind: "read_and_answer";
      activity: ReadAndAnswerPlayable;
    })
  | (AssessmentPartBase & {
      kind: "short_answer_reading";
      activity: {
        passage: { title?: string; text: string };
        questions: Array<{
          id: string;
          prompt: string;
          acceptedAnswers: string[];
        }>;
      };
    })
  | (AssessmentPartBase & {
      kind: "picture_yes_no";
      activity: {
        image: { src: string; alt: string };
        statements: Array<{ id: string; text: string; correctAnswer: "yes" | "no" }>;
      };
    })
  | (AssessmentPartBase & {
      kind: "dialogue_bank";
      activity: {
        opening: string;
        exchanges: Array<{
          id: string;
          speaker: string;
          prompt: string;
          correctResponseId: string;
        }>;
        responses: Array<{ id: string; text: string }>;
      };
    })
  | (AssessmentPartBase & {
      kind: "story_bank_title";
      activity: {
        storyTitle: string;
        segments: Array<
          | { type: "text"; id: string; text: string }
          | { type: "gap"; id: string; correctWordId: string }
        >;
        words: Array<{ id: string; word: string }>;
        titleQuestionId: string;
        titleOptions: Array<{ id: string; text: string }>;
        correctTitleId: string;
      };
    })
  | (AssessmentPartBase & {
      kind: "listening_character_match";
      activity: {
        audioText: string;
        names: Array<{ id: string; name: string }>;
        characters: Array<{
          id: string;
          imageSrc: string;
          imageAlt: string;
          clueLabel: string;
          correctNameId: string;
        }>;
      };
    })
  | (AssessmentPartBase & {
      kind: "listening_information";
      activity: {
        audioText: string;
        organizerTitle: string;
        fields: Array<{ id: string; label: string; acceptedAnswers: string[] }>;
      };
    })
  | (AssessmentPartBase & {
      kind: "listening_item_match";
      activity: {
        audioText: string;
        choices: Array<{ id: string; label: string; imageSrc?: string }>;
        prompts: Array<{ id: string; label: string; correctChoiceId: string }>;
      };
    })
  | (AssessmentPartBase & {
      kind: "listening_picture_choice";
      activity: {
        items: Array<{
          id: string;
          audioText: string;
          choices: Array<{ id: string; imageSrc: string; imageAlt: string; label: string }>;
          correctChoiceId: string;
        }>;
      };
    })
  | (AssessmentPartBase & {
      kind: "listening_colour_picture";
      activity: {
        audioText: string;
        image: { src: string; alt: string };
        palette: Array<{ id: string; label: string; hex: string }>;
        targets: Array<{
          id: string;
          label: string;
          xPercent: number;
          yPercent: number;
          widthPercent: number;
          heightPercent: number;
          correctColourId: string;
        }>;
      };
    })
  | (AssessmentPartBase & {
      kind: "speaking_picture_differences";
      activity: {
        responseId: string;
        prompt: string;
        maxDurationSeconds: number;
        images: Array<{ src: string; alt: string; label: string }>;
      };
    })
  | (AssessmentPartBase & {
      kind: "speaking_question_exchange";
      activity: {
        responseId: string;
        prompt: string;
        maxDurationSeconds: number;
        cards: Array<{ id: string; title: string; prompts: string[] }>;
      };
    })
  | (AssessmentPartBase & {
      kind: "speaking_picture_story";
      activity: {
        responseId: string;
        prompt: string;
        maxDurationSeconds: number;
        frames: Array<{ id: string; src: string; alt: string }>;
      };
    })
  | (AssessmentPartBase & {
      kind: "cloze_choice";
      activity: ClozeChoicePlayable;
    })
  | (AssessmentPartBase & {
      kind: "cloze_open";
      activity: ClozeOpenPlayable;
    });

export type AssessmentSection = {
  id: string;
  title: string;
  description: string;
  parts: AssessmentPart[];
};

/** Immutable, versioned content snapshot used to start an assessment attempt. */
export type AssessmentDefinition = {
  schemaVersion: 1;
  id: string;
  contentVersion: string;
  title: string;
  level: string;
  audience: string;
  estimatedMinutes: number;
  sections: AssessmentSection[];
};

export type AssessmentAttemptStatus = "not_started" | "in_progress" | "submitted";

export type AssessmentAttempt = {
  schemaVersion: 1;
  attemptId: string;
  definitionId: string;
  contentVersion: string;
  status: AssessmentAttemptStatus;
  activePartId: string;
  responses: Record<string, Record<string, string>>;
  startedAt: string | null;
  updatedAt: string;
  submittedAt: string | null;
};

export type AssessmentSpeakingRecording = {
  id: string;
  partId: string;
  responseId: string;
  durationMs: number;
  url: string;
};

export type AssessmentPartProgress = {
  answered: number;
  total: number;
  correct: number;
  objectiveTotal: number;
};

export type AssessmentProgress = {
  answered: number;
  total: number;
  correct: number;
  objectiveTotal: number;
  parts: Record<string, AssessmentPartProgress>;
};
