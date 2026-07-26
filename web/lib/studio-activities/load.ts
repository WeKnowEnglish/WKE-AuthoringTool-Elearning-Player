import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";
import {
  bankPathForStudioActivity,
  playPathForStudioActivity,
} from "@/lib/studio-activities/paths";

export type StudioActivitySummary = {
  id: string;
  title: string;
  format: StudioActivityFormat;
  created_at: string;
  updated_at: string;
  playPath: string;
  bankPath: string;
  source: Record<string, unknown>;
};

export type StudioActivityDetail = StudioActivitySummary & {
  pack: unknown;
  authoring: Record<string, unknown> | null;
};

function mapSummary(row: {
  id: string;
  title: string;
  format: string;
  created_at: string;
  updated_at: string;
  source?: unknown;
}): StudioActivitySummary {
  const format = row.format as StudioActivityFormat;
  return {
    id: row.id,
    title: row.title,
    format,
    created_at: row.created_at,
    updated_at: row.updated_at,
    playPath: playPathForStudioActivity(format, row.id),
    bankPath: bankPathForStudioActivity(row.id),
    source:
      row.source && typeof row.source === "object" && !Array.isArray(row.source)
        ? (row.source as Record<string, unknown>)
        : {},
  };
}

export async function listStudioActivitiesForTeacher(
  supabase: SupabaseClient,
  teacherId: string,
  options?: { format?: StudioActivityFormat; limit?: number },
): Promise<StudioActivitySummary[]> {
  let query = supabase
    .from("studio_activities")
    .select("id, title, format, created_at, updated_at, source")
    .eq("teacher_id", teacherId)
    .order("updated_at", { ascending: false });

  if (options?.format) {
    query = query.eq("format", options.format);
  }
  if (options?.limit && options.limit > 0) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) {
    const hint =
      /studio_activities|schema cache|does not exist/i.test(error.message)
        ? " Apply migration web/supabase/migrations/070_studio_activities.sql."
        : "";
    throw new Error(`${error.message}${hint}`);
  }
  return (data ?? []).map((row) => mapSummary(row as Parameters<typeof mapSummary>[0]));
}

export async function getStudioActivityForTeacher(
  supabase: SupabaseClient,
  teacherId: string,
  id: string,
): Promise<StudioActivityDetail | null> {
  const { data, error } = await supabase
    .from("studio_activities")
    .select("id, title, format, pack, authoring, source, created_at, updated_at")
    .eq("teacher_id", teacherId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    const hint =
      /studio_activities|schema cache|does not exist/i.test(error.message)
        ? " Apply migration web/supabase/migrations/070_studio_activities.sql."
        : "";
    throw new Error(`${error.message}${hint}`);
  }
  if (!data) return null;

  const summary = mapSummary(data as Parameters<typeof mapSummary>[0]);
  return {
    ...summary,
    pack: data.pack,
    authoring:
      data.authoring && typeof data.authoring === "object" && !Array.isArray(data.authoring)
        ? (data.authoring as Record<string, unknown>)
        : null,
  };
}
