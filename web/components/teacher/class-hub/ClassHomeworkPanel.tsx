"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  createClassHomework,
  deleteClassHomework,
  saveClassHomework,
} from "@/lib/actions/class-homework";
import {
  formatHomeworkListSubtitle,
  packFlashcardsEmptyDropdownCopy,
  packQuizEmptyDropdownCopy,
  resolvePackTitleForFlashcardSet,
  resolvePackTitleForQuiz,
} from "@/lib/class-homework/display";
import { sourceLabelForAssignableKind } from "@/lib/assignable-activities/map";
import type { TeacherTier } from "@/lib/auth/roles";
import type { ClassHomework, ClassHomeworkPayload, HomeworkCompletionSummary } from "@/lib/class-homework/types";
import type { TeacherWordPackSummary } from "@/lib/data/teacher-word-packs";

const ACTIVITY_LABEL = sourceLabelForAssignableKind("pack_mc_quiz");
const FLASHCARDS_LABEL = sourceLabelForAssignableKind("pack_flashcards");

type QuizOption = {
  id: string;
  title: string;
  questionCount: number;
  packId: string | null;
};

type FlashcardSetOption = {
  id: string;
  title: string;
  cardCount: number;
  packId: string | null;
};

type RosterName = {
  studentId: string;
  displayName: string;
};

type Props = {
  classId: string;
  archived: boolean;
  teacherTier?: TeacherTier;
  homework: ClassHomework[];
  wordPacks: TeacherWordPackSummary[];
  packQuizzes: QuizOption[];
  packFlashcardSets: FlashcardSetOption[];
  rosterSize: number;
  rosterNames: RosterName[];
  completions: HomeworkCompletionSummary[];
};

function formatDue(value: string | null) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ClassHomeworkPanel({
  classId,
  archived,
  teacherTier = "plus",
  homework: initialHomework,
  wordPacks,
  packQuizzes,
  packFlashcardSets,
  rosterSize,
  rosterNames,
  completions,
}: Props) {
  const isLight = teacherTier === "light";
  const [items, setItems] = useState(initialHomework);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setItems(initialHomework);
  }, [initialHomework]);

  const editing = useMemo(
    () => items.find((item) => item.id === editingId) ?? null,
    [editingId, items],
  );

  const packTitleById = useMemo(
    () => new Map(wordPacks.map((pack) => [pack.id, pack.title])),
    [wordPacks],
  );

  const nameByStudentId = useMemo(
    () => new Map(rosterNames.map((row) => [row.studentId, row.displayName])),
    [rosterNames],
  );

  const completionsByHomework = useMemo(() => {
    const map = new Map<string, HomeworkCompletionSummary[]>();
    for (const row of completions) {
      const list = map.get(row.homeworkId) ?? [];
      list.push(row);
      map.set(row.homeworkId, list);
    }
    return map;
  }, [completions]);

  const create = () => {
    setError(null);
    startTransition(async () => {
      const result = await createClassHomework({ classId, title: "New homework" });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setItems((current) => [result.homework, ...current]);
      setEditingId(result.homework.id);
    });
  };

  const copyStudentLink = async (homeworkId: string) => {
    const url = `${window.location.origin}/primary/homework/${encodeURIComponent(homeworkId)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopiedId(homeworkId);
    window.setTimeout(() => setCopiedId((current) => current === homeworkId ? null : current), 2000);
  };

  if (editing) {
    return (
      <HomeworkEditor
        homework={editing}
        archived={archived}
        teacherTier={teacherTier}
        wordPacks={wordPacks}
        packQuizzes={packQuizzes}
        packFlashcardSets={packFlashcardSets}
        finishers={completionsByHomework.get(editing.id) ?? []}
        nameByStudentId={nameByStudentId}
        busy={isPending}
        onCancel={() => setEditingId(null)}
        onSaved={(homework) => {
          setItems((current) =>
            current.map((item) => (item.id === homework.id ? homework : item)),
          );
          setEditingId(null);
        }}
        onDeleted={(id) => {
          setItems((current) => current.filter((item) => item.id !== id));
          setEditingId(null);
        }}
      />
    );
  }

  return (
    <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">Homework</h3>
          <p className="mt-1 max-w-xl text-sm text-neutral-600">
            {isLight
              ? `Assign a ${ACTIVITY_LABEL.toLowerCase()}, ${FLASHCARDS_LABEL.toLowerCase()}, or word-pack practice.`
              : `Assign a catalog activity (${ACTIVITY_LABEL.toLowerCase()} or ${FLASHCARDS_LABEL.toLowerCase()}), word-pack practice, or a short note. Assigned items appear on Primary Learn.`}
          </p>
        </div>
        {!archived ? (
          <button
            type="button"
            disabled={isPending}
            onClick={create}
            className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {isPending ? "Creating…" : "New homework"}
          </button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-3 py-4 text-sm text-neutral-600">
          No homework yet. Assign an activity when students should see it on Primary Learn.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const doneCount = completionsByHomework.get(item.id)?.length ?? 0;
            const showDone =
              (item.payload.type === "pack_quiz" ||
                item.payload.type === "pack_flashcards" ||
                item.payload.type === "homework_template" ||
                item.payload.type === "picture_cloze" ||
                item.payload.type === "verb_table" ||
                item.payload.type === "sentence_columns" ||
                item.payload.type === "word_annotation" ||
                item.payload.type === "picture_writing" ||
                item.payload.type === "question_writing" ||
                item.payload.type === "definition_match" ||
                item.payload.type === "cloze_choice" ||
                item.payload.type === "cloze_open" ||
                item.payload.type === "read_and_answer" ||
                item.payload.type === "picture_story" ||
                item.payload.type === "studio_activity") &&
              (item.status === "assigned" || item.status === "closed");
            return (
              <li key={item.id} className="flex flex-wrap items-stretch gap-2 rounded-lg border border-neutral-200 p-2 hover:border-neutral-400">
                <button
                  type="button"
                  onClick={() => setEditingId(item.id)}
                  className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2 rounded-md px-2 py-1 text-left hover:bg-neutral-50"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-neutral-900">{item.title}</span>
                      <StatusPill status={item.status} />
                      {showDone ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
                          Done {doneCount}/{rosterSize}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-600">
                      {formatHomeworkListSubtitle(item.payload, {
                        packTitle:
                          item.payload.type === "pack_quiz"
                            ? resolvePackTitleForQuiz(
                                item.payload.quizId,
                                packQuizzes,
                                packTitleById,
                              )
                            : item.payload.type === "pack_flashcards"
                              ? resolvePackTitleForFlashcardSet(
                                  item.payload.setId,
                                  packFlashcardSets,
                                  packTitleById,
                                )
                              : null,
                        dueLabel: formatDue(item.dueAt),
                      })}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-neutral-700">Edit →</span>
                </button>
                <button
                  type="button"
                  onClick={() => void copyStudentLink(item.id)}
                  className="min-h-10 shrink-0 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
                  aria-label={`Copy student link for ${item.title}`}
                  title="Students must sign in and belong to this class"
                >
                  {copiedId === item.id ? "Copied!" : "Copy student link"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function StatusPill({ status }: { status: ClassHomework["status"] }) {
  const styles =
    status === "assigned"
      ? "bg-teal-100 text-teal-900"
      : status === "closed"
        ? "bg-neutral-200 text-neutral-700"
        : "bg-amber-100 text-amber-900";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${styles}`}>
      {status}
    </span>
  );
}

