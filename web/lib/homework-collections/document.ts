import {
  HOMEWORK_COLLECTION_PART_KINDS,
  HOMEWORK_COLLECTION_VERSION,
  type HomeworkCollectionDocument,
  type HomeworkCollectionPart,
  type HomeworkCollectionPartKind,
} from "@/lib/homework-collections/types";
import { defaultListeningItemMatchSettings } from "@/lib/learning-tracks/composition";
import {
  LISTENING_ITEM_MATCH_MAX_CHOICES,
  LISTENING_ITEM_MATCH_MAX_PROMPTS,
  LISTENING_ITEM_MATCH_MIN_CHOICES,
  LISTENING_ITEM_MATCH_MIN_PROMPTS,
  listeningItemMatchCountIssues,
} from "@/lib/listening-item-match/limits";
import {
  lessonPlayerPackItemIds,
  lessonPlayerPackValidationIssues,
} from "@/lib/homework-collections/lesson-player-pack";
import {
  documentModuleItemIds,
  documentModuleValidationIssues,
  isCollectionReadingModuleFormat,
} from "@/lib/homework-collections/document-module";
import { isHomeworkStudioFormat } from "@/lib/class-homework/types";
import {
  createCreativePresentationContent,
  creativePresentationAnswerIds,
  creativePresentationValidationIssues,
  parseCreativePresentationContent,
} from "@/lib/homework-collections/creative-presentation";

const MAX_PARTS = 30;
const MAX_ITEMS = 50;
const GENERIC_SENTENCE_SCRAMBLE_PROMPTS = new Set([
  "put the words in order",
  "put the words in order.",
  "unscramble the sentence",
  "unscramble the sentence.",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value: unknown, max: number, fallback = ""): string {
  return typeof value === "string" ? value.trim().slice(0, max) : fallback;
}

function cleanId(value: unknown, fallback: string): string {
  return cleanText(value, 100, fallback) || fallback;
}

function cleanUrl(value: unknown): string | undefined {
  const url = cleanText(value, 2000);
  if (!url) return undefined;
  if (url.startsWith("/")) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? url : undefined;
  } catch {
    return undefined;
  }
}

export function isHomeworkCollectionPartKind(
  value: unknown,
): value is HomeworkCollectionPartKind {
  return (
    typeof value === "string" &&
    (HOMEWORK_COLLECTION_PART_KINDS as readonly string[]).includes(value)
  );
}

export function homeworkCollectionPartLabel(kind: HomeworkCollectionPartKind): string {
  if (kind === "multiple_choice") return "Multiple choice";
  if (kind === "letter_mixup") return "Scramble letters";
  if (kind === "line_match") return "Match pictures";
  if (kind === "listen_and_choose") return "Listen and choose";
  if (kind === "listening_item_match") return "Listen and match";
  if (kind === "sentence_scramble") return "Sentence scramble";
  if (kind === "lesson_player_pack") return "Quiz activity";
  if (kind === "document_module") return "Reading activity";
  if (kind === "speaking_prompt") return "Speaking prompt";
  if (kind === "creative_presentation") return "Creative presentation";
  return "Free response";
}

export function homeworkCollectionGradingMode(
  kind: HomeworkCollectionPartKind,
): "automatic" | "teacher_review" {
  return kind === "free_response" ||
    kind === "speaking_prompt" ||
    kind === "creative_presentation"
    ? "teacher_review"
    : "automatic";
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim());
}

function addIdIssues(
  rows: unknown[],
  label: string,
  issues: string[],
): void {
  const ids: string[] = [];
  rows.forEach((row, index) => {
    if (!isRecord(row) || !hasText(row.id)) {
      issues.push(`${label} ${index + 1} needs an id.`);
      return;
    }
    ids.push(row.id.trim());
  });
  if (new Set(ids).size !== ids.length) {
    issues.push(`${label} ids must be unique.`);
  }
}

/**
 * Completeness checks for teacher-authored collection activities. Draft editors
 * may temporarily contain blanks, but assignment must never silently discard a
 * question or turn another option into the correct answer.
 */
