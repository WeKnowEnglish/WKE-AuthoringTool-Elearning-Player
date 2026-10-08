"use server";

import { revalidatePath } from "next/cache";
import {
  courseDocumentSchema,
  MAP_PATH,
  lessonObjectives,
  type CourseMap,
  type ResourceOption,
} from "@/lib/course-map/model";
import {
  courseMapContext,
  courseMapError,
  courseResourceOptions,
  getCourseMap,
} from "@/lib/course-map/server";
import { loadPosterModuleForEditor } from "@/lib/grammar-builder/editor/load-poster-module-for-editor";
import { isUuid } from "@/lib/class-lessons/vocabulary";

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };
export async function saveCourseMap(input: {
  id: string;
  expectedRevision: number;
  document: unknown;
  archived?: boolean;
}): Promise<Result<{ map: CourseMap }>> {
  try {
    if (
      !isUuid(input.id) ||
      !Number.isInteger(input.expectedRevision) ||
      input.expectedRevision < 0
    )
      throw new Error("Invalid course identity or revision.");
    const document = courseDocumentSchema.parse(input.document);
    const { supabase } = await courseMapContext();
    const grammar: Record<string, unknown> = {};
    for (const resource of document.units
      .flatMap((u) => u.lessons.flatMap((l) => l.resources))
      .filter((r) => r.kind === "grammar")) {
      const poster = loadPosterModuleForEditor(resource.sourceId);
      grammar[resource.sourceId] = {
        title: poster.title,
        raw: poster.raw,
        updatedAt: "catalog-v1",
      };
    }
    const { error } = await supabase.rpc("save_curriculum_map", {
      p_id: input.id,
      p_expected_revision: input.expectedRevision,
      p_document: document,
      p_archived: input.archived ?? false,
      p_grammar_snapshots: grammar,
    });
    if (error) throw error;
    const map = await getCourseMap(input.id);
    if (!map)
      throw new Error(
        "Saved, but could not reload. Reload the map before editing again.",
      );
    revalidatePath(MAP_PATH);
    revalidatePath(`${MAP_PATH}/${input.id}`);
    return { ok: true, map };
  } catch (error) {
    return { ok: false, error: courseMapError(error) };
  }
}
export async function findCourseResources(input: {
  document: unknown;
  search?: string;
}): Promise<Result<{ resources: ResourceOption[] }>> {
  try {
    return {
      ok: true,
      resources: await courseResourceOptions(
        courseDocumentSchema.parse(input.document),
        input.search?.slice(0, 100),
      ),
    };
  } catch (error) {
    return { ok: false, error: courseMapError(error) };
  }
}
export async function createLessonFromCourseMap(input: {
  operationId: string;
  mapId: string;
  revision: number;
  plannedLessonId: string;
  classId: string;
  existingLessonId?: string;
}): Promise<Result<{ lessonId: string; href: string }>> {
  try {
    if (
      ![
        input.operationId,
        input.mapId,
        input.plannedLessonId,
        input.classId,
        ...(input.existingLessonId ? [input.existingLessonId] : []),
      ].every(isUuid) ||
      !Number.isInteger(input.revision)
    )
      throw new Error("Choose a saved course lesson and class.");
    const { supabase } = await courseMapContext();
    const map = await getCourseMap(input.mapId);
    if (!map || map.archived) throw new Error("Course map is unavailable.");
    // RPC imports the requested immutable revision, including retry after a map edit.
    if (map.revision === input.revision) {
      const lesson = map.document.units
        .flatMap((u) => u.lessons)
        .find((l) => l.id === input.plannedLessonId);
      if (!lesson) throw new Error("Planned lesson not found.");
      const objectives = lessonObjectives(map.document, lesson);
      const notes = [lesson.support ? `Support: ${lesson.support}` : "", lesson.extension ? `Extension: ${lesson.extension}` : ""].filter(Boolean).join("\n\n");
      if (!input.existingLessonId && notes.length > 2000)
        throw new Error("The planner supports up to 2,000 characters for support and extension together. Shorten these notes before importing.");
      if (
        !input.existingLessonId &&
        (objectives.map((o) => o.statement).join("\n").length > 1000 ||
          objectives.map((o) => o.successCriteria).join("\n").length > 1000)
      )
        throw new Error(
          "The planner supports up to 1,000 characters for goals and checks. Shorten this lesson's combined objectives before importing.",
        );
    }
    const { data, error } = await supabase.rpc("import_curriculum_lesson", {
      p_operation_id: input.operationId,
      p_map_id: input.mapId,
      p_revision: input.revision,
      p_planned_lesson_id: input.plannedLessonId,
      p_class_id: input.classId,
      p_existing_lesson_id: input.existingLessonId ?? null,
    });
    if (error) throw error;
    if (typeof data !== "string" || !isUuid(data))
      throw new Error(
        "Could not load the imported lesson. Retry to recover the same draft.",
      );
    revalidatePath(`/teacher/classes/${input.classId}`);
    return {
      ok: true,
      lessonId: data,
      href: `/teacher/classes/${input.classId}?tab=lesson&lessonId=${data}`,
    };
  } catch (error) {
    return { ok: false, error: courseMapError(error) };
  }
}
export async function listCourseClassLessons(
  classId: string,
): Promise<Result<{ lessons: { id: string; title: string }[] }>> {
  try {
    if (!isUuid(classId)) throw new Error("Choose a class.");
    const { supabase, teacherId } = await courseMapContext();
    const { data, error } = await supabase
      .from("class_lessons")
      .select("id, title")
      .eq("teacher_id", teacherId)
      .eq("class_id", classId)
      .neq("status", "archived")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return { ok: true, lessons: data ?? [] };
  } catch (error) {
    return { ok: false, error: courseMapError(error) };
  }
}
