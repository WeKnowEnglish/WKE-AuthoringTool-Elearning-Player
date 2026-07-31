/** Curated WKE Library catalog (public templates → fork into private Activity Bank). */

import type { StudioActivityFormat } from "@/lib/studio-activities/types";

export type WkeLibraryItemStatus =
  | "draft"
  | "pending"
  | "published"
  | "rejected"
  | "retired";

export type WkeLibraryItemSummary = {
  id: string;
  slug: string;
  format: StudioActivityFormat;
  title: string;
  description: string;
  cefr: string | null;
  tags: string[];
  status: WkeLibraryItemStatus;
  coverImageUrl: string | null;
  sortOrder: number;
  updatedAt: string;
  creditName: string | null;
  submitterNote: string | null;
  reviewNote: string | null;
  submittedFromStudioActivityId: string | null;
  reviewedAt: string | null;
  createdBy: string | null;
};

export type WkeLibraryItemDetail = WkeLibraryItemSummary & {
  pack: unknown;
  authoring: unknown | null;
  source: Record<string, unknown>;
};

export type WkeLibrarySeedDefinition = {
  slug: string;
  format: StudioActivityFormat;
  title: string;
  description: string;
  cefr?: string;
  tags: string[];
  sortOrder: number;
  /** Build pack + authoring at seed time. */
  build: () => Promise<{ pack: unknown; authoring: unknown }>;
};
