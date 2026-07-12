import "server-only";

import { randomBytes } from "node:crypto";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role-client";
import type { LiveGameQuestionRow } from "@/lib/live-game/question-banks/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type SourceSetRow = {
  id: string;
  slug: string;
  title: string;
  level: "A1" | "A2";
  topic: string;
  learning_objective: string;
  description: string;
  version: number;
};

type SourceQuestionRow = {
  bank: LiveGameQuestionRow["bank"];
  sort_order: number;
  prompt: string;
  payload: unknown;
  enabled: boolean;
};

async function loadPublishedSource(setId: string): Promise<{
  set: SourceSetRow;
  questions: SourceQuestionRow[];
} | null> {
  const admin = createServiceRoleSupabase();
  if (!admin) return null;

  const { data: setData, error: setError } = await admin
    .from("live_game_question_sets")
    .select("id, slug, title, level, topic, learning_objective, description, version")
    .eq("id", setId)
    .eq("status", "published")
    .maybeSingle();
  if (setError || !setData) return null;

  const { data: questions, error: questionError } = await admin
    .from("live_game_questions")
    .select("bank, sort_order, prompt, payload, enabled")
    .eq("set_id", setId)
    .order("bank", { ascending: true })
    .order("sort_order", { ascending: true });
  if (questionError || !questions) return null;

  return {
    set: setData as SourceSetRow,
    questions: questions as SourceQuestionRow[],
  };
}

function buildDuplicateSlug(sourceSlug: string): string {
  const suffix = randomBytes(4).toString("hex");
  const base = `${sourceSlug}-copy-${suffix}`;
  return base.slice(0, 120);
}

export async function duplicateQuestionSetForTeacher(
  sourceSetId: string,
  teacherId: string,
  supabase: SupabaseClient,
): Promise<{ id: string; slug: string; title: string }> {
  const source = await loadPublishedSource(sourceSetId);
  if (!source) {
    throw new Error("Source question set not found or not published.");
  }

  const newId = crypto.randomUUID();
  let slug = buildDuplicateSlug(source.set.slug);
  let title = `${source.set.title} (copy)`;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { error: insertError } = await supabase.from("live_game_question_sets").insert({
      id: newId,
      slug,
      title,
      level: source.set.level,
      topic: source.set.topic,
      learning_objective: source.set.learning_objective,
      description: source.set.description,
      version: 1,
      status: "draft",
      visibility: "teacher",
      sort_order: 0,
      created_by: teacherId,
      updated_at: new Date().toISOString(),
    });
    if (!insertError) break;
    if (insertError.code !== "23505" || attempt === 4) {
      throw new Error(`Could not duplicate question set: ${insertError.message}`);
    }
    slug = buildDuplicateSlug(source.set.slug);
  }

  if (source.questions.length > 0) {
    const rows = source.questions.map((question) => ({
      id: crypto.randomUUID(),
      set_id: newId,
      bank: question.bank,
      sort_order: question.sort_order,
      prompt: question.prompt,
      payload: question.payload,
      enabled: question.enabled,
      legacy_source_id: null,
      updated_at: new Date().toISOString(),
    }));
    const { error: questionsError } = await supabase.from("live_game_questions").insert(rows);
    if (questionsError) {
      await supabase.from("live_game_question_sets").delete().eq("id", newId);
      throw new Error(`Could not duplicate questions: ${questionsError.message}`);
    }
  }

  return { id: newId, slug, title };
}
