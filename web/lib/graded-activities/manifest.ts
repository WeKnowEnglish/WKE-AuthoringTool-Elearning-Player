import type {
  ActivityTrackDocument,
  ActivityTrackPart,
  ActivityTrackPartKind,
} from "@/lib/activity-tracks/types";
import {
  homeworkCollectionGradingMode,
  homeworkCollectionPartMaxScore,
  type HomeworkCollectionPart,
} from "@/lib/homework-collections";
import { lessonPlayerPackItemIds } from "@/lib/homework-collections/lesson-player-pack";
import { documentModuleItemIds } from "@/lib/homework-collections/document-module";
import {
  GRADED_ACTIVITY_MANIFEST_VERSION,
  type GradedActivityManifestItem,
  type GradedActivityManifestPart,
  type GradedActivityPolicy,
  type GradedTrackManifest,
} from "@/lib/graded-activities/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanId(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function collectionItemIds(part: HomeworkCollectionPart): string[] {
  if (part.kind === "multiple_choice") {
    return part.questions.map((question) => question.id);
  }
  if (part.kind === "line_match") return part.pairs.map((pair) => pair.id);
  if (part.kind === "free_response") {
    return part.prompts.map((prompt) => prompt.id);
  }
  if (part.kind === "speaking_prompt") {
    return [part.responseId];
  }
  if (part.kind === "listening_item_match") {
    return part.activity.prompts.map((prompt) => prompt.id);
  }
  if (part.kind === "lesson_player_pack") {
    return lessonPlayerPackItemIds(part);
  }
  if (part.kind === "document_module") {
    return documentModuleItemIds(part);
  }
  return part.items.map((item) => item.id);
}

function collectionManifestPart(
  part: HomeworkCollectionPart,
  label: string,
): GradedActivityManifestPart {
  const promptScores =
    part.kind === "free_response"
      ? new Map(part.prompts.map((prompt) => [prompt.id, prompt.maxPoints]))
      : part.kind === "speaking_prompt"
        ? new Map([[part.responseId, part.maxPoints]])
        : null;
  const items = collectionItemIds(part).map((itemId) => ({
    itemId,
    required: part.required,
    maxScore: promptScores?.get(itemId) ?? 1,
  }));
  return {
    partId: part.id,
    label,
    format: part.kind === "lesson_player_pack"
      ? part.studioFormat
      : part.kind === "document_module"
        ? part.moduleFormat
        : part.kind,
    contentVersion: part.schemaVersion,
    gradingPolicy: homeworkCollectionGradingMode(part.kind),
    required: part.required,
    maxScore: homeworkCollectionPartMaxScore(part),
    items,
  };
}

function policyForTemplateKind(kind: ActivityTrackPartKind): GradedActivityPolicy {
  if (
    kind === "picture_writing" ||
    kind === "question_writing" ||
    kind === "writing_prompt" ||
    kind === "free_response" ||
    kind === "speaking_prompt"
  ) {
    return "teacher_review";
  }
  if (kind === "flashcards" || kind === "explore_hotspots") return "completion";
  return "automatic";
}

function idsFromRows(value: unknown, prefix: string): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row, index) => {
    if (!isRecord(row)) return [];
    return [cleanId(row.id) ?? `${prefix}-${index + 1}`];
  });
}

function templateItemIds(part: ActivityTrackPart): string[] {
  if (part.source.type !== "template_section") return [];
  const section = part.source.section;

  if (part.kind === "word_annotation" && Array.isArray(section.sentences)) {
    return section.sentences.flatMap((sentence, sentenceIndex) => {
      if (!isRecord(sentence) || !Array.isArray(sentence.tokens)) return [];
      const sentenceId = cleanId(sentence.id) ?? `sentence-${sentenceIndex + 1}`;
      return sentence.tokens.flatMap((token, tokenIndex) => {
        if (!isRecord(token) || !cleanId(token.role)) return [];
        const tokenId = cleanId(token.id) ?? `token-${tokenIndex + 1}`;
        return [`${sentenceId}:${tokenId}`];
      });
    });
  }

  if (part.kind === "sentence_columns" && Array.isArray(section.challenges)) {
    return section.challenges.flatMap((challenge, challengeIndex) => {
      if (!isRecord(challenge) || !Array.isArray(challenge.pieces)) return [];
      const challengeId = cleanId(challenge.id) ?? `challenge-${challengeIndex + 1}`;
      return challenge.pieces.map((piece, pieceIndex) => {
        const pieceId = isRecord(piece) ? cleanId(piece.id) : null;
        return `${challengeId}:${pieceId ?? `piece-${pieceIndex + 1}`}`;
      });
    });
  }

  if (part.kind === "verb_table" && Array.isArray(section.rows)) {
    return section.rows.flatMap((row, rowIndex) => {
      if (!isRecord(row) || !Array.isArray(row.missing)) return [];
      const rowId = cleanId(row.id) ?? `row-${rowIndex + 1}`;
      return row.missing.flatMap((cell) => {
        const cellId = cleanId(cell);
        return cellId ? [`${rowId}:${cellId}`] : [];
      });
    });
  }

  const candidates: Array<[unknown, string]> = [
    [section.items, "item"],
    [section.questions, "question"],
    [section.prompts, "prompt"],
    [section.events, "event"],
    [section.lines, "line"],
    [section.rows, "row"],
    [section.challenges, "challenge"],
  ];
  for (const [rows, prefix] of candidates) {
    const ids = idsFromRows(rows, prefix);
    if (ids.length > 0) return ids;
  }
  return [part.id];
}

function templateManifestPart(part: ActivityTrackPart): GradedActivityManifestPart {
  const itemIds = templateItemIds(part);
  const policy = policyForTemplateKind(part.kind);
  const items: GradedActivityManifestItem[] = itemIds.map((itemId) => ({
    itemId,
    required: true,
    maxScore: 1,
  }));
  return {
    partId: part.id,
    label: part.label,
    format: part.kind,
    contentVersion: 1,
    gradingPolicy: policy,
    required: true,
    maxScore: policy === "ungraded" ? 0 : items.length,
    items,
  };
}

export function buildGradedTrackManifest(
  doc: ActivityTrackDocument,
): GradedTrackManifest {
  if (doc.mode !== "graded") {
    throw new Error("Only Graded tracks have a grading manifest.");
  }
  const parts = doc.parts
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((part) => {
      if (part.source.type === "homework_part") {
        return [collectionManifestPart(part.source.part, part.label)];
      }
      if (part.source.type === "template_section") {
        return [templateManifestPart(part)];
      }
      return [];
    });
  return {
    version: GRADED_ACTIVITY_MANIFEST_VERSION,
    trackId: doc.id,
    parts,
  };
}
