"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  countWkeLibraryItems,
  forkWkeLibraryItemToBank,
  listMyWkeLibrarySubmissions,
  listPublishedWkeLibraryItems,
  retireWkeLibraryItem,
  seedWkeLibraryFromFixtures,
  withdrawWkeLibrarySubmission,
} from "@/lib/actions/wke-library";
import type { WkeLibraryItemSummary } from "@/lib/wke-library/types";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";
import { AssignHomeworkTemplateOverlay } from "@/components/teacher/wke-library/AssignHomeworkTemplateOverlay";
import type { HomeworkTemplateId } from "@/lib/homework-templates/registry";

const FORMAT_LABELS: Record<StudioActivityFormat, string> = {
  explore_hotspots: "Hotspots",
  vocabulary_list: "Vocabulary list",
  multiple_choice: "Multiple choice",
  letter_mixup: "Letter scramble",
  flashcards: "Flashcards",
  listen_and_choose: "Listen and choose",
  line_match: "Line match",
  true_false: "True / false",
  sentence_scramble: "Sentence scramble",
  fill_blanks: "Fill in the blanks",
  learning_track: "Learning track",
  picture_cloze: "Picture cloze",
  verb_table: "Verb table",
  sentence_columns: "Sentence columns",
  word_annotation: "Word annotation",
  picture_writing: "Picture writing",
  question_writing: "Question writing",
  definition_match: "Definition match",
  cloze_choice: "Cloze with choices",
  cloze_open: "Open cloze",
  read_and_answer: "Read and answer",
  picture_story: "Picture story",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending review",
  rejected: "Rejected",
  published: "Published",
};

type Props = {
  isAdmin?: boolean;
  classes?: readonly { id: string; title: string }[];
  classLoadError?: boolean;
};

