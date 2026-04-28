import { createClient } from "@/lib/supabase/server";

export type CourseRow = {
  id: string;
  title: string;
  slug: string;
  target: string;
  order_index: number;
  published: boolean;
};

export type ModuleRow = {
  id: string;
  course_id: string;
  title: string;
  slug: string;
  order_index: number;
  published: boolean;
  unlock_strategy: "sequential" | "always_open" | "manual";
  manual_unlocked: boolean;
};

export type LessonRow = {
  id: string;
  module_id: string;
  title: string;
  slug: string;
  order_index: number;
  published: boolean;
  estimated_minutes: number | null;
};

export type LessonScreenRow = {
  id: string;
  lesson_id: string;
  order_index: number;
  screen_type: string;
  payload: unknown;
  updated_at?: string;
};

export type PublishedCatalog = {
  courses: CourseRow[];
  modules: ModuleRow[];
  lessons: LessonRow[];
  skillsByLesson: Record<string, string[]>;
  moduleTagsByModule: Record<string, string[]>;
  /** Set when Supabase returns an error (shown on /learn and /profile). */
  loadError?: string;
};

function formatSupabaseError(err: {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}): string {
  const parts = [
    err.message,
    err.code ? `(${err.code})` : "",
    err.details,
    err.hint,
  ].filter(Boolean);
  const base = parts.join(" ").trim() || "Unknown Supabase error";
  if (
    /permission denied|42501/i.test(base) ||
    /PGRST/i.test(err.code ?? "")
  ) {
    return `${base} — If tables exist, run the grant script: web/supabase/migrations/002_grants_anon_authenticated.sql`;
  }
  if (/relation|does not exist|42P01/i.test(base)) {
    return `${base} — Run web/supabase/migrations/001_initial.sql in the Supabase SQL Editor first.`;
  }
  if (/JWT|Invalid API key|401|PGRST301/i.test(base)) {
    return `${base} — Check NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_ANON_KEY; try the legacy anon JWT from Dashboard → Settings → API if publishable key fails.`;
  }
  return base;
}

function isMissingModuleUnlockSchema(err: {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}): boolean {
  const msg = `${err.message ?? ""} ${err.details ?? ""} ${err.hint ?? ""}`.toLowerCase();
  return err.code === "42703" || msg.includes("unlock_strategy") || msg.includes("manual_unlocked");
}

