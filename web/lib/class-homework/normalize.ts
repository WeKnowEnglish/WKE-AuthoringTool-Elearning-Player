import type {
  ClassHomeworkPayload,
  ClassHomeworkPayloadType,
  ClassHomeworkStatus,
} from "@/lib/class-homework/types";
import {
  CLASS_HOMEWORK_PAYLOAD_TYPES,
  CLASS_HOMEWORK_STATUSES,
} from "@/lib/class-homework/types";
import { parseStoredPackQuizQuestions } from "@/lib/class-homework/freeze-pack-quiz";
import { parseStoredPackFlashcardCards } from "@/lib/class-homework/freeze-pack-flashcards";
import {
  homeworkStudioFormatLabel,
  isHomeworkStudioFormat,
} from "@/lib/class-homework/types";
import {
  isPackFlashcardFace,
  sortPackFlashcardFaces,
  type PackFlashcardFace,
} from "@/lib/vocabulary/pack-flashcards";

const TITLE_MAX = 120;
const INSTRUCTIONS_MAX = 2000;
const NOTE_MAX = 2000;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asFaceList(value: unknown): PackFlashcardFace[] {
  if (!Array.isArray(value)) return [];
  const out: PackFlashcardFace[] = [];
  for (const item of value) {
    if (isPackFlashcardFace(item) && !out.includes(item)) out.push(item);
  }
  return sortPackFlashcardFaces(out);
}

export function normalizeHomeworkTitle(raw: unknown, fallback = "Homework"): string {
  if (typeof raw !== "string") return fallback;
  const title = raw.trim().slice(0, TITLE_MAX);
  return title.length > 0 ? title : fallback;
}

export function normalizeHomeworkInstructions(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, INSTRUCTIONS_MAX);
}

export function normalizeHomeworkStatus(raw: unknown): ClassHomeworkStatus {
  if (typeof raw === "string" && (CLASS_HOMEWORK_STATUSES as readonly string[]).includes(raw)) {
    return raw as ClassHomeworkStatus;
  }
  return "draft";
}

export function normalizeDueAt(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString();
}

export function isHomeworkPayloadType(value: unknown): value is ClassHomeworkPayloadType {
  return (
    typeof value === "string" &&
    (CLASS_HOMEWORK_PAYLOAD_TYPES as readonly string[]).includes(value)
  );
}

export function defaultHomeworkPayload(
  type: ClassHomeworkPayloadType = "external_note",
): ClassHomeworkPayload {
  if (type === "pack_quiz") {
    return { type: "pack_quiz", quizId: "", quizTitle: "", questionCount: 0 };
  }
  if (type === "pack_flashcards") {
    return { type: "pack_flashcards", setId: "", setTitle: "", cardCount: 0 };
  }
  if (type === "word_pack_practice") {
    return { type: "word_pack_practice", packId: "", packTitle: "", wordCount: 0 };
  }
  if (type === "studio_activity") {
    return {
      type: "studio_activity",
      activityId: "",
      format: "multiple_choice",
      title: "",
      screenCount: 0,
      pack: {},
      frozenAt: "",
    };
  }
  if (type === "homework_template") {
    return {
      type: "homework_template",
      templateId: "homework-template-one",
      title: "Homework Template One",
      sectionCount: 6,
      frozenAt: "",
    };
  }
  return { type: "external_note", body: "" };
}