export function WkeLibraryBrowse({ isAdmin = false, classes = [], classLoadError = false }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<WkeLibraryItemSummary[]>([]);
  const [mine, setMine] = useState<WkeLibraryItemSummary[]>([]);
  const [formatFilter, setFormatFilter] = useState<StudioActivityFormat | "all">(
    "all",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [forkingId, setForkingId] = useState<string | null>(null);
  const [catalogCount, setCatalogCount] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [assignTemplateId, setAssignTemplateId] = useState<HomeworkTemplateId | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rows, myRows] = await Promise.all([
        listPublishedWkeLibraryItems({
          format: formatFilter === "all" ? undefined : formatFilter,
        }),
        listMyWkeLibrarySubmissions().catch(() => [] as WkeLibraryItemSummary[]),
      ]);
      setItems(rows);
      setMine(myRows);
      if (isAdmin) {
        try {
          setCatalogCount(await countWkeLibraryItems());
        } catch {
          setCatalogCount(null);
        }
      }
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "Could not load WKE Library.");
    } finally {
      setLoading(false);
    }
  }, [formatFilter, isAdmin]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onUse = (item: WkeLibraryItemSummary) => {
    setNotice(null);
    setError(null);
    setForkingId(item.id);
    startTransition(async () => {
      try {
        const result = await forkWkeLibraryItemToBank({ libraryItemId: item.id });
        setNotice(`Copied “${result.title}” into My Activity Bank.`);
        router.push(result.editPath);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not copy to Activity Bank.");
        setForkingId(null);
      }
    });
  };

  const onSeed = () => {
    setNotice(null);
    setError(null);
    startTransition(async () => {
      try {
        const result = await seedWkeLibraryFromFixtures();
        setNotice(`Seeded ${result.upserted} curated items.`);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Seed failed.");
      }
    });
  };

  const onWithdraw = (item: WkeLibraryItemSummary) => {
    setNotice(null);
    setError(null);
    startTransition(async () => {
      try {
        const result = await withdrawWkeLibrarySubmission({ libraryItemId: item.id });
        setNotice(`Withdrew “${result.title}” from the review queue.`);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Withdraw failed.");
      }
    });
  };

  const onRetire = (item: WkeLibraryItemSummary) => {
    if (
      !window.confirm(
        `Retire “${item.title}” from the public catalog? Teachers will no longer see it.`,
      )
    ) {
      return;
    }
    setNotice(null);
    setError(null);
    startTransition(async () => {
      try {
        const result = await retireWkeLibraryItem({ libraryItemId: item.id });
        setNotice(`Retired “${result.title}”.`);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Retire failed.");
      }
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
          WKE Library
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          Start faster with curated activities
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-stone-600">
          Browse published templates, then copy one into{" "}
          <span className="font-medium text-stone-800">My Activity Bank</span>. Your
          private class work stays private. To contribute, open Activity Bank in Hotspots
          and choose <span className="font-medium">Submit to library</span>.
        </p>
        <div className="flex flex-wrap gap-2 pt-1 text-sm">
          <Link
            href="/teacher/activity-builder"
            className="text-stone-600 underline-offset-2 hover:underline"
          >
            ← Activity Builder
          </Link>
          <Link
            href="/teacher/activity-builder/hotspots"
            className="text-stone-600 underline-offset-2 hover:underline"
          >
            Hotspots workspace
          </Link>
          {isAdmin ? (
            <Link
              href="/teacher/admin/wke-library"
              className="text-amber-800 underline-offset-2 hover:underline"
            >
              Review submissions
            </Link>
          ) : null}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-medium text-stone-600">
          Format
          <select
            className="ml-2 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900"
            value={formatFilter}
            onChange={(event) =>
              setFormatFilter(event.target.value as StudioActivityFormat | "all")
            }
          >
            <option value="all">All</option>
            <option value="explore_hotspots">Hotspots</option>
            <option value="vocabulary_list">Vocabulary lists</option>
            <option value="multiple_choice">Multiple choice</option>
            <option value="letter_mixup">Letter scramble</option>
            <option value="flashcards">Flashcards</option>
            <option value="learning_track">Learning tracks</option>
          </select>
        </label>
        {isAdmin ? (
          <button
            type="button"
            disabled={pending}
            onClick={onSeed}
            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50"
          >
            {pending ? "Working…" : "Seed curated Hotspots"}
          </button>
        ) : null}
        {isAdmin && catalogCount != null ? (
          <span className="text-xs text-stone-500">{catalogCount} catalog rows</span>
        ) : null}
      </div>

      {notice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </p>
      ) : null}

      {mine.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            My submissions
          </h2>
          <ul className="space-y-2">
            {mine.map((item) => (
              <li
                key={`mine-${item.id}`}
                className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-stone-900">{item.title}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        item.status === "published"
                          ? "bg-emerald-50 text-emerald-900"
                          : item.status === "rejected"
                            ? "bg-rose-50 text-rose-900"
                            : "bg-amber-50 text-amber-950"
                      }`}
                    >
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                    {item.status === "pending" ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onWithdraw(item)}
                        className="text-[11px] font-semibold text-stone-600 underline hover:text-stone-900 disabled:opacity-50"
                      >
                        Withdraw
                      </button>
                    ) : null}
                  </div>
                </div>
                {item.reviewNote ? (
                  <p className="mt-1 text-xs text-stone-500">Review: {item.reviewNote}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col rounded-xl border-2 border-sky-300 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2"><span className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">Homework template</span><span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-900">Primary</span></div>
        <h2 className="mt-1 text-base font-semibold text-stone-900">Homework Template One</h2>
        <p className="mt-1 text-sm leading-snug text-stone-600">Six connected parts covering vocabulary, adjectives and adverbs, sentence building, verb forms, picture writing, and question writing.</p>
        <p className="mt-2 text-[11px] text-stone-500">6 parts · about 30 minutes · teacher completion reporting</p>
        {classLoadError ? <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950">The activity library is available, but classes could not be loaded. Refresh before assigning homework.</p> : null}
        <div className="mt-4 grid max-w-md grid-cols-2 gap-2"><Link href="/pilots/homework-template-one" className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-center text-sm font-semibold text-stone-800 hover:bg-stone-50">Preview</Link><button type="button" disabled={classLoadError} onClick={() => setAssignTemplateId("homework-template-one")} className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50">Assign homework</button></div>
      </section>

      <section className="flex flex-col rounded-xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2"><span className="text-[10px] font-semibold uppercase tracking-wide text-violet-800">Homework template</span><span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold text-white">Secondary</span></div>
        <h2 className="mt-1 text-base font-semibold text-stone-900">Secondary Homework One</h2>
        <p className="mt-1 text-sm leading-snug text-stone-600">Community reading, simple-past practice, irregular verbs, question building, and a recorded speaking response.</p>
        <p className="mt-2 text-[11px] text-stone-500">5 parts · about 35 minutes · automatic and teacher grading</p>
        <div className="mt-4 grid max-w-md grid-cols-2 gap-2"><Link href="/pilots/secondary-homework-one" className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-center text-sm font-semibold text-stone-800 hover:bg-stone-50">Preview</Link><button type="button" disabled={classLoadError} onClick={() => setAssignTemplateId("secondary-homework-template-one")} className="rounded-lg bg-violet-800 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50">Assign homework</button></div>
      </section>

      {loading ? (
        <p className="text-sm text-stone-500">Loading library…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/80 px-4 py-8 text-center">
          <p className="text-sm font-medium text-stone-800">No published items yet</p>
          <p className="mt-1 text-sm text-stone-600">
            {isAdmin
              ? "Apply migrations 082–084, then use Seed curated Hotspots."
              : "Check back soon — curated starters are on the way."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => {
            const busy = forkingId === item.id && pending;
            return (
              <li
                key={item.id}
                className="flex flex-col rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    {FORMAT_LABELS[item.format] ?? item.format}
                  </span>
                  {item.cefr ? (
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-900">
                      {item.cefr}
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-1 text-base font-semibold text-stone-900">
                  {item.title}
                </h2>
                <p className="mt-1 flex-1 text-sm leading-snug text-stone-600">
                  {item.description}
                </p>
                {item.creditName ? (
                  <p className="mt-2 text-[11px] text-stone-500">
                    Contributed by {item.creditName}
                  </p>
                ) : null}
                {item.tags.length > 0 ? (
                  <p className="mt-1 text-[11px] text-stone-500">
                    {item.tags.join(" · ")}
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onUse(item)}
                  className="mt-4 rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
                >
                  {busy ? "Copying…" : "Use this → My Activity Bank"}
                </button>
                {isAdmin ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onRetire(item)}
                    className="mt-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                  >
                    Retire from catalog
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {assignTemplateId ? <AssignHomeworkTemplateOverlay key={assignTemplateId} open onClose={() => setAssignTemplateId(null)} classes={classes} templateId={assignTemplateId} /> : null}
    </div>
  );
}