export async function getPublishedCatalog(): Promise<PublishedCatalog> {
  const empty = (): PublishedCatalog => ({
    courses: [],
    modules: [],
    lessons: [],
    skillsByLesson: {},
    moduleTagsByModule: {},
  });

  const supabase = await createClient();
  const { data: courseData, error: cErr } = await supabase
    .from("courses")
    .select("id,title,slug,target,order_index,published")
    .eq("published", true)
    .order("order_index", { ascending: true });
  if (cErr) {
    return { ...empty(), loadError: formatSupabaseError(cErr) };
  }
  const courses = (courseData ?? []) as unknown as CourseRow[];
  const courseIds = courses.map((c) => c.id);

  const modQuery = (withUnlockColumns: boolean) =>
    supabase
      .from("modules")
      .select(
        withUnlockColumns ?
          "id,course_id,title,slug,order_index,published,unlock_strategy,manual_unlocked"
        : "id,course_id,title,slug,order_index,published",
      )
      .eq("published", true)
      .order("order_index", { ascending: true });
  const withUnlock = modQuery(true);
  const withUnlockResult =
    courseIds.length > 0 ? await withUnlock.in("course_id", courseIds) : await withUnlock;

  let modules: ModuleRow[] = [];
  if (withUnlockResult.error && isMissingModuleUnlockSchema(withUnlockResult.error)) {
    const legacyQuery = modQuery(false);
    const legacy =
      courseIds.length > 0 ? await legacyQuery.in("course_id", courseIds) : await legacyQuery;
    if (legacy.error) {
      return { ...empty(), loadError: formatSupabaseError(legacy.error) };
    }
    modules = ((legacy.data ?? []) as unknown as Omit<
      ModuleRow,
      "unlock_strategy" | "manual_unlocked"
    >[])
      .map((m) => ({
        ...m,
        unlock_strategy: "sequential",
        manual_unlocked: false,
      }));
  } else if (withUnlockResult.error) {
    return { ...empty(), loadError: formatSupabaseError(withUnlockResult.error) };
  } else {
    modules = (withUnlockResult.data ?? []) as unknown as ModuleRow[];
  }
  const moduleIds = modules.map((m) => m.id);
  const moduleTagsByModule: Record<string, string[]> = {};

  if (moduleIds.length > 0) {
    const { data: tagData, error: tErr } = await supabase
      .from("module_tags")
      .select("module_id,tags(slug)")
      .in("module_id", moduleIds);
    if (tErr) {
      return { ...empty(), loadError: formatSupabaseError(tErr) };
    }
    for (const row of tagData ?? []) {
      const moduleId = row.module_id as string;
      const slug = (row.tags as { slug?: string } | null)?.slug;
      if (!slug) continue;
      if (!moduleTagsByModule[moduleId]) moduleTagsByModule[moduleId] = [];
      moduleTagsByModule[moduleId].push(slug);
    }
  }

  if (moduleIds.length === 0) {
    return { courses, modules, lessons: [], skillsByLesson: {}, moduleTagsByModule };
  }

  const { data: lesData, error: lErr } = await supabase
    .from("lessons")
    .select("id,module_id,title,slug,order_index,published,estimated_minutes")
    .eq("published", true)
    .in("module_id", moduleIds)
    .order("order_index", { ascending: true });

  if (lErr) {
    return {
      ...empty(),
      loadError: formatSupabaseError(lErr),
    };
  }

  const lessons = (lesData ?? []) as unknown as LessonRow[];
  const lessonIds = lessons.map((l) => l.id);
  const skillsByLesson: Record<string, string[]> = {};

  if (lessonIds.length > 0) {
    const { data: skills, error: sErr } = await supabase
      .from("lesson_skills")
      .select("lesson_id,skill_key")
      .in("lesson_id", lessonIds);

    if (sErr) {
      return {
        courses,
        modules,
        lessons,
        skillsByLesson: {},
        moduleTagsByModule,
        loadError: formatSupabaseError(sErr),
      };
    }

    for (const row of skills ?? []) {
      const lid = row.lesson_id as string;
      if (!skillsByLesson[lid]) skillsByLesson[lid] = [];
      skillsByLesson[lid].push(row.skill_key as string);
    }
  }

  return {
    courses,
    modules,
    lessons,
    skillsByLesson,
    moduleTagsByModule,
  };
}

export async function getLessonBySlugs(moduleSlug: string, lessonSlug: string) {
  const supabase = await createClient();

  let mod: ModuleRow | null = null;
  {
    const withUnlock = await supabase
      .from("modules")
      .select(
        "id,course_id,title,slug,order_index,published,unlock_strategy,manual_unlocked",
      )
      .eq("slug", moduleSlug)
      .eq("published", true)
      .maybeSingle();
    if (withUnlock.error && isMissingModuleUnlockSchema(withUnlock.error)) {
      const legacy = await supabase
        .from("modules")
        .select("id,course_id,title,slug,order_index,published")
        .eq("slug", moduleSlug)
        .eq("published", true)
        .maybeSingle();
      if (legacy.error || !legacy.data) return null;
      mod = {
        ...(legacy.data as unknown as Omit<
          ModuleRow,
          "unlock_strategy" | "manual_unlocked"
        >),
        unlock_strategy: "sequential",
        manual_unlocked: false,
      };
    } else if (withUnlock.error || !withUnlock.data) {
      return null;
    } else {
      mod = withUnlock.data as ModuleRow;
    }
  }

  const { data: lesson, error: lErr } = await supabase
    .from("lessons")
    .select("id,module_id,title,slug,order_index,published,estimated_minutes")
    .eq("module_id", mod.id)
    .eq("slug", lessonSlug)
    .eq("published", true)
    .maybeSingle();

  if (lErr || !lesson) return null;

  const { data: screens, error: sErr } = await supabase
    .from("lesson_screens")
    .select("id,lesson_id,order_index,screen_type,payload")
    .eq("lesson_id", lesson.id)
    .order("order_index", { ascending: true });

  if (sErr || !screens) return null;

  return {
    module: mod as ModuleRow,
    lesson: lesson as LessonRow,
    screens: screens as unknown as LessonScreenRow[],
  };
}

export async function getModuleOrderIndex(moduleId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("modules")
    .select("order_index")
    .eq("id", moduleId)
    .eq("published", true)
    .maybeSingle();
  return data?.order_index ?? null;
}
