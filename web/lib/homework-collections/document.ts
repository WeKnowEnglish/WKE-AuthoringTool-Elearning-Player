import {
  HOMEWORK_COLLECTION_PART_KINDS,
  HOMEWORK_COLLECTION_VERSION,
  type HomeworkCollectionDocument,
  type HomeworkCollectionPart,
  type HomeworkCollectionPartKind,
} from "@/lib/homework-collections/types";

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
  if (kind === "sentence_scramble") return "Sentence scramble";
  return "Free response";
}

export function homeworkCollectionGradingMode(
  kind: HomeworkCollectionPartKind,
): "automatic" | "teacher_review" {
  return kind === "free_response" ? "teacher_review" : "automatic";
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
  return part.items.length;
}

export function homeworkCollectionPartMaxScore(part: HomeworkCollectionPart): number {
  if (part.kind === "free_response") {
    return part.prompts.reduce((total, prompt) => total + prompt.maxPoints, 0);
  }
  return homeworkCollectionPartItemCount(part);
}