export function homeworkCollectionPartValidationIssues(raw: unknown): string[] {
  if (!isRecord(raw) || !isHomeworkCollectionPartKind(raw.kind)) {
    return ["Choose a supported homework activity type."];
  }

  const issues: string[] = [];
  if (!hasText(raw.id)) issues.push("The activity needs an id.");
  if (!hasText(raw.title)) issues.push("Add an activity title.");

  if (raw.kind === "multiple_choice") {
    const questions = Array.isArray(raw.questions) ? raw.questions : [];
    if (questions.length < 1 || questions.length > MAX_ITEMS) {
      issues.push(`Add between 1 and ${MAX_ITEMS} multiple-choice questions.`);
    }
    addIdIssues(questions, "Question", issues);
    questions.forEach((question, questionIndex) => {
      if (!isRecord(question)) return;
      if (!hasText(question.prompt)) {
        issues.push(`Question ${questionIndex + 1} needs a prompt.`);
      }
      const options = Array.isArray(question.options) ? question.options : [];
      if (options.length < 2 || options.length > 8) {
        issues.push(`Question ${questionIndex + 1} needs 2–8 options.`);
      }
      addIdIssues(options, `Question ${questionIndex + 1} option`, issues);
      options.forEach((option, optionIndex) => {
        if (isRecord(option) && !hasText(option.text)) {
          issues.push(
            `Question ${questionIndex + 1}, option ${optionIndex + 1} needs text.`,
          );
        }
      });
      if (
        !hasText(question.correctOptionId) ||
        !options.some(
          (option) =>
            isRecord(option) && option.id === question.correctOptionId,
        )
      ) {
        issues.push(`Question ${questionIndex + 1} needs a valid correct option.`);
      }
    });
    return issues;
  }

  if (raw.kind === "letter_mixup") {
    const items = Array.isArray(raw.items) ? raw.items : [];
    if (items.length < 1 || items.length > MAX_ITEMS) {
      issues.push(`Add between 1 and ${MAX_ITEMS} scrambled words.`);
    }
    addIdIssues(items, "Word", issues);
    items.forEach((item, index) => {
      if (!isRecord(item)) return;
      if (!hasText(item.targetWord)) {
        issues.push(`Word ${index + 1} needs a correct word.`);
      }
      if (hasText(item.imageUrl) && !cleanUrl(item.imageUrl)) {
        issues.push(`Word ${index + 1} has an invalid picture URL.`);
      }
    });
    return issues;
  }

  if (raw.kind === "line_match") {
    const pairs = Array.isArray(raw.pairs) ? raw.pairs : [];
    if (pairs.length < 2 || pairs.length > MAX_ITEMS) {
      issues.push(`Add between 2 and ${MAX_ITEMS} matching pairs.`);
    }
    addIdIssues(pairs, "Pair", issues);
    pairs.forEach((pair, index) => {
      if (!isRecord(pair)) return;
      if (!hasText(pair.left)) {
        issues.push(`Pair ${index + 1} needs a left-side prompt.`);
      }
      const imageUrl = cleanUrl(pair.imageUrl);
      if (!hasText(pair.right) && !imageUrl) {
        issues.push(`Pair ${index + 1} needs matching text or a picture.`);
      }
      if (hasText(pair.imageUrl) && !imageUrl) {
        issues.push(`Pair ${index + 1} has an invalid picture URL.`);
      }
    });
    return issues;
  }

  if (raw.kind === "listen_and_choose") {
    const items = Array.isArray(raw.items) ? raw.items : [];
    if (items.length < 1 || items.length > MAX_ITEMS) {
      issues.push(`Add between 1 and ${MAX_ITEMS} listening questions.`);
    }
    addIdIssues(items, "Listening question", issues);
    items.forEach((item, itemIndex) => {
      if (!isRecord(item)) return;
      const audioUrl = cleanUrl(item.audioUrl);
      if (!audioUrl && !hasText(item.speakText)) {
        issues.push(
          `Listening question ${itemIndex + 1} needs audio or text to speak.`,
        );
      }
      if (hasText(item.audioUrl) && !audioUrl) {
        issues.push(`Listening question ${itemIndex + 1} has an invalid audio URL.`);
      }
      const choices = Array.isArray(item.choices) ? item.choices : [];
      if (choices.length < 2 || choices.length > 6) {
        issues.push(`Listening question ${itemIndex + 1} needs 2–6 choices.`);
      }
      addIdIssues(
        choices,
        `Listening question ${itemIndex + 1} choice`,
        issues,
      );
      choices.forEach((choice, choiceIndex) => {
        if (!isRecord(choice)) return;
        const imageUrl = cleanUrl(choice.imageUrl);
        if (!hasText(choice.label) && !imageUrl) {
          issues.push(
            `Listening question ${itemIndex + 1}, choice ${choiceIndex + 1} needs text or a picture.`,
          );
        }
        if (hasText(choice.imageUrl) && !imageUrl) {
          issues.push(
            `Listening question ${itemIndex + 1}, choice ${choiceIndex + 1} has an invalid picture URL.`,
          );
        }
      });
      if (
        !hasText(item.correctChoiceId) ||
        !choices.some(
          (choice) => isRecord(choice) && choice.id === item.correctChoiceId,
        )
      ) {
        issues.push(
          `Listening question ${itemIndex + 1} needs a valid correct choice.`,
        );
      }
    });
    return issues;
  }

  if (raw.kind === "listening_item_match") {
    const activity = isRecord(raw.activity) ? raw.activity : {};
    const audioUrl = cleanUrl(activity.audioUrl);
    const audioText = cleanText(activity.audioText, 5000);
    if (!audioUrl && !audioText) {
      issues.push("Add an audio clip or narration text for the conversation.");
    }
    if (hasText(activity.audioUrl) && !audioUrl) {
      issues.push("The listening track URL is invalid.");
    }
    const choices = Array.isArray(activity.choices) ? activity.choices : [];
    const prompts = Array.isArray(activity.prompts) ? activity.prompts : [];
    for (const message of listeningItemMatchCountIssues({
      promptCount: prompts.length,
      choiceCount: choices.length,
    })) {
      issues.push(message);
    }
    if (prompts.length > LISTENING_ITEM_MATCH_MAX_PROMPTS) {
      issues.push(
        `Listen and match supports up to ${LISTENING_ITEM_MATCH_MAX_PROMPTS} prompts.`,
      );
    }
    if (choices.length > LISTENING_ITEM_MATCH_MAX_CHOICES) {
      issues.push(
        `Listen and match supports up to ${LISTENING_ITEM_MATCH_MAX_CHOICES} choices.`,
      );
    }
    addIdIssues(choices, "Choice", issues);
    addIdIssues(prompts, "Prompt", issues);
    choices.forEach((choice, index) => {
      if (!isRecord(choice)) return;
      const label = cleanText(choice.label, 500);
      const imageSrc = cleanUrl(choice.imageSrc);
      if (!label && !imageSrc) {
        issues.push(`Choice ${index + 1} needs a label or picture.`);
      }
      if (hasText(choice.imageSrc) && !imageSrc) {
        issues.push(`Choice ${index + 1} has an invalid picture URL.`);
      }
    });
    prompts.forEach((prompt, index) => {
      if (!isRecord(prompt)) return;
      if (!hasText(prompt.label)) {
        issues.push(`Prompt ${index + 1} needs a label.`);
      }
      const correctChoiceId = cleanText(prompt.correctChoiceId, 100);
      if (
        !correctChoiceId ||
        !choices.some(
          (choice) => isRecord(choice) && choice.id === correctChoiceId,
        )
      ) {
        issues.push(`Prompt ${index + 1} needs a valid correct choice.`);
      }
    });
    const correctIds = prompts
      .flatMap((prompt) =>
        isRecord(prompt) && hasText(prompt.correctChoiceId)
          ? [prompt.correctChoiceId.trim()]
          : [],
      );
    if (new Set(correctIds).size !== prompts.length) {
      issues.push(
        "Each prompt needs a unique correct choice (no duplicate matches).",
      );
    }
    return issues;
  }

  if (raw.kind === "lesson_player_pack") {
    const studioFormat = raw.studioFormat;
    if (!isHomeworkStudioFormat(studioFormat) || studioFormat === "learning_track") {
      issues.push("Choose a supported quiz format.");
    }
    if (!isRecord(raw.pack)) {
      issues.push("Lesson Player pack is missing.");
    }
    if (issues.length > 0) return issues;
    return lessonPlayerPackValidationIssues({
      schemaVersion: HOMEWORK_COLLECTION_VERSION,
      id: typeof raw.id === "string" ? raw.id : "part",
      kind: "lesson_player_pack",
      title: typeof raw.title === "string" ? raw.title : "",
      instructions: typeof raw.instructions === "string" ? raw.instructions : "",
      required: raw.required !== false,
      studioFormat: studioFormat as import("@/lib/class-homework/types").HomeworkStudioFormat,
      pack: raw.pack as Record<string, unknown>,
      authoringSession: raw.authoringSession as import("@/lib/activity-builder/games/quiz-builder-session").QuizSession | undefined,
    });
  }

  if (raw.kind === "document_module") {
    const moduleFormat = raw.moduleFormat;
    if (!isCollectionReadingModuleFormat(moduleFormat)) {
      issues.push("Choose a supported reading activity format.");
      return issues;
    }
    if (!isRecord(raw.document)) {
      issues.push("Reading activity content is missing.");
      return issues;
    }
    return documentModuleValidationIssues({
      schemaVersion: HOMEWORK_COLLECTION_VERSION,
      id: typeof raw.id === "string" ? raw.id : "part",
      kind: "document_module",
      title: typeof raw.title === "string" ? raw.title : "",
      instructions: typeof raw.instructions === "string" ? raw.instructions : "",
      required: raw.required !== false,
      moduleFormat,
      document: raw.document as Record<string, unknown>,
    });
  }

  if (raw.kind === "sentence_scramble") {
    const items = Array.isArray(raw.items) ? raw.items : [];
    if (items.length < 1 || items.length > MAX_ITEMS) {
      issues.push(`Add between 1 and ${MAX_ITEMS} scrambled sentences.`);
    }
    addIdIssues(items, "Sentence", issues);
    items.forEach((item, index) => {
      if (!isRecord(item)) return;
      if (!hasText(item.sentence)) {
        issues.push(`Sentence ${index + 1} needs a correct sentence.`);
      }
      if (item.promptMode === "additional_prompt" && !hasText(item.prompt)) {
        issues.push(`Sentence ${index + 1} needs its additional prompt.`);
      }
    });
    return issues;
  }

  if (raw.kind === "speaking_prompt") {
    if (!hasText(raw.prompt)) {
      issues.push("Add a speaking prompt for students.");
    }
    if (!hasText(raw.responseId)) {
      issues.push("Speaking response id is missing.");
    }
    const maxDuration = Number(raw.maxDurationSeconds);
    if (
      !Number.isInteger(maxDuration) ||
      maxDuration < 15 ||
      maxDuration > 120
    ) {
      issues.push("Max recording length must be between 15 and 120 seconds.");
    }
    const maxPoints = Number(raw.maxPoints);
    if (!Number.isInteger(maxPoints) || maxPoints < 1 || maxPoints > 100) {
      issues.push("Points must be between 1 and 100.");
    }
    if (
      raw.imageUrl !== undefined &&
      raw.imageUrl !== "" &&
      !cleanUrl(raw.imageUrl)
    ) {
      issues.push("Picture URL must be a valid http(s) link or site path.");
    }
    return issues;
  }

  if (raw.kind === "creative_presentation") {
    const part = {
      schemaVersion: HOMEWORK_COLLECTION_VERSION,
      id: typeof raw.id === "string" ? raw.id : "part",
      kind: "creative_presentation" as const,
      title: typeof raw.title === "string" ? raw.title : "",
      instructions: typeof raw.instructions === "string" ? raw.instructions : "",
      required: raw.required !== false,
      ...parseCreativePresentationContent(raw),
    };
    return [...issues, ...creativePresentationValidationIssues(part)];
  }

  if (raw.kind !== "free_response") {
    return ["Choose a supported homework activity type."];
  }

  const prompts = Array.isArray(raw.prompts) ? raw.prompts : [];
  if (prompts.length < 1 || prompts.length > MAX_ITEMS) {
    issues.push(`Add between 1 and ${MAX_ITEMS} free-response prompts.`);
  }
  addIdIssues(prompts, "Prompt", issues);
  prompts.forEach((prompt, index) => {
    if (!isRecord(prompt)) return;
    if (!hasText(prompt.prompt)) {
      issues.push(`Prompt ${index + 1} needs a question or writing prompt.`);
    }
    if (
      !Number.isInteger(prompt.minWords) ||
      Number(prompt.minWords) < 0 ||
      Number(prompt.minWords) > 1000
    ) {
      issues.push(`Prompt ${index + 1} needs a minimum word count from 0–1000.`);
    }
    if (
      !Number.isInteger(prompt.maxPoints) ||
      Number(prompt.maxPoints) < 1 ||
      Number(prompt.maxPoints) > 100
    ) {
      issues.push(`Prompt ${index + 1} needs a point value from 1–100.`);
    }
  });
  return issues;
}

