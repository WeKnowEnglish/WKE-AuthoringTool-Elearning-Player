import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HomeworkPackQuizPlayer } from "@/components/primary/HomeworkPackQuizPlayer";
import { isStudent, isTeacher, TEACHER_DEFAULT_PATH } from "@/lib/auth/roles";
import { CLASS_HOMEWORK_PAYLOAD_LABELS } from "@/lib/class-homework/types";
import { getHomeworkForStudent } from "@/lib/data/class-homework";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-4 py-6 sm:px-6">
      <Link
        href="/primary?nav=learn"
        className="text-sm font-semibold text-blue-700 underline underline-offset-2"
      >
        ← Back to Learn
      </Link>

      <header className="mt-4 space-y-2">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-neutral-500">
          {homework.classTitle} · {CLASS_HOMEWORK_PAYLOAD_LABELS[payload.type]}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">
          {homework.title}
        </h1>
        <p className="text-sm font-semibold text-neutral-600">Due {formatDue(homework.dueAt)}</p>
        {homework.instructions ? (
          <p className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-800">
            {homework.instructions}
          </p>
        ) : null}
        {homework.status === "closed" ? (
          <p className="text-sm font-semibold text-amber-800">
            This assignment is closed. You can still review it.
          </p>
        ) : null}
      </header>

      <section className="mt-6 space-y-4">
        {payload.type === "external_note" ? (
          <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-5 shadow-sm">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-neutral-500">
              Teacher note
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-base font-semibold text-neutral-900">
              {payload.body}
            </p>
          </div>
        ) : null}

        {payload.type === "word_pack_practice" ? (
          <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-5 shadow-sm">
            <h2 className="text-lg font-extrabold text-neutral-900">{payload.packTitle}</h2>
            <p className="mt-1 text-sm font-semibold text-neutral-600">
              Practice {payload.wordCount} word{payload.wordCount === 1 ? "" : "s"} from this pack
              in Vocabulary.
            </p>
            <Link
              href="/primary?nav=vocabulary"
              className="mt-4 inline-flex rounded-xl bg-neutral-900 px-4 py-2 text-sm font-bold text-white"
            >
              Open Vocabulary
            </Link>
          </div>
        ) : null}

        {payload.type === "pack_quiz" ? (
          <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-5 shadow-sm">
            <h2 className="text-lg font-extrabold text-neutral-900">{payload.quizTitle}</h2>
            <p className="mt-1 text-sm font-semibold text-neutral-600">
              {payload.questionCount} question{payload.questionCount === 1 ? "" : "s"}
            </p>
            <div className="mt-4">
              {quizQuestions && quizQuestions.length > 0 ? (
                <HomeworkPackQuizPlayer
                  homeworkId={homework.id}
                  title={payload.quizTitle}
                  questions={quizQuestions}
                  alreadyCompleted={Boolean(homework.completedAt)}
                />
              ) : (
                <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-5 text-sm text-neutral-600">
                  Quiz content is not available yet. Ask your teacher to check the pack quiz.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
