import type {
  ActivityTrackDocument,
  ActivityTrackPart,
} from "@/lib/activity-tracks/types";
import { buildGradedTrackManifest } from "@/lib/graded-activities";

export type TrackMediaKind = "image" | "audio" | "video" | "document";

export type TrackMediaUsage = {
  id: string;
  url: string;
  kind: TrackMediaKind;
  label: string;
  partId: string | null;
  activityLabel: string;
};

export type TrackMediaIssue = {
  id: string;
  message: string;
  partId: string;
};

export type TrackScoringPart = {
  partId: string;
  label: string;
  policy: "automatic" | "completion" | "teacher_review" | "ungraded";
  itemCount: number;
  maxScore: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function firstArrayLength(
  value: Record<string, unknown>,
  keys: readonly string[],
): number | null {
  for (const key of keys) {
    const candidate = value[key];
    if (Array.isArray(candidate)) return candidate.length;
  }
  return null;
}

export function activityItemCount(part: ActivityTrackPart): number {
  if (part.source.type === "empty") return 0;
  if (part.source.type === "homework_part") {
    const record = part.source.part as unknown as Record<string, unknown>;
    if (part.source.part.kind === "speaking_prompt") return 1;
    if (part.source.part.kind === "listening_item_match") {
      return part.source.part.activity.prompts.length;
    }
    const direct = firstArrayLength(record, ["questions", "items", "pairs", "prompts"]);
    if (direct != null) return direct;
    if (part.source.part.kind === "lesson_player_pack") {
      const session = part.source.part.authoringSession;
      if (session && isRecord(session)) {
        return firstArrayLength(session, ["questions", "items", "cards"]) ?? 1;
      }
    }
    return 1;
  }
  return (
    firstArrayLength(part.source.section, [
      "questions",
      "items",
      "pairs",
      "prompts",
      "events",
      "lines",
      "rows",
      "challenges",
      "sentences",
    ]) ?? 1
  );
}

export function activityItemNoun(part: ActivityTrackPart): string {
  if (part.kind === "multiple_choice" || part.kind === "secondary_questions") {
    return "question";
  }
  if (part.kind === "line_match" || part.kind === "definition_match") return "pair";
  if (
    part.kind === "free_response" ||
    part.kind === "writing_prompt" ||
    part.kind === "speaking_prompt" ||
    part.kind === "picture_writing" ||
    part.kind === "question_writing"
  ) {
    return "prompt";
  }
  return "item";
}

export function activityCountLabel(part: ActivityTrackPart): string {
  const count = activityItemCount(part);
  const noun = activityItemNoun(part);
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function mediaKind(key: string, url: string): TrackMediaKind | null {
  const lowerKey = key.toLowerCase();
  const lowerUrl = url.toLowerCase().split("?")[0] ?? "";
  if (lowerKey.includes("audio") || /\.(mp3|wav|ogg|m4a|aac|webm)$/.test(lowerUrl)) {
    return "audio";
  }
  if (lowerKey.includes("video") || /\.(mp4|mov|m4v)$/.test(lowerUrl)) {
    return "video";
  }
  if (lowerKey.includes("document") || /\.pdf$/.test(lowerUrl)) return "document";
  if (
    lowerKey.includes("image") ||
    lowerKey.includes("picture") ||
    lowerKey.includes("cover") ||
    lowerKey.includes("thumbnail") ||
    lowerKey === "src" ||
    /\.(png|jpe?g|gif|webp|svg|avif)$/.test(lowerUrl)
  ) {
    return "image";
  }
  return null;
}

function looksLikeMediaUrl(value: string): boolean {
  return /^(https?:|blob:|data:|\/)/i.test(value.trim());
}

function collectFromValue(input: {
  value: unknown;
  path: string[];
  partId: string | null;
  activityLabel: string;
  output: TrackMediaUsage[];
}) {
  const { value, path, partId, activityLabel, output } = input;
  if (typeof value === "string") {
    const key = path[path.length - 1] ?? "media";
    const kind = looksLikeMediaUrl(value) ? mediaKind(key, value) : null;
    if (!kind) return;
    output.push({
      id: `${partId ?? "track"}:${path.join(".")}:${value}`,
      url: value.trim(),
      kind,
      label: path
        .map((entry) => entry.replace(/([a-z])([A-Z])/g, "$1 $2"))
        .join(" · "),
      partId,
      activityLabel,
    });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      collectFromValue({
        value: entry,
        path: [...path, String(index + 1)],
        partId,
        activityLabel,
        output,
      }),
    );
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    collectFromValue({
      value: entry,
      path: [...path, key],
      partId,
      activityLabel,
      output,
    });
  }
}

export function collectTrackMediaUsages(
  document: ActivityTrackDocument,
): TrackMediaUsage[] {
  const output: TrackMediaUsage[] = [];
  if (document.coverImageUrl?.trim()) {
    output.push({
      id: `track:cover:${document.coverImageUrl}`,
      url: document.coverImageUrl.trim(),
      kind: "image",
      label: "Learning Track cover",
      partId: null,
      activityLabel: document.title,
    });
  }
  for (const part of document.parts) {
    collectFromValue({
      value:
        part.source.type === "homework_part"
          ? part.source.part
          : part.source.type === "template_section"
            ? part.source.section
            : null,
      path: [],
      partId: part.id,
      activityLabel: part.label,
      output,
    });
  }
  return [...new Map(output.map((usage) => [usage.id, usage])).values()];
}

export function trackMediaIssues(document: ActivityTrackDocument): TrackMediaIssue[] {
  const issues: TrackMediaIssue[] = [];
  for (const part of document.parts) {
    if (part.source.type !== "homework_part") continue;
    const homeworkPart = part.source.part;
    if (homeworkPart.kind === "listen_and_choose") {
      homeworkPart.items.forEach((item, index) => {
        if (item.audioUrl?.trim() || item.speakText?.trim()) return;
        issues.push({
          id: `${part.id}:listen:${item.id}`,
          partId: part.id,
          message: `${part.label}, item ${index + 1}, needs audio or text to read aloud.`,
        });
      });
    }
    if (
      homeworkPart.kind === "listening_item_match" &&
      !homeworkPart.activity.audioUrl?.trim() &&
      !homeworkPart.activity.audioText.trim()
    ) {
      issues.push({
        id: `${part.id}:listening-track`,
        partId: part.id,
        message: `${part.label} needs audio or a conversation transcript.`,
      });
    }
  }
  return issues;
}

export function trackScoringParts(document: ActivityTrackDocument): TrackScoringPart[] {
  if (document.mode !== "graded") return [];
  return buildGradedTrackManifest(document).parts.map((part) => ({
    partId: part.partId,
    label: part.label,
    policy: part.gradingPolicy,
    itemCount: part.items.length,
    maxScore: part.maxScore,
  }));
}
