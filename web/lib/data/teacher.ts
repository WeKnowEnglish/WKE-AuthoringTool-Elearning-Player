import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { cache } from "react";

export type CourseRow = {
  id: string;
  title: string;
  slug: string;
  target: string;
  cover_image_url?: string;
  cover_video_url?: string;
  standards?: string;
  outcomes?: string;
  order_index: number;
  published: boolean;
};

export type TagRow = {
  id: string;
  label: string;
  slug: string;
};

export type TeacherModuleRow = {
  id: string;
  title: string;
  slug: string;
  course_id?: string;
  unlock_strategy?: "sequential" | "always_open" | "manual";
  manual_unlocked?: boolean;
  standards?: string;
  outcomes?: string;
  order_index: number;
  published: boolean;
  courses?: { title?: string; slug?: string } | null;
  module_tags?: { tags?: { slug?: string; label?: string; id?: string } | null }[];
};

export type TeacherLessonRow = {
  id: string;
  module_id: string;
  title: string;
  slug: string;
  order_index: number;
  published: boolean;
  estimated_minutes?: number | null;
};

export type ActivitySubtype =
  | "mc_quiz"
  | "true_false"
  | "fill_blanks"
  | "fix_text"
  | "drag_sentence"
  | "letter_mixup"
  | "listen_hotspot_sequence";

export type ActivityLibraryRow = {
  id: string;
  title: string;
  activity_subtype: ActivitySubtype;
  level: string;
  topic: string;
  vocabulary: string[];
  payload: {
    start?: unknown;
    items?: unknown[];
    settings?: {
      shuffle_questions?: boolean;
      shuffle_answer_options_each_replay?: boolean;
      auto_advance_on_pass_default?: boolean;
      activity_subtypes?: string[];
      editor_module_id?: string;
      editor_lesson_id?: string;
    };
  };
  question_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  /** When true, activity appears in the student activity library (`/activities`). */
  published?: boolean;
};

export type ActivityLibraryFilters = {
  q?: string;
  level?: string;
  topic?: string;
  subtype?: ActivitySubtype | "all";
  /** `student` lists only published rows for anon/learners; `teacher` lists the signed-in teacher's rows (RLS). */
  audience?: "teacher" | "student";
};

type ModuleSearchFilters = {
  q?: string;
  published?: "all" | "published" | "draft";
  tagSlugs?: string[];
  courseId?: string;
};

type ModuleFiltersCacheShape = {
  q: string;
  published: "all" | "published" | "draft";
  courseId: string;
  tagSlugs: string[];
};

function toModuleFiltersCacheKey(filters?: ModuleSearchFilters): string {
  const shape: ModuleFiltersCacheShape = {
    q: (filters?.q ?? "").trim().toLowerCase(),
    published: filters?.published ?? "all",
    courseId: filters?.courseId ?? "",
    tagSlugs: [...(filters?.tagSlugs ?? [])].map((v) => v.trim()).filter(Boolean).sort(),
  };
  return JSON.stringify(shape);
}

function fromModuleFiltersCacheKey(key: string): ModuleSearchFilters {
  const parsed = JSON.parse(key) as ModuleFiltersCacheShape;
  return {
    q: parsed.q || undefined,
    published: parsed.published,
    courseId: parsed.courseId || undefined,
    tagSlugs: parsed.tagSlugs.length ? parsed.tagSlugs : undefined,
  };
}

function toModuleIdsCacheKey(moduleIds: string[]): string {
  return [...new Set(moduleIds)].sort().join(",");
}

function fromModuleIdsCacheKey(key: string): string[] {
  if (!key) return [];
  return key.split(",").map((v) => v.trim()).filter(Boolean);
}

function isMissingCourseSchema(err: PostgrestError | null): boolean {
  if (!err) return false;
  const msg = `${err.message ?? ""} ${err.details ?? ""} ${err.hint ?? ""}`.toLowerCase();
  return (
    err.code === "42P01" ||
    err.code === "42703" ||
    msg.includes("courses") ||
    msg.includes("module_tags") ||
    msg.includes("tags")
  );
}

function isMissingActivityLibrarySchema(err: PostgrestError | null): boolean {
  if (!err) return false;
  const msg = `${err.message ?? ""} ${err.details ?? ""} ${err.hint ?? ""}`.toLowerCase();
  return err.code === "42P01" || msg.includes("activity_library_items");
}

export const getAllCourses = cache(async function getAllCourses() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("order_index", { ascending: true });
  if (error) {
    if (isMissingCourseSchema(error)) return [];
    throw error;
  }
  return (data ?? []) as unknown as CourseRow[];
});

export const getCourse = cache(async function getCourse(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("courses").select("*").eq("id", id).single();
  if (error) {
    if (isMissingCourseSchema(error)) {
      throw new Error("Course schema is not available yet. Run migration 008 first.");
    }
    throw error;
  }
  return data as CourseRow;
});

export const getAllTags = cache(async function getAllTags() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tags").select("id,label,slug").order("label");
  if (error) {
    if (isMissingCourseSchema(error)) return [];
    throw error;
  }
  return (data ?? []) as unknown as TagRow[];
});

