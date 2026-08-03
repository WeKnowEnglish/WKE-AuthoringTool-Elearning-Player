import type {
  ClassPostGuardianVisibility,
  ClassPostKind,
} from "@/lib/class-posts/types";

const MAX_BODY = 4000;
const MAX_IMAGE_URL = 2048;
const MAX_LINK_URL = 2048;
const MAX_LINK_TITLE = 200;
const MAX_ACTIVITY_TITLE = 200;
const MAX_ACTIVITY_PLAY_PATH = 512;

const KINDS: ClassPostKind[] = [
  "announcement",
  "photo",
  "link",
  "homework_reminder",
  "activity",
];

export function normalizeClassPostKind(value: unknown): ClassPostKind | null {
  if (typeof value !== "string") return null;
  return (KINDS as string[]).includes(value) ? (value as ClassPostKind) : null;
}

export function normalizeClassPostBody(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_BODY);
}

export function normalizeClassPostImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_IMAGE_URL) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

export function normalizeClassPostLinkUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_LINK_URL) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeClassPostLinkTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, MAX_LINK_TITLE);
  return trimmed || null;
}

export function normalizeClassPostHomeworkId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 80) return null;
  return trimmed;
}

export function normalizeClassPostActivitySpaceItemId(
  value: unknown,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 80) return null;
  return trimmed;
}

export function normalizeClassPostActivityTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, MAX_ACTIVITY_TITLE);
  return trimmed || null;
}

/** Allow relative app paths (/wke/...) or absolute https URLs. */
export function normalizeClassPostActivityPlayPath(
  value: unknown,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, MAX_ACTIVITY_PLAY_PATH);
  if (!trimmed) return null;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeClassPostPinnedAt(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString();
}

export function normalizeClassPostGuardianVisibility(
  value: unknown,
): ClassPostGuardianVisibility {
  if (value === "class_guardians" || value === "tagged_student_guardians") {
    return value;
  }
  return "none";
}
