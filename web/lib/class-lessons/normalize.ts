import {
  defaultPromptForTemplate,
  defaultScaffoldsForTemplate,
} from "@/lib/document-activity/domain";
import type {
  DocumentParticipationMode,
  DocumentTemplateType,
} from "@/lib/document-activity/types";
import { normalizeWhiteboardLaunchPayload } from "@/lib/whiteboard/launch-options";
import { parseWordList } from "@/lib/word-cards/domain";
import type {
  ClassLessonStep,
  ClassLessonStepInput,
  ClassLessonStepKind,
  ClassLessonStatus,
  DocumentLessonStepConfig,
  LiveGameLessonStepConfig,
  WhiteboardLessonStepConfig,
  WordCardsLessonStepConfig,
} from "@/lib/class-lessons/types";
import { CLASS_LESSON_STEP_KINDS, CLASS_LESSON_STATUSES } from "@/lib/class-lessons/types";

const TITLE_MAX = 120;
const NOTES_MAX = 2000;
const STEPS_MAX = 20;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeClassLessonTitle(raw: unknown, fallback = "Untitled lesson"): string {
  if (typeof raw !== "string") return fallback;
  const title = raw.trim().slice(0, TITLE_MAX);
  return title.length > 0 ? title : fallback;
}

export function normalizeClassLessonNotes(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, NOTES_MAX);
}

export function normalizeClassLessonStatus(raw: unknown): ClassLessonStatus {
  if (typeof raw === "string" && (CLASS_LESSON_STATUSES as readonly string[]).includes(raw)) {
    return raw as ClassLessonStatus;
  }
  return "draft";
}

export function isClassLessonStepKind(value: unknown): value is ClassLessonStepKind {
  return typeof value === "string" && (CLASS_LESSON_STEP_KINDS as readonly string[]).includes(value);
}

function normalizeDocumentTemplate(raw: unknown): DocumentTemplateType {
  if (
    raw === "paragraph" ||
    raw === "story_continuation" ||
    raw === "reading_response" ||
    raw === "dialogue"
  ) {
    return raw;
  }
  return "paragraph";
}

function normalizeDocumentMode(raw: unknown): DocumentParticipationMode {
  if (raw === "group" || raw === "whole_class" || raw === "individual") return raw;
  return "individual";
}

export function defaultWhiteboardStepConfig(): WhiteboardLessonStepConfig {
  return normalizeWhiteboardLaunchPayload({});
}

export function defaultDocumentStepConfig(
  templateType: DocumentTemplateType = "paragraph",
): DocumentLessonStepConfig {
  const prompt = defaultPromptForTemplate(templateType);
  const scaffolds = defaultScaffoldsForTemplate(templateType);
  return {
    templateType,
    participationMode: "individual",
    title: prompt.title,
    instructions: prompt.instructions,
    successCriteria: prompt.successCriteria,
    stimulus: prompt.stimulus ?? "",
    wordBank: scaffolds.wordBank,
    sentenceStarters: scaffolds.sentenceStarters,
    groupSubmitPolicy: "any_member",
    timerMinutes: 5,
  };
}

export function defaultWordCardsStepConfig(): WordCardsLessonStepConfig {
  return {
    title: "Create a word card",
    instructions: "Create a card for your assigned vocabulary word.",
    successCriteria: "Clear definition and a natural example sentence.",
    wordList: ["apple", "banana", "chair", "desk", "window", "school", "friend", "happy"],
    participationMode: "individual",
    timerMinutes: 4,
  };
}

export function defaultLiveGameStepConfig(): LiveGameLessonStepConfig {
  return {
    questionSetId: "",
    questionSetTitle: "",
  };
}

export function defaultConfigForKind(kind: ClassLessonStepKind) {
  switch (kind) {
    case "whiteboard":
      return defaultWhiteboardStepConfig();
    case "document":
      return defaultDocumentStepConfig();
    case "word_cards":
      return defaultWordCardsStepConfig();
    case "live_game":
      return defaultLiveGameStepConfig();
  }
}

export function normalizeWhiteboardStepConfig(raw: unknown): WhiteboardLessonStepConfig {
  return normalizeWhiteboardLaunchPayload(asRecord(raw));
}

