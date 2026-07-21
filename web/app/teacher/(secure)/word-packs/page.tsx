import type { Metadata } from "next";
import Link from "next/link";
import { createTeacherWordPackFromForm } from "@/lib/actions/teacher-word-packs";
import { PackQuizListRowActions } from "@/components/teacher/word-packs/PackQuizListRowActions";
import { WordPackListRowActions } from "@/components/teacher/word-packs/WordPackListRowActions";
import { listTeacherClasses } from "@/lib/data/teacher-classes";
import { listPackQuizHomeworkUsage, type PackQuizHomeworkUsage } from "@/lib/data/class-homework";
import { listTeacherPackQuizzes } from "@/lib/data/teacher-pack-quizzes";
import { listTeacherWordPacks } from "@/lib/data/teacher-word-packs";
import { getPackQuizFormatMeta } from "@/lib/vocabulary/pack-quiz";

export const metadata: Metadata = {
  title: "Word packs — Teacher",
  description: "Build Primary vocabulary packs and quizzes from the master candidate bank.",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type PageTab = "packs" | "quizzes";

function firstParam(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

function formatUpdated(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function resolveTab(raw: string): PageTab {
  return raw === "quizzes" ? "quizzes" : "packs";
}

export default async function TeacherWordPacksPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const error = firstParam(params.error);
  const archived = firstParam(params.archived);
  const archivedQuiz = firstParam(params.archived_quiz);
  const tab = resolveTab(firstParam(params.tab));

  const [packs, classes, quizzes, quizHomeworkUsage] = await Promise.all([
    listTeacherWordPacks(),
    listTeacherClasses(),
    listTeacherPackQuizzes().catch(() => []),
    listPackQuizHomeworkUsage().catch(
      (): Record<string, PackQuizHomeworkUsage> => ({}),
    ),
  ]);
  const activeClasses = classes.filter((c) => !c.archived_at);
  const packTitleById = new Map(packs.map((p) => [p.id, p.title]));
  const packClassIdById = new Map(packs.map((p) => [p.id, p.class_id]));
  const classOptions = activeClasses.map((c) => ({ id: c.id, title: c.title }));
  const assignedFlag = firstParam(params.assigned);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Word packs</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Build packs from the Primary candidate bank, then turn them into quizzes. Pack edits do not change
          quizzes you already saved.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-neutral-200">
        <Link
          href="/teacher/word-packs?tab=packs"
          className={`rounded-t border px-3 py-2 text-sm font-semibold ${
            tab === "packs"
              ? "border-neutral-300 border-b-white bg-white text-neutral-900"
              : "border-transparent text-neutral-600 hover:text-neutral-900"
          }`}
        >
          Word packs <span className={tab === "packs" ? "text-neutral-500" : "text-neutral-400"}>({packs.length})</span>
        </Link>
        <Link
          href="/teacher/word-packs?tab=quizzes"
          className={`rounded-t border px-3 py-2 text-sm font-semibold ${
            tab === "quizzes"
              ? "border-neutral-300 border-b-white bg-white text-neutral-900"
              : "border-transparent text-neutral-600 hover:text-neutral-900"
          }`}
        >
          Quizzes{" "}
          <span className={tab === "quizzes" ? "text-neutral-500" : "text-neutral-400"}>
            ({quizzes.length})
          </span>
        </Link>
      </div>

      {archived === "1" ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Pack archived.
        </p>
      ) : null}

      {archivedQuiz === "1" ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Quiz archived.
        </p>
      ) : null}

      {assignedFlag === "1" ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Homework created from quiz. Open the class hub to review or edit it.
        </p>
      ) : null}

      {error === "create_failed" ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Couldn’t create a pack. Apply migration <code className="rounded bg-red-100 px-1">056_teacher_word_packs</code>{" "}
          in Supabase if you haven’t yet, then try again.
        </p>
      ) : null}

      {error === "duplicate_failed" || error === "archive_failed" ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error === "duplicate_failed" ? "Couldn’t duplicate that pack." : "Couldn’t archive that pack."}
        </p>
      ) : null}

      {error === "quiz_archive_failed" ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Couldn’t archive that quiz. Apply migration{" "}
          <code className="rounded bg-red-100 px-1">061_teacher_pack_quizzes</code> if you haven’t yet.
        </p>
      ) : null}

      {tab === "packs" ? (
        <>
          <form
            action={createTeacherWordPackFromForm}
            className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
          >
            <label className="min-w-[12rem] flex-1 text-sm">
              <span className="mb-1 block font-medium text-neutral-700">New pack title</span>
              <input
                name="title"
                placeholder="e.g. Food — Fruit A1"
                className="w-full rounded border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
                autoComplete="off"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-neutral-700">Link to class (optional)</span>
              <select name="class_id" className="rounded border border-neutral-300 px-3 py-2 text-sm">
                <option value="">Not linked yet</option>
                {activeClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              + New pack
            </button>
          </form>

          {packs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-4 py-10 text-center">
              <p className="font-medium text-neutral-800">No packs yet</p>
              <p className="mt-1 text-sm text-neutral-600">
                Create one above, then search and click words into your sheet — like a familiar spreadsheet.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {packs.map((pack) => {
                const linkedClass = activeClasses.find((c) => c.id === pack.class_id);
                return (
                  <li
                    key={pack.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <Link
                      href={`/teacher/word-packs/${pack.id}`}
                      className="min-w-0 flex-1 hover:opacity-90"
                    >
                      <p className="font-semibold text-neutral-900">{pack.title}</p>
                      <p className="text-sm text-neutral-600">
                        {pack.wordCount} word{pack.wordCount === 1 ? "" : "s"}
                        {linkedClass ? (
                          <>
                            {" "}
                            · <span className="text-neutral-800">{linkedClass.title}</span>
                          </>
                        ) : (
                          " · Not linked to a class"
                        )}
                        <span className="text-neutral-400"> · Updated {formatUpdated(pack.updated_at)}</span>
                      </p>
                    </Link>
                    <WordPackListRowActions
                      packId={pack.id}
                      title={pack.title}
                      wordIds={pack.wordIds}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-neutral-600">
            Saved from <span className="font-medium text-neutral-800">Make a quiz</span> on a pack.
            Assign a quiz to a class as homework — students see it on Primary → Assigned.
          </p>

          {quizzes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-4 py-10 text-center">
              <p className="font-medium text-neutral-800">No saved quizzes yet</p>
              <p className="mt-1 text-sm text-neutral-600">
                Open a pack on the Word packs tab, choose <span className="font-medium">Make a quiz</span>,
                then Save in the preview.
              </p>
              <p className="mt-3 text-xs text-neutral-500">
                After you save, use Assign to send the quiz as class homework.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {quizzes.map((quiz) => {
                const packTitle = quiz.pack_id ? packTitleById.get(quiz.pack_id) : null;
                const formatLabel = getPackQuizFormatMeta(quiz.format).label;
                const usage = quizHomeworkUsage[quiz.id];
                return (
                  <li
                    key={quiz.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-neutral-900">{quiz.title}</p>
                        {usage && usage.total > 0 ? (
                          <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-900">
                            Homework · {usage.total}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-neutral-600">
                        {formatLabel} · {quiz.questionCount} question
                        {quiz.questionCount === 1 ? "" : "s"} · {quiz.wordCount} word
                        {quiz.wordCount === 1 ? "" : "s"} ·{" "}
                        <span className="capitalize">{quiz.status}</span>
                        {packTitle ? (
                          <>
                            {" "}
                            · from{" "}
                            {quiz.pack_id ? (
                              <Link
                                href={`/teacher/word-packs/${quiz.pack_id}`}
                                className="font-medium text-neutral-800 underline-offset-2 hover:underline"
                              >
                                {packTitle}
                              </Link>
                            ) : (
                              packTitle
                            )}
                          </>
                        ) : quiz.pack_id ? (
                          " · pack unavailable"
                        ) : null}
                        <span className="text-neutral-400"> · Updated {formatUpdated(quiz.updated_at)}</span>
                      </p>
                    </div>
                    <PackQuizListRowActions
                      quizId={quiz.id}
                      title={quiz.title}
                      questionCount={quiz.questionCount}
                      format={quiz.format}
                      packId={quiz.pack_id}
                      packClassId={quiz.pack_id ? packClassIdById.get(quiz.pack_id) ?? null : null}
                      classes={classOptions}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
