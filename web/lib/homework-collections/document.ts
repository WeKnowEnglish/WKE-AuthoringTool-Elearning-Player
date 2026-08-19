import {
  HOMEWORK_COLLECTION_PART_KINDS,
  HOMEWORK_COLLECTION_VERSION,
  type HomeworkCollectionDocument,
  type HomeworkCollectionPart,
  type HomeworkCollectionPartKind,
} from "@/lib/homework-collections/types";

const MAX_PARTS = 30;
const MAX_ITEMS = 50;

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
          prompt: "Put the words in order.",
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
        return [{
          id: cleanId(value.id, `sentence-${index + 1}`),
          prompt: cleanText(value.prompt, 500, "Put the words in order."),
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
