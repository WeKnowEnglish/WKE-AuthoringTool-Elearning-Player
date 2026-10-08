"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { isTeacher, isTeacherLight } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { getClassLesson } from "@/lib/data/class-lessons";
import { getStudioActivityForTeacher } from "@/lib/studio-activities/load";
import { parseGamesFlashcardsLessonPlayerPack } from "@/lib/games-flashcards/parse-games-pack";
import { parseGamesMcQuizLessonPlayerPack } from "@/lib/games-mc-quiz/parse-games-pack";
import { playPathForStudioActivity } from "@/lib/studio-activities/paths";
import { validateVocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/document";
import { compileLessonVocabularyMaterial } from "@/lib/class-lessons/compile-vocabulary";
import { isUuid, LESSON_VOCABULARY_FORMATS, type LessonVocabularyFormat, type LessonVocabularyGeneration } from "@/lib/class-lessons/vocabulary";
import type { ClassLesson, ClassLessonStep } from "@/lib/class-lessons/types";
import { listTeacherLexiconEntries } from "@/lib/data/teacher-lexicon";
import { listPublishedPlatformSearchEntries } from "@/lib/data/platform-lexicon";
import { listMasterLexiconOverrides } from "@/lib/data/platform-lexicon-overrides";
import { getPrimaryVocabularySearchEntries } from "@/lib/vocabulary/primary-candidates";
import { applyMasterOverrides, mergePlatformSearchEntries } from "@/lib/vocabulary/platform-lexicon";

async function requireTeacher() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isTeacher(user)) throw new Error("Teacher authentication required.");
  return { supabase, user };
}

/** Load the same dictionary context used by the standalone vocabulary workspace, on demand. */
export async function getLessonVocabularyEditorContext() {
  const { user } = await requireTeacher();
  const [teacherLexicon, publishedPlatform, overrides] = await Promise.all([
    listTeacherLexiconEntries(), listPublishedPlatformSearchEntries(), listMasterLexiconOverrides(),
  ]);
  return {
    initialPlatformEntries: applyMasterOverrides(mergePlatformSearchEntries(getPrimaryVocabularySearchEntries(), publishedPlatform), overrides),
    initialTeacherLexicon: teacherLexicon,
    showLexiconReviewLink: !isTeacherLight(user),
  };
}

export async function generateLessonVocabularyActivity(input: {
  lessonId: string; expectedUpdatedAt: string; vocabListId: string;
  format: LessonVocabularyFormat; selectedEntryIds: string[]; operationId: string;
}): Promise<{ ok: true; lesson: ClassLesson } | { ok: false; error: string }> {
  try {
    const { supabase, user } = await requireTeacher();
    if (!isUuid(input.lessonId) || !isUuid(input.vocabListId) || !isUuid(input.operationId) ||
        !LESSON_VOCABULARY_FORMATS.includes(input.format) || !Number.isFinite(Date.parse(input.expectedUpdatedAt))) {
      throw new Error("Invalid lesson generation request.");
    }
    const lesson = await getClassLesson(input.lessonId);
    if (!lesson || lesson.teacherId !== user.id || lesson.status === "archived") throw new Error("Lesson not found or cannot be edited.");
    if (!lesson.vocabularySources?.some((source) => source.vocabListId === input.vocabListId)) throw new Error("Attach the vocabulary list to this lesson first.");
    const source = await getStudioActivityForTeacher(supabase, user.id, input.vocabListId);
    if (!source || source.format !== "vocabulary_list") throw new Error("Vocabulary list not found. It may have been deleted.");
    const list = validateVocabularyListDocument(source.authoring);
    // Compile the saved list itself; enrichment belongs in the vocabulary editor
    // so the source fingerprint describes exactly what the teacher reviewed.
    const built = compileLessonVocabularyMaterial(list, input.selectedEntryIds, input.format);
    const pack = input.format === "flashcards" ? parseGamesFlashcardsLessonPlayerPack(built.pack) : parseGamesMcQuizLessonPlayerPack(built.pack);
    const inputHash = createHash("sha256").update(built.inputText).digest("hex");
    const idHash = createHash("sha256").update(`${user.id}:${input.lessonId}:${input.operationId}`).digest("hex");
    const activityId = `${idHash.slice(0, 8)}-${idHash.slice(8, 12)}-5${idHash.slice(13, 16)}-8${idHash.slice(17, 20)}-${idHash.slice(20, 32)}`;
    const generation: LessonVocabularyGeneration = {
      version: 1, adapterVersion: 1, lessonId: lesson.id, sourceName: list.name,
      inputHash, generatedAt: new Date().toISOString(),
      recipe: { kind: "vocabulary_list", version: 1, vocabListId: source.id,
        format: input.format, selectedEntryIds: built.selectedEntryIds, settings: built.settings },
    };
    const flashcards = input.format === "flashcards";
    const title = `${list.name} · ${flashcards ? "Flashcards" : "Vocabulary check"}`.slice(0, 120);
    const step: ClassLessonStep = {
      id: input.operationId, position: lesson.steps.length, kind: "studio_activity", title,
      phase: flashcards ? "teach" : "assessment", durationMinutes: 5,
      teacherAction: flashcards ? "Model meaning and pronunciation, then invite recall." : "Ask students to answer independently and review uncertain meanings.",
      studentAction: flashcards ? "Look, recall the word, and check the meaning." : "Choose the word matching each meaning or picture.",
      config: { activityId, activityTitle: title, format: input.format, playPath: playPathForStudioActivity(input.format, activityId), generation,
        planning: { delivery: "classroom", purpose: flashcards ? "Retrieve and rehearse the selected vocabulary to support the lesson goal." : "Check independent recognition of the selected vocabulary.", successCriteria: flashcards ? "Recall the word before turning the card and check its meaning." : "Choose the correct word for each meaning independently; review errors.", grouping: flashcards ? "whole_class" : "individual", scaffolding: "" },
      },
    };
    const { error } = await supabase.rpc("add_class_lesson_vocabulary_activity", {
      p_lesson_id: lesson.id, p_expected_updated_at: input.expectedUpdatedAt,
      p_vocab_list_id: source.id, p_source_updated_at: source.updated_at,
      p_activity_id: activityId, p_step: step, p_pack: pack, p_authoring: built.authoring,
      p_source: { via: "lesson_vocabulary_generation", vocabListId: source.id,
        generation: generation.recipe, lessonGeneration: generation, itemCount: built.itemCount },
    });
    if (error) throw new Error(error.message);
    const updated = await getClassLesson(lesson.id);
    if (!updated) throw new Error("Material generated but the lesson could not be reloaded. Retry to recover it.");
    revalidatePath(`/teacher/classes/${lesson.classId}`);
    return { ok: true, lesson: updated };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not generate the lesson material." };
  }
}
