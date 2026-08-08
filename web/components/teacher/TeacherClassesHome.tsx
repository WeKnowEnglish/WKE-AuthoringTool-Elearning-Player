"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  publishBankActivityToSpace,
  removeBankActivityFromSpace,
} from "@/lib/actions/teacher-space";
import { isAssignableStudioHomeworkFormat } from "@/lib/class-homework/assignable-studio-formats";
import type { TeacherClassSummary } from "@/lib/data/teacher-classes";
import type { StudioActivitySummary } from "@/lib/studio-activities/load";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";
import type {
  TeacherSpaceItemSummary,
  TeacherSpaceSummary,
} from "@/lib/teacher-space/types";
import { AssignStudioActivityHomeworkOverlay } from "@/components/teacher/AssignStudioActivityHomeworkOverlay";
import { TeacherSpacePanel } from "@/components/teacher/TeacherSpacePanel";
import { recordAppDiagnostic } from "@/lib/app-diagnostics/client";

const FORMAT_LABEL: Record<StudioActivityFormat, string> = {
  multiple_choice: "MCQ",
  letter_mixup: "Letter scramble",
  flashcards: "Flashcards",
  listen_and_choose: "Listen and choose",
  line_match: "Line match",
  true_false: "True / false",
  sentence_scramble: "Sentence scramble",
  fill_blanks: "Fill in the blanks",
  learning_track: "Learning track",
  vocabulary_list: "Vocabulary list",
  explore_hotspots: "Explore hotspots",
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

type MainTab = "classes" | "wall";

type Props = {
  classes: TeacherClassSummary[];
  activities: StudioActivitySummary[];
  space: TeacherSpaceSummary | null;
  spaceItems: TeacherSpaceItemSummary[];
  spaceItemByActivityId: Record<string, string>;
  origin: string;
  liveRequiresPlus?: boolean;
  initialTab?: MainTab;
  initialShowBank?: boolean;
  initialActivityId?: string | null;
};

export function TeacherClassesHome({
  classes,
  activities: initialActivities,
  space,
  spaceItems,
  spaceItemByActivityId: initialSpaceMap,
  origin,
  liveRequiresPlus = false,
  initialTab = "classes",
  initialShowBank = false,
  initialActivityId = null,
}: Props) {
  const router = useRouter();
  const [activities, setActivities] = useState(initialActivities);
  const [spaceMap, setSpaceMap] = useState(initialSpaceMap);
  const [tab, setTab] = useState<MainTab>(initialTab);
  const [showBank, setShowBank] = useState(
    initialShowBank || Boolean(initialActivityId),
  );
  const [selectedId, setSelectedId] = useState<string | null>(initialActivityId);
  const [formatFilter, setFormatFilter] = useState<StudioActivityFormat | "all">(
    "all",
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const classOptions = useMemo(
    () => classes.map((row) => ({ id: row.id, title: row.title })),
    [classes],
  );

  useEffect(() => {
    setAssignOpen(false);
  }, [selectedId]);

  useEffect(() => {
    recordAppDiagnostic("teacher", "mark", "teacher_classes_loaded", {
      classCount: classes.length,
      activityCount: activities.length,
    });
  }, [activities.length, classes.length]);

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  useEffect(() => {
    setSpaceMap(initialSpaceMap);
  }, [initialSpaceMap]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialShowBank || initialActivityId) {
      setShowBank(true);
    }
    if (initialActivityId) {
      setSelectedId(initialActivityId);
    }
  }, [initialShowBank, initialActivityId]);

  const filtered = useMemo(() => {
    if (formatFilter === "all") return activities;
    return activities.filter((row) => row.format === formatFilter);
  }, [activities, formatFilter]);

  const selected = useMemo(
    () => activities.find((row) => row.id === selectedId) ?? null,
    [activities, selectedId],
  );

  function syncUrl(nextTab: MainTab, bankOpen: boolean, activityId: string | null) {
    const params = new URLSearchParams();
    if (nextTab === "wall") params.set("space", "1");
    if (bankOpen) params.set("bank", "1");
    if (activityId) params.set("activity", activityId);
    const q = params.toString();
    router.replace(q ? `/teacher/classes?${q}` : "/teacher/classes");
  }

  function goTab(next: MainTab) {
    setTab(next);
    if (next === "wall") {
      setSelectedId(null);
      syncUrl("wall", showBank, null);
      return;
    }
    syncUrl("classes", showBank, selectedId);
  }

  function openBank(activityId?: string | null) {
    setShowBank(true);
    setSelectedId(activityId ?? null);
    syncUrl(tab, true, activityId ?? null);
  }

  async function deleteActivity(id: string) {
    if (!window.confirm("Delete this activity from your bank? This cannot be undone.")) {
      return;
    }
    setNotice(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/studio/activities/${encodeURIComponent(id)}`, {
          method: "DELETE",
          credentials: "include",
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "Could not delete activity.");
        }
        setActivities((current) => current.filter((row) => row.id !== id));
        setSpaceMap((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
        if (selectedId === id) setSelectedId(null);
        setNotice("Deleted from Activity Bank.");
        router.refresh();
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Delete failed.");
      }
    });
  }

  function publishToSpace(activityId: string) {
    setNotice(null);
    startTransition(async () => {
      const result = await publishBankActivityToSpace(activityId);
      if (!result.ok) {
        setNotice(result.error);
        return;
      }
      if (result.itemId) {
        setSpaceMap((current) => ({ ...current, [activityId]: result.itemId! }));
      }
      setNotice(result.message ?? "Published to Classroom Wall.");
      router.refresh();
    });
  }

  function removeFromSpace(activityId: string) {
    setNotice(null);
    startTransition(async () => {
      const result = await removeBankActivityFromSpace(activityId);
      if (!result.ok) {
        setNotice(result.error);
        return;
      }
      setSpaceMap((current) => {
        const next = { ...current };
        delete next[activityId];
        return next;
      });
      setNotice(result.message ?? "Removed from Classroom Wall.");
      router.refresh();
    });
  }

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: activities.length };
    for (const row of activities) {
      map[row.format] = (map[row.format] ?? 0) + 1;
    }
    return map;
  }, [activities]);

  const selectedOnSpace = selected ? Boolean(spaceMap[selected.id]) : false;

  const tabButtonClass = (active: boolean) =>
    [
      "relative -mb-px min-w-[9.5rem] rounded-t-2xl px-5 py-3 text-left transition sm:min-w-[11rem]",
      active
        ? "z-10 border border-b-0 border-stone-200/90 bg-[#fbf8f4] text-stone-900 shadow-[0_-1px_0_#fbf8f4]"
        : "border border-transparent bg-stone-100/70 text-stone-600 hover:bg-stone-100 hover:text-stone-800",
    ].join(" ");

  return (
    <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden">
      {liveRequiresPlus ? (
        <p
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          role="status"
        >
          Live hosting (Virtual Classroom, Live Game, and in-class live tools) is available on
          Teacher Plus. Your account can still create classes, word packs, grammar posters, and
          homework.
        </p>
      ) : null}

      {notice ? (
        <p className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800">
          {notice}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Left rail: activities + tools */}
        <aside className="w-full min-w-0 shrink-0 lg:sticky lg:top-4 lg:w-[19rem] xl:w-[21rem]">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-4 py-3">
              <p className="text-sm font-semibold text-stone-900">My Activity Bank</p>
              <p className="mt-0.5 text-xs text-stone-500">
                {activities.length} saved · use with private classes or Classroom Wall
              </p>
            </div>

            <div className="min-w-0 space-y-3 px-3 py-3">
              <BankFormatFilterRow
                formatFilter={formatFilter}
                counts={counts}
                onSelect={(next) => {
                  setFormatFilter(next);
                  openBank(selectedId);
                }}
              />

              <ul className="max-h-[16rem] space-y-1 overflow-y-auto">
                {filtered.length === 0 ? (
                  <li className="px-2 py-3 text-xs text-stone-500">
                    No activities yet. Use Play in Lesson Player from EDU Studio while signed in.
                  </li>
                ) : (
                  filtered.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => openBank(row.id)}
                        className={`w-full rounded-xl px-2.5 py-2 text-left text-xs transition ${
                          selectedId === row.id
                            ? "bg-sky-50 text-sky-950 ring-1 ring-sky-200"
                            : "hover:bg-stone-50"
                        }`}
                      >
                        <span className="line-clamp-2 font-semibold">{row.title}</span>
                        <span className="mt-0.5 block text-[10px] text-stone-500">
                          {FORMAT_LABEL[row.format]}
                          {spaceMap[row.id] ? " · On Wall" : ""}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>

              {selected ? (
                <div className="rounded-xl border border-stone-200 bg-[#fbf8f4]/90 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                    {FORMAT_LABEL[selected.format]}
                    {selectedOnSpace ? " · On Wall" : ""}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-stone-900">{selected.title}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <a
                      href={selected.playPath}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-stone-800 px-2.5 py-1 text-[11px] font-semibold text-white"
                    >
                      Play
                    </a>
                    {isAssignableStudioHomeworkFormat(selected.format) ? (
                      <button
                        type="button"
                        className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-950 disabled:opacity-50"
                        disabled={classOptions.length === 0}
                        title={
                          classOptions.length === 0
                            ? "Create a private class first"
                            : "Assign as class homework"
                        }
                        onClick={() => setAssignOpen(true)}
                      >
                        Assign homework
                      </button>
                    ) : null}
                    {selectedOnSpace ? (
                      <button
                        type="button"
                        className="rounded-lg border border-stone-300 px-2.5 py-1 text-[11px] disabled:opacity-50"
                        disabled={pending}
                        onClick={() => removeFromSpace(selected.id)}
                      >
                        Remove from Wall
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-950 disabled:opacity-50"
                        disabled={pending}
                        onClick={() => publishToSpace(selected.id)}
                      >
                        Publish to Wall
                      </button>
                    )}
                    <button
                      type="button"
                      className="rounded-lg border border-stone-300 px-2.5 py-1 text-[11px] disabled:opacity-50"
                      disabled={pending}
                      onClick={() => void deleteActivity(selected.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : showBank && filtered.length > 0 ? (
                <p className="px-1 text-[11px] text-stone-500">
                  Select an activity to play, assign, or publish.
                </p>
              ) : null}
            </div>

            <div className="border-t border-dashed border-stone-200 px-4 py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-stone-800">Teacher tools</p>
                  <p className="mt-0.5 text-[11px] text-stone-500">
                    Timers, name pickers, and live helpers.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  Soon
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {["Timer", "Name picker", "Whiteboard", "Live game"].map((label) => (
                  <div
                    key={label}
                    className="rounded-xl border border-stone-200/80 bg-stone-50/90 px-2 py-2.5 text-center"
                  >
                    <div
                      className="mx-auto mb-1.5 h-7 w-7 rounded-lg bg-stone-200/80"
                      aria-hidden
                    />
                    <p className="text-[10px] font-medium text-stone-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main: folder tabs */}
        <div className="min-w-0 flex-1">
          <div
            className="flex flex-wrap items-end gap-1.5 px-1"
            role="tablist"
            aria-label="Classes and Classroom Wall"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "classes"}
              className={tabButtonClass(tab === "classes")}
              onClick={() => goTab("classes")}
            >
              <span className="block text-sm font-semibold tracking-tight">Private Classes</span>
              <span className="mt-0.5 block text-[11px] font-medium text-stone-500">
                {classes.length} class{classes.length === 1 ? "" : "es"} · roster & homework
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "wall"}
              className={tabButtonClass(tab === "wall")}
              onClick={() => goTab("wall")}
            >
              <span className="block text-sm font-semibold tracking-tight">Classroom Wall</span>
              <span className="mt-0.5 block text-[11px] font-medium text-stone-500">
                {space
                  ? `${space.is_published ? "Published" : "Draft"} · ${space.itemCount} activit${
                      space.itemCount === 1 ? "y" : "ies"
                    }`
                  : "Share practice with a link"}
              </span>
            </button>
          </div>

          <div
            role="tabpanel"
            className="rounded-2xl rounded-tl-md border border-stone-200/90 bg-[#fbf8f4] p-4 shadow-sm sm:p-6"
          >
            {tab === "classes" ? (
              <section className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-stone-900">
                      Private Classes
                    </h1>
                    <p className="mt-1 max-w-xl text-sm text-stone-600">
                      Create a class, share the join code, and build your student roster for Light
                      tracking and homework.
                    </p>
                  </div>
                  <Link
                    href="/teacher/classes/new"
                    className="rounded-xl bg-stone-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-900"
                  >
                    + New class
                  </Link>
                </div>

                {classes.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-stone-300 bg-white/70 px-4 py-8 text-sm text-stone-600">
                    No classes yet. Create one to get a join code for students.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {classes.map((teacherClass) => (
                      <li key={teacherClass.id}>
                        <Link
                          href={`/teacher/classes/${teacherClass.id}`}
                          className="block rounded-xl border border-stone-200/80 bg-white px-4 py-3 transition hover:border-stone-300"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-stone-900">
                                  {teacherClass.title}
                                </p>
                                <span className="rounded-full border border-stone-300 bg-stone-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-stone-600">
                                  {teacherClass.class_kind === "trial"
                                    ? "Trial"
                                    : "Regular"}
                                </span>
                              </div>
                              <p className="text-sm text-stone-600">
                                {teacherClass.enrollmentCount} student
                                {teacherClass.enrollmentCount === 1 ? "" : "s"}
                                {teacherClass.archived_at ? " · Archived" : ""}
                              </p>
                            </div>
                            <span className="rounded-lg bg-stone-100 px-2.5 py-1 font-mono text-sm tracking-widest text-stone-700">
                              {teacherClass.join_code}
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : (
              <TeacherSpacePanel space={space} items={spaceItems} origin={origin} />
            )}
          </div>
        </div>
      </div>

      {selected && isAssignableStudioHomeworkFormat(selected.format) ? (
        <AssignStudioActivityHomeworkOverlay
          open={assignOpen}
          onClose={() => setAssignOpen(false)}
          activityId={selected.id}
          activityTitle={selected.title}
          format={selected.format}
          classes={classOptions}
        />
      ) : null}
    </div>
  );
}

function BankFormatFilterRow(props: {
  formatFilter: StudioActivityFormat | "all";
  counts: Record<string, number>;
  onSelect: (next: StudioActivityFormat | "all") => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const formats = useMemo(
    () =>
      (Object.keys(FORMAT_LABEL) as StudioActivityFormat[]).filter(
        (format) => (props.counts[format] ?? 0) > 0,
      ),
    [props.counts],
  );

  const updateScrollState = () => {
    const node = scrollerRef.current;
    if (!node) return;
    const max = node.scrollWidth - node.clientWidth;
    setCanScrollLeft(node.scrollLeft > 2);
    setCanScrollRight(max - node.scrollLeft > 2);
  };

  useEffect(() => {
    updateScrollState();
    const node = scrollerRef.current;
    if (!node) return;
    const onScroll = () => updateScrollState();
    node.addEventListener("scroll", onScroll, { passive: true });
    const observer = new ResizeObserver(() => updateScrollState());
    observer.observe(node);
    return () => {
      node.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [formats, props.counts.all]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      if (node.scrollWidth <= node.clientWidth) return;
      event.preventDefault();
      node.scrollLeft += event.deltaY;
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, []);

  const scrollBy = (delta: number) => {
    scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <div className="flex min-w-0 items-center gap-1">
      <button
        type="button"
        aria-label="Scroll filters left"
        disabled={!canScrollLeft}
        onClick={() => scrollBy(-120)}
        className="shrink-0 rounded-md border border-stone-200 bg-white px-1.5 py-1 text-xs font-bold text-stone-700 disabled:opacity-30"
      >
        ‹
      </button>
      <div
        ref={scrollerRef}
        className="flex min-w-0 flex-1 gap-1 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]"
      >
        <FilterChip
          active={props.formatFilter === "all"}
          onClick={() => props.onSelect("all")}
          label={`All (${props.counts.all ?? 0})`}
        />
        {formats.map((format) => (
          <FilterChip
            key={format}
            active={props.formatFilter === format}
            onClick={() => props.onSelect(format)}
            label={`${FORMAT_LABEL[format]} (${props.counts[format] ?? 0})`}
          />
        ))}
      </div>
      <button
        type="button"
        aria-label="Scroll filters right"
        disabled={!canScrollRight}
        onClick={() => scrollBy(120)}
        className="shrink-0 rounded-md border border-stone-200 bg-white px-1.5 py-1 text-xs font-bold text-stone-700 disabled:opacity-30"
      >
        ›
      </button>
    </div>
  );
}

function FilterChip(props: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
        props.active
          ? "bg-stone-800 text-white"
          : "bg-stone-100 text-stone-700 hover:bg-stone-200"
      }`}
    >
      {props.label}
    </button>
  );
}
