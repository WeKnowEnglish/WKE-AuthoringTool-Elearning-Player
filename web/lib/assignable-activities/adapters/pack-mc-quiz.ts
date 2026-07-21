import "server-only";

import { freezePackQuizPayload, parseStoredPackQuizQuestions } from "@/lib/class-homework/freeze-pack-quiz";
import type { ClassHomeworkPayload } from "@/lib/class-homework/types";
import { listTeacherPackQuizzesForClass } from "@/lib/data/class-homework";
import { isTeacher } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import type {
  AssignableActivityAdapter,
  AssignableActivityCard,
} from "@/lib/assignable-activities/types";
import { sourceLabelForAssignableKind } from "@/lib/assignable-activities/map";

const SOURCE_LABEL = sourceLabelForAssignableKind("pack_mc_quiz");

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

export const packMcQuizAdapter: AssignableActivityAdapter = {
  kind: "pack_mc_quiz",
  label: SOURCE_LABEL,
  studentRenderer: "pack_mc_quiz",

  async listForClass(classId: string): Promise<AssignableActivityCard[]> {
    const quizzes = await listTeacherPackQuizzesForClass(classId);
    if (!quizzes.length) return [];

    const packIds = [
      ...new Set(quizzes.map((quiz) => quiz.packId).filter((id): id is string => Boolean(id))),
    ];
    const packTitleById = new Map<string, string>();

    if (packIds.length > 0) {
      const supabase = await createClient();
      await requireTeacherUserId();
      const { data: packs } = await supabase
        .from("teacher_word_packs")
        .select("id, title")
        .in("id", packIds)
        .is("archived_at", null);
      for (const row of packs ?? []) {
        packTitleById.set(String((row as { id: string }).id), String((row as { title: string }).title));
      }
    }

    return quizzes.map((quiz) => {
      const packTitle = quiz.packId ? packTitleById.get(quiz.packId) : undefined;
      const ready = quiz.questionCount > 0;
      return {
        kind: "pack_mc_quiz" as const,
        artifactId: quiz.id,
        title: quiz.title,
        subtitle: packTitle ? `from ${packTitle}` : undefined,
        questionCount: quiz.questionCount,
        ready,
        sourceLabel: SOURCE_LABEL,
        packId: quiz.packId,
      };
    });
  },

  async toHomeworkPayload(artifactId: string): Promise<ClassHomeworkPayload> {
    const teacherId = await requireTeacherUserId();
    const quizId = artifactId.trim();
    if (!quizId) {
      throw new Error("Missing quiz.");
    }

    const supabase = await createClient();
    const { data: quiz, error } = await supabase
      .from("teacher_pack_quizzes")
      .select("id, title, questions, archived_at")
      .eq("id", quizId)
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (error) {
      if (/teacher_pack_quizzes|schema cache|does not exist/i.test(error.message)) {
        throw new Error("Quizzes aren’t available yet — apply migration 061_teacher_pack_quizzes.");
      }
      throw new Error(error.message);
    }
    if (!quiz || quiz.archived_at) {
      throw new Error("Quiz not found.");
    }

    const questions = parseStoredPackQuizQuestions(quiz.questions);
    if (questions.length < 1) {
      throw new Error("Quiz has no questions.");
    }

    return freezePackQuizPayload({
      quizId,
      quizTitle: String(quiz.title ?? "Pack quiz"),
      questions,
    });
  },
};