export function createHomeworkCollectionPart(
  kind: HomeworkCollectionPartKind,
  id = crypto.randomUUID(),
): HomeworkCollectionPart {
  const base = {
    schemaVersion: HOMEWORK_COLLECTION_VERSION,
    id,
    kind,
    title: homeworkCollectionPartLabel(kind),
    instructions: "",
    required: true,
  } as const;

  if (kind === "multiple_choice") {
    const correctOptionId = crypto.randomUUID();
    return {
      ...base,
      kind,
      questions: [
        {
          id: crypto.randomUUID(),
          prompt: "Add a question",
          options: [
            { id: correctOptionId, text: "Correct answer" },
            { id: crypto.randomUUID(), text: "Another answer" },
          ],
          correctOptionId,
        },
      ],
    };
  }
  if (kind === "letter_mixup") {
    return {
      ...base,
      kind,
      items: [
        {
          id: crypto.randomUUID(),
          prompt: "Unscramble the word.",
          targetWord: "example",
          acceptedWords: [],
        },
      ],
    };
  }
  if (kind === "line_match") {
    return {
      ...base,
      kind,
      pairs: [
        { id: crypto.randomUUID(), left: "Word", right: "Meaning" },
        { id: crypto.randomUUID(), left: "Example", right: "Picture or definition" },
      ],
    };
  }
  if (kind === "listen_and_choose") {
    const correctChoiceId = crypto.randomUUID();
    return {
      ...base,
      kind,
      items: [
        {
          id: crypto.randomUUID(),
          prompt: "Listen and choose the answer.",
          speakText: "Add the sentence students should hear.",
          choices: [
            { id: correctChoiceId, label: "Correct answer" },
            { id: crypto.randomUUID(), label: "Another answer" },
          ],
          correctChoiceId,
        },
      ],
    };
  }
  if (kind === "listening_item_match") {
    return {
      ...base,
      kind,
      activity: defaultListeningItemMatchSettings(),
    };
  }
  if (kind === "sentence_scramble") {
    return {
      ...base,
      kind,
      items: [
        {
          id: crypto.randomUUID(),
          promptMode: "scramble_only",
          sentence: "This is an example sentence.",
        },
      ],
    };
  }
  if (kind === "speaking_prompt") {
    return {
      ...base,
      kind,
      prompt: "Describe what you see or answer the question aloud.",
      responseId: crypto.randomUUID(),
      maxDurationSeconds: 60,
      maxPoints: 5,
    };
  }
  if (kind === "creative_presentation") {
    return {
      ...base,
      kind,
      title: "Plan your VLOG",
      instructions: "Complete the four simple steps.",
      ...createCreativePresentationContent(),
    };
  }
  return {
    ...base,
    kind: "free_response",
    prompts: [
      {
        id: crypto.randomUUID(),
        prompt: "Write your answer.",
        minWords: 1,
        maxPoints: 5,
      },
    ],
  };
}

