import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HomeworkFlashcardsPlayer } from "@/components/primary/HomeworkFlashcardsPlayer";
import { HomeworkPackQuizPlayer } from "@/components/primary/HomeworkPackQuizPlayer";
import { HomeworkPlayChrome } from "@/components/primary/HomeworkPlayChrome";
import { HomeworkStudioActivityPlayer } from "@/components/primary/HomeworkStudioActivityPlayer";
import { isStudent, isTeacher, TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import { CLASS_HOMEWORK_PAYLOAD_LABELS } from "@/lib/class-homework/types";
import { parseStoredPackFlashcardCards } from "@/lib/class-homework/freeze-pack-flashcards";
import { getHomeworkForStudent } from "@/lib/data/class-homework";
import { createClient } from "@/lib/supabase/server";
import { requireSecondaryStudentAccess } from "../../_lib/requireSecondaryAccess";

export const metadata: Metadata = {
  title: "Homework | We Know English",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ homeworkId: string }>;
};

function formatDue(value: string | null) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function SecondaryHomeworkPage({ params }: Props) {
  await requireSecondaryStudentAccess();
  const { homeworkId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/secondary/homework/${encodeURIComponent(homeworkId)}`);
  if (isTeacher(user)) redirect(TEACHER_DEFAULT_PATH);
  if (!isStudent(user)) redirect("/login?error=unknown_role");

  const detail = await getHomeworkForStudent(homeworkId);
  if (!detail) notFound();

  const { homework, quizQuestions } = detail;
  const payload = homework.payload;
  const flashcardCards =
    payload.type === "pack_flashcards"
      ? parseStoredPackFlashcardCards(payload.cards ?? [])
      : [];
  const typeLabel = CLASS_HOMEWORK_PAYLOAD_LABELS[payload.type];
  const eyebrow = `${homework.classTitle} · ${typeLabel}`;

  return (
    <HomeworkPlayChrome
      title={homework.title}
      eyebrow={eyebrow}
      dueLabel={formatDue(homework.dueAt)}
      instructions={homework.instructions || null}
      closed={homework.status === "closed"}
      homeHref="/secondary"
    >
      {payload.type === "external_note" ? (
        <div className="rounded-xl border-2 border-neutral-800 bg-white px-4 py-5">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-neutral-600">
            Teacher note
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-base font-semibold text-neutral-900">
            {payload.body}
          </p>
          <Link
            href="/secondary"
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-md border-2 border-neutral-900 bg-neutral-900 px-5 text-sm font-extrabold text-white"
          >
            Back to Secondary home
          </Link>
        </div>
      ) : null}

      {payload.type === "word_pack_practice" ? (
        <div className="rounded-xl border-2 border-neutral-800 bg-white px-4 py-5">
          <h2 className="text-lg font-extrabold text-neutral-900">{payload.packTitle}</h2>
          <p className="mt-1 text-sm font-semibold text-neutral-600">
            Practice {payload.wordCount} word{payload.wordCount === 1 ? "" : "s"} from this pack on
            the Secondary daily path.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/secondary"
              className="inline-flex min-h-12 items-center justify-center rounded-md border-2 border-neutral-900 bg-neutral-900 px-5 text-sm font-extrabold text-white"
            >
              Back to Secondary home
            </Link>
          </div>
        </div>
      ) : null}

      {payload.type === "pack_quiz" ? (
        quizQuestions && quizQuestions.length > 0 ? (
          <HomeworkPackQuizPlayer
            homeworkId={homework.id}
            title={payload.quizTitle}
            questions={quizQuestions}
            alreadyCompleted={Boolean(homework.completedAt)}
          />
        ) : (
          <p className="rounded-xl border-2 border-dashed border-neutral-400 bg-white px-4 py-5 text-sm font-semibold text-neutral-600">
            Quiz content is not available yet. Ask your teacher to check the pack quiz.
          </p>
        )
      ) : null}

      {payload.type === "pack_flashcards" ? (
        flashcardCards.length > 0 ? (
          <HomeworkFlashcardsPlayer
            homeworkId={homework.id}
            title={payload.setTitle}
            cards={flashcardCards}
            alreadyCompleted={Boolean(homework.completedAt)}
          />
        ) : (
          <p className="rounded-xl border-2 border-dashed border-neutral-400 bg-white px-4 py-5 text-sm font-semibold text-neutral-600">
            Flashcard content is not available yet. Ask your teacher to check the set.
          </p>
        )
      ) : null}

      {payload.type === "studio_activity" ? (
        <HomeworkStudioActivityPlayer
          homeworkId={homework.id}
          activityId={payload.activityId}
          format={payload.format}
          title={payload.title}
          pack={payload.pack}
          alreadyCompleted={Boolean(homework.completedAt)}
        />
      ) : null}
    </HomeworkPlayChrome>
  );
}