export function normalizeHomeworkPayload(raw: unknown): ClassHomeworkPayload | null {
  const input = asRecord(raw);
  if (!isHomeworkPayloadType(input.type)) return null;

  if (input.type === "pack_quiz") {
    const quizId = asString(input.quizId).trim();
    if (!quizId) return null;
    const questions = parseStoredPackQuizQuestions(input.questions);
    const questionCountFromField =
      typeof input.questionCount === "number" && Number.isFinite(input.questionCount)
        ? Math.max(0, Math.round(input.questionCount))
        : 0;
    const questionCount = questions.length > 0 ? questions.length : questionCountFromField;
    const frozenAt =
      typeof input.frozenAt === "string" && input.frozenAt.trim()
        ? input.frozenAt.trim()
        : undefined;
    return {
      type: "pack_quiz",
      quizId,
      quizTitle: asString(input.quizTitle).trim() || "Pack quiz",
      questionCount,
      ...(questions.length > 0 ? { questions } : {}),
      ...(frozenAt ? { frozenAt } : {}),
    };
  }

  if (input.type === "pack_flashcards") {
    const setId = asString(input.setId).trim();
    if (!setId) return null;
    const cards = parseStoredPackFlashcardCards(input.cards);
    const cardCountFromField =
      typeof input.cardCount === "number" && Number.isFinite(input.cardCount)
        ? Math.max(0, Math.round(input.cardCount))
        : 0;
    const cardCount = cards.length > 0 ? cards.length : cardCountFromField;
    const frozenAt =
      typeof input.frozenAt === "string" && input.frozenAt.trim()
        ? input.frozenAt.trim()
        : undefined;
    const optionsRaw =
      input.options && typeof input.options === "object" && !Array.isArray(input.options)
        ? (input.options as Record<string, unknown>)
        : null;
    const options = optionsRaw
      ? {
          includeFaces: asFaceList(optionsRaw.includeFaces),
          frontFaces: asFaceList(optionsRaw.frontFaces),
          backFaces: asFaceList(optionsRaw.backFaces),
          shuffle: Boolean(optionsRaw.shuffle),
        }
      : undefined;
    return {
      type: "pack_flashcards",
      setId,
      setTitle: asString(input.setTitle).trim() || "Flashcards",
      cardCount,
      ...(cards.length > 0 ? { cards } : {}),
      ...(options && options.includeFaces.length > 0 ? { options } : {}),
      ...(frozenAt ? { frozenAt } : {}),
    };
  }

  if (input.type === "word_pack_practice") {
    const packId = asString(input.packId).trim();
    if (!packId) return null;
    const wordCount =
      typeof input.wordCount === "number" && Number.isFinite(input.wordCount)
        ? Math.max(0, Math.round(input.wordCount))
        : 0;
    return {
      type: "word_pack_practice",
      packId,
      packTitle: asString(input.packTitle).trim() || "Word pack",
      wordCount,
    };
  }

  if (input.type === "studio_activity") {
    const activityId = asString(input.activityId).trim();
    if (!activityId) return null;
    if (!isHomeworkStudioFormat(input.format)) return null;
    const packRaw = input.pack;
    if (!packRaw || typeof packRaw !== "object" || Array.isArray(packRaw)) {
      return null;
    }
    const screenCount =
      typeof input.screenCount === "number" && Number.isFinite(input.screenCount)
        ? Math.max(0, Math.round(input.screenCount))
        : 0;
    if (screenCount < 1) return null;
    const frozenAt =
      typeof input.frozenAt === "string" && input.frozenAt.trim()
        ? input.frozenAt.trim()
        : new Date(0).toISOString();
    return {
      type: "studio_activity",
      activityId,
      format: input.format,
      title: asString(input.title).trim() || homeworkStudioFormatLabel(input.format),
      screenCount,
      pack: packRaw as Record<string, unknown>,
      frozenAt,
    };
  }

  if (input.type === "homework_template") {
    if (input.templateId !== "homework-template-one") return null;
    return {
      type: "homework_template",
      templateId: "homework-template-one",
      title: asString(input.title).trim() || "Homework Template One",
      sectionCount: 6,
      frozenAt:
        typeof input.frozenAt === "string" && input.frozenAt.trim()
          ? input.frozenAt.trim()
          : new Date(0).toISOString(),
    };
  }

  const body = asString(input.body).trim().slice(0, NOTE_MAX);
  if (!body) return null;
  return { type: "external_note", body };
}

export function homeworkPayloadSummary(payload: ClassHomeworkPayload): string {
  if (payload.type === "pack_quiz") {
    return `${payload.quizTitle} · ${payload.questionCount} question${
      payload.questionCount === 1 ? "" : "s"
    }`;
  }
  if (payload.type === "pack_flashcards") {
    return `${payload.setTitle} · ${payload.cardCount} card${
      payload.cardCount === 1 ? "" : "s"
    }`;
  }
  if (payload.type === "word_pack_practice") {
    return `${payload.packTitle} · ${payload.wordCount} word${
      payload.wordCount === 1 ? "" : "s"
    }`;
  }
  if (payload.type === "studio_activity") {
    return `${payload.title} · ${homeworkStudioFormatLabel(payload.format)} · ${
      payload.screenCount
    } screen${payload.screenCount === 1 ? "" : "s"}`;
  }
  if (payload.type === "homework_template") {
    return `${payload.title} · ${payload.sectionCount} parts`;
  }
  return payload.body.length > 80 ? `${payload.body.slice(0, 77)}…` : payload.body;
}