function HomeworkEditor({
  homework,
  archived,
  teacherTier,
  wordPacks,
  packQuizzes,
  packFlashcardSets,
  finishers,
  nameByStudentId,
  busy,
  onCancel,
  onSaved,
  onDeleted,
}: {
  homework: ClassHomework;
  archived: boolean;
  teacherTier: TeacherTier;
  wordPacks: TeacherWordPackSummary[];
  packQuizzes: QuizOption[];
  packFlashcardSets: FlashcardSetOption[];
  finishers: HomeworkCompletionSummary[];
  nameByStudentId: Map<string, string>;
  busy: boolean;
  onCancel: () => void;
  onSaved: (homework: ClassHomework) => void;
  onDeleted: (id: string) => void;
}) {
  const isLight = teacherTier === "light";
  const typeOptions = (
    isLight
      ? ([
          ["pack_quiz", ACTIVITY_LABEL],
          ["pack_flashcards", FLASHCARDS_LABEL],
          ["word_pack_practice", "Word pack practice"],
          ["homework_template", "Homework template"],
        ] as const)
      : ([
          ["pack_quiz", ACTIVITY_LABEL],
          ["pack_flashcards", FLASHCARDS_LABEL],
          ["word_pack_practice", "Word pack practice"],
          ["external_note", "Note / reminder"],
          ["homework_template", "Homework template"],
        ] as const)
  );
  const initialType =
    isLight && homework.payload.type === "external_note" ? "pack_quiz" : homework.payload.type;
  const [title, setTitle] = useState(homework.title);
  const [instructions, setInstructions] = useState(homework.instructions);
  const [dueLocal, setDueLocal] = useState(toDatetimeLocalValue(homework.dueAt));
  const [status, setStatus] = useState(homework.status);
  const [payloadType, setPayloadType] = useState(initialType);
  const [quizId, setQuizId] = useState(
    homework.payload.type === "pack_quiz" ? homework.payload.quizId : "",
  );
  const [flashcardSetId, setFlashcardSetId] = useState(
    homework.payload.type === "pack_flashcards" ? homework.payload.setId : "",
  );
  const [packId, setPackId] = useState(
    homework.payload.type === "word_pack_practice" ? homework.payload.packId : "",
  );
  const [noteBody, setNoteBody] = useState(
    homework.payload.type === "external_note" ? homework.payload.body : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const pending = busy || isPending;

  const buildPayload = (): ClassHomeworkPayload | null => {
    if (payloadType === "homework_template") {
      return homework.payload.type === "homework_template" ? homework.payload : null;
    }
    if (payloadType === "pack_quiz") {
      const quiz = packQuizzes.find((item) => item.id === quizId);
      if (!quiz) return null;
      return {
        type: "pack_quiz",
        quizId: quiz.id,
        quizTitle: quiz.title,
        questionCount: quiz.questionCount,
      };
    }
    if (payloadType === "pack_flashcards") {
      const set = packFlashcardSets.find((item) => item.id === flashcardSetId);
      if (!set) return null;
      return {
        type: "pack_flashcards",
        setId: set.id,
        setTitle: set.title,
        cardCount: set.cardCount,
      };
    }
    if (payloadType === "word_pack_practice") {
      const pack = wordPacks.find((item) => item.id === packId);
      if (!pack) return null;
      return {
        type: "word_pack_practice",
        packId: pack.id,
        packTitle: pack.title,
        wordCount: pack.wordCount,
      };
    }
    const body = noteBody.trim();
    if (!body) return null;
    return { type: "external_note", body };
  };

  const save = (nextStatus = status) => {
    setError(null);
    const payload = buildPayload();
    if (!payload) {
      setError("Complete the homework type fields before saving.");
      return;
    }
    startTransition(async () => {
      const result = await saveClassHomework({
        homeworkId: homework.id,
        title,
        instructions,
        dueAt: dueLocal ? new Date(dueLocal).toISOString() : null,
        status: nextStatus,
        payload,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved(result.homework);
    });
  };

  const remove = () => {
    if (!window.confirm(`Delete “${title.trim() || homework.title}”?`)) return;
    startTransition(async () => {
      const result = await deleteClassHomework(homework.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDeleted(homework.id);
    });
  };

  return (
    <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Edit homework
          </p>
          <h3 className="text-lg font-bold text-neutral-900">Offline assignment</h3>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-semibold"
        >
          Back
        </button>
      </div>

      <label className="block text-sm font-semibold">
        Title
        <input
          value={title}
          disabled={archived || pending}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal"
        />
      </label>

      <label className="block text-sm font-semibold">
        Instructions
        <textarea
          value={instructions}
          disabled={archived || pending}
          onChange={(event) => setInstructions(event.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal"
        />
      </label>

      <label className="block text-sm font-semibold">
        Due
        <input
          type="datetime-local"
          value={dueLocal}
          disabled={archived || pending}
          onChange={(event) => setDueLocal(event.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Assign</legend>
        <div className="flex flex-wrap gap-2">
          {typeOptions.map(([value, label]) => (
            <button
              key={value}
              type="button"
              disabled={archived || pending}
              onClick={() => setPayloadType(value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                payloadType === value
                  ? "bg-neutral-900 text-white"
                  : "border border-neutral-300 bg-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {payloadType === "pack_quiz" ? (
          <p className="text-xs font-normal text-neutral-500">
            Catalog activity — MCQ quizzes saved from word packs.
          </p>
        ) : null}
        {payloadType === "pack_flashcards" ? (
          <p className="text-xs font-normal text-neutral-500">
            Catalog activity — flashcard sets saved from word packs.
          </p>
        ) : null}
      </fieldset>

      {payloadType === "pack_quiz" ? (
        <div className="space-y-1">
          <label className="block text-sm font-semibold">
            {ACTIVITY_LABEL}
            <select
              value={quizId}
              disabled={archived || pending}
              onChange={(event) => setQuizId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal"
            >
              <option value="">Select a {ACTIVITY_LABEL.toLowerCase()}…</option>
              {packQuizzes.map((quiz) => (
                <option key={quiz.id} value={quiz.id} disabled={quiz.questionCount < 1}>
                  {quiz.title} ({quiz.questionCount} q)
                  {quiz.questionCount < 1 ? " — not ready" : ""}
                </option>
              ))}
            </select>
          </label>
          {packQuizzes.length === 0 ? (
            <PackQuizEmptyHint wordPackCount={wordPacks.length} />
          ) : (
            <p className="text-xs font-normal text-neutral-500">
              Students get a frozen copy of the questions. Editing the quiz later won’t change this
              homework.
            </p>
          )}
        </div>
      ) : null}

      {payloadType === "pack_flashcards" ? (
        <div className="space-y-1">
          <label className="block text-sm font-semibold">
            {FLASHCARDS_LABEL}
            <select
              value={flashcardSetId}
              disabled={archived || pending}
              onChange={(event) => setFlashcardSetId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal"
            >
              <option value="">Select a {FLASHCARDS_LABEL.toLowerCase()} set…</option>
              {packFlashcardSets.map((set) => (
                <option key={set.id} value={set.id} disabled={set.cardCount < 1}>
                  {set.title} ({set.cardCount} card{set.cardCount === 1 ? "" : "s"})
                  {set.cardCount < 1 ? " — not ready" : ""}
                </option>
              ))}
            </select>
          </label>
          {packFlashcardSets.length === 0 ? (
            <PackFlashcardsEmptyHint wordPackCount={wordPacks.length} />
          ) : (
            <p className="text-xs font-normal text-neutral-500">
              Students get a frozen copy of the cards. Editing the set later won’t change this
              homework.
            </p>
          )}
        </div>
      ) : null}

      {payloadType === "word_pack_practice" ? (
        <label className="block text-sm font-semibold">
          Word pack
          <select
            value={packId}
            disabled={archived || pending}
            onChange={(event) => setPackId(event.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal"
          >
            <option value="">Select a class word pack…</option>
            {wordPacks.map((pack) => (
              <option key={pack.id} value={pack.id}>
                {pack.title} ({pack.wordCount} words)
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {payloadType === "external_note" ? (
        <label className="block text-sm font-semibold">
          Note for students
          <textarea
            value={noteBody}
            disabled={archived || pending}
            onChange={(event) => setNoteBody(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal"
          />
        </label>
      ) : null}

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Status</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["draft", "Draft"],
              ["assigned", "Assigned"],
              ["closed", "Closed"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              disabled={archived || pending}
              onClick={() => setStatus(value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                status === value
                  ? "bg-neutral-900 text-white"
                  : "border border-neutral-300 bg-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {(homework.payload.type === "pack_quiz" ||
        homework.payload.type === "pack_flashcards") &&
      (homework.status === "assigned" || homework.status === "closed") ? (
        isLight ? (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3">
            <p className="text-sm font-semibold text-neutral-900">
              Done {finishers.length}
            </p>
            <p className="mt-1 text-xs text-neutral-600">
              Simple completion count — detailed student lists are available on Teacher Plus.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3">
            <p className="text-sm font-semibold text-neutral-900">
              Finished ({finishers.length})
            </p>
            {finishers.length === 0 ? (
              <p className="mt-1 text-xs text-neutral-600">No students have finished yet.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {finishers.map((row) => (
                  <li key={`${row.homeworkId}:${row.studentId}`} className="text-xs text-neutral-700">
                    <span className="font-semibold">
                      {nameByStudentId.get(row.studentId) ?? "Student"}
                    </span>
                    <span className="text-neutral-500">
                      {" "}
                      · {formatDue(row.finishedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      ) : null}

      <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
        <button
          type="button"
          disabled={archived || pending}
          onClick={() => save(status)}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {status !== "assigned" ? (
          <button
            type="button"
            disabled={archived || pending}
            onClick={() => {
              setStatus("assigned");
              save("assigned");
            }}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            Save &amp; assign
          </button>
        ) : null}
        <button
          type="button"
          disabled={archived || pending}
          onClick={remove}
          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </section>
  );
}

function PackQuizEmptyHint({ wordPackCount }: { wordPackCount: number }) {
  const copy = packQuizEmptyDropdownCopy(wordPackCount === 0 ? "no_packs" : "no_quizzes");
  return (
    <p className="text-xs font-normal text-neutral-500">
      {copy.body}{" "}
      <Link href={copy.packsHref} className="font-semibold underline underline-offset-2">
        Word packs
      </Link>
      {" · "}
      <Link href={copy.quizzesHref} className="font-semibold underline underline-offset-2">
        Quizzes
      </Link>
    </p>
  );
}

function PackFlashcardsEmptyHint({ wordPackCount }: { wordPackCount: number }) {
  const copy = packFlashcardsEmptyDropdownCopy(wordPackCount === 0 ? "no_packs" : "no_sets");
  return (
    <p className="text-xs font-normal text-neutral-500">
      {copy.body}{" "}
      <Link href={copy.packsHref} className="font-semibold underline underline-offset-2">
        Word packs
      </Link>
      {" · "}
      <Link href={copy.flashcardsHref} className="font-semibold underline underline-offset-2">
        Flashcards
      </Link>
    </p>
  );
}