const getAllModulesCached = cache(async (filtersCacheKey: string) => {
  const filters = fromModuleFiltersCacheKey(filtersCacheKey);
  const supabase = await createClient();
  let query = supabase
    .from("modules")
    .select("*, courses(title,slug), module_tags(tags(slug,label))")
    .order("order_index", { ascending: true });

  if (filters?.published === "published") query = query.eq("published", true);
  if (filters?.published === "draft") query = query.eq("published", false);
  if (filters?.courseId) query = query.eq("course_id", filters.courseId);

  let rows: TeacherModuleRow[] = [];
  {
    const { data, error } = await query;
    if (error) {
      if (!isMissingCourseSchema(error)) throw error;
      // Backward compatibility before migration 008 is applied.
      const legacy = await supabase
        .from("modules")
        .select("*")
        .order("order_index", { ascending: true });
      if (legacy.error) throw legacy.error;
      rows = ((legacy.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        ...row,
        courses: null,
        module_tags: [],
      })) as unknown as TeacherModuleRow[];
    } else {
      rows = (data ?? []) as unknown as TeacherModuleRow[];
    }
  }

  if (filters?.q) {
    const q = filters.q.trim().toLowerCase();
    if (q.length > 0) {
      rows = rows.filter((row) => {
        const course = row.courses as { title?: string; slug?: string } | null;
        return [row.title, row.slug, course?.title ?? "", course?.slug ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q);
      });
    }
  }

  if (filters?.tagSlugs?.length) {
    const selected = new Set(filters.tagSlugs);
    rows = rows.filter((row) => {
      const rels = (row.module_tags ?? []) as { tags?: { slug?: string } | null }[];
      return rels.some((rel) => rel.tags?.slug && selected.has(rel.tags.slug));
    });
  }

  return rows;
});

export async function getAllModules(filters?: ModuleSearchFilters) {
  return getAllModulesCached(toModuleFiltersCacheKey(filters));
}

/** Next `order_index` so a new module sorts after existing ones. */
export async function getNextModuleOrderIndex(courseId?: string): Promise<number> {
  const rows = await getAllModules();
  const scoped = courseId ? rows.filter((m) => m.course_id === courseId) : rows;
  if (!scoped?.length) return 0;
  return Math.max(...scoped.map((m) => m.order_index ?? 0)) + 1;
}

/** Next `order_index` so a new course sorts after existing ones. */
export async function getNextCourseOrderIndex(): Promise<number> {
  const rows = await getAllCourses();
  if (!rows?.length) return 0;
  return Math.max(...rows.map((c) => c.order_index ?? 0)) + 1;
}

/** Next `order_index` for a new lesson inside this module. */
export async function getNextLessonOrderIndex(moduleId: string): Promise<number> {
  const rows = await getLessonsForModule(moduleId);
  if (!rows?.length) return 0;
  return Math.max(...rows.map((l) => l.order_index ?? 0)) + 1;
}

export const getModule = cache(async function getModule(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("modules")
    .select("*, module_tags(tags(id,label,slug))")
    .eq("id", id)
    .single();
  if (error) {
    if (!isMissingCourseSchema(error)) throw error;
    const legacy = await supabase.from("modules").select("*").eq("id", id).single();
    if (legacy.error) throw legacy.error;
    return {
      ...legacy.data,
      module_tags: [],
    };
  }
  return data;
});

export const getLessonsForModule = cache(async function getLessonsForModule(moduleId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("module_id", moduleId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as TeacherLessonRow[];
});

const getLessonsForModulesCached = cache(async (moduleIdsKey: string) => {
  const moduleIds = fromModuleIdsCacheKey(moduleIdsKey);
  if (moduleIds.length === 0) return [] as TeacherLessonRow[];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .in("module_id", moduleIds)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as TeacherLessonRow[];
});

export async function getLessonsForModules(moduleIds: string[]) {
  return getLessonsForModulesCached(toModuleIdsCacheKey(moduleIds));
}

export const getLesson = cache(async function getLesson(lessonId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .single();
  if (error) throw error;
  return data;
});

export async function getScreens(lessonId: string) {
  noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lesson_screens")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data;
}

export const getLessonSkills = cache(async function getLessonSkills(lessonId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lesson_skills")
    .select("skill_key")
    .eq("lesson_id", lessonId);
  if (error) throw error;
  return (data ?? []).map((r) => r.skill_key as string);
});

export async function searchActivityLibrary(filters?: ActivityLibraryFilters) {
  noStore();
  const supabase = await createClient();
  const audience = filters?.audience ?? "teacher";
  let query = supabase
    .from("activity_library_items")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(300);

  if (audience === "student") {
    query = query.eq("published", true);
  }

  if (filters?.subtype && filters.subtype !== "all") {
    query = query.eq("activity_subtype", filters.subtype);
  }
  if (filters?.level?.trim()) query = query.ilike("level", filters.level.trim());
  if (filters?.topic?.trim()) query = query.ilike("topic", `%${filters.topic.trim()}%`);
  if (filters?.q?.trim()) query = query.ilike("title", `%${filters.q.trim()}%`);

  const { data, error } = await query;
  if (error) {
    if (isMissingActivityLibrarySchema(error)) return [];
    throw error;
  }
  return (data ?? []) as unknown as ActivityLibraryRow[];
}

export async function getActivityLibraryItem(id: string) {
  noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_library_items")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (isMissingActivityLibrarySchema(error)) {
      throw new Error("Activity library schema is not available yet. Run migration 014 first.");
    }
    throw error;
  }
  return data as ActivityLibraryRow;
}

/** Student activity detail: only published activities (anon-friendly RLS). */
export async function getPublishedActivityLibraryItemById(id: string): Promise<ActivityLibraryRow | null> {
  noStore();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_library_items")
    .select("*")
    .eq("id", id)
    .eq("published", true)
    .maybeSingle();
  if (error) {
    if (isMissingActivityLibrarySchema(error)) return null;
    throw error;
  }
  return (data ?? null) as ActivityLibraryRow | null;
}
