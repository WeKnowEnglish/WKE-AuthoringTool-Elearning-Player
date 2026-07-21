"use server";

import { revalidatePath } from "next/cache";
import { isStudent, isTeacher } from "@/lib/auth/roles";
import {
  normalizeDueAt,
  normalizeHomeworkInstructions,
  normalizeHomeworkPayload,
  normalizeHomeworkTitle,
} from "@/lib/class-homework/normalize";
import { getAssignableActivityAdapter } from "@/lib/assignable-activities/registry";
import {
  freezePackFlashcardsPayload,
  parseStoredPackFlashcardCards,
} from "@/lib/class-homework/freeze-pack-flashcards";
import { freezePackQuizPayload, parseStoredPackQuizQuestions } from "@/lib/class-homework/freeze-pack-quiz";
import type { ClassHomework, ClassHomeworkStatus } from "@/lib/class-homework/types";
import { getClassHomework } from "@/lib/data/class-homework";
import { createClient } from "@/lib/supabase/server";
import {
  normalizePackFlashcardOptions,
  type PackFlashcardOptions,
} from "@/lib/vocabulary/pack-flashcards";
export type ClassHomeworkActionResult =
  | { ok: true; homework: ClassHomework }
  | { ok: false; error: string };

async function requireTeacherUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !isTeacher(user)) {
    throw new Error("Teacher authentication required.");
  }
  return user.id;
}

function revalidateClass(classId: string) {
  revalidatePath(`/teacher/classes/${classId}`);
  revalidatePath("/primary");
}

export async function createClassHomework(input: {
  classId: string;
  title?: string;
}): Promise<ClassHomeworkActionResult> {
  try {
    const teacherId = await requireTeacherUserId();
    const classId = input.classId.trim();
    if (!classId) return { ok: false, error: "Missing class." };

    const supabase = await createClient();
    const { data: ownedClass, error: classError } = await supabase
      .from("teacher_classes")
      .select("id")
      .eq("id", classId)
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (classError) return { ok: false, error: classError.message };
    if (!ownedClass) return { ok: false, error: "Class not found." };

    const title = normalizeHomeworkTitle(input.title, "New homework");
    const { data, error } = await supabase
      .from("class_homework")
      .insert({
        class_id: classId,
        teacher_id: teacherId,
        title,
        instructions: "",
        status: "draft",
        payload: { type: "external_note", body: "Complete this homework." },
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      return { ok: false, error: error?.message ?? "Could not create homework." };
    }

    const homework = await getClassHomework(data.id);
    if (!homework) return { ok: false, error: "Homework created but could not be loaded." };

    revalidateClass(classId);
    return { ok: true, homework };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not create homework.",
    };
  }
}

