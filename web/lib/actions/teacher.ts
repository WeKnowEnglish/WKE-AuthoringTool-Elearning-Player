"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  interactionPayloadSchema,
  type InteractionSubtype,
  remapStoryPayloadIds,
  startPayloadSchema,
  storyPayloadSchema,
} from "@/lib/lesson-schemas";

export async function requireTeacher() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "teacher") {
    throw new Error("Unauthorized");
  }
  return supabase;
}

export async function saveModule(formData: FormData) {
  const supabase = await requireTeacher();
  const id = formData.get("id") as string | null;
  const title = (formData.get("title") as string)?.trim();
  const slug = (formData.get("slug") as string)?.trim().toLowerCase();
  const course_id = (formData.get("course_id") as string)?.trim();
  const tagsRaw = (formData.get("tags_raw") as string)?.trim() ?? "";
  const standards = ((formData.get("standards") as string) ?? "").trim();
  const outcomes = ((formData.get("outcomes") as string) ?? "").trim();
  const order_index = Number(formData.get("order_index") ?? 0);
  const published = formData.get("published") === "on";
  const unlockStrategyInput = (formData.get("unlock_strategy") as string | null) ?? "sequential";
  const unlock_strategy =
    unlockStrategyInput === "always_open" || unlockStrategyInput === "manual" ?
      unlockStrategyInput
    : "sequential";
  const manual_unlocked = formData.get("manual_unlocked") === "on";

  if (!title || !slug || !course_id) throw new Error("Title, slug, and course required");
  const tagSlugs = Array.from(
    new Set(
      tagsRaw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  async function saveModuleTags(moduleId: string) {
    await supabase.from("module_tags").delete().eq("module_id", moduleId);
    if (!tagSlugs.length) return;

    const { data: existingTags, error: fetchTagErr } = await supabase
      .from("tags")
      .select("id,slug")
      .in("slug", tagSlugs);
    if (fetchTagErr) throw fetchTagErr;

    const bySlug = new Map((existingTags ?? []).map((t) => [t.slug as string, t.id as string]));
    for (const tagSlug of tagSlugs) {
      if (!bySlug.has(tagSlug)) {
        const label = tagSlug
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");
        const { data: inserted, error: createTagErr } = await supabase
          .from("tags")
          .insert({ slug: tagSlug, label })
          .select("id")
          .single();
        if (createTagErr) throw createTagErr;
        bySlug.set(tagSlug, inserted.id as string);
      }
    }

    await supabase.from("module_tags").insert(
      tagSlugs.map((tagSlug) => ({
        module_id: moduleId,
        tag_id: bySlug.get(tagSlug),
      })),
    );
  }

  if (id) {
    const { error } = await supabase
      .from("modules")
      .update({
        title,
        slug,
        course_id,
        standards,
        outcomes,
        order_index,
        published,
        unlock_strategy,
        manual_unlocked,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
    await saveModuleTags(id);
    revalidatePath("/teacher/courses");
    revalidatePath("/teacher");
    revalidatePath(`/teacher/modules/${id}`);
    redirect(`/teacher/modules/${id}`);
  }

  const { data, error } = await supabase
    .from("modules")
    .insert({
      title,
      slug,
      course_id,
      standards,
      outcomes,
      order_index,
      published,
      unlock_strategy,
      manual_unlocked,
    })
    .select("id")
    .single();
  if (error) throw error;
  await saveModuleTags(data.id);
  revalidatePath("/teacher/courses");
  revalidatePath("/teacher");
  redirect(`/teacher/modules/${data.id}`);
}

export async function saveCourse(formData: FormData) {
  const supabase = await requireTeacher();
  const id = formData.get("id") as string | null;
  const title = (formData.get("title") as string)?.trim();
  const slug = (formData.get("slug") as string)?.trim().toLowerCase();
  const target = (formData.get("target") as string)?.trim();
  const standards = ((formData.get("standards") as string) ?? "").trim();
  const outcomes = ((formData.get("outcomes") as string) ?? "").trim();
  const order_index = Number(formData.get("order_index") ?? 0);
  const published = formData.get("published") === "on";
  if (!title || !slug || !target) throw new Error("Title, slug, and target are required");

  if (id) {
    const { error } = await supabase
      .from("courses")
      .update({
        title,
        slug,
        target,
        standards,
        outcomes,
        order_index,
        published,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/teacher");
    revalidatePath("/teacher/courses");
    revalidatePath(`/teacher/courses/${id}`);
    redirect(`/teacher/courses/${id}`);
  }

  const { error } = await supabase.from("courses").insert({
    title,
    slug,
    target,
    standards,
    outcomes,
    order_index,
    published,
  });
  if (error) throw error;
  revalidatePath("/teacher");
  revalidatePath("/teacher/courses");
  redirect("/teacher/courses");
}

export async function saveLesson(formData: FormData) {
  const supabase = await requireTeacher();
  const id = formData.get("id") as string | null;
  const module_id = formData.get("module_id") as string;
  const title = (formData.get("title") as string)?.trim();
  const slug = (formData.get("slug") as string)?.trim().toLowerCase();
  const order_index = Number(formData.get("order_index") ?? 0);
  const published = formData.get("published") === "on";
  const estimated = formData.get("estimated_minutes");
  const estimated_minutes = estimated ? Number(estimated) : null;

  if (!module_id || !title || !slug) throw new Error("Missing fields");

  if (id) {
    const { error } = await supabase
      .from("lessons")
      .update({
        title,
        slug,
        order_index,
        published,
        estimated_minutes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
    revalidatePath(`/teacher/modules/${module_id}`);
    revalidatePath(`/teacher/modules/${module_id}/lessons/${id}`);
    redirect(`/teacher/modules/${module_id}/lessons/${id}`);
  }

  const { data, error } = await supabase
    .from("lessons")
    .insert({
      module_id,
      title,
      slug,
      order_index,
      published,
      estimated_minutes,
    })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath(`/teacher/modules/${module_id}`);
  redirect(`/teacher/modules/${module_id}/lessons/${data.id}`);
}

export async function deleteModule(moduleId: string, _fd: FormData) {
  void _fd;
  const supabase = await requireTeacher();
  const { error } = await supabase.from("modules").delete().eq("id", moduleId);
  if (error) throw error;
  revalidatePath("/teacher");
  redirect("/teacher");
}

export async function deleteLesson(lessonId: string, moduleId: string, _fd: FormData) {
  void _fd;
  const supabase = await requireTeacher();
  const { error } = await supabase
    .from("lessons")
    .delete()
    .eq("id", lessonId)
    .eq("module_id", moduleId);
  if (error) throw error;
  revalidatePath(`/teacher/modules/${moduleId}`);
  redirect(`/teacher/modules/${moduleId}`);
}

export async function deleteScreen(
  screenId: string,
  lessonId: string,
  moduleId: string,
  _fd: FormData,
) {
  void _fd;
  const supabase = await requireTeacher();
  const { error } = await supabase.from("lesson_screens").delete().eq("id", screenId);
  if (error) throw error;
  await renumberScreens(supabase, lessonId);
  revalidatePath(`/teacher/modules/${moduleId}/lessons/${lessonId}`);
}

export async function moveScreen(
  screenId: string,
  lessonId: string,
  moduleId: string,
  direction: "up" | "down",
  _fd: FormData,
) {
  void _fd;
  const supabase = await requireTeacher();
  const { data: rows, error: fetchErr } = await supabase
    .from("lesson_screens")
    .select("id,order_index")
    .eq("lesson_id", lessonId)
    .order("order_index", { ascending: true });
  if (fetchErr || !rows?.length) throw fetchErr ?? new Error("No screens");
  const idx = rows.findIndex((r) => r.id === screenId);
  if (idx < 0) throw new Error("Screen not found");
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= rows.length) return;
  const a = rows[idx];
  const b = rows[swapWith];
  await supabase
    .from("lesson_screens")
    .update({ order_index: b.order_index, updated_at: new Date().toISOString() })
    .eq("id", a.id);
  await supabase
    .from("lesson_screens")
    .update({ order_index: a.order_index, updated_at: new Date().toISOString() })
    .eq("id", b.id);
  await renumberScreens(supabase, lessonId);
  revalidatePath(`/teacher/modules/${moduleId}/lessons/${lessonId}`);
}

export async function reorderScreens(
  lessonId: string,
  moduleId: string,
  orderedScreenIds: string[],
) {
  const supabase = await requireTeacher();
  const { data: rows, error: fetchErr } = await supabase
    .from("lesson_screens")
    .select("id")
    .eq("lesson_id", lessonId);
  if (fetchErr || !rows?.length) throw fetchErr ?? new Error("No screens");
  const valid = new Set(rows.map((r) => r.id));
  if (orderedScreenIds.length !== valid.size) {
    throw new Error("Reorder list must include every screen exactly once");
  }
  for (const id of orderedScreenIds) {
    if (!valid.has(id)) throw new Error("Unknown screen id in reorder list");
  }
  const now = new Date().toISOString();
  for (let i = 0; i < orderedScreenIds.length; i++) {
    const { error } = await supabase
      .from("lesson_screens")
      .update({ order_index: i, updated_at: now })
      .eq("id", orderedScreenIds[i])
      .eq("lesson_id", lessonId);
    if (error) throw error;
  }
  revalidatePath(`/teacher/modules/${moduleId}/lessons/${lessonId}`);
}

export async function duplicateScreen(
  screenId: string,
  lessonId: string,
  moduleId: string,
  _fd: FormData,
) {
  void _fd;
  const supabase = await requireTeacher();
  const { data: row, error } = await supabase
    .from("lesson_screens")
    .select("screen_type,payload,order_index")
    .eq("id", screenId)
    .single();
  if (error || !row) throw error ?? new Error("Screen not found");
  const { count } = await supabase
    .from("lesson_screens")
    .select("*", { count: "exact", head: true })
    .eq("lesson_id", lessonId);
  const order_index = count ?? 0;
  let payloadToInsert = row.payload;
  if (row.screen_type === "story") {
    const parsed = storyPayloadSchema.safeParse(row.payload);
    if (parsed.success && parsed.data.pages?.length) {
      payloadToInsert = remapStoryPayloadIds(parsed.data);
    }
  }
  const { data: inserted, error: insErr } = await supabase
    .from("lesson_screens")
    .insert({
      lesson_id: lessonId,
      order_index,
      screen_type: row.screen_type,
      payload: payloadToInsert,
    })
    .select("id")
    .single();
  if (insErr || !inserted) throw insErr ?? new Error("Duplicate insert failed");
  const newId = inserted.id as string;

  const { data: allRows } = await supabase
    .from("lesson_screens")
    .select("id,screen_type,payload,order_index")
    .eq("lesson_id", lessonId)
    .order("order_index", { ascending: true });
  if (!allRows?.length) {
    await renumberScreens(supabase, lessonId);
    revalidatePath(`/teacher/modules/${moduleId}/lessons/${lessonId}`);
    return;
  }
  const normalRows = allRows.filter((r) => !isCongratsEndScreen(r.screen_type, r.payload));
  const endRows = allRows.filter((r) => isCongratsEndScreen(r.screen_type, r.payload));
  const rowsOrdered = [...normalRows, ...endRows];
  const withoutNew = rowsOrdered.filter((r) => r.id !== newId);
  const sourceIdx = withoutNew.findIndex((r) => r.id === screenId);
  const newRow = rowsOrdered.find((r) => r.id === newId);
  if (sourceIdx < 0 || !newRow) {
    await renumberScreens(supabase, lessonId);
    revalidatePath(`/teacher/modules/${moduleId}/lessons/${lessonId}`);
    return;
  }
  const reordered = [...withoutNew.slice(0, sourceIdx + 1), newRow, ...withoutNew.slice(sourceIdx + 1)];
  const reorderedIds = reordered.map((r) => r.id);
  await reorderScreens(lessonId, moduleId, reorderedIds);
}

export async function duplicateLesson(
  sourceLessonId: string,
  moduleId: string,
  _fd: FormData,
) {
  void _fd;
  const supabase = await requireTeacher();
  const { data: lesson, error: lErr } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", sourceLessonId)
    .single();
  if (lErr || !lesson) throw lErr ?? new Error("Lesson not found");
  if (lesson.module_id !== moduleId) throw new Error("Module mismatch");
  const suffix = Date.now().toString(36);
  const newSlug = `${lesson.slug}-copy-${suffix}`.slice(0, 120);
  const { data: lessonRows } = await supabase
    .from("lessons")
    .select("order_index")
    .eq("module_id", moduleId);
  const nextOrder =
    lessonRows?.length ?
      Math.max(...lessonRows.map((l) => l.order_index ?? 0)) + 1
    : 0;
  const { data: inserted, error: insErr } = await supabase
    .from("lessons")
    .insert({
      module_id: moduleId,
      title: `Copy of ${lesson.title}`,
      slug: newSlug,
      order_index: nextOrder,
      published: false,
      estimated_minutes: lesson.estimated_minutes,
    })
    .select("id")
    .single();
  if (insErr || !inserted) throw insErr ?? new Error("Insert failed");
  const { data: screens } = await supabase
    .from("lesson_screens")
    .select("order_index,screen_type,payload")
    .eq("lesson_id", sourceLessonId)
    .order("order_index", { ascending: true });
  if (screens?.length) {
    await supabase.from("lesson_screens").insert(
      screens.map((s) => ({
        lesson_id: inserted.id,
        order_index: s.order_index,
        screen_type: s.screen_type,
        payload: s.payload,
      })),
    );
  }
  const { data: skills } = await supabase
    .from("lesson_skills")
    .select("skill_key")
    .eq("lesson_id", sourceLessonId);
  if (skills?.length) {
    await supabase.from("lesson_skills").insert(
      skills.map((r) => ({ lesson_id: inserted.id, skill_key: r.skill_key })),
    );
  }
  revalidatePath(`/teacher/modules/${moduleId}`);
  revalidatePath(`/teacher/modules/${moduleId}/lessons/${inserted.id}`);
  redirect(`/teacher/modules/${moduleId}/lessons/${inserted.id}`);
}

export async function importLessonScreensJson(
  lessonId: string,
  moduleId: string,
  formData: FormData,
) {
  const supabase = await requireTeacher();
  const raw = (formData.get("import_json") as string) ?? "";
  const replace = formData.get("replace_existing") === "on";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON");
  }
  const obj = parsed as { screens?: unknown };
  if (!Array.isArray(obj.screens)) {
    throw new Error('JSON must be { "screens": [ { "screen_type", "payload" }, ... ] }');
  }
  const rows: { screen_type: string; payload: unknown }[] = [];
  for (const item of obj.screens) {
    const r = item as { screen_type?: string; payload?: unknown };
    if (!r.screen_type || r.payload === undefined) continue;
    const st = r.screen_type;
    const p = r.payload;
    if (st === "start") startPayloadSchema.parse(p);
    else if (st === "story") storyPayloadSchema.parse(p);
    else if (st === "interaction") interactionPayloadSchema.parse(p);
    else throw new Error(`Invalid screen_type: ${st}`);
    rows.push({ screen_type: st, payload: p });
  }
  if (rows.length === 0) throw new Error("No valid screens in import");
  if (replace) {
    await supabase.from("lesson_screens").delete().eq("lesson_id", lessonId);
  }
  const { count } = await supabase
    .from("lesson_screens")
    .select("*", { count: "exact", head: true })
    .eq("lesson_id", lessonId);
  let order = replace ? 0 : count ?? 0;
  for (const row of rows) {
    await supabase.from("lesson_screens").insert({
      lesson_id: lessonId,
      order_index: order++,
      screen_type: row.screen_type,
      payload: row.payload,
    });
  }
  await renumberScreens(supabase, lessonId);
  revalidatePath(`/teacher/modules/${moduleId}/lessons/${lessonId}`);
}

async function renumberScreens(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lessonId: string,
) {
  const { data } = await supabase
    .from("lesson_screens")
    .select("id,screen_type,payload,order_index")
    .eq("lesson_id", lessonId)
    .order("order_index", { ascending: true });
  if (!data) return;
  const normalRows = data.filter((row) => !isCongratsEndScreen(row.screen_type, row.payload));
  const endRows = data.filter((row) => isCongratsEndScreen(row.screen_type, row.payload));
  const orderedRows = [...normalRows, ...endRows];
  for (let i = 0; i < orderedRows.length; i++) {
    await supabase
      .from("lesson_screens")
      .update({ order_index: i, updated_at: new Date().toISOString() })
      .eq("id", orderedRows[i].id);
  }
}

function isCongratsEndScreen(screenType: string, payload: unknown): boolean {
  if (screenType !== "start") return false;
  const parsed = startPayloadSchema.safeParse(payload);
  if (!parsed.success) return false;
  return (
    (parsed.data.cta_label ?? "").trim().toLowerCase() === "finish activity" &&
    (parsed.data.read_aloud_title ?? "").trim().toLowerCase() === "congratulations"
  );
}

function buildCongratsEndPayload() {
  return startPayloadSchema.parse({
    type: "start",
    image_url: "https://placehold.co/800x520/e2e8f0/1e293b?text=Congratulations",
    image_fit: "contain",
    cta_label: "Finish activity",
    read_aloud_title: "Congratulations",
  });
}

async function ensureCongratsEndScreen(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lessonId: string,
) {
  const { data, error } = await supabase
    .from("lesson_screens")
    .select("id,screen_type,payload")
    .eq("lesson_id", lessonId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  const rows = data ?? [];
  const hasCongrats = rows.some((row) => isCongratsEndScreen(row.screen_type, row.payload));
  if (!hasCongrats) {
    const { count } = await supabase
      .from("lesson_screens")
      .select("*", { count: "exact", head: true })
      .eq("lesson_id", lessonId);
    await supabase.from("lesson_screens").insert({
      lesson_id: lessonId,
      order_index: count ?? rows.length,
      screen_type: "start",
      payload: buildCongratsEndPayload(),
    });
  }
  await renumberScreens(supabase, lessonId);
}

export type AddScreenKind =
  | "start"
  | "story"
  | "mc_quiz"
  | "click_targets"
  | "treasure_tap"
  | "sound_sort"
  | "listen_hotspot_sequence"
  | "listen_color_write"
  | "letter_mixup"
  | "word_shape_hunt"
  | "table_complete"
  | "sorting_game"
  | "drag_sentence"
  | "true_false"
  | "short_answer"
  | "fill_blanks"
  | "fix_text"
  | "hotspot_info"
  | "hotspot_gate"
  | "drag_match"
  | "essay"
  | "voice_question"
  | "guided_dialogue"
  | "presentation_interactive";

export async function addScreenTemplate(
  lessonId: string,
  moduleId: string,
  kind: AddScreenKind,
  _fd: FormData,
) {
  void _fd;
  const supabase = await requireTeacher();
  const { count } = await supabase
    .from("lesson_screens")
    .select("*", { count: "exact", head: true })
    .eq("lesson_id", lessonId);
  const order_index = count ?? 0;

  if (kind === "start") {
    const payload = startPayloadSchema.parse({
      type: "start",
      image_url: "https://placehold.co/800x520/e2e8f0/1e293b?text=Start",
      cta_label: "Start learning",
    });
    await supabase.from("lesson_screens").insert({
      lesson_id: lessonId,
      order_index,
      screen_type: "start",
      payload,
    });
    await ensureCongratsEndScreen(supabase, lessonId);
  } else if (kind === "story") {
    const payload = storyPayloadSchema.parse({
      type: "story",
      image_url: "https://placehold.co/800x400/f1f5f9/334155?text=Story",
      body_text: "Write your story here.",
      tts_lang: "en-US",
    });
    await supabase.from("lesson_screens").insert({
      lesson_id: lessonId,
      order_index,
      screen_type: "story",
      payload,
    });
  } else {
    let interactionPayload: unknown;
    switch (kind) {
      case "mc_quiz":
        interactionPayload = {
          type: "interaction",
          subtype: "mc_quiz",
          question: "Question?",
          image_fit: "cover",
          options: [
            { id: "a", label: "Answer A" },
            { id: "b", label: "Answer B" },
          ],
          correct_option_id: "a",
          shuffle_options: false,
        };
        break;
      case "click_targets":
        interactionPayload = {
          type: "interaction",
          subtype: "click_targets",
          image_url: "https://placehold.co/800x450/e2e8f0/334155?text=Scene",
          body_text: "Tap the correct place.",
          targets: [
            {
              id: "t1",
              x_percent: 20,
              y_percent: 30,
              w_percent: 25,
              h_percent: 20,
              label: "Here",
            },
          ],
          correct_target_id: "t1",
        };
        break;
      case "drag_sentence":
        interactionPayload = {
          type: "interaction",
          subtype: "drag_sentence",
          body_text: "Put the words in order.",
          sentence_slots: ["", ""],
          word_bank: ["Hello", "world"],
          correct_order: ["Hello", "world"],
        };
        break;
      case "true_false":
        interactionPayload = {
          type: "interaction",
          subtype: "true_false",
          statement: "The sun is hot.",
          correct: true,
        };
        break;
      case "short_answer":
        interactionPayload = {
          type: "interaction",
          subtype: "short_answer",
          prompt: "What do you say when you meet someone?",
          acceptable_answers: ["Hello", "Hi"],
        };
        break;
      case "fill_blanks":
        interactionPayload = {
          type: "interaction",
          subtype: "fill_blanks",
          template: "Hello __1__ welcome to __2__.",
          blanks: [
            { id: "1", acceptable: ["and", "And"] },
            { id: "2", acceptable: ["school", "School"] },
          ],
        };
        break;
      case "fix_text":
        interactionPayload = {
          type: "interaction",
          subtype: "fix_text",
          broken_text: "Helo, I am go to school.",
          acceptable: ["Hello, I am going to school.", "Hello, I am going to school"],
          image_fit: "cover",
          hints_enabled: true,
          hint_decoy_words: ["went", "gone", "goes"],
        };
        break;
      case "hotspot_info":
        interactionPayload = {
          type: "interaction",
          subtype: "hotspot_info",
          image_url: "https://placehold.co/800x450/dcfce7/14532d?text=Explore",
          body_text: "Tap the picture to learn more.",
          hotspots: [
            {
              id: "h1",
              x_percent: 10,
              y_percent: 10,
              w_percent: 30,
              h_percent: 40,
              title: "Tip",
              body: "This is extra information.",
            },
          ],
          require_all_viewed: false,
        };
        break;
      case "hotspot_gate":
        interactionPayload = {
          type: "interaction",
          subtype: "hotspot_gate",
          image_url: "https://placehold.co/800x450/fee2e2/991b1b?text=Tap",
          body_text: "Tap the correct area.",
          mode: "single",
          targets: [
            {
              id: "t1",
              x_percent: 15,
              y_percent: 20,
              w_percent: 30,
              h_percent: 35,
              label: "Correct",
            },
            {
              id: "t2",
              x_percent: 55,
              y_percent: 20,
              w_percent: 30,
              h_percent: 35,
              label: "Wrong",
            },
          ],
          correct_target_id: "t1",
        };
        break;
      case "drag_match":
        interactionPayload = {
          type: "interaction",
          subtype: "drag_match",
          body_text: "Match each word to the right group.",
          zones: [
            { id: "z1", label: "Animals" },
            { id: "z2", label: "Food" },
          ],
          tokens: [
            { id: "tok1", label: "cat" },
            { id: "tok2", label: "apple" },
          ],
          correct_map: { tok1: "z1", tok2: "z2" },
        };
        break;
      case "sound_sort":
        interactionPayload = {
          type: "interaction",
          subtype: "sound_sort",
          body_text: "Listen and tap the picture that matches.",
          prompt_audio_url:
            "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
          choices: [
            { id: "a", image_url: "https://placehold.co/400x400/e2e8f0/334155?text=A" },
            { id: "b", image_url: "https://placehold.co/400x400/fce7f3/831843?text=B" },
          ],
          correct_choice_id: "a",
        };
        break;
      case "listen_hotspot_sequence":
        interactionPayload = {
          type: "interaction",
          subtype: "listen_hotspot_sequence",
          image_url: "https://placehold.co/800x450/e2e8f0/334155?text=Listen+and+tap",
          body_text: "Listen and tap the hotspots in order.",
          prompt_audio_url:
            "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
          targets: [
            { id: "s1", x_percent: 12, y_percent: 18, w_percent: 20, h_percent: 24, label: "First" },
            { id: "s2", x_percent: 40, y_percent: 26, w_percent: 20, h_percent: 24, label: "Second" },
            { id: "s3", x_percent: 68, y_percent: 22, w_percent: 20, h_percent: 24, label: "Third" },
          ],
          order: ["s1", "s2", "s3"],
          allow_replay: true,
        };
        break;
      case "listen_color_write":
        interactionPayload = {
          type: "interaction",
          subtype: "listen_color_write",
          image_url: "https://placehold.co/800x450/e2e8f0/334155?text=Listen+Color+Write",
          body_text: "Listen. Pick a color or word. Tap each target.",
          prompt_audio_url:
            "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
          allow_replay: true,
          allow_overwrite: true,
          require_all_targets: true,
          shuffle_text_options: false,
          palette: [
            { id: "red", label: "Red", color_hex: "#ef4444" },
            { id: "blue", label: "Blue", color_hex: "#3b82f6" },
            { id: "green", label: "Green", color_hex: "#22c55e" },
          ],
          text_options: [
            { id: "cat", label: "cat" },
            { id: "dog", label: "dog" },
            { id: "sun", label: "sun" },
          ],
          targets: [
            {
              id: "lcw1",
              x_percent: 12,
              y_percent: 20,
              w_percent: 20,
              h_percent: 24,
              label: "Color target",
              expected_mode: "color",
              expected_value: "red",
            },
            {
              id: "lcw2",
              x_percent: 42,
              y_percent: 28,
              w_percent: 20,
              h_percent: 24,
              label: "Write target",
              expected_mode: "text",
              expected_value: "cat",
            },
          ],
        };
        break;
      case "letter_mixup":
        interactionPayload = {
          type: "interaction",
          subtype: "letter_mixup",
          prompt: "Reorder the letters to make the correct words.",
          image_url: "https://placehold.co/800x450/e2e8f0/334155?text=Letter+Mixup",
          shuffle_letters: true,
          case_sensitive: false,
          items: [
            { id: "lm1", target_word: "school", accepted_words: ["School"] },
            { id: "lm2", target_word: "teacher", accepted_words: ["Teacher"] },
          ],
        };
        break;
      case "word_shape_hunt":
        interactionPayload = {
          type: "interaction",
          subtype: "word_shape_hunt",
          prompt: "Tap all vocabulary words.",
          image_url: "https://placehold.co/800x450/e2e8f0/334155?text=Word+Shape+Hunt",
          shape_layout: "wave",
          shuffle_chunks: false,
          word_chunks: [
            { id: "w1", text: "apple", is_vocab: true },
            { id: "w2", text: "table", is_vocab: false },
            { id: "w3", text: "banana", is_vocab: true },
            { id: "w4", text: "window", is_vocab: false },
          ],
        };
        break;
      case "table_complete":
        interactionPayload = {
          type: "interaction",
          subtype: "table_complete",
          prompt: "Complete the table.",
          left_column_label: "Word",
          right_column_label: "Meaning",
          input_mode: "typing",
          case_insensitive: true,
          normalize_whitespace: true,
          rows: [
            { id: "r1", prompt_text: "doctor", accepted_answers: ["a person who helps sick people"] },
            { id: "r2", prompt_text: "pilot", accepted_answers: ["a person who flies a plane"] },
          ],
          token_bank: [],
        };
        break;
      case "sorting_game":
        interactionPayload = {
          type: "interaction",
          subtype: "sorting_game",
          prompt: "Sort each object into the correct container.",
          containers: [
            { id: "c1", display: { text: "Animals" } },
            { id: "c2", display: { text: "Food" } },
          ],
          objects: [
            { id: "o1", display: { text: "cat" }, target_container_id: "c1" },
            { id: "o2", display: { text: "apple" }, target_container_id: "c2" },
            { id: "o3", display: { text: "dog" }, target_container_id: "c1" },
            { id: "o4", display: { text: "bread" }, target_container_id: "c2" },
          ],
          shuffle_objects: true,
          allow_reassign: true,
        };
        break;
      case "treasure_tap":
        interactionPayload = {
          type: "interaction",
          subtype: "click_targets",
          image_url: "https://placehold.co/800x450/e2e8f0/334155?text=Scene",
          body_text: "Find three hidden things!",
          targets: [
            {
              id: "t1",
              x_percent: 12,
              y_percent: 18,
              w_percent: 20,
              h_percent: 22,
              label: "Thing 1",
            },
            {
              id: "t2",
              x_percent: 42,
              y_percent: 38,
              w_percent: 20,
              h_percent: 22,
              label: "Thing 2",
            },
            {
              id: "t3",
              x_percent: 68,
              y_percent: 22,
              w_percent: 20,
              h_percent: 22,
              label: "Thing 3",
            },
            {
              id: "d1",
              x_percent: 20,
              y_percent: 70,
              w_percent: 18,
              h_percent: 18,
              label: "Not this",
            },
          ],
          treasure_target_ids: ["t1", "t2", "t3"],
        };
        break;
      case "essay":
        interactionPayload = {
          type: "interaction",
          subtype: "essay",
          prompt: "Write two sentences about your school.",
          min_chars: 10,
          keywords: [],
          feedback_text: "",
          show_keywords_to_students: false,
        };
        break;
      case "voice_question":
        interactionPayload = {
          type: "interaction",
          subtype: "voice_question",
          prompt: "Record your answer: What did you do this morning?",
          max_duration_seconds: 90,
          max_attempts: 3,
          require_playback_before_submit: false,
        };
        break;
      case "guided_dialogue":
        interactionPayload = {
          type: "interaction",
          subtype: "guided_dialogue",
          character_name: "Mia",
          character_image_url: "https://placehold.co/500x700/fce7f3/831843?text=Character",
          intro_text: "Talk to Mia and complete each speaking turn.",
          turns: [
            {
              id: "turn_1",
              prompt_text: "Hi! What is your name?",
              student_response_label: "Say your name",
              max_duration_seconds: 60,
            },
            {
              id: "turn_2",
              prompt_text: "Nice to meet you. How are you today?",
              student_response_label: "Describe how you feel",
              max_duration_seconds: 60,
            },
          ],
          require_turn_audio_playback: false,
          allow_retry_each_turn: true,
        };
        break;
      case "presentation_interactive":
        interactionPayload = {
          type: "interaction",
          subtype: "presentation_interactive",
          title: "Interactive presentation",
          body_text: "Tap elements and explore the slides.",
          pass_rule: "drag_targets_complete",
          slides: [
            {
              id: "slide1",
              title: "Slide 1",
              background_image_url: "https://placehold.co/1280x800/e2e8f0/334155?text=Slide+1",
              image_fit: "cover",
              elements: [
                {
                  id: "el1",
                  kind: "button",
                  label: "More info",
                  text: "More info",
                  x_percent: 12,
                  y_percent: 14,
                  w_percent: 22,
                  h_percent: 12,
                  z_index: 1,
                  visible: true,
                  draggable_mode: "none",
                  actions: [
                    {
                      type: "info_popup",
                      title: "Welcome",
                      body: "This is an interactive presentation slide.",
                    },
                  ],
                },
              ],
            },
          ],
        };
        break;
      default:
        interactionPayload = {
          type: "interaction",
          subtype: "mc_quiz",
          question: "Question?",
          image_fit: "cover",
          options: [
            { id: "a", label: "Answer A" },
            { id: "b", label: "Answer B" },
          ],
          correct_option_id: "a",
          shuffle_options: false,
        };
    }
    const payload = interactionPayloadSchema.parse(interactionPayload);
    await supabase.from("lesson_screens").insert({
      lesson_id: lessonId,
      order_index,
      screen_type: "interaction",
      payload,
    });
  }
  revalidatePath(`/teacher/modules/${moduleId}/lessons/${lessonId}`);
}

export async function updateScreenPayload(
  screenId: string,
  lessonId: string,
  moduleId: string,
  screenType: string,
  formData: FormData,
) {
  const supabase = await requireTeacher();
  const payloadJson = (formData.get("payload_json") as string) ?? "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadJson);
  } catch {
    throw new Error("Invalid JSON");
  }
  let toStore: unknown;
  if (screenType === "start") {
    toStore = startPayloadSchema.parse(parsed);
  } else if (screenType === "story") {
    toStore = storyPayloadSchema.parse(parsed);
  } else if (screenType === "interaction") {
    toStore = interactionPayloadSchema.parse(parsed);
  } else {
    throw new Error("Unknown screen type");
  }
  const { data, error } = await supabase
    .from("lesson_screens")
    .update({ payload: toStore, updated_at: new Date().toISOString() })
    .eq("id", screenId)
    .eq("lesson_id", lessonId)
    .select("id");
  if (error) throw error;
  if (!data?.length) {
    throw new Error(
      "Screen was not updated (no matching row — check screen id and lesson).",
    );
  }
  revalidatePath(`/teacher/modules/${moduleId}/lessons/${lessonId}`);
}

export async function saveLessonSkills(
  lessonId: string,
  moduleId: string,
  formData: FormData,
) {
  const supabase = await requireTeacher();
  const skillsRaw = (formData.get("skills_raw") as string) ?? "";
  const keys = skillsRaw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  await supabase.from("lesson_skills").delete().eq("lesson_id", lessonId);
  if (keys.length > 0) {
    await supabase.from("lesson_skills").insert(
      keys.map((skill_key) => ({ lesson_id: lessonId, skill_key })),
    );
  }
  revalidatePath(`/teacher/modules/${moduleId}/lessons/${lessonId}`);
}

export async function appendScreensFromAi(
  lessonId: string,
  moduleId: string,
  screens: { screen_type: string; payload: unknown }[],
) {
  const supabase = await requireTeacher();
  const { count } = await supabase
    .from("lesson_screens")
    .select("*", { count: "exact", head: true })
    .eq("lesson_id", lessonId);
  let order = count ?? 0;

  for (const row of screens) {
    const st = row.screen_type;
    const p = row.payload;
    if (st === "start") startPayloadSchema.parse(p);
    else if (st === "story") storyPayloadSchema.parse(p);
    else if (st === "interaction") interactionPayloadSchema.parse(p);
    else throw new Error(`Invalid screen_type ${st}`);
    await supabase.from("lesson_screens").insert({
      lesson_id: lessonId,
      order_index: order++,
      screen_type: st,
      payload: p,
    });
  }
  revalidatePath(`/teacher/modules/${moduleId}/lessons/${lessonId}`);
}

type ActivityLibrarySubtype = Extract<
  InteractionSubtype,
  | "mc_quiz"
  | "true_false"
  | "fill_blanks"
  | "fix_text"
  | "drag_sentence"
  | "listen_hotspot_sequence"
>;

type TeacherSupabase = Awaited<ReturnType<typeof createClient>>;
type ActivityLibrarySettings = {
  shuffle_questions: boolean;
  shuffle_answer_options_each_replay: boolean;
  auto_advance_on_pass_default: boolean;
};

function isTruthyFormValue(value: FormDataEntryValue | undefined): boolean {
  const v = `${value ?? ""}`.toLowerCase();
  return v === "on" || v === "1" || v === "true" || v === "yes";
}

function readCheckbox(formData: FormData, name: string): boolean {
  const values = formData.getAll(name);
  if (values.length === 0) return false;
  return values.some((v) => isTruthyFormValue(v));
}

function asMissingActivityLibrarySchemaError(err: unknown): Error | null {
  const e = err as { code?: string; message?: string; details?: string; hint?: string } | null;
  if (!e) return null;
  const msg = `${e.message ?? ""} ${e.details ?? ""} ${e.hint ?? ""}`.toLowerCase();
  if (e.code === "42P01" || msg.includes("activity_library_items")) {
    return new Error("Activity library schema is not available yet. Run migration 014 first.");
  }
  return null;
}

function parseVocabularyInput(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ).slice(0, 40);
}

function buildActivityItems(
  subtype: ActivityLibrarySubtype,
  vocabulary: string[],
  imageByWord: Record<string, string>,
): unknown[] {
  const words = vocabulary.length > 0 ? vocabulary : ["word"];
  const getImage = (word: string) => imageByWord[word.toLowerCase()];
  const fallbackTypos = (word: string): string[] => {
    if (word.length <= 2) return [`${word}${word.slice(-1)}`, `${word}e`, `${word}s`];
    return [
      `${word.slice(0, 1)}${word.slice(2)}`,
      `${word}${word.slice(-1)}`,
      `${word.slice(0, word.length - 1)}`,
    ];
  };
  const distractorsFor = (word: string): string[] => {
    const others = words
      .filter((w) => w.toLowerCase() !== word.toLowerCase())
      .slice(0, 3);
    if (others.length >= 2) return others.slice(0, 2);
    return fallbackTypos(word).slice(0, 2);
  };
  const sentenceFrame = (word: string, idx: number): string => {
    const frames = [
      `I can see a ${word}.`,
      `This is a ${word}.`,
      `We learned the word "${word}" today.`,
      `Can you find the ${word}?`,
      `The picture shows a ${word}.`,
    ];
    return frames[idx % frames.length] ?? `This is a ${word}.`;
  };
  switch (subtype) {
    case "mc_quiz":
      return words.map((word) => {
        const imageUrl = getImage(word);
        const distractors = distractorsFor(word);
        const idx = words.findIndex((w) => w === word);
        const promptVariant = idx % 4;
        const baseWord = word;
        const typoA = distractors[0] ?? `${baseWord}s`;
        const typoB = distractors[1] ?? `${baseWord}e`;
        if (promptVariant === 1) {
          return {
            type: "interaction",
            subtype: "mc_quiz",
            image_url: imageUrl,
            image_fit: "contain",
            body_text: imageUrl ? "Look at the picture and choose the correct spelling." : undefined,
            question: imageUrl ? "Which spelling is correct?" : "Which spelling is correct?",
            options: [
              { id: "a", label: baseWord },
              { id: "b", label: typoA },
              { id: "c", label: typoB },
            ],
            correct_option_id: "a",
            shuffle_options: true,
          };
        }
        if (promptVariant === 2) {
          return {
            type: "interaction",
            subtype: "mc_quiz",
            image_url: imageUrl,
            image_fit: "contain",
            body_text: imageUrl ? "Read the sentence and choose the missing word." : undefined,
            question: sentenceFrame("__blank__", idx).replace("__blank__", "_____"),
            options: [
              { id: "a", label: baseWord },
              { id: "b", label: typoA },
              { id: "c", label: typoB },
            ],
            correct_option_id: "a",
            shuffle_options: true,
          };
        }
        if (promptVariant === 3) {
          return {
            type: "interaction",
            subtype: "mc_quiz",
            image_url: imageUrl,
            image_fit: "contain",
            body_text: imageUrl ? "Choose the word that matches this picture." : "Choose the correct word.",
            question: "What is this?",
            options: [
              { id: "a", label: baseWord },
              { id: "b", label: typoA },
              { id: "c", label: typoB },
            ],
            correct_option_id: "a",
            shuffle_options: true,
          };
        }
        return {
          type: "interaction",
          subtype: "mc_quiz",
          image_url: imageUrl,
          image_fit: "contain",
          body_text: imageUrl ? "Look at the picture and choose the correct word." : undefined,
          question: imageUrl ? "Which word matches the picture?" : "Which spelling is correct?",
          options: [{ id: "a", label: word }, { id: "b", label: typoA }, { id: "c", label: typoB }],
          correct_option_id: "a",
          shuffle_options: true,
        };
      });
    case "true_false":
      return words.map((word, idx) => {
        const variant = idx % 4;
        const useTrue = variant === 0 || variant === 2;
        const wrongForm = fallbackTypos(word)[0] ?? `${word}s`;
        const statement =
          variant === 0 ? `This is the correct spelling: "${word}".`
          : variant === 1 ? `This is the correct spelling: "${wrongForm}".`
          : variant === 2 ? `The sentence "${sentenceFrame(word, idx)}" uses "${word}" correctly.`
          : `The sentence "${sentenceFrame(wrongForm, idx)}" uses "${word}" correctly.`;
        return {
          type: "interaction",
          subtype: "true_false",
          image_url: getImage(word),
          statement,
          correct: useTrue,
        };
      });
    case "fill_blanks":
      return words.map((word, idx) => {
        const templateVariant = idx % 3;
        const template =
          templateVariant === 0 ? "I can see a __1__ in the picture."
          : templateVariant === 1 ? "This is a __1__."
          : "Today we learned the word __1__.";
        return {
          type: "interaction",
          subtype: "fill_blanks",
          image_fit: "contain",
          image_url: getImage(word),
          template,
          blanks: [{ id: "1", acceptable: [word] }],
          word_bank: [word],
        };
      });
    case "fix_text":
      return words.map((word, idx) => {
        const typo = fallbackTypos(word)[0] ?? word;
        const promptVariant = idx % 3;
        const brokenText =
          promptVariant === 0 ? `I like ${typo}.`
          : promptVariant === 1 ? `This is a ${typo}.`
          : `Can you find the ${typo}?`;
        const acceptable =
          promptVariant === 0 ? [`I like ${word}.`]
          : promptVariant === 1 ? [`This is a ${word}.`]
          : [`Can you find the ${word}?`];
        return {
          type: "interaction",
          subtype: "fix_text",
          image_url: getImage(word),
          image_fit: "contain",
          broken_text: brokenText,
          acceptable,
        };
      });
    case "drag_sentence":
      return words.map((word, idx) => {
        const variant = idx % 3;
        const correctOrder =
          variant === 0 ? ["I", "see", word]
          : variant === 1 ? ["This", "is", word]
          : ["Find", "the", word];
        return {
          type: "interaction",
          subtype: "drag_sentence",
          image_url: getImage(word),
          body_text: "Drag the words to make a sentence.",
          sentence_slots: ["", "", ""],
          word_bank: [...correctOrder].sort(() => Math.random() - 0.5),
          correct_order: correctOrder,
        };
      });
    case "listen_hotspot_sequence":
      return words.map((word, idx) => ({
        type: "interaction",
        subtype: "listen_hotspot_sequence",
        image_url:
          getImage(word) ?? "https://placehold.co/800x450/e2e8f0/334155?text=Listen+and+Find",
        body_text: `Listen and tap ${word}.`,
        prompt_audio_url:
          "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
        targets: [
          {
            id: "t1",
            x_percent: 10 + ((idx * 7) % 55),
            y_percent: 20 + ((idx * 5) % 45),
            w_percent: 22,
            h_percent: 22,
            label: word,
          },
        ],
        order: ["t1"],
        allow_replay: true,
      }));
  }
}

function parseSelectedActivitySubtypes(formData: FormData): ActivityLibrarySubtype[] {
  const rawMulti = formData.getAll("activity_subtypes").map((v) => `${v}`.trim());
  const rawSingle = `${formData.get("activity_subtype") ?? ""}`.trim();
  const raw = rawMulti.length > 0 ? rawMulti : rawSingle ? [rawSingle] : [];
  const allowed: ActivityLibrarySubtype[] = [
    "mc_quiz",
    "true_false",
    "fill_blanks",
    "fix_text",
    "drag_sentence",
    "listen_hotspot_sequence",
  ];
  const selected = Array.from(new Set(raw)).filter((v): v is ActivityLibrarySubtype =>
    allowed.includes(v as ActivityLibrarySubtype),
  );
  return selected.length ? selected : ["mc_quiz"];
}

function normalizeWordForLookup(raw: string): string {
  return raw.trim().toLowerCase();
}

async function findImageByVocabulary(
  supabase: TeacherSupabase,
  vocabulary: string[],
): Promise<Record<string, string>> {
  if (!vocabulary.length) return {};
  const { data, error } = await supabase
    .from("media_assets")
    .select(
      "public_url,original_filename,meta_item_name,meta_tags,meta_alternative_names,meta_plural",
    )
    .like("content_type", "image/%")
    .order("created_at", { ascending: false })
    .limit(800);
  if (error) return {};
  const rows = (data ?? []) as Array<{
    public_url?: string | null;
    original_filename?: string | null;
    meta_item_name?: string | null;
    meta_tags?: string[] | null;
    meta_alternative_names?: string[] | null;
    meta_plural?: string | null;
  }>;
  const out: Record<string, string> = {};
  for (const rawWord of vocabulary) {
    const word = normalizeWordForLookup(rawWord);
    if (!word) continue;
    const found = rows.find((row) => {
      const bag = [
        row.meta_item_name ?? "",
        row.original_filename ?? "",
        row.meta_plural ?? "",
        ...((row.meta_tags ?? []).filter(Boolean) as string[]),
        ...((row.meta_alternative_names ?? []).filter(Boolean) as string[]),
      ]
        .join(" ")
        .toLowerCase();
      return bag.includes(word);
    });
    if (found?.public_url) {
      out[word] = found.public_url;
    }
  }
  return out;
}

function parseActivitySettings(raw: unknown): ActivityLibrarySettings {
  const settings = (raw as { settings?: Record<string, unknown> } | null)?.settings;
  return {
    shuffle_questions:
      settings?.shuffle_questions === true || isTruthyFormValue(settings?.shuffle_questions as string | undefined),
    shuffle_answer_options_each_replay:
      settings?.shuffle_answer_options_each_replay !== false &&
      `${settings?.shuffle_answer_options_each_replay ?? ""}` !== "0",
    auto_advance_on_pass_default:
      settings?.auto_advance_on_pass_default === true ||
      isTruthyFormValue(settings?.auto_advance_on_pass_default as string | undefined),
  };
}

function applySettingsToItems(items: unknown[], settings: ActivityLibrarySettings): unknown[] {
  return items.map((item) => {
    if (!item || typeof item !== "object") return item;
    const maybe = item as {
      subtype?: string;
      shuffle_options?: boolean;
      auto_advance_on_pass?: boolean;
    };
    const next: Record<string, unknown> = { ...maybe };
    if (maybe.subtype === "mc_quiz") {
      next.shuffle_options = settings.shuffle_answer_options_each_replay;
    }
    next.auto_advance_on_pass = settings.auto_advance_on_pass_default;
    return next;
  });
}

function normalizeActivityPayload(raw: unknown): {
  start: unknown;
  items: unknown[];
  settings: ActivityLibrarySettings;
} {
  const fallbackStart = startPayloadSchema.parse({
    type: "start",
    image_url: "https://placehold.co/800x520/e2e8f0/1e293b?text=Start+Activity",
    image_fit: "contain",
    cta_label: "Start activity",
  });
  if (!raw || typeof raw !== "object") {
    return {
      start: fallbackStart,
      items: [],
      settings: {
        shuffle_questions: false,
        shuffle_answer_options_each_replay: true,
        auto_advance_on_pass_default: false,
      },
    };
  }
  const startRaw = (raw as { start?: unknown }).start;
  const itemsRaw = (raw as { items?: unknown[] }).items;
  const settings = parseActivitySettings(raw);
  const start =
    startRaw ? startPayloadSchema.parse(startRaw) : fallbackStart;
  const items = Array.isArray(itemsRaw) ? itemsRaw : [];
  const parsed = items.map((item) => interactionPayloadSchema.parse(item));
  const withSettings = applySettingsToItems(parsed, settings);
  return { start, items: withSettings, settings };
}

export async function createActivityLibraryItem(formData: FormData) {
  const supabase = await requireTeacher();
  const title = `${formData.get("title") ?? ""}`.trim();
  const selectedSubtypes = parseSelectedActivitySubtypes(formData);
  const subtype = selectedSubtypes[0]!;
  const level = `${formData.get("level") ?? ""}`.trim();
  const topic = `${formData.get("topic") ?? ""}`.trim();
  const vocabulary = parseVocabularyInput(`${formData.get("vocabulary_raw") ?? ""}`);
  if (!title) throw new Error("Title is required");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const imageByWord = await findImageByVocabulary(supabase, vocabulary);
  const items = selectedSubtypes
    .flatMap((selectedSubtype) => buildActivityItems(selectedSubtype, vocabulary, imageByWord))
    .map((item) => interactionPayloadSchema.parse(item));
  const firstWord = vocabulary[0] ?? "activity";
  const startImage =
    imageByWord[firstWord.toLowerCase()] ??
    (items.find((item) => typeof item === "object" && item && "image_url" in item) as { image_url?: string })
      ?.image_url ??
    "https://placehold.co/800x520/e2e8f0/1e293b?text=Start+Activity";
  const start = startPayloadSchema.parse({
    type: "start",
    image_url: startImage,
    image_fit: "contain",
    cta_label: "Start activity",
    read_aloud_title: title,
  });
  const settings: ActivityLibrarySettings = {
    shuffle_questions: false,
    shuffle_answer_options_each_replay: true,
    auto_advance_on_pass_default: false,
  };
  const payload = {
    start,
    items: applySettingsToItems(items, settings),
    settings: {
      ...settings,
      activity_subtypes: selectedSubtypes,
    },
  };
  const { error } = await supabase.from("activity_library_items").insert({
    title,
    activity_subtype: subtype,
    level,
    topic,
    vocabulary,
    payload,
    question_count: items.length,
    created_by: user.id,
  });
  if (error) throw asMissingActivityLibrarySchemaError(error) ?? error;
  revalidatePath("/teacher/activities");
}

export async function updateActivityLibraryItem(formData: FormData) {
  const supabase = await requireTeacher();
  const id = `${formData.get("id") ?? ""}`.trim();
  const title = `${formData.get("title") ?? ""}`.trim();
  const level = `${formData.get("level") ?? ""}`.trim();
  const topic = `${formData.get("topic") ?? ""}`.trim();
  const vocabulary = parseVocabularyInput(`${formData.get("vocabulary_raw") ?? ""}`);
  const settings: ActivityLibrarySettings = {
    shuffle_questions: readCheckbox(formData, "shuffle_questions"),
    shuffle_answer_options_each_replay: readCheckbox(formData, "shuffle_answer_options_each_replay"),
    auto_advance_on_pass_default: readCheckbox(formData, "auto_advance_on_pass_default"),
  };
  const editorModuleIdFromForm = `${formData.get("editor_module_id") ?? ""}`.trim();
  const editorLessonIdFromForm = `${formData.get("editor_lesson_id") ?? ""}`.trim();
  const payloadJson = `${formData.get("payload_json") ?? ""}`.trim();
  if (!id || !title) throw new Error("Missing required fields");
  let payload: {
    start: unknown;
    items: unknown[];
    settings: ActivityLibrarySettings & Record<string, unknown>;
  };
  if (payloadJson) {
    payload = normalizeActivityPayload(JSON.parse(payloadJson));
  } else {
    const existing = await supabase
      .from("activity_library_items")
      .select("payload")
      .eq("id", id)
      .single();
    if (existing.error) throw existing.error;
    payload = normalizeActivityPayload(existing.data.payload);
    const linkedLessonId =
      editorLessonIdFromForm ||
      `${(payload.settings as Record<string, unknown> | undefined)?.editor_lesson_id ?? ""}`;
    if (typeof linkedLessonId === "string" && linkedLessonId.length > 0) {
      const lessonScreens = await supabase
        .from("lesson_screens")
        .select("screen_type,payload,order_index")
        .eq("lesson_id", linkedLessonId)
        .order("order_index", { ascending: true });
      if (lessonScreens.error) {
        throw new Error(
          `Could not load linked editor lesson screens (${linkedLessonId}): ${lessonScreens.error.message}`,
        );
      }
      if ((lessonScreens.data?.length ?? 0) > 0) {
        const startFromLesson =
          lessonScreens.data?.find((s) => s.screen_type === "start")?.payload ?? payload.start;
        const itemsFromLesson =
          lessonScreens.data
            ?.filter((s) => s.screen_type === "interaction")
            .map((s) => interactionPayloadSchema.parse(s.payload)) ?? payload.items;
        payload = {
          ...payload,
          start: startPayloadSchema.parse(startFromLesson),
          items: itemsFromLesson,
        };
      }
    }
  }
  payload.settings = {
    ...(payload.settings ?? {}),
    shuffle_questions: settings.shuffle_questions,
    shuffle_answer_options_each_replay: settings.shuffle_answer_options_each_replay,
    auto_advance_on_pass_default: settings.auto_advance_on_pass_default,
    ...(editorModuleIdFromForm ? { editor_module_id: editorModuleIdFromForm } : {}),
    ...(editorLessonIdFromForm ? { editor_lesson_id: editorLessonIdFromForm } : {}),
  };
  payload.items = applySettingsToItems(payload.items, payload.settings);
  const linkedLessonId = `${(payload.settings as Record<string, unknown>)?.editor_lesson_id ?? ""}`;
  if (linkedLessonId) {
    const lessonScreens = await supabase
      .from("lesson_screens")
      .select("id,screen_type,payload")
      .eq("lesson_id", linkedLessonId);
    if (lessonScreens.error) {
      throw new Error(
        `Could not load linked editor lesson screens (${linkedLessonId}): ${lessonScreens.error.message}`,
      );
    }
    const desiredAutoAdvance = settings.auto_advance_on_pass_default;
    for (const row of lessonScreens.data ?? []) {
      if (row.screen_type !== "interaction") continue;
      const parsed = interactionPayloadSchema.safeParse(row.payload);
      if (!parsed.success) continue;
      const nextPayload = {
        ...parsed.data,
        auto_advance_on_pass: desiredAutoAdvance,
      };
      const { error: updateErr } = await supabase
        .from("lesson_screens")
        .update({
          payload: nextPayload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (updateErr) throw updateErr;
    }
  }
  const { error } = await supabase
    .from("activity_library_items")
    .update({
      title,
      level,
      topic,
      vocabulary,
      payload,
      question_count: payload.items.length,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw asMissingActivityLibrarySchemaError(error) ?? error;
  revalidatePath("/teacher/activities");
}

export async function removeActivityLibraryQuestion(formData: FormData) {
  const supabase = await requireTeacher();
  const id = `${formData.get("id") ?? ""}`.trim();
  const index = Number(formData.get("question_index") ?? -1);
  if (!id || index < 0) throw new Error("Missing question target");
  const { data, error } = await supabase
    .from("activity_library_items")
    .select("payload")
    .eq("id", id)
    .single();
  if (error) throw asMissingActivityLibrarySchemaError(error) ?? error;
  const payload = normalizeActivityPayload(data.payload);
  payload.items.splice(index, 1);
  const validated = normalizeActivityPayload(payload);
  const { error: saveErr } = await supabase
    .from("activity_library_items")
    .update({
      payload: validated,
      question_count: validated.items.length,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (saveErr) throw asMissingActivityLibrarySchemaError(saveErr) ?? saveErr;
  revalidatePath("/teacher/activities");
}

export async function deleteActivityLibraryItem(formData: FormData) {
  const supabase = await requireTeacher();
  const id = `${formData.get("id") ?? ""}`.trim();
  if (!id) throw new Error("Missing id");
  const { error } = await supabase.from("activity_library_items").delete().eq("id", id);
  if (error) throw asMissingActivityLibrarySchemaError(error) ?? error;
  revalidatePath("/teacher/activities");
}

export async function openActivityInCourseEditor(formData: FormData) {
  const supabase = await requireTeacher();
  const activityId = `${formData.get("id") ?? ""}`.trim();
  if (!activityId) throw new Error("Missing activity id");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: activity, error: activityErr } = await supabase
    .from("activity_library_items")
    .select("id,title,payload")
    .eq("id", activityId)
    .single();
  if (activityErr) throw activityErr;
  const normalized = normalizeActivityPayload(activity.payload);
  const settings = normalized.settings as ActivityLibrarySettings & {
    editor_module_id?: string;
    editor_lesson_id?: string;
  };

  let courseId: string | null = null;
  {
    const existingCourse = await supabase
      .from("courses")
      .select("id")
      .order("order_index", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (existingCourse.data?.id) {
      courseId = existingCourse.data.id as string;
    } else {
      const courseRows = await supabase.from("courses").select("order_index");
      const orderIndex =
        courseRows.data?.length ?
          Math.max(...courseRows.data.map((r) => (r.order_index as number) ?? 0)) + 1
        : 0;
      const createdCourse = await supabase
        .from("courses")
        .insert({
          title: "Activity Library Workspace",
          slug: `activity-library-workspace-${user.id.slice(0, 8)}`,
          target: "Activity Library",
          order_index: orderIndex,
          published: false,
        })
        .select("id")
        .single();
      if (createdCourse.error || !createdCourse.data?.id) {
        throw createdCourse.error ?? new Error("Could not create editor course");
      }
      courseId = createdCourse.data.id as string;
    }
  }

  let moduleId = settings.editor_module_id;
  const moduleSlug = `activity-library-${user.id.slice(0, 8)}`;
  if (!moduleId) {
    const existing = await supabase
      .from("modules")
      .select("id")
      .eq("slug", moduleSlug)
      .eq("published", false)
      .limit(1)
      .maybeSingle();
    if (existing.data?.id) {
      moduleId = existing.data.id as string;
    } else {
      const rows = await supabase.from("modules").select("order_index").eq("published", false);
      const orderIndex =
        rows.data?.length ? Math.max(...rows.data.map((r) => (r.order_index as number) ?? 0)) + 1 : 0;
      const created = await supabase
        .from("modules")
        .insert({
          title: "Activity Library Editor",
          slug: moduleSlug,
          course_id: courseId,
          order_index: orderIndex,
          published: false,
        })
        .select("id")
        .single();
      if (created.error || !created.data?.id) throw created.error ?? new Error("Could not create editor module");
      moduleId = created.data.id as string;
    }
  }

  let lessonId = settings.editor_lesson_id;
  if (!lessonId) {
    const lessonSlug = `activity-${activityId}`;
    const existingLesson = await supabase
      .from("lessons")
      .select("id")
      .eq("module_id", moduleId)
      .eq("slug", lessonSlug)
      .limit(1)
      .maybeSingle();
    if (existingLesson.data?.id) {
      lessonId = existingLesson.data.id as string;
    } else {
      const lessonRows = await supabase.from("lessons").select("order_index").eq("module_id", moduleId);
      const orderIndex =
        lessonRows.data?.length ?
          Math.max(...lessonRows.data.map((r) => (r.order_index as number) ?? 0)) + 1
        : 0;
      const createdLesson = await supabase
        .from("lessons")
        .insert({
          module_id: moduleId,
          title: `${activity.title} (Activity Library)`,
          slug: lessonSlug,
          order_index: orderIndex,
          published: false,
        })
        .select("id")
        .single();
      if (createdLesson.error || !createdLesson.data?.id) {
        throw createdLesson.error ?? new Error("Could not create editor lesson");
      }
      lessonId = createdLesson.data.id as string;
    }
  }

  const existingScreens = await supabase
    .from("lesson_screens")
    .select("id", { count: "exact", head: true })
    .eq("lesson_id", lessonId);
  const hasExistingScreens = (existingScreens.count ?? 0) > 0;
  if (!hasExistingScreens) {
    const screensToInsert = [
      { screen_type: "start", payload: normalized.start },
      ...normalized.items.map((payload) => ({ screen_type: "interaction", payload })),
    ];
    for (let i = 0; i < screensToInsert.length; i += 1) {
      const row = screensToInsert[i]!;
      await supabase.from("lesson_screens").insert({
        lesson_id: lessonId,
        order_index: i,
        screen_type: row.screen_type,
        payload: row.payload,
      });
    }
  } else {
    const desiredAutoAdvance = normalized.settings.auto_advance_on_pass_default;
    const lessonScreens = await supabase
      .from("lesson_screens")
      .select("id,screen_type,payload")
      .eq("lesson_id", lessonId);
    if (lessonScreens.error) throw lessonScreens.error;
    for (const row of lessonScreens.data ?? []) {
      if (row.screen_type !== "interaction") continue;
      const parsed = interactionPayloadSchema.safeParse(row.payload);
      if (!parsed.success) continue;
      const nextPayload = {
        ...parsed.data,
        auto_advance_on_pass: desiredAutoAdvance,
      };
      const { error: updateErr } = await supabase
        .from("lesson_screens")
        .update({
          payload: nextPayload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (updateErr) throw updateErr;
    }
  }

  const nextSettings = {
    ...normalized.settings,
    editor_module_id: moduleId,
    editor_lesson_id: lessonId,
  };
  await supabase
    .from("activity_library_items")
    .update({
      payload: { ...normalized, settings: nextSettings },
      updated_at: new Date().toISOString(),
    })
    .eq("id", activityId);

  revalidatePath("/teacher/activities");
  redirect(`/teacher/modules/${moduleId}/lessons/${lessonId}`);
}
