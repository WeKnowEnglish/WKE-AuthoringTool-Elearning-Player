/** Shared helpers for Studio games authoring validate/export. */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function assertString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

export type AuthoringEducationalIntent = {
  objective: string;
  successCriteria: string;
  cefr?: string;
  vocabulary?: string[];
};

export type AuthoringContent = {
  instruction?: string;
  completionMessage?: string;
};

export function parseEducationalIntent(value: unknown): AuthoringEducationalIntent {
  if (!isRecord(value)) throw new Error("educationalIntent is required.");
  const objective = assertString(value.objective, "Objective");
  const successCriteria = assertString(value.successCriteria, "Success criteria");
  const educationalIntent: AuthoringEducationalIntent = {
    objective,
    successCriteria,
  };
  if (typeof value.cefr === "string" && value.cefr.trim()) {
    educationalIntent.cefr = value.cefr.trim();
  }
  if (Array.isArray(value.vocabulary)) {
    educationalIntent.vocabulary = value.vocabulary
      .filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim()))
      .map((entry) => entry.trim());
  }
  return educationalIntent;
}

export function parseContent(value: unknown): AuthoringContent {
  if (!isRecord(value)) throw new Error("content is required.");
  const content: AuthoringContent = {};
  if (typeof value.instruction === "string" && value.instruction.trim()) {
    content.instruction = value.instruction.trim();
  }
  if (typeof value.completionMessage === "string" && value.completionMessage.trim()) {
    content.completionMessage = value.completionMessage.trim();
  }
  return content;
}

export function assertActivityShell(value: unknown): {
  id: string;
  name: string;
  educationalIntent: AuthoringEducationalIntent;
  content: AuthoringContent;
  interaction: Record<string, unknown>;
} {
  if (!isRecord(value)) throw new Error("Activity document must be an object.");
  if (value.version !== 1) throw new Error("Quiz authoring documents must be version 1.");
  if (value.kind !== "activity-authoring") {
    throw new Error('Document kind must be "activity-authoring".');
  }
  const id = assertString(value.id, "Activity id");
  const name = assertString(value.name, "Activity name");
  const educationalIntent = parseEducationalIntent(value.educationalIntent);
  const content = parseContent(value.content);
  if (!isRecord(value.interaction)) throw new Error("interaction is required.");
  if (value.interaction.type !== "games") {
    throw new Error('interaction.type must be "games".');
  }
  return { id, name, educationalIntent, content, interaction: value.interaction };
}

export function placeholderImageUrl(word: string): string {
  return `https://placehold.co/400x400/e2e8f0/334155?text=${encodeURIComponent(word)}`;
}

export function slugifyQuizId(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "vocab-quiz"
  );
}