export function normalizeDocumentStepConfig(raw: unknown): DocumentLessonStepConfig {
  const input = asRecord(raw);
  const templateType = normalizeDocumentTemplate(input.templateType);
  const defaults = defaultDocumentStepConfig(templateType);
  const timerRaw =
    typeof input.timerMinutes === "number" && Number.isFinite(input.timerMinutes)
      ? Math.round(input.timerMinutes)
      : defaults.timerMinutes;

  return {
    templateType,
    participationMode: normalizeDocumentMode(input.participationMode),
    title: asString(input.title).trim() || defaults.title,
    instructions: asString(input.instructions).trim() || defaults.instructions,
    successCriteria: asString(input.successCriteria).trim() || defaults.successCriteria,
    stimulus: asString(input.stimulus).trim(),
    wordBank: asStringArray(input.wordBank).length
      ? asStringArray(input.wordBank)
      : defaults.wordBank,
    sentenceStarters: asStringArray(input.sentenceStarters).length
      ? asStringArray(input.sentenceStarters)
      : defaults.sentenceStarters,
    groupSubmitPolicy: "any_member",
    timerMinutes: Math.min(30, Math.max(1, timerRaw)),
  };
}

export function normalizeWordCardsStepConfig(raw: unknown): WordCardsLessonStepConfig {
  const input = asRecord(raw);
  const defaults = defaultWordCardsStepConfig();
  const wordListFromArray = asStringArray(input.wordList);
  const wordList =
    wordListFromArray.length > 0
      ? wordListFromArray
      : parseWordList(asString(input.wordListText));
  const timerRaw =
    typeof input.timerMinutes === "number" && Number.isFinite(input.timerMinutes)
      ? Math.round(input.timerMinutes)
      : defaults.timerMinutes;

  return {
    title: asString(input.title).trim() || defaults.title,
    instructions: asString(input.instructions).trim() || defaults.instructions,
    successCriteria: asString(input.successCriteria).trim() || defaults.successCriteria,
    wordList: wordList.length > 0 ? wordList : defaults.wordList,
    participationMode: input.participationMode === "group" ? "group" : "individual",
    timerMinutes: Math.min(30, Math.max(1, timerRaw)),
  };
}

export function normalizeLiveGameStepConfig(raw: unknown): LiveGameLessonStepConfig {
  const input = asRecord(raw);
  return {
    questionSetId: asString(input.questionSetId).trim(),
    questionSetTitle: asString(input.questionSetTitle).trim(),
    questionSetSlug: asString(input.questionSetSlug).trim() || undefined,
    level: asString(input.level).trim() || undefined,
  };
}

export function normalizeStepConfig(kind: ClassLessonStepKind, raw: unknown) {
  switch (kind) {
    case "whiteboard":
      return normalizeWhiteboardStepConfig(raw);
    case "document":
      return normalizeDocumentStepConfig(raw);
    case "word_cards":
      return normalizeWordCardsStepConfig(raw);
    case "live_game":
      return normalizeLiveGameStepConfig(raw);
  }
}

export function stepTitleFromConfig(kind: ClassLessonStepKind, config: unknown): string {
  const normalized = normalizeStepConfig(kind, config);
  if (kind === "live_game") {
    const live = normalized as LiveGameLessonStepConfig;
    return live.questionSetTitle.trim() || "Live Game";
  }
  const titled = normalized as { title?: string };
  return normalizeClassLessonTitle(titled.title, kind === "whiteboard" ? "Whiteboard" : kind === "document" ? "Document" : "Word cards");
}

export function normalizeClassLessonStepInputs(rawSteps: unknown): ClassLessonStepInput[] {
  if (!Array.isArray(rawSteps)) return [];
  const out: ClassLessonStepInput[] = [];
  for (const item of rawSteps.slice(0, STEPS_MAX)) {
    const row = asRecord(item);
    if (!isClassLessonStepKind(row.kind)) continue;
    const config = normalizeStepConfig(row.kind, row.config);
    const title = normalizeClassLessonTitle(
      row.title,
      stepTitleFromConfig(row.kind, config),
    );
    if (row.kind === "live_game") {
      const live = config as LiveGameLessonStepConfig;
      if (!live.questionSetId) continue;
    }
    out.push({
      id: typeof row.id === "string" && row.id.trim() ? row.id.trim() : undefined,
      kind: row.kind,
      title,
      config,
    });
  }
  return out;
}

export function mapDbStepRow(row: {
  id: string;
  position: number;
  kind: string;
  title: string;
  config: unknown;
}): ClassLessonStep | null {
  if (!isClassLessonStepKind(row.kind)) return null;
  const config = normalizeStepConfig(row.kind, row.config);
  return {
    id: row.id,
    position: row.position,
    kind: row.kind,
    title: normalizeClassLessonTitle(row.title, stepTitleFromConfig(row.kind, config)),
    config,
  };
}
