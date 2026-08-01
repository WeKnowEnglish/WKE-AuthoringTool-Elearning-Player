import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  bankPathForStudioActivity,
  playPathForStudioActivity,
} from "@/lib/studio-activities/paths";
import type {
  PublishStudioActivityInput,
  PublishStudioActivityResult,
  StudioActivityFormat,
} from "@/lib/studio-activities/types";
import {
  isStudioActivityFormat,
  normalizeStudioActivitySource,
  normalizeStudioActivityTitle,
  validateStudioActivityPack,
} from "@/lib/studio-activities/validate";

export class StudioActivityValidationError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "StudioActivityValidationError";
  }
}

export async function publishStudioActivity(
  supabase: SupabaseClient,
  user: User,
  input: PublishStudioActivityInput,
): Promise<PublishStudioActivityResult> {
  if (!isStudioActivityFormat(input.format)) {
    throw new StudioActivityValidationError(
      "format must be one of: multiple_choice, letter_mixup, flashcards, listen_and_choose, line_match, true_false, sentence_scramble, fill_blanks, learning_track, vocabulary_list, explore_hotspots, picture_cloze, verb_table, sentence_columns, word_annotation, picture_writing, question_writing, definition_match, cloze_choice, cloze_open, read_and_answer, picture_story.",
    );
  }
  const format = input.format as StudioActivityFormat;

  let validated: ReturnType<typeof validateStudioActivityPack>;
  try {
    validated = validateStudioActivityPack(format, input.pack, input.authoring);
  } catch (error) {
    throw new StudioActivityValidationError(
      error instanceof Error ? error.message : "Invalid pack.",
    );
  }

  let title: string;
  try {
    title = normalizeStudioActivityTitle(
      input.title?.trim() || validated.defaultTitle,
    );
  } catch (error) {
    throw new StudioActivityValidationError(
      error instanceof Error ? error.message : "Invalid title.",
    );
  }

  const source = normalizeStudioActivitySource(input.source, {
    ...(input.filename?.trim() ? { filename: input.filename.trim() } : {}),
    publishedAt: new Date().toISOString(),
  });

  const updateId = typeof input.id === "string" ? input.id.trim() : "";
  const now = new Date().toISOString();

  if (updateId) {
    const { data: row, error } = await supabase
      .from("studio_activities")
      .update({
        format,
        title,
        pack: validated.pack,
        authoring: validated.authoring,
        source,
        updated_at: now,
      })
      .eq("id", updateId)
      .eq("teacher_id", user.id)
      .select("id, title, format, created_at")
      .maybeSingle();

    if (error) {
      const hint =
        /studio_activities|schema cache|does not exist|vocabulary_list/i.test(
          error.message,
        )
          ? " Apply migrations 070_studio_activities.sql and 074_studio_activities_vocabulary_list.sql."
          : "";
      throw new Error(`${error.message}${hint}`);
    }
    if (!row) {
      throw new StudioActivityValidationError(
        "Activity not found. It may belong to another teacher or was deleted.",
      );
    }

    const id = row.id as string;
    return {
      id,
      title: row.title as string,
      format: row.format as StudioActivityFormat,
      playPath: playPathForStudioActivity(format, id),
      bankPath: bankPathForStudioActivity(id),
      created_at: row.created_at as string,
    };
  }

  const { data: row, error } = await supabase
    .from("studio_activities")
    .insert({
      teacher_id: user.id,
      format,
      title,
      pack: validated.pack,
      authoring: validated.authoring,
      source,
    })
    .select("id, title, format, created_at")
    .single();

  if (error || !row) {
    const hint =
      /studio_activities|schema cache|does not exist|vocabulary_list/i.test(
        error?.message ?? "",
      )
        ? " Apply migrations 070_studio_activities.sql and 074_studio_activities_vocabulary_list.sql."
        : "";
    throw new Error(`${error?.message ?? "Could not save studio activity."}${hint}`);
  }

  const id = row.id as string;
  return {
    id,
    title: row.title as string,
    format: row.format as StudioActivityFormat,
    playPath: playPathForStudioActivity(format, id),
    bankPath: bankPathForStudioActivity(id),
    created_at: row.created_at as string,
  };
}
