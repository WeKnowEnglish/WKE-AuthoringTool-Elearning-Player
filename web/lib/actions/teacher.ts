"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  interactionPayloadSchema,
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
  await supabase.from("lesson_screens").insert({
    lesson_id: lessonId,
    order_index,
    screen_type: row.screen_type,
    payload: payloadToInsert,
  });
  await renumberScreens(supabase, lessonId);
  revalidatePath(`/teacher/modules/${moduleId}/lessons/${lessonId}`);
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
    .select("id")
    .eq("lesson_id", lessonId)
    .order("order_index", { ascending: true });
  if (!data) return;
  for (let i = 0; i < data.length; i++) {
    await supabase
      .from("lesson_screens")
      .update({ order_index: i, updated_at: new Date().toISOString() })
      .eq("id", data[i].id);
  }
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