export async function saveClassHomework(input: {
  homeworkId: string;
  title: string;
  instructions?: string;
  dueAt?: string | null;
  status?: ClassHomeworkStatus;
  payload: unknown;
}): Promise<ClassHomeworkActionResult> {
  try {
    const teacherId = await requireTeacherUserId();
    const homeworkId = input.homeworkId.trim();
    if (!homeworkId) return { ok: false, error: "Missing homework." };

    const supabase = await createClient();
    const { data: existing, error: existingError } = await supabase
      .from("class_homework")
      .select("id, class_id, status, assigned_at, payload")
      .eq("id", homeworkId)
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (existingError) return { ok: false, error: existingError.message };
    if (!existing) return { ok: false, error: "Homework not found." };

    let payload = normalizeHomeworkPayload(input.payload);
    if (!payload) {
      return { ok: false, error: "Choose a valid homework type and complete the fields." };
    }

    if (payload.type === "pack_quiz") {
      const { data: quiz, error: quizError } = await supabase
        .from("teacher_pack_quizzes")
        .select("title, questions, archived_at")
        .eq("id", payload.quizId)
        .eq("teacher_id", teacherId)
        .maybeSingle();
      if (quizError) return { ok: false, error: quizError.message };
      if (!quiz || quiz.archived_at) {
        return { ok: false, error: "Pack quiz not found." };
      }
      const sourceQuestions = parseStoredPackQuizQuestions(quiz.questions);
      if (sourceQuestions.length < 1) {
        return { ok: false, error: "Pack quiz needs at least one question." };
      }
      payload = freezePackQuizPayload({
        quizId: payload.quizId,
        quizTitle: payload.quizTitle || String(quiz.title ?? "Pack quiz"),
        questions: sourceQuestions,
      });
    }

    if (payload.type === "pack_flashcards") {
      const { data: set, error: setError } = await supabase
        .from("teacher_pack_flashcard_sets")
        .select("title, cards, options, archived_at")
        .eq("id", payload.setId)
        .eq("teacher_id", teacherId)
        .maybeSingle();
      if (setError) return { ok: false, error: setError.message };
      if (!set || set.archived_at) {
        return { ok: false, error: "Flashcard set not found." };
      }
      const sourceCards = parseStoredPackFlashcardCards(set.cards);
      if (sourceCards.length < 1) {
        return { ok: false, error: "Flashcard set needs at least one card." };
      }
      let options: PackFlashcardOptions | null = null;
      if (set.options && typeof set.options === "object" && !Array.isArray(set.options)) {
        const raw = set.options as Record<string, unknown>;
        options = normalizePackFlashcardOptions({
          includeFaces: Array.isArray(raw.includeFaces)
            ? (raw.includeFaces as PackFlashcardOptions["includeFaces"])
            : [],
          frontFaces: Array.isArray(raw.frontFaces)
            ? (raw.frontFaces as PackFlashcardOptions["frontFaces"])
            : [],
          backFaces: Array.isArray(raw.backFaces)
            ? (raw.backFaces as PackFlashcardOptions["backFaces"])
            : [],
          shuffle: Boolean(raw.shuffle),
        });
      }
      payload = freezePackFlashcardsPayload({
        setId: payload.setId,
        setTitle: payload.setTitle || String(set.title ?? "Flashcards"),
        cards: sourceCards,
        options,
      });
    }

    const status: ClassHomeworkStatus =
      input.status === "draft" || input.status === "assigned" || input.status === "closed"
        ? input.status
        : existing.status === "assigned" ||
            existing.status === "closed" ||
            existing.status === "draft"
          ? (existing.status as ClassHomeworkStatus)
          : "draft";

    if (status === "assigned" || status === "closed") {
      if (payload.type === "pack_quiz" && payload.questionCount < 1) {
        return { ok: false, error: "Pack quiz needs at least one question." };
      }
      if (payload.type === "pack_flashcards" && payload.cardCount < 1) {
        return { ok: false, error: "Flashcard set needs at least one card." };
      }
      if (payload.type === "word_pack_practice" && payload.wordCount < 1) {
        return { ok: false, error: "Word pack needs at least one word." };
      }
    }

    const assignedAt =
      status === "assigned"
        ? existing.assigned_at ?? new Date().toISOString()
        : status === "draft"
          ? null
          : existing.assigned_at;

    if (payload.type === "pack_quiz" && status === "assigned") {
      await supabase
        .from("teacher_pack_quizzes")
        .update({ status: "published", updated_at: new Date().toISOString() })
        .eq("id", payload.quizId)
        .eq("teacher_id", teacherId);
    }

    if (payload.type === "pack_flashcards" && status === "assigned") {
      await supabase
        .from("teacher_pack_flashcard_sets")
        .update({ status: "published", updated_at: new Date().toISOString() })
        .eq("id", payload.setId)
        .eq("teacher_id", teacherId);
    }

    const { error: updateError } = await supabase
      .from("class_homework")
      .update({
        title: normalizeHomeworkTitle(input.title),
        instructions: normalizeHomeworkInstructions(input.instructions),
        due_at: normalizeDueAt(input.dueAt),
        status,
        payload,
        assigned_at: assignedAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", homeworkId)
      .eq("teacher_id", teacherId);

    if (updateError) return { ok: false, error: updateError.message };

    const homework = await getClassHomework(homeworkId);
    if (!homework) return { ok: false, error: "Homework saved but could not be loaded." };

    revalidateClass(String(existing.class_id));
    return { ok: true, homework };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not save homework.",
    };
  }
}

export async function deleteClassHomework(homeworkId: string): Promise<
  | { ok: true; classId: string }
  | { ok: false; error: string }
> {
  try {
    const teacherId = await requireTeacherUserId();
    const id = homeworkId.trim();
    if (!id) return { ok: false, error: "Missing homework." };

    const supabase = await createClient();
    const { data: existing, error: existingError } = await supabase
      .from("class_homework")
      .select("id, class_id")
      .eq("id", id)
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (existingError) return { ok: false, error: existingError.message };
    if (!existing) return { ok: false, error: "Homework not found." };

    const { error } = await supabase
      .from("class_homework")
      .delete()
      .eq("id", id)
      .eq("teacher_id", teacherId);

    if (error) return { ok: false, error: error.message };

    revalidateClass(String(existing.class_id));
    return { ok: true, classId: String(existing.class_id) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not delete homework.",
    };
  }
}

/**
 * Create class homework from a saved pack quiz (Quizzes tab → Assign).
 * Optionally links the source word pack to the target class.
 */
export async function assignPackQuizAsHomework(input: {
  quizId: string;
  classId: string;
  title?: string;
  instructions?: string;
  dueAt?: string | null;
  status: "draft" | "assigned";
  linkPackToClass?: boolean;
}): Promise<ClassHomeworkActionResult> {
  try {
    const teacherId = await requireTeacherUserId();
    const quizId = input.quizId.trim();
    const classId = input.classId.trim();
    if (!quizId) return { ok: false, error: "Missing quiz." };
    if (!classId) return { ok: false, error: "Choose a class." };

    const status: ClassHomeworkStatus =
      input.status === "assigned" ? "assigned" : "draft";

    const supabase = await createClient();

    const { data: ownedClass, error: classError } = await supabase
      .from("teacher_classes")
      .select("id, archived_at")
      .eq("id", classId)
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (classError) {
      if (/teacher_classes|schema cache|does not exist/i.test(classError.message)) {
        return { ok: false, error: "Classes aren’t available yet." };
      }
      return { ok: false, error: classError.message };
    }
    if (!ownedClass || ownedClass.archived_at) {
      return { ok: false, error: "Class not found." };
    }

    const { data: quiz, error: quizError } = await supabase
      .from("teacher_pack_quizzes")
      .select("id, title, pack_id, questions, archived_at")
      .eq("id", quizId)
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (quizError) {
      if (/teacher_pack_quizzes|schema cache|does not exist/i.test(quizError.message)) {
        return {
          ok: false,
          error: "Quizzes aren’t available yet — apply migration 061_teacher_pack_quizzes.",
        };
      }
      return { ok: false, error: quizError.message };
    }
    if (!quiz || quiz.archived_at) {
      return { ok: false, error: "Quiz not found." };
    }

    let payload;
    try {
      payload = await getAssignableActivityAdapter("pack_mc_quiz").toHomeworkPayload(quizId);
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not prepare quiz for homework.",
      };
    }
    if (payload.type !== "pack_quiz" || payload.questionCount < 1) {
      return { ok: false, error: "Could not freeze quiz questions." };
    }

    const packId = typeof quiz.pack_id === "string" ? quiz.pack_id : null;
    if (input.linkPackToClass && packId) {
      const { data: pack, error: packError } = await supabase
        .from("teacher_word_packs")
        .select("id, class_id, archived_at")
        .eq("id", packId)
        .eq("teacher_id", teacherId)
        .maybeSingle();

      if (packError) return { ok: false, error: packError.message };
      if (!pack || pack.archived_at) {
        return { ok: false, error: "Word pack not found." };
      }

      if (pack.class_id !== classId) {
        const { error: linkError } = await supabase
          .from("teacher_word_packs")
          .update({
            class_id: classId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", packId)
          .eq("teacher_id", teacherId);

        if (linkError) return { ok: false, error: linkError.message };
        if (typeof pack.class_id === "string" && pack.class_id) {
          revalidatePath(`/teacher/classes/${pack.class_id}`);
        }
        revalidatePath(`/teacher/word-packs/${packId}`);
      }
    }

    const now = new Date().toISOString();
    const title = normalizeHomeworkTitle(input.title, payload.quizTitle);
    const instructions = normalizeHomeworkInstructions(input.instructions);
    const dueAt = normalizeDueAt(input.dueAt);

    const { data: inserted, error: insertError } = await supabase
      .from("class_homework")
      .insert({
        class_id: classId,
        teacher_id: teacherId,
        title,
        instructions,
        due_at: dueAt,
        status,
        payload,
        assigned_at: status === "assigned" ? now : null,
        updated_at: now,
      })
      .select("id")
      .single();

    if (insertError || !inserted?.id) {
      if (/class_homework|schema cache|does not exist/i.test(insertError?.message ?? "")) {
        return {
          ok: false,
          error: "Homework isn’t available yet — apply migration 064_class_homework.",
        };
      }
      return { ok: false, error: insertError?.message ?? "Could not create homework." };
    }

    if (status === "assigned") {
      await supabase
        .from("teacher_pack_quizzes")
        .update({ status: "published", updated_at: now })
        .eq("id", quizId)
        .eq("teacher_id", teacherId);
    }

    const homework = await getClassHomework(inserted.id);
    if (!homework) {
      return { ok: false, error: "Homework created but could not be loaded." };
    }

    revalidateClass(classId);
    revalidatePath("/teacher/word-packs");
    return { ok: true, homework };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not assign quiz as homework.",
    };
  }
}

export async function assignPackFlashcardSetAsHomework(input: {
  setId: string;
  classId: string;
  title?: string;
  instructions?: string;
  dueAt?: string | null;
  status?: "draft" | "assigned";
  linkPackToClass?: boolean;
}): Promise<ClassHomeworkActionResult> {
  try {
    const teacherId = await requireTeacherUserId();
    const setId = input.setId.trim();
    const classId = input.classId.trim();
    if (!setId) return { ok: false, error: "Missing flashcard set." };
    if (!classId) return { ok: false, error: "Choose a class." };

    const status: ClassHomeworkStatus =
      input.status === "assigned" ? "assigned" : "draft";

    const supabase = await createClient();

    const { data: ownedClass, error: classError } = await supabase
      .from("teacher_classes")
      .select("id, archived_at")
      .eq("id", classId)
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (classError) {
      if (/teacher_classes|schema cache|does not exist/i.test(classError.message)) {
        return { ok: false, error: "Classes aren’t available yet." };
      }
      return { ok: false, error: classError.message };
    }
    if (!ownedClass || ownedClass.archived_at) {
      return { ok: false, error: "Class not found." };
    }

    const { data: set, error: setError } = await supabase
      .from("teacher_pack_flashcard_sets")
      .select("id, title, pack_id, cards, archived_at")
      .eq("id", setId)
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (setError) {
      if (/teacher_pack_flashcard_sets|schema cache|does not exist/i.test(setError.message)) {
        return {
          ok: false,
          error: "Flashcards aren’t available yet — apply migration 068_teacher_pack_flashcard_sets.",
        };
      }
      return { ok: false, error: setError.message };
    }
    if (!set || set.archived_at) {
      return { ok: false, error: "Flashcard set not found." };
    }

    let payload;
    try {
      payload = await getAssignableActivityAdapter("pack_flashcards").toHomeworkPayload(setId);
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Could not prepare flashcards for homework.",
      };
    }
    if (payload.type !== "pack_flashcards" || payload.cardCount < 1) {
      return { ok: false, error: "Could not freeze flashcard set." };
    }

    const packId = typeof set.pack_id === "string" ? set.pack_id : null;
    if (input.linkPackToClass && packId) {
      const { data: pack, error: packError } = await supabase
        .from("teacher_word_packs")
        .select("id, class_id, archived_at")
        .eq("id", packId)
        .eq("teacher_id", teacherId)
        .maybeSingle();

      if (packError) return { ok: false, error: packError.message };
      if (!pack || pack.archived_at) {
        return { ok: false, error: "Word pack not found." };
      }

      if (pack.class_id !== classId) {
        const { error: linkError } = await supabase
          .from("teacher_word_packs")
          .update({
            class_id: classId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", packId)
          .eq("teacher_id", teacherId);

        if (linkError) return { ok: false, error: linkError.message };
        if (typeof pack.class_id === "string" && pack.class_id) {
          revalidatePath(`/teacher/classes/${pack.class_id}`);
        }
        revalidatePath(`/teacher/word-packs/${packId}`);
      }
    }

    const now = new Date().toISOString();
    const title = normalizeHomeworkTitle(input.title, payload.setTitle);
    const instructions = normalizeHomeworkInstructions(input.instructions);
    const dueAt = normalizeDueAt(input.dueAt);

    const { data: inserted, error: insertError } = await supabase
      .from("class_homework")
      .insert({
        class_id: classId,
        teacher_id: teacherId,
        title,
        instructions,
        due_at: dueAt,
        status,
        payload,
        assigned_at: status === "assigned" ? now : null,
        updated_at: now,
      })
      .select("id")
      .single();

    if (insertError || !inserted?.id) {
      if (/class_homework|schema cache|does not exist/i.test(insertError?.message ?? "")) {
        return {
          ok: false,
          error: "Homework isn’t available yet — apply migration 064_class_homework.",
        };
      }
      return { ok: false, error: insertError?.message ?? "Could not create homework." };
    }

    if (status === "assigned") {
      await supabase
        .from("teacher_pack_flashcard_sets")
        .update({ status: "published", updated_at: now })
        .eq("id", setId)
        .eq("teacher_id", teacherId);
    }

    const homework = await getClassHomework(inserted.id);
    if (!homework) {
      return { ok: false, error: "Homework created but could not be loaded." };
    }

    revalidateClass(classId);
    revalidatePath("/teacher/word-packs");
    return { ok: true, homework };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not assign flashcards as homework.",
    };
  }
}

export type RecordHomeworkCompletionResult =
  | { ok: true; finishedAt: string }
  | { ok: false; error: string };

/**
 * Student marks catalog activity homework as finished (upsert one row per student).
 * questions_total stores question count (quiz) or card count (flashcards).
 */
async function recordCatalogHomeworkCompletion(input: {
  homeworkId: string;
  allowedTypes: ReadonlyArray<"pack_quiz" | "pack_flashcards">;
}): Promise<RecordHomeworkCompletionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id || !isStudent(user)) {
      return { ok: false, error: "Student authentication required." };
    }

    const homeworkId = input.homeworkId.trim();
    if (!homeworkId) return { ok: false, error: "Missing homework." };

    const { data: homework, error: homeworkError } = await supabase
      .from("class_homework")
      .select("id, class_id, status, payload")
      .eq("id", homeworkId)
      .maybeSingle();

    if (homeworkError) {
      if (/class_homework|schema cache|does not exist/i.test(homeworkError.message)) {
        return { ok: false, error: "Homework isn’t available yet." };
      }
      return { ok: false, error: homeworkError.message };
    }
    if (!homework) return { ok: false, error: "Homework not found." };
    if (homework.status !== "assigned" && homework.status !== "closed") {
      return { ok: false, error: "This homework isn’t assigned yet." };
    }

    const payload = normalizeHomeworkPayload(homework.payload);
    if (
      !payload ||
      (payload.type !== "pack_quiz" && payload.type !== "pack_flashcards") ||
      !input.allowedTypes.includes(payload.type)
    ) {
      return { ok: false, error: "This homework type can’t be marked complete here." };
    }

    let questionsTotal = 0;
    if (payload.type === "pack_quiz") {
      questionsTotal =
        Array.isArray(payload.questions) && payload.questions.length > 0
          ? payload.questions.length
          : Math.max(0, payload.questionCount);
    } else if (payload.type === "pack_flashcards") {
      questionsTotal =
        Array.isArray(payload.cards) && payload.cards.length > 0
          ? payload.cards.length
          : Math.max(0, payload.cardCount);
    }

    const { data: memberships, error: membershipError } = await supabase.rpc(
      "student_class_memberships",
    );
    if (membershipError) return { ok: false, error: membershipError.message };
    const enrolled = ((memberships ?? []) as Array<{ class_id: string }>).some(
      (row) => row.class_id === homework.class_id,
    );
    if (!enrolled) return { ok: false, error: "You’re not in this class." };

    const now = new Date().toISOString();
    const { data: upserted, error: upsertError } = await supabase
      .from("class_homework_completions")
      .upsert(
        {
          homework_id: homeworkId,
          student_id: user.id,
          finished_at: now,
          questions_total: questionsTotal,
          correct_count: 0,
          updated_at: now,
        },
        { onConflict: "homework_id,student_id" },
      )
      .select("finished_at")
      .single();

    if (upsertError) {
      if (/class_homework_completions|schema cache|does not exist/i.test(upsertError.message)) {
        return {
          ok: false,
          error: "Completions aren’t available yet — apply migration 065_class_homework_completions.",
        };
      }
      return { ok: false, error: upsertError.message };
    }

    revalidatePath("/primary");
    revalidatePath(`/primary/homework/${homeworkId}`);
    revalidatePath(`/teacher/classes/${String(homework.class_id)}`);

    return {
      ok: true,
      finishedAt:
        typeof upserted?.finished_at === "string" ? upserted.finished_at : now,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not save completion.",
    };
  }
}

/**
 * Student marks a pack_quiz homework as finished (upsert one row per student).
 * questionsTotal is taken from the homework payload on the server, not the client.
 */
export async function recordPackQuizHomeworkCompletion(input: {
  homeworkId: string;
}): Promise<RecordHomeworkCompletionResult> {
  return recordCatalogHomeworkCompletion({
    homeworkId: input.homeworkId,
    allowedTypes: ["pack_quiz"],
  });
}

/** Student marks pack_flashcards homework finished after studying the deck. */
export async function recordPackFlashcardsHomeworkCompletion(input: {
  homeworkId: string;
}): Promise<RecordHomeworkCompletionResult> {
  return recordCatalogHomeworkCompletion({
    homeworkId: input.homeworkId,
    allowedTypes: ["pack_flashcards"],
  });
}

