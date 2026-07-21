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
  if (type === "word_pack_practice") {
    return { type: "word_pack_practice", packId: "", packTitle: "", wordCount: 0 };
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
  if (payload.type === "word_pack_practice") {
    return `${payload.packTitle} · ${payload.wordCount} word${
      payload.wordCount === 1 ? "" : "s"
    }`;
  }
  return payload.body.length > 80 ? `${payload.body.slice(0, 77)}…` : payload.body;
}