function parseBase(row: Record<string, unknown>, kind: HomeworkCollectionPartKind) {
  const id = cleanId(row.id, "part");
  return {
    schemaVersion: HOMEWORK_COLLECTION_VERSION,
    id,
    kind,
    title: cleanText(row.title, 120, homeworkCollectionPartLabel(kind)) ||
      homeworkCollectionPartLabel(kind),
    instructions: cleanText(row.instructions, 2000),
    required: row.required !== false,
  } as const;
}

export function parseHomeworkCollectionPart(raw: unknown): HomeworkCollectionPart | null {
  if (!isRecord(raw) || !isHomeworkCollectionPartKind(raw.kind)) return null;
  const kind = raw.kind;
  const base = parseBase(raw, kind);

  if (kind === "multiple_choice") {
    const questions = (Array.isArray(raw.questions) ? raw.questions : [])
      .slice(0, MAX_ITEMS)
      .flatMap((value, index) => {
        if (!isRecord(value)) return [];
        const options = (Array.isArray(value.options) ? value.options : [])
          .slice(0, 8)
          .flatMap((option, optionIndex) =>
            isRecord(option)
              ? [{
                  id: cleanId(option.id, `option-${optionIndex + 1}`),
                  text: cleanText(option.text, 500),
                }]
              : [],
          )
          .filter((option) => option.text);
        if (options.length < 2) return [];
        const correctOptionId = cleanId(value.correctOptionId, options[0]!.id);
        return [{
          id: cleanId(value.id, `question-${index + 1}`),
          prompt: cleanText(value.prompt, 1000, "Choose the answer."),
          options,
          correctOptionId: options.some((option) => option.id === correctOptionId)
            ? correctOptionId
            : options[0]!.id,
        }];
      });
    return questions.length ? { ...base, kind, questions } : null;
  }

  if (kind === "letter_mixup") {
    const items = (Array.isArray(raw.items) ? raw.items : [])
      .slice(0, MAX_ITEMS)
      .flatMap((value, index) => {
        if (!isRecord(value)) return [];
        const targetWord = cleanText(value.targetWord, 100);
        if (!targetWord) return [];
        return [{
          id: cleanId(value.id, `word-${index + 1}`),
          prompt: cleanText(value.prompt, 500, "Unscramble the word."),
          targetWord,
          acceptedWords: (Array.isArray(value.acceptedWords) ? value.acceptedWords : [])
            .flatMap((entry) => (typeof entry === "string" ? [entry.trim().slice(0, 100)] : []))
            .filter(Boolean)
            .slice(0, 10),
          ...(cleanUrl(value.imageUrl) ? { imageUrl: cleanUrl(value.imageUrl) } : {}),
        }];
      });
    return items.length ? { ...base, kind, items } : null;
  }

  if (kind === "line_match") {
    const pairs = (Array.isArray(raw.pairs) ? raw.pairs : [])
      .slice(0, MAX_ITEMS)
      .flatMap((value, index) => {
        if (!isRecord(value)) return [];
        const left = cleanText(value.left, 500);
        const right = cleanText(value.right, 500);
        if (!left || (!right && !cleanUrl(value.imageUrl))) return [];
        return [{
          id: cleanId(value.id, `pair-${index + 1}`),
          left,
          right,
          ...(cleanUrl(value.imageUrl) ? { imageUrl: cleanUrl(value.imageUrl) } : {}),
        }];
      });
    return pairs.length >= 2 ? { ...base, kind, pairs } : null;
  }

  if (kind === "listen_and_choose") {
    const items = (Array.isArray(raw.items) ? raw.items : [])
      .slice(0, MAX_ITEMS)
      .flatMap((value, index) => {
        if (!isRecord(value)) return [];
        const choices = (Array.isArray(value.choices) ? value.choices : [])
          .slice(0, 6)
          .flatMap((choice, choiceIndex) => {
            if (!isRecord(choice)) return [];
            const label = cleanText(choice.label, 500);
            const imageUrl = cleanUrl(choice.imageUrl);
            if (!label && !imageUrl) return [];
            return [{
              id: cleanId(choice.id, `choice-${choiceIndex + 1}`),
              label,
              ...(imageUrl ? { imageUrl } : {}),
            }];
          });
        if (choices.length < 2) return [];
        const audioUrl = cleanUrl(value.audioUrl);
        const speakText = cleanText(value.speakText, 1000);
        if (!audioUrl && !speakText) return [];
        const correctChoiceId = cleanId(value.correctChoiceId, choices[0]!.id);
        return [{
          id: cleanId(value.id, `listen-${index + 1}`),
          prompt: cleanText(value.prompt, 500, "Listen and choose."),
          ...(audioUrl ? { audioUrl } : {}),
          ...(speakText ? { speakText } : {}),
          choices,
          correctChoiceId: choices.some((choice) => choice.id === correctChoiceId)
            ? correctChoiceId
            : choices[0]!.id,
        }];
      });
    return items.length ? { ...base, kind, items } : null;
  }

  if (kind === "listening_item_match") {
    const activityRaw = isRecord(raw.activity) ? raw.activity : {};
    const audioUrl = cleanUrl(activityRaw.audioUrl);
    const audioText = cleanText(activityRaw.audioText, 5000);
    if (!audioUrl && !audioText) return null;
    const choices = (Array.isArray(activityRaw.choices) ? activityRaw.choices : [])
      .slice(0, LISTENING_ITEM_MATCH_MAX_CHOICES)
      .flatMap((value, index) => {
        if (!isRecord(value)) return [];
        const label = cleanText(value.label, 500);
        const imageSrc = cleanUrl(value.imageSrc);
        if (!label && !imageSrc) return [];
        return [{
          id: cleanId(value.id, `choice-${index + 1}`),
          label,
          ...(imageSrc ? { imageSrc } : {}),
        }];
      });
    const prompts = (Array.isArray(activityRaw.prompts) ? activityRaw.prompts : [])
      .slice(0, LISTENING_ITEM_MATCH_MAX_PROMPTS)
      .flatMap((value, index) => {
        if (!isRecord(value)) return [];
        const label = cleanText(value.label, 500);
        if (!label) return [];
        const correctChoiceId = cleanId(value.correctChoiceId, choices[0]?.id ?? "");
        if (!choices.some((choice) => choice.id === correctChoiceId)) return [];
        return [{
          id: cleanId(value.id, `prompt-${index + 1}`),
          label,
          correctChoiceId,
        }];
      });
    if (
      choices.length < LISTENING_ITEM_MATCH_MIN_CHOICES ||
      prompts.length < LISTENING_ITEM_MATCH_MIN_PROMPTS ||
      choices.length < prompts.length ||
      new Set(prompts.map((prompt) => prompt.correctChoiceId)).size !==
        prompts.length
    ) {
      return null;
    }
    return {
      ...base,
      kind,
      activity: {
        audioText,
        ...(audioUrl ? { audioUrl } : {}),
        choices,
        prompts,
      },
    };
  }

  if (kind === "sentence_scramble") {
    const items = (Array.isArray(raw.items) ? raw.items : [])
      .slice(0, MAX_ITEMS)
      .flatMap((value, index) => {
        if (!isRecord(value)) return [];
        const sentence = cleanText(value.sentence, 1000);
        if (!sentence) return [];
        const prompt = cleanText(value.prompt, 500);
        const promptMode: "scramble_only" | "additional_prompt" =
          value.promptMode === "scramble_only" ||
          value.promptMode === "additional_prompt"
            ? value.promptMode
            : prompt &&
                !GENERIC_SENTENCE_SCRAMBLE_PROMPTS.has(prompt.toLowerCase())
              ? "additional_prompt"
              : "scramble_only";
        return [{
          id: cleanId(value.id, `sentence-${index + 1}`),
          promptMode,
          ...(promptMode === "additional_prompt" ? { prompt } : {}),
          sentence,
        }];
      });
    return items.length ? { ...base, kind, items } : null;
  }

  if (kind === "lesson_player_pack") {
    const studioFormat = raw.studioFormat;
    if (!isHomeworkStudioFormat(studioFormat) || studioFormat === "learning_track") {
      return null;
    }
    if (!isRecord(raw.pack)) return null;
    const part: import("@/lib/homework-collections/types").HomeworkCollectionLessonPlayerPackPart = {
      ...base,
      kind,
      studioFormat,
      pack: raw.pack as Record<string, unknown>,
      ...(raw.authoringSession
        ? { authoringSession: raw.authoringSession as import("@/lib/activity-builder/games/quiz-builder-session").QuizSession }
        : {}),
    };
    return lessonPlayerPackValidationIssues(part).length === 0 ? part : null;
  }

  if (kind === "document_module") {
    const moduleFormat = raw.moduleFormat;
    if (!isCollectionReadingModuleFormat(moduleFormat)) return null;
    if (!isRecord(raw.document)) return null;
    const part: import("@/lib/homework-collections/types").HomeworkCollectionDocumentModulePart = {
      ...base,
      kind,
      moduleFormat,
      document: raw.document as Record<string, unknown>,
    };
    return documentModuleValidationIssues(part).length === 0 ? part : null;
  }

  if (kind === "speaking_prompt") {
    const prompt = cleanText(raw.prompt, 2000);
    if (!prompt) return null;
    const responseId = cleanId(raw.responseId, "response");
    const maxDurationSeconds = Number.isFinite(raw.maxDurationSeconds)
      ? Math.max(15, Math.min(120, Math.round(Number(raw.maxDurationSeconds))))
      : 60;
    const maxPoints = Number.isFinite(raw.maxPoints)
      ? Math.max(1, Math.min(100, Math.round(Number(raw.maxPoints))))
      : 5;
    const imageUrl = cleanUrl(raw.imageUrl);
    return {
      ...base,
      kind,
      prompt,
      responseId,
      maxDurationSeconds,
      maxPoints,
      ...(imageUrl ? { imageUrl } : {}),
    };
  }

  if (kind === "creative_presentation") {
    const part = {
      ...base,
      kind,
      ...parseCreativePresentationContent(raw),
    };
    return creativePresentationValidationIssues(part).length === 0 ? part : null;
  }

  if (kind !== "free_response") return null;

  const prompts = (Array.isArray(raw.prompts) ? raw.prompts : [])
    .slice(0, MAX_ITEMS)
    .flatMap((value, index) => {
      if (!isRecord(value)) return [];
      const prompt = cleanText(value.prompt, 2000);
      if (!prompt) return [];
      return [{
        id: cleanId(value.id, `response-${index + 1}`),
        prompt,
        minWords: Number.isFinite(value.minWords)
          ? Math.max(0, Math.min(1000, Math.round(Number(value.minWords))))
          : 1,
        maxPoints: Number.isFinite(value.maxPoints)
          ? Math.max(1, Math.min(100, Math.round(Number(value.maxPoints))))
          : 5,
      }];
    });
  return prompts.length ? { ...base, kind: "free_response", prompts } : null;
}

