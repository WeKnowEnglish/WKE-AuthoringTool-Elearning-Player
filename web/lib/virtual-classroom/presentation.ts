export type VirtualClassroomPresentation = {
  kind: "image" | "pdf";
  url: string;
  title: string;
  mediaAssetId?: string | null;
  /** Shared PDF page. Browsers render this page after refresh and late join. */
  page?: number;
};

export function normalizePresentationPage(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(1, Math.min(9_999, Math.trunc(numeric)));
}

export function classroomPdfPageUrl(url: string, page: number): string {
  return `${url.split("#", 1)[0]}#page=${normalizePresentationPage(page)}&view=FitH`;
}

function safePresentationUrl(value: string): string | null {
  const trimmed = value.trim().slice(0, 2_000);
  if (!trimmed) return null;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? trimmed : null;
  } catch {
    return null;
  }
}

export function normalizeVirtualClassroomPresentation(
  value: unknown,
): VirtualClassroomPresentation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const url = safePresentationUrl(typeof row.url === "string" ? row.url : "");
  if (!url) return null;
  const kind = row.kind === "pdf" ? "pdf" : "image";
  return {
    kind,
    url,
    title:
      typeof row.title === "string" && row.title.trim()
        ? row.title.trim().slice(0, 160)
        : row.kind === "pdf"
          ? "Class PDF"
          : "Class image",
    mediaAssetId:
      typeof row.mediaAssetId === "string" && row.mediaAssetId.trim()
        ? row.mediaAssetId.trim().slice(0, 160)
        : null,
    ...(kind === "pdf" ? { page: normalizePresentationPage(row.page) } : {}),
  };
}
