import type { ClassPostKind } from "@/lib/class-posts/types";

const MAX_BODY = 4000;
const MAX_IMAGE_URL = 2048;

export function normalizeClassPostKind(value: unknown): ClassPostKind | null {
  if (value === "announcement" || value === "photo") return value;
  return null;
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