export function parseHomeworkCollectionDocument(
  raw: unknown,
): HomeworkCollectionDocument | null {
  if (!isRecord(raw) || raw.version !== HOMEWORK_COLLECTION_VERSION) return null;
  const parts = (Array.isArray(raw.parts) ? raw.parts : [])
    .slice(0, MAX_PARTS)
    .map(parseHomeworkCollectionPart)
    .filter((part): part is HomeworkCollectionPart => Boolean(part));
  if (!parts.length) return null;
  const ids = new Set<string>();
  for (const part of parts) {
    if (ids.has(part.id)) return null;
    ids.add(part.id);
  }
  return { version: HOMEWORK_COLLECTION_VERSION, parts };
}

export function homeworkCollectionPartItemCount(part: HomeworkCollectionPart): number {
  if (part.kind === "multiple_choice") return part.questions.length;
  if (part.kind === "line_match") return part.pairs.length;
  if (part.kind === "free_response") return part.prompts.length;
  if (part.kind === "creative_presentation") {
    return creativePresentationAnswerIds(part).length;
  }
  if (part.kind === "speaking_prompt") return 1;
  if (part.kind === "listening_item_match") return part.activity.prompts.length;
  if (part.kind === "lesson_player_pack") return lessonPlayerPackItemIds(part).length;
  if (part.kind === "document_module") return documentModuleItemIds(part).length;
  return part.items.length;
}

export function homeworkCollectionPartMaxScore(part: HomeworkCollectionPart): number {
  if (part.kind === "free_response") {
    return part.prompts.reduce((total, prompt) => total + prompt.maxPoints, 0);
  }
  if (part.kind === "speaking_prompt") {
    return part.maxPoints;
  }
  if (part.kind === "creative_presentation") {
    return part.maxPoints;
  }
  return homeworkCollectionPartItemCount(part);
}
