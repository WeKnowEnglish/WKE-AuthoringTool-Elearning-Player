import "server-only";

import type { StudioActivityFormat } from "@/lib/studio-activities/types";
import type {
  WkeLibraryItemDetail,
  WkeLibraryItemStatus,
  WkeLibraryItemSummary,
} from "@/lib/wke-library/types";

type LibraryRow = {
  id: string;
  slug: string;
  format: string;
  title: string;
  description: string | null;
  cefr: string | null;
  tags: string[] | null;
  status: string;
  cover_image_url: string | null;
  sort_order: number;
  updated_at: string;
  credit_name?: string | null;
  submitter_note?: string | null;
  review_note?: string | null;
  submitted_from_studio_activity_id?: string | null;
  reviewed_at?: string | null;
  created_by?: string | null;
  pack?: unknown;
  authoring?: unknown;
  source?: Record<string, unknown> | null;
};

export function mapWkeLibrarySummary(row: LibraryRow): WkeLibraryItemSummary {
  return {
    id: row.id,
    slug: row.slug,
    format: row.format as StudioActivityFormat,
    title: row.title,
    description: row.description ?? "",
    cefr: row.cefr,
    tags: row.tags ?? [],
    status: row.status as WkeLibraryItemStatus,
    coverImageUrl: row.cover_image_url,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
    creditName: row.credit_name ?? null,
    submitterNote: row.submitter_note ?? null,
    reviewNote: row.review_note ?? null,
    submittedFromStudioActivityId: row.submitted_from_studio_activity_id ?? null,
    reviewedAt: row.reviewed_at ?? null,
    createdBy: row.created_by ?? null,
  };
}

export function mapWkeLibraryDetail(row: LibraryRow): WkeLibraryItemDetail {
  return {
    ...mapWkeLibrarySummary(row),
    pack: row.pack ?? {},
    authoring: row.authoring ?? null,
    source:
      row.source && typeof row.source === "object" && !Array.isArray(row.source)
        ? row.source
        : {},
  };
}

export const WKE_LIBRARY_SUMMARY_COLUMNS =
  "id,slug,format,title,description,cefr,tags,status,cover_image_url,sort_order,updated_at,credit_name,submitter_note,review_note,submitted_from_studio_activity_id,reviewed_at,created_by";

export const WKE_LIBRARY_DETAIL_COLUMNS = `${WKE_LIBRARY_SUMMARY_COLUMNS},pack,authoring,source`;

export function slugifyLibraryTitle(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "contribution";
}
