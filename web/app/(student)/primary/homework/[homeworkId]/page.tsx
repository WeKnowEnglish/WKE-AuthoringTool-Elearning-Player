import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HomeworkFlashcardsPlayer } from "@/components/primary/HomeworkFlashcardsPlayer";
import { HomeworkPackQuizPlayer } from "@/components/primary/HomeworkPackQuizPlayer";
import { HomeworkPlayChrome } from "@/components/primary/HomeworkPlayChrome";
import { isStudent, isTeacher, TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import { CLASS_HOMEWORK_PAYLOAD_LABELS } from "@/lib/class-homework/types";
import { parseStoredPackFlashcardCards } from "@/lib/class-homework/freeze-pack-flashcards";
import { getHomeworkForStudent } from "@/lib/data/class-homework";
import { createClient } from "@/lib/supabase/server";

/**
 * Product C — teacher pack homework (quiz / flashcards / notes).
 * F2: focused play chrome + progress + finish → Home.
 * @see docs/primary/PRIMARY_VOCAB_ACTIVITY_CONTRACT.md
 */

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

export default async function PrimaryHomeworkPage({ params }: Props) {
  const { homeworkId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");
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
    >
      {payload.type === "external_note" ? (
        <div className="rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] px-4 py-5 shadow-sm">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-[var(--pl-muted)]">
            Teacher note
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-base font-semibold text-[var(--pl-ink)]">
            {payload.body}
          </p>
          <Link
            href="/primary"
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--pl-teal)] px-5 text-sm font-extrabold text-white transition hover:bg-[var(--pl-teal-hover)]"
          >
            Back to Home
          </Link>
        </div>
      ) : null}

      {payload.type === "word_pack_practice" ? (
        <div className="rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] px-4 py-5 shadow-sm">
          <h2 className="text-lg font-extrabold text-[var(--pl-ink)]">{payload.packTitle}</h2>
          <p className="mt-1 text-sm font-semibold text-[var(--pl-muted)]">
            Practice {payload.wordCount} word{payload.wordCount === 1 ? "" : "s"} from this pack in
            Vocabulary.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/primary?nav=vocabulary"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[var(--pl-teal)] px-5 text-sm font-extrabold text-white transition hover:bg-[var(--pl-teal-hover)]"
            >
              Open Vocabulary
            </Link>
            <Link
              href="/primary"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[var(--pl-border)] bg-white px-5 text-sm font-extrabold text-[var(--pl-ink)] transition hover:border-[var(--pl-purple)]"
            >
              Back to Home
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
          <p className="rounded-2xl border border-dashed border-[var(--pl-border)] bg-[var(--pl-card)] px-4 py-5 text-sm font-semibold text-[var(--pl-muted)]">
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
          <p className="rounded-2xl border border-dashed border-[var(--pl-border)] bg-[var(--pl-card)] px-4 py-5 text-sm font-semibold text-[var(--pl-muted)]">
            Flashcard content is not available yet. Ask your teacher to check the set.
          </p>
        )
      ) : null}
    </HomeworkPlayChrome>
  );
}
