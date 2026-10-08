import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isTeacher } from "@/lib/auth/roles";
import { ZodError } from "zod";
import { getPublishedGrammarModules } from "@/lib/grammar-builder/load-catalog";
import {
  courseDocumentSchema,
  resourceHref,
  type CourseDocument,
  type CourseMap,
  type ResourceOption,
} from "./model";

export async function courseMapContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isTeacher(user))
    throw new Error("Teacher authentication required.");
  return { supabase, teacherId: user.id };
}
export function courseMapError(error: unknown): string {
  if (error instanceof ZodError)
    return `Check the course map: ${error.issues[0]?.message ?? "invalid field"}.`;
  const value = error as { message?: string; code?: string };
  if (
    value?.code === "42P01" ||
    value?.code === "PGRST205" ||
    value?.code === "PGRST202"
  )
    return "Course map setup is not available yet. Please ask your administrator to complete the database update.";
  return value?.message ?? "Could not load the course map. Please retry.";
}
export async function listCourseMaps(): Promise<CourseMap[]> {
  const { supabase, teacherId } = await courseMapContext();
  const { data, error } = await supabase
    .from("curriculum_maps")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    teacherId: row.teacher_id,
    revision: row.revision,
    archived: row.archived,
    updatedAt: row.updated_at,
    document: courseDocumentSchema.parse(row.document),
    sourceRevisions: {},
  }));
}
export async function getCourseMap(id: string): Promise<CourseMap | null> {
  const { supabase, teacherId } = await courseMapContext();
  const { data, error } = await supabase
    .from("curriculum_maps")
    .select("*")
    .eq("id", id)
    .eq("teacher_id", teacherId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const revision = await supabase
    .from("curriculum_map_revisions")
    .select("source_snapshots")
    .eq("map_id", id)
    .eq("revision", data.revision)
    .single();
  if (revision.error) throw revision.error;
  const snapshots = revision.data.source_snapshots as Record<
    string,
    { updatedAt?: string }
  >;
  return {
    id: data.id,
    teacherId: data.teacher_id,
    revision: data.revision,
    archived: data.archived,
    updatedAt: data.updated_at,
    document: courseDocumentSchema.parse(data.document),
    sourceRevisions: Object.fromEntries(
      Object.entries(snapshots).map(([key, source]) => [
        key,
        source.updatedAt ?? "",
      ]),
    ),
  };
}

/** Current access is checked for both picker results and already-linked resources. */
export async function courseResourceOptions(
  doc?: CourseDocument,
  search = "",
): Promise<ResourceOption[]> {
  const { supabase, teacherId } = await courseMapContext();
  const linked =
    doc?.units.flatMap((u) => u.lessons.flatMap((l) => l.resources)) ?? [];
  let activitiesQuery = supabase
    .from("studio_activities")
    .select("id, title, format, updated_at, entries:authoring->entries")
    .eq("teacher_id", teacherId)
    .order("updated_at", { ascending: false })
    .limit(150);
  let mediaQuery = supabase
    .from("media_assets")
    .select("id, original_filename, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (search.trim()) {
    const query = `%${search
      .trim()
      .replace(/[%_\\]/g, "\\$&")
      .slice(0, 100)}%`;
    activitiesQuery = activitiesQuery.ilike("title", query);
    mediaQuery = mediaQuery.ilike("original_filename", query);
  }
  const ids = [
    ...new Set(
      linked
        .filter((r) => r.kind === "activity" || r.kind === "vocabulary_list")
        .map((r) => r.sourceId),
    ),
  ];
  const mediaIds = [
    ...new Set(linked.filter((r) => r.kind === "media").map((r) => r.sourceId)),
  ];
  const [activities, media, attachedActivities, attachedMedia] =
    await Promise.all([
      activitiesQuery,
      mediaQuery,
      ids.length
        ? supabase
            .from("studio_activities")
            .select("id, title, format, updated_at, entries:authoring->entries")
            .eq("teacher_id", teacherId)
            .in("id", ids)
        : Promise.resolve({ data: [], error: null }),
      mediaIds.length
        ? supabase
            .from("media_assets")
            .select("id, original_filename, created_at")
            .in("id", mediaIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
  for (const result of [activities, media, attachedActivities, attachedMedia])
    if (result.error) throw result.error;
  const options: ResourceOption[] = [];
  for (const row of [
    ...(activities.data ?? []),
    ...(attachedActivities.data ?? []),
  ]) {
    const kind =
      row.format === "vocabulary_list" ? "vocabulary_list" : "activity";
    const entries = row.entries as { id: string; word: string }[] | null;
    options.push({
      kind,
      sourceId: row.id,
      title: row.title,
      updatedAt: row.updated_at,
      href: resourceHref({ kind, sourceId: row.id }),
      ...(kind === "vocabulary_list" && Array.isArray(entries)
        ? { entries: entries.map((e) => ({ id: e.id, word: e.word })) }
        : {}),
    });
  }
  for (const row of [...(media.data ?? []), ...(attachedMedia.data ?? [])])
    options.push({
      kind: "media",
      sourceId: row.id,
      title: row.original_filename,
      updatedAt: row.created_at,
      href: `/teacher/media?q=${encodeURIComponent(row.original_filename)}`,
    });
  for (const entry of getPublishedGrammarModules())
    if (
      !search ||
      entry.title.toLowerCase().includes(search.toLowerCase()) ||
      linked.some((r) => r.kind === "grammar" && r.sourceId === entry.slug)
    )
      options.push({
        kind: "grammar",
        sourceId: entry.slug,
        title: entry.title,
        updatedAt: "catalog-v1",
        href: resourceHref({ kind: "grammar", sourceId: entry.slug }),
      });
  return [
    ...new Map(options.map((o) => [`${o.kind}:${o.sourceId}`, o])).values(),
  ];
}
