"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  createLessonFromCourseMap,
  findCourseResources,
  listCourseClassLessons,
  saveCourseMap,
} from "@/lib/actions/course-map";
import {
  activeLessons,
  blankPlannedLesson,
  coverageRows,
  duplicatePlannedLesson,
  duplicateUnit,
  lessonObjectives,
  MAP_PATH,
  planningIssues,
  SKILL_FOCUSES,
  TARGET_ROLES,
  type CourseDocument,
  type CourseMap,
  type CourseObjective,
  type CourseResource,
  type CourseUnit,
  type PlannedLesson,
  type ResourceOption,
} from "@/lib/course-map/model";

const inputClass =
  "mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-normal text-neutral-900 disabled:bg-neutral-100";
const buttonClass =
  "rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-semibold hover:border-teal-600 disabled:opacity-40";
const subscribeHydration = () => () => {};
function Field({
  label,
  value,
  onChange,
  multiline = false,
  maxLength = 1000,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="block text-sm font-semibold text-neutral-800">
      {label}
      {multiline ? (
        <textarea
          aria-label={label}
          className={inputClass}
          value={value}
          rows={3}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          aria-label={label}
          className={inputClass}
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
      <h2 className="font-bold text-neutral-900">{title}</h2>
      {children}
    </section>
  );
}

type Props = {
  initialMap: CourseMap;
  initialResources: ResourceOption[];
  classes: { id: string; title: string }[];
  initialLessonId?: string;
  initialClassId?: string;
};
export function CourseMapEditor({
  initialMap,
  initialResources,
  classes,
  initialLessonId,
  initialClassId,
}: Props) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const [saved, setSaved] = useState(initialMap);
  const [document, setDocument] = useState(initialMap.document);
  const [selectedId, setSelectedId] = useState(
    initialLessonId ?? activeLessons(initialMap.document)[0]?.id ?? "",
  );
  // Navigation state stays separate from the saved curriculum document.
  const [openUnitIds, setOpenUnitIds] = useState<string[]>(() => {
    const lessonId =
      initialLessonId ?? activeLessons(initialMap.document)[0]?.id;
    const initialUnit =
      initialMap.document.units.find((u) =>
        u.lessons.some((l) => l.id === lessonId),
      ) ?? initialMap.document.units.find((u) => !u.archived);
    return initialUnit ? [initialUnit.id] : [];
  });
  const [resources, setResources] = useState(initialResources);
  const [view, setView] = useState<"sequence" | "coverage">("sequence");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  const [showBrief, setShowBrief] = useState(false);
  const [resourceQuery, setResourceQuery] = useState("");
  const [resourceKind, setResourceKind] =
    useState<CourseResource["kind"]>("vocabulary_list");
  const [resourceSelection, setResourceSelection] = useState("");
  const [targetSelection, setTargetSelection] = useState("");
  const [targetRole, setTargetRole] =
    useState<(typeof TARGET_ROLES)[number]>("introduce");
  const [newTarget, setNewTarget] = useState("");
  const [targetType, setTargetType] =
    useState<CourseDocument["targets"][number]["type"]>("word");
  const [classId, setClassId] = useState(
    initialClassId ?? classes[0]?.id ?? "",
  );
  const [existingId, setExistingId] = useState("");
  const [existingLessons, setExistingLessons] = useState<
    { id: string; title: string }[]
  >([]);
  const [linkExisting, setLinkExisting] = useState(false);
  const operation = useRef<{ key: string; id: string } | null>(null);
  const dirty = JSON.stringify(document) !== JSON.stringify(saved.document);
  const sequence = activeLessons(document);
  const unit = document.units.find((u) =>
    u.lessons.some((l) => l.id === selectedId),
  );
  const selected = unit?.lessons.find((l) => l.id === selectedId);
  const goals = selected ? lessonObjectives(document, selected) : [];
  const coverage = useMemo(() => coverageRows(document), [document]);

  // Reapply after a save refresh so deep links retain the selected lesson.
  useEffect(() => {
    if (!selectedId || busy) return;
    const url = new URL(window.location.href);
    url.searchParams.set("lesson", selectedId);
    window.history.replaceState(window.history.state, "", url.toString());
  }, [selectedId, busy, saved.revision]);

  useEffect(() => {
    const listener = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [dirty]);
  useEffect(() => {
    if (!linkExisting || !classId) return;
    let live = true;
    setExistingLessons([]);
    setExistingId("");
    listCourseClassLessons(classId)
      .then((result) => {
        if (!live) return;
        if (result.ok) setExistingLessons(result.lessons);
        else setError(result.error);
      })
      .catch(() => {
        if (live) setError("Could not load class lessons. Retry.");
      });
    return () => {
      live = false;
    };
  }, [classId, linkExisting]);

  function change(update: (current: CourseDocument) => CourseDocument) {
    setDocument(update);
    setMessage("");
  }
  function updateLesson(patch: Partial<PlannedLesson>) {
    change((d) => ({
      ...d,
      units: d.units.map((u) => ({
        ...u,
        lessons: u.lessons.map((l) =>
          l.id === selectedId ? { ...l, ...patch } : l,
        ),
      })),
    }));
  }
  function updateUnit(id: string, patch: Partial<CourseUnit>) {
    change((d) => ({
      ...d,
      units: d.units.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    }));
  }
  function updateObjective(id: string, patch: Partial<CourseObjective>) {
    change((d) => ({
      ...d,
      objectives: d.objectives.map((o) =>
        o.id === id ? { ...o, ...patch } : o,
      ),
    }));
  }
  function selectLesson(id: string) {
    setSelectedId(id);
    const selectedUnit = document.units.find((u) =>
      u.lessons.some((l) => l.id === id),
    );
    if (selectedUnit) openUnit(selectedUnit.id);
    setResourceSelection("");
    setExistingId("");
    operation.current = null;
    const url = new URL(window.location.href);
    url.searchParams.set("lesson", id);
    window.history.replaceState(window.history.state, "", url.toString());
  }
  function openUnit(id: string) {
    setOpenUnitIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }
  function expandAllUnits() {
    setOpenUnitIds(document.units.map((u) => u.id));
  }
  function addLesson(unitId: string, afterId?: string) {
    const lesson = blankPlannedLesson();
    const objective: CourseObjective = {
      id: crypto.randomUUID(),
      statement: "",
      learnerStatement: "",
      successCriteria: "",
      evidenceMode: "production",
    };
    lesson.objectiveIds = [objective.id];
    change((d) => ({
      ...d,
      objectives: [...d.objectives, objective],
      units: d.units.map((u) => {
        if (u.id !== unitId) return u;
        const lessons = [...u.lessons];
        const index = afterId
          ? lessons.findIndex((l) => l.id === afterId) + 1
          : lessons.length;
        lessons.splice(index, 0, lesson);
        return { ...u, lessons };
      }),
    }));
    selectLesson(lesson.id);
    openUnit(unitId);
  }
  function moveUnit(index: number, delta: number) {
    change((d) => {
      const units = [...d.units];
      [units[index], units[index + delta]] = [
        units[index + delta],
        units[index],
      ];
      return { ...d, units };
    });
  }
  function moveLesson(delta: number) {
    if (!unit || !selected) return;
    const index = unit.lessons.findIndex((l) => l.id === selected.id);
    const lessons = [...unit.lessons];
    [lessons[index], lessons[index + delta]] = [
      lessons[index + delta],
      lessons[index],
    ];
    updateUnit(unit.id, { lessons });
  }
  async function persist(archived = saved.archived): Promise<CourseMap | null> {
    setError("");
    setMessage("");
    try {
      const result = await saveCourseMap({
        id: saved.id,
        expectedRevision: saved.revision,
        document,
        archived,
      });
      if (!result.ok) {
        setError(result.error);
        return null;
      }
      setSaved(result.map);
      setDocument(result.map.document);
      setMessage(`Saved revision ${result.map.revision}.`);
      return result.map;
    } catch {
      setError(
        "Connection interrupted. Your unsaved work is still on screen. Reload in a new tab to check the saved revision before retrying.",
      );
      return null;
    }
  }
  function refreshResources() {
    setError("");
    startTransition(async () => {
      try {
        const result = await findCourseResources({
          document,
          search: resourceQuery,
        });
        if (result.ok) {
          setResources(result.resources);
          setMessage("Resource availability refreshed.");
        } else setError(result.error);
      } catch {
        setError("Could not refresh resources. Please retry.");
      }
    });
  }
  function createPlan() {
    if (!selected) return;
    const key = `${saved.id}:${saved.revision}:${selected.id}:${classId}:${existingId}`;
    if (operation.current?.key !== key)
      operation.current = { key, id: crypto.randomUUID() };
    setError("");
    startTransition(async () => {
      try {
        const result = await createLessonFromCourseMap({
          operationId: operation.current!.id,
          mapId: saved.id,
          revision: saved.revision,
          plannedLessonId: selected.id,
          classId,
          ...(linkExisting ? { existingLessonId: existingId } : {}),
        });
        if (result.ok) router.push(result.href);
        else setError(result.error);
      } catch {
        setError(
          "Connection interrupted. Retry to recover the same class lesson.",
        );
      }
    });
  }
  const filteredOptions = resources.filter(
    (r) =>
      r.kind === resourceKind &&
      !selected?.resources.some(
        (a) => a.kind === r.kind && a.sourceId === r.sourceId,
      ),
  );
  return (
    <div className="mx-auto max-w-[1500px] space-y-4 pb-16">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-teal-200 bg-teal-50 p-5">
        <div>
          <Link
            href={MAP_PATH}
            onClick={(e) => {
              if (
                dirty &&
                !window.confirm("Leave this page and discard unsaved changes?")
              )
                e.preventDefault();
            }}
            className="text-xs font-bold uppercase tracking-wider text-teal-800"
          >
            Libraries / Course map
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-neutral-950">
            {document.title}
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            {document.audience || "Set the intended learners"}{" "}
            {document.cefr && `· ${document.cefr}`} · {sequence.length} planned
            lessons
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            role="status"
            className={`rounded-full px-3 py-1 text-xs font-semibold ${dirty ? "bg-amber-100 text-amber-900" : "bg-white text-teal-900"}`}
          >
            {busy
              ? "Working…"
              : dirty
                ? "Unsaved changes"
                : `Saved · revision ${saved.revision}`}
          </span>
          <button
            className={buttonClass}
            disabled={busy || !hydrated}
            onClick={() => setShowBrief(!showBrief)}
          >
            Course details
          </button>
          <button
            className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            disabled={busy || !hydrated}
            onClick={() =>
              startTransition(async () => {
                await persist();
              })
            }
          >
            Save map
          </button>
        </div>
      </header>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}{" "}
          <button
            className="ml-3 underline"
            onClick={() =>
              window.open(window.location.href, "_blank", "noopener")
            }
          >
            Open saved map in a new tab
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="text-sm text-teal-800">
          {message}
        </p>
      )}
      {saved.archived && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          This course is archived. Restore it in Course details to create class
          lessons.
        </p>
      )}
      <fieldset
        disabled={busy || !hydrated}
        className="min-w-0 space-y-4 disabled:opacity-70"
      >
        {showBrief && (
          <Panel title="Course brief">
            <div className="grid gap-4 md:grid-cols-3">
              <Field
                label="Course title"
                value={document.title}
                onChange={(title) => change((d) => ({ ...d, title }))}
                maxLength={120}
              />
              <Field
                label="Intended learners / age band"
                value={document.audience}
                onChange={(audience) => change((d) => ({ ...d, audience }))}
                maxLength={300}
              />
              <Field
                label="Grade range"
                value={document.gradeRange}
                onChange={(gradeRange) => change((d) => ({ ...d, gradeRange }))}
                maxLength={100}
              />
              <Field
                label="CEFR range"
                value={document.cefr}
                onChange={(cefr) => change((d) => ({ ...d, cefr }))}
                maxLength={100}
              />
              <Field
                label="Course outcomes"
                multiline
                value={document.outcomes}
                onChange={(outcomes) => change((d) => ({ ...d, outcomes }))}
                maxLength={3000}
              />
              <Field
                label="Entry expectations"
                multiline
                value={document.entryExpectations}
                onChange={(entryExpectations) =>
                  change((d) => ({ ...d, entryExpectations }))
                }
                maxLength={1500}
              />
            </div>
            <button
              className={buttonClass}
              onClick={() => {
                if (
                  window.confirm(
                    saved.archived
                      ? "Restore this course map?"
                      : "Archive this course map? Existing class lessons and history will be kept.",
                  )
                )
                  startTransition(async () => {
                    await persist(!saved.archived);
                  });
              }}
            >
              {saved.archived ? "Restore course" : "Archive course"}
            </button>
          </Panel>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex gap-1 rounded-lg border bg-white p-1"
            aria-label="Map views"
          >
            {(["sequence", "coverage"] as const).map((v) => (
              <button
                key={v}
                aria-pressed={view === v}
                className={`rounded-md px-4 py-2 text-sm font-semibold ${view === v ? "bg-teal-800 text-white" : "text-neutral-600"}`}
                onClick={() => setView(v)}
              >
                {v === "sequence" ? "Sequence" : "Target coverage"}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-500">
            Planning coverage shows opportunities to learn; student mastery
            comes from evidence.
          </p>
        </div>
        {view === "coverage" ? (
          <Panel title="Target coverage across the course">
            <p className="text-sm text-neutral-600">
              Introduce → practise → assess → revisit. Look for opportunities to
              retrieve and use learning after a gap.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr>
                    <th className="min-w-48 border-b p-3">Learning target</th>
                    {sequence.map((l) => (
                      <th key={l.id} className="min-w-36 border-b p-3">
                        <button
                          className="text-teal-800 underline"
                          onClick={() => {
                            selectLesson(l.id);
                            setView("sequence");
                          }}
                        >
                          {l.title}
                        </button>
                      </th>
                    ))}
                    <th className="min-w-44 border-b p-3">Planning gaps</th>
                  </tr>
                </thead>
                <tbody>
                  {coverage.map((row) => (
                    <tr key={row.target.id}>
                      <th scope="row" className="border-b p-3">
                        {row.target.label}
                        <span className="block text-xs font-normal text-neutral-500">
                          {row.target.type}
                        </span>
                      </th>
                      {row.cells.map((cell, i) => (
                        <td key={sequence[i].id} className="border-b p-3">
                          {cell.length ? cell.join(" · ") : "—"}
                        </td>
                      ))}
                      <td className="border-b p-3 text-xs text-amber-800">
                        {row.warnings.join(" · ") ||
                          "Assessment and revisit mapped"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!coverage.length && (
              <p className="text-sm text-neutral-500">
                Add targets in a lesson to see their progression here.
              </p>
            )}
          </Panel>
        ) : (
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,1fr)]">
            <Panel title="Units and planned lessons">
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs font-semibold">
                  Search titles, objectives, targets, resources
                  <input
                    className={inputClass}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      expandAllUnits();
                    }}
                    placeholder="Find a lesson…"
                  />
                </label>
                <label className="text-xs font-semibold">
                  Filter
                  <select
                    className={inputClass}
                    value={filter}
                    onChange={(e) => {
                      setFilter(e.target.value);
                      expandAllUnits();
                    }}
                  >
                    <option value="">All lessons</option>
                    <option value="gaps">Preparation gaps</option>
                    {SKILL_FOCUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex items-center gap-2 text-xs text-neutral-600">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                />
                Show archived units and lessons
              </label>
              <div className="flex flex-wrap gap-2">
                <button className={buttonClass} onClick={expandAllUnits}>
                  Expand all
                </button>
                <button
                  className={buttonClass}
                  onClick={() => setOpenUnitIds([])}
                >
                  Collapse all
                </button>
                {unit && (
                  <button
                    className={buttonClass}
                    onClick={() => {
                      setQuery("");
                      setFilter("");
                      if (unit.archived || selected?.archived)
                        setShowArchived(true);
                      openUnit(unit.id);
                      requestAnimationFrame(() =>
                        window.document
                          .getElementById(`unit-${unit.id}`)
                          ?.scrollIntoView({ block: "nearest" }),
                      );
                    }}
                  >
                    Show selected lesson
                  </button>
                )}
              </div>
              {document.units.map((u, ui) => {
                if (!showArchived && u.archived) return null;
                const visibleLessons = u.lessons
                  .filter((l) => showArchived || !l.archived)
                  .filter((l) => {
                    const terms = [
                      u.title,
                      u.outcome,
                      l.title,
                      l.targetLanguage,
                      ...lessonObjectives(document, l).map((o) => o.statement),
                      ...l.resources.map((r) => r.title),
                      ...l.targets.map(
                        (t) =>
                          document.targets.find((x) => x.id === t.targetId)
                            ?.label ?? "",
                      ),
                    ]
                      .join(" ")
                      .toLowerCase();
                    return (
                      terms.includes(query.trim().toLowerCase()) &&
                      (!filter ||
                        (filter === "gaps"
                          ? planningIssues(document, l, resources).length > 0
                          : l.skills.includes(
                              filter as (typeof SKILL_FOCUSES)[number],
                            )))
                    );
                  });
                const searching = Boolean(query.trim() || filter);
                if (searching && !visibleLessons.length) return null;
                const expanded = openUnitIds.includes(u.id);
                return (
                  <div
                    key={u.id}
                    id={`unit-${u.id}`}
                    className={`rounded-xl border ${u.archived ? "bg-neutral-100" : "bg-neutral-50"}`}
                  >
                    <h3>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                        aria-expanded={expanded}
                        aria-controls={`unit-content-${u.id}`}
                        onClick={() =>
                          setOpenUnitIds((ids) =>
                            expanded
                              ? ids.filter((id) => id !== u.id)
                              : [...ids, u.id],
                          )
                        }
                      >
                        <span aria-hidden="true" className="text-neutral-500">
                          {expanded ? "▾" : "▸"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-sm font-semibold">
                            {u.title || "Untitled unit"}
                            {u.archived && " (archived)"}
                          </span>
                          <span className="mt-1 block text-xs text-neutral-600">
                            {visibleLessons.length}{" "}
                            {searching ? "matching " : ""}
                            {visibleLessons.length === 1 ? "lesson" : "lessons"}
                            {unit?.id === u.id &&
                              " · Selected lesson in this unit"}
                          </span>
                        </span>
                      </button>
                    </h3>
                    <div id={`unit-content-${u.id}`} hidden={!expanded}>
                      <div className="space-y-2 p-3">
                        <Field
                          label="Unit title"
                          value={u.title}
                          maxLength={120}
                          onChange={(title) => updateUnit(u.id, { title })}
                        />
                        <Field
                          label="Unit outcome"
                          value={u.outcome}
                          maxLength={1500}
                          onChange={(outcome) => updateUnit(u.id, { outcome })}
                        />
                        <div className="flex flex-wrap gap-1">
                          <button
                            className={buttonClass}
                            disabled={ui === 0}
                            aria-label={`Move ${u.title} up`}
                            onClick={() => moveUnit(ui, -1)}
                          >
                            ↑
                          </button>
                          <button
                            className={buttonClass}
                            disabled={ui === document.units.length - 1}
                            aria-label={`Move ${u.title} down`}
                            onClick={() => moveUnit(ui, 1)}
                          >
                            ↓
                          </button>
                          <button
                            className={buttonClass}
                            onClick={() => {
                              const copy = duplicateUnit(u);
                              change((d) => ({
                                ...d,
                                units: [
                                  ...d.units.slice(0, ui + 1),
                                  copy,
                                  ...d.units.slice(ui + 1),
                                ],
                              }));
                              openUnit(copy.id);
                            }}
                          >
                            Duplicate unit
                          </button>
                          <button
                            className={buttonClass}
                            onClick={() => {
                              if (
                                window.confirm(
                                  u.archived
                                    ? "Restore this unit?"
                                    : "Archive this unit and hide it from the active sequence?",
                                )
                              )
                                updateUnit(u.id, { archived: !u.archived });
                            }}
                          >
                            {u.archived ? "Restore unit" : "Archive unit"}
                          </button>
                        </div>
                      </div>
                      <ul className="divide-y border-t">
                        {visibleLessons.map((l) => {
                          const issues = planningIssues(document, l, resources);
                          return (
                            <li key={l.id}>
                              <button
                                className={`w-full p-3 text-left ${selectedId === l.id ? "bg-teal-100" : "hover:bg-white"}`}
                                onClick={() => selectLesson(l.id)}
                                aria-pressed={selectedId === l.id}
                              >
                                <span className="flex items-center justify-between gap-2">
                                  <strong className="text-sm">
                                    {l.title}
                                    {l.archived && " (archived)"}
                                  </strong>
                                  <span className="text-xs text-neutral-500">
                                    {l.durationMinutes} min
                                  </span>
                                </span>
                                <span className="mt-1 line-clamp-2 text-xs text-neutral-600">
                                  {lessonObjectives(document, l)
                                    .map((o) => o.statement)
                                    .filter(Boolean)
                                    .join(" · ") ||
                                    "Define the learning objective"}
                                </span>
                                <span
                                  className={`mt-2 block text-xs ${issues.length ? "text-amber-800" : "text-teal-800"}`}
                                >
                                  {issues.length
                                    ? issues.join(" · ")
                                    : "Ready to plan"}{" "}
                                  · {l.resources.length} resources
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                      {!u.archived && (
                        <button
                          className="m-3 text-sm font-semibold text-teal-800"
                          onClick={() => addLesson(u.id)}
                        >
                          + Add lesson
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <button
                className={buttonClass}
                onClick={() => {
                  const id = crypto.randomUUID();
                  change((d) => ({
                    ...d,
                    units: [
                      ...d.units,
                      {
                        id,
                        title: `Unit ${d.units.length + 1}`,
                        outcome: "",
                        archived: false,
                        lessons: [],
                      },
                    ],
                  }));
                  setQuery("");
                  setFilter("");
                  openUnit(id);
                }}
              >
                + Add unit
              </button>
              {!document.units.length && (
                <p className="text-sm text-neutral-500">
                  Add a unit, define its outcome, then add the planned lessons.
                </p>
              )}
            </Panel>
            <div className="min-w-0 space-y-4">
              {selected && unit ? (
                <>
                  <Panel title="Lesson learning brief">
                    <Field
                      label="Planned lesson title"
                      value={selected.title}
                      maxLength={120}
                      onChange={(title) => updateLesson({ title })}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-sm font-semibold">
                        Expected class minutes
                        <input
                          type="number"
                          min={5}
                          max={240}
                          value={selected.durationMinutes}
                          className={inputClass}
                          onChange={(e) =>
                            updateLesson({
                              durationMinutes: Math.min(
                                240,
                                Math.max(5, Number(e.target.value) || 5),
                              ),
                            })
                          }
                        />
                      </label>
                      <label className="text-sm font-semibold">
                        Unit
                        <select
                          className={inputClass}
                          value={unit.id}
                          onChange={(e) => {
                            const destination = e.target.value;
                            change((d) => ({
                              ...d,
                              units: d.units.map((u) => ({
                                ...u,
                                lessons:
                                  u.id === destination
                                    ? [...u.lessons, selected]
                                    : u.lessons.filter(
                                        (l) => l.id !== selected.id,
                                      ),
                              })),
                            }));
                          }}
                        >
                          {document.units
                            .filter((u) => !u.archived || u.id === unit.id)
                            .map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.title}
                              </option>
                            ))}
                        </select>
                      </label>
                    </div>
                    {goals.map((goal) => (
                      <div
                        className="space-y-3 rounded-lg border border-teal-100 bg-teal-50/50 p-3"
                        key={goal.id}
                      >
                        <Field
                          label="Observable learning objective"
                          multiline
                          value={goal.statement}
                          onChange={(statement) =>
                            updateObjective(goal.id, { statement })
                          }
                        />
                        <Field
                          label="Student-friendly goal"
                          value={goal.learnerStatement}
                          onChange={(learnerStatement) =>
                            updateObjective(goal.id, { learnerStatement })
                          }
                        />
                        <Field
                          label="Success criteria / learning check"
                          multiline
                          value={goal.successCriteria}
                          onChange={(successCriteria) =>
                            updateObjective(goal.id, { successCriteria })
                          }
                        />
                        <label className="text-sm font-semibold">
                          Intended evidence
                          <select
                            className={inputClass}
                            value={goal.evidenceMode}
                            onChange={(e) =>
                              updateObjective(goal.id, {
                                evidenceMode: e.target
                                  .value as CourseObjective["evidenceMode"],
                              })
                            }
                          >
                            {[
                              "recognition",
                              "recall",
                              "production",
                              "transfer",
                            ].map((v) => (
                              <option key={v}>{v}</option>
                            ))}
                          </select>
                        </label>
                        <p className="text-xs text-neutral-500">
                          This objective is used by{" "}
                          {
                            document.units
                              .flatMap((u) => u.lessons)
                              .filter((l) => l.objectiveIds.includes(goal.id))
                              .length
                          }{" "}
                          lesson(s). Editing it updates every linked lesson in
                          this draft.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            className={buttonClass}
                            onClick={() => {
                              const copy = { ...goal, id: crypto.randomUUID() };
                              change((d) => ({
                                ...d,
                                objectives: [...d.objectives, copy],
                                units: d.units.map((u) => ({
                                  ...u,
                                  lessons: u.lessons.map((l) =>
                                    l.id === selected.id
                                      ? {
                                          ...l,
                                          objectiveIds: l.objectiveIds.map(
                                            (id) =>
                                              id === goal.id ? copy.id : id,
                                          ),
                                        }
                                      : l,
                                  ),
                                })),
                              }));
                            }}
                          >
                            Make independent objective
                          </button>
                          <button
                            className={buttonClass}
                            onClick={() =>
                              updateLesson({
                                objectiveIds: selected.objectiveIds.filter(
                                  (id) => id !== goal.id,
                                ),
                              })
                            }
                          >
                            Unlink objective
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2">
                      <button
                        className={buttonClass}
                        onClick={() => {
                          const goal: CourseObjective = {
                            id: crypto.randomUUID(),
                            statement: "",
                            learnerStatement: "",
                            successCriteria: "",
                            evidenceMode: "production",
                          };
                          change((d) => ({
                            ...d,
                            objectives: [...d.objectives, goal],
                            units: d.units.map((u) => ({
                              ...u,
                              lessons: u.lessons.map((l) =>
                                l.id === selected.id
                                  ? {
                                      ...l,
                                      objectiveIds: [
                                        ...l.objectiveIds,
                                        goal.id,
                                      ],
                                    }
                                  : l,
                              ),
                            })),
                          }));
                        }}
                      >
                        + Add objective
                      </button>
                      <label className="text-xs">
                        Reuse objective
                        <select
                          className={inputClass}
                          value=""
                          onChange={(e) => {
                            if (e.target.value)
                              updateLesson({
                                objectiveIds: [
                                  ...selected.objectiveIds,
                                  e.target.value,
                                ],
                              });
                          }}
                        >
                          <option value="">Choose an existing goal…</option>
                          {document.objectives
                            .filter(
                              (o) =>
                                !selected.objectiveIds.includes(o.id) &&
                                o.statement,
                            )
                            .map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.statement.slice(0, 90)}
                              </option>
                            ))}
                        </select>
                      </label>
                    </div>
                    <Field
                      label="Target language / grammar patterns"
                      multiline
                      value={selected.targetLanguage}
                      maxLength={1500}
                      onChange={(targetLanguage) =>
                        updateLesson({ targetLanguage })
                      }
                    />
                    <Field
                      label="Teacher-led task instructions"
                      multiline
                      value={selected.teacherTask}
                      maxLength={1500}
                      onChange={(teacherTask) => updateLesson({ teacherTask })}
                    />
                    <div>
                      <p className="text-sm font-semibold">Skill focus</p>
                      <div className="mt-2 flex flex-wrap gap-3">
                        {SKILL_FOCUSES.map((skill) => (
                          <label
                            key={skill}
                            className="flex items-center gap-1 text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={selected.skills.includes(skill)}
                              onChange={(e) =>
                                updateLesson({
                                  skills: e.target.checked
                                    ? [...selected.skills, skill]
                                    : selected.skills.filter(
                                        (s) => s !== skill,
                                      ),
                                })
                              }
                            />
                            {skill}
                          </label>
                        ))}
                      </div>
                    </div>
                    <label className="text-sm font-semibold">
                      Prerequisites
                      <select
                        multiple
                        className={inputClass}
                        value={selected.prerequisites}
                        onChange={(e) =>
                          updateLesson({
                            prerequisites: Array.from(
                              e.target.selectedOptions,
                            ).map((o) => o.value),
                          })
                        }
                      >
                        {sequence
                          .filter((l) => l.id !== selected.id)
                          .map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.title}
                            </option>
                          ))}
                      </select>
                      <span className="text-xs font-normal text-neutral-500">
                        Select earlier lessons; Ctrl/Cmd selects multiple.
                      </span>
                    </label>
                    <Field
                      label="Support / scaffolding"
                      multiline
                      value={selected.support}
                      maxLength={1500}
                      onChange={(support) => updateLesson({ support })}
                    />
                    <Field
                      label="Extension after success"
                      multiline
                      value={selected.extension}
                      maxLength={1500}
                      onChange={(extension) => updateLesson({ extension })}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        className={buttonClass}
                        disabled={unit.lessons[0]?.id === selected.id}
                        onClick={() => moveLesson(-1)}
                        aria-label="Move lesson up"
                      >
                        ↑ Move up
                      </button>
                      <button
                        className={buttonClass}
                        disabled={unit.lessons.at(-1)?.id === selected.id}
                        onClick={() => moveLesson(1)}
                        aria-label="Move lesson down"
                      >
                        ↓ Move down
                      </button>
                      <button
                        className={buttonClass}
                        onClick={() => addLesson(unit.id, selected.id)}
                      >
                        Insert lesson after
                      </button>
                      <button
                        className={buttonClass}
                        onClick={() => {
                          const copy = duplicatePlannedLesson(selected);
                          const index = unit.lessons.findIndex(
                            (l) => l.id === selected.id,
                          );
                          updateUnit(unit.id, {
                            lessons: [
                              ...unit.lessons.slice(0, index + 1),
                              copy,
                              ...unit.lessons.slice(index + 1),
                            ],
                          });
                          selectLesson(copy.id);
                          openUnit(unit.id);
                        }}
                      >
                        Duplicate lesson
                      </button>
                      <button
                        className={buttonClass}
                        onClick={() => {
                          if (
                            window.confirm(
                              selected.archived
                                ? "Restore this lesson?"
                                : "Archive this planned lesson? Existing class plans are kept.",
                            )
                          )
                            updateLesson({ archived: !selected.archived });
                        }}
                      >
                        {selected.archived
                          ? "Restore lesson"
                          : "Archive lesson"}
                      </button>
                    </div>
                  </Panel>
                  <Panel title="Learning targets and review">
                    {selected.targets.map((occurrence, index) => (
                      <div
                        key={`${occurrence.targetId}:${index}`}
                        className="flex flex-wrap items-center gap-2 rounded-lg bg-neutral-50 p-2"
                      >
                        <span className="flex-1 text-sm">
                          {
                            document.targets.find(
                              (t) => t.id === occurrence.targetId,
                            )?.label
                          }
                        </span>
                        <select
                          aria-label="Target role"
                          className="rounded border p-1 text-xs"
                          value={occurrence.role}
                          onChange={(e) =>
                            updateLesson({
                              targets: selected.targets.map((t, i) =>
                                i === index
                                  ? {
                                      ...t,
                                      role: e.target.value as typeof t.role,
                                    }
                                  : t,
                              ),
                            })
                          }
                        >
                          {TARGET_ROLES.map((r) => (
                            <option key={r}>{r}</option>
                          ))}
                        </select>
                        <button
                          className="text-xs text-red-700 underline"
                          onClick={() =>
                            updateLesson({
                              targets: selected.targets.filter(
                                (_, i) => i !== index,
                              ),
                            })
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="text-xs font-semibold">
                        Existing target
                        <select
                          className={inputClass}
                          value={targetSelection}
                          onChange={(e) => setTargetSelection(e.target.value)}
                        >
                          <option value="">Choose a target…</option>
                          {document.targets.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-semibold">
                        Role
                        <select
                          className={inputClass}
                          value={targetRole}
                          onChange={(e) =>
                            setTargetRole(e.target.value as typeof targetRole)
                          }
                        >
                          {TARGET_ROLES.map((r) => (
                            <option key={r}>{r}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <button
                      className={buttonClass}
                      disabled={
                        !targetSelection ||
                        selected.targets.some(
                          (t) =>
                            t.targetId === targetSelection &&
                            t.role === targetRole,
                        )
                      }
                      onClick={() => {
                        updateLesson({
                          targets: [
                            ...selected.targets,
                            { targetId: targetSelection, role: targetRole },
                          ],
                        });
                        setTargetSelection("");
                      }}
                    >
                      Map existing target
                    </button>
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="flex-1 text-xs font-semibold">
                        New target
                        <input
                          className={inputClass}
                          value={newTarget}
                          maxLength={200}
                          placeholder="e.g. pencil / ask about objects"
                          onChange={(e) => setNewTarget(e.target.value)}
                        />
                      </label>
                      <label className="text-xs font-semibold">
                        Type
                        <select
                          className={inputClass}
                          value={targetType}
                          onChange={(e) =>
                            setTargetType(e.target.value as typeof targetType)
                          }
                        >
                          {[
                            "word",
                            "phrase",
                            "grammar",
                            "skill",
                            "learning_goal",
                          ].map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </label>
                      <button
                        className={buttonClass}
                        disabled={!newTarget.trim()}
                        onClick={() => {
                          const target = {
                            id: crypto.randomUUID(),
                            label: newTarget.trim(),
                            type: targetType,
                            key: newTarget.trim().toLowerCase(),
                          };
                          const prior = document.targets.find(
                            (t) =>
                              t.key === target.key && t.type === target.type,
                          );
                          change((d) => ({
                            ...d,
                            targets: prior ? d.targets : [...d.targets, target],
                            units: d.units.map((u) => ({
                              ...u,
                              lessons: u.lessons.map((l) =>
                                l.id === selected.id
                                  ? {
                                      ...l,
                                      targets: [
                                        ...l.targets,
                                        {
                                          targetId: prior?.id ?? target.id,
                                          role: targetRole,
                                        },
                                      ],
                                    }
                                  : l,
                              ),
                            })),
                          }));
                          setNewTarget("");
                        }}
                      >
                        Add target
                      </button>
                    </div>
                    <p className="text-xs text-neutral-500">
                      Reuse the same target in later lessons to map review.
                      Target labels do not automatically create mastery records.
                    </p>
                  </Panel>
                  <Panel title="Linked learning resources">
                    {selected.resources.map((resource) => {
                      const current = resources.find(
                        (r) =>
                          r.kind === resource.kind &&
                          r.sourceId === resource.sourceId,
                      );
                      const savedRevision =
                        saved.sourceRevisions[
                          `${resource.kind}:${resource.sourceId}`
                        ];
                      const stale =
                        current &&
                        savedRevision &&
                        current.updatedAt !== savedRevision &&
                        new Date(current.updatedAt).getTime() !==
                          new Date(savedRevision).getTime();
                      return (
                        <div
                          key={resource.id}
                          className="space-y-2 rounded-lg border p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <strong className="text-sm">
                                {current?.title ?? resource.title}
                              </strong>
                              <p className="text-xs text-neutral-500">
                                {resource.kind.replaceAll("_", " ")}
                                {!current
                                  ? " · Unavailable — replace or remove"
                                  : stale
                                    ? " · Source changed — review before saving"
                                    : ""}
                              </p>
                            </div>
                            <button
                              className="text-xs text-red-700 underline"
                              onClick={() =>
                                updateLesson({
                                  resources: selected.resources.filter(
                                    (r) => r.id !== resource.id,
                                  ),
                                })
                              }
                            >
                              Remove
                            </button>
                          </div>
                          <Field
                            label="Learning purpose"
                            value={resource.purpose}
                            onChange={(purpose) =>
                              updateLesson({
                                resources: selected.resources.map((r) =>
                                  r.id === resource.id ? { ...r, purpose } : r,
                                ),
                              })
                            }
                          />
                          {resource.kind === "vocabulary_list" &&
                            current?.entries && (
                              <details>
                                <summary className="cursor-pointer text-xs font-semibold text-teal-800">
                                  {resource.selectedEntryIds.length
                                    ? `${resource.selectedEntryIds.length} selected words`
                                    : "Use all words"}{" "}
                                  · Choose a subset
                                </summary>
                                <p className="mt-2 text-xs text-neutral-500">
                                  No selection uses the whole saved list.
                                </p>
                                <div className="mt-2 grid max-h-48 grid-cols-2 gap-2 overflow-y-auto">
                                  {current.entries.map((entry) => (
                                    <label
                                      key={entry.id}
                                      className="flex items-center gap-1 text-xs"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={resource.selectedEntryIds.includes(
                                          entry.id,
                                        )}
                                        onChange={(e) =>
                                          updateLesson({
                                            resources: selected.resources.map(
                                              (r) =>
                                                r.id === resource.id
                                                  ? {
                                                      ...r,
                                                      selectedEntryIds: e.target
                                                        .checked
                                                        ? [
                                                            ...r.selectedEntryIds,
                                                            entry.id,
                                                          ]
                                                        : r.selectedEntryIds.filter(
                                                            (id) =>
                                                              id !== entry.id,
                                                          ),
                                                    }
                                                  : r,
                                            ),
                                          })
                                        }
                                      />
                                      {entry.word}
                                    </label>
                                  ))}
                                </div>
                              </details>
                            )}
                          {current && (
                            <a
                              href={current.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block text-xs font-semibold text-teal-800 underline"
                            >
                              Open existing editor ↗
                            </a>
                          )}
                        </div>
                      );
                    })}
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="text-xs font-semibold">
                        Resource type
                        <select
                          className={inputClass}
                          value={resourceKind}
                          onChange={(e) => {
                            setResourceKind(
                              e.target.value as typeof resourceKind,
                            );
                            setResourceSelection("");
                          }}
                        >
                          {[
                            "vocabulary_list",
                            "activity",
                            "grammar",
                            "media",
                          ].map((kind) => (
                            <option key={kind} value={kind}>
                              {kind.replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-semibold">
                        Search libraries
                        <input
                          className={inputClass}
                          value={resourceQuery}
                          placeholder="Title or filename"
                          onChange={(e) => setResourceQuery(e.target.value)}
                        />
                      </label>
                    </div>
                    <button className={buttonClass} onClick={refreshResources}>
                      Search / refresh resources
                    </button>
                    <label className="block text-xs font-semibold">
                      Available resources
                      <select
                        aria-label="Available resources"
                        className={inputClass}
                        value={resourceSelection}
                        onChange={(e) => setResourceSelection(e.target.value)}
                      >
                        <option value="">Choose a saved resource…</option>
                        {filteredOptions.map((r) => (
                          <option
                            key={`${r.kind}:${r.sourceId}`}
                            value={r.sourceId}
                          >
                            {r.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className={buttonClass}
                      disabled={!resourceSelection}
                      onClick={() => {
                        const option = filteredOptions.find(
                          (r) => r.sourceId === resourceSelection,
                        );
                        if (!option) return;
                        updateLesson({
                          resources: [
                            ...selected.resources,
                            {
                              id: crypto.randomUUID(),
                              kind: option.kind,
                              sourceId: option.sourceId,
                              title: option.title,
                              purpose: "",
                              selectedEntryIds: [],
                            },
                          ],
                        });
                        setResourceSelection("");
                      }}
                    >
                      Link resource
                    </button>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href="/teacher/activity-builder/vocabulary-lists"
                        className="text-teal-800 underline"
                      >
                        Create vocabulary list ↗
                      </a>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href="/teacher/activity-builder"
                        className="text-teal-800 underline"
                      >
                        Create activity ↗
                      </a>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href="/teacher/media"
                        className="text-teal-800 underline"
                      >
                        Asset Library ↗
                      </a>
                    </div>
                  </Panel>
                  <Panel title="Use in lesson planning">
                    <p className="text-sm text-neutral-600">
                      Create an editable draft with this learning brief and a
                      frozen copy of its selected vocabulary. Activity, grammar,
                      and media links stay available as planning references.
                    </p>
                    {!!planningIssues(document, selected, resources).length && (
                      <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                        {planningIssues(document, selected, resources).join(
                          " · ",
                        )}
                        . You can start a class draft and complete preparation
                        in the planner.
                      </p>
                    )}
                    <label className="text-sm font-semibold">
                      Class
                      <select
                        aria-label="Class"
                        className={inputClass}
                        value={classId}
                        onChange={(e) => setClassId(e.target.value)}
                      >
                        <option value="">Choose a class…</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={linkExisting}
                        onChange={(e) => {
                          setLinkExisting(e.target.checked);
                          setExistingId("");
                        }}
                      />
                      Link an existing class lesson instead
                    </label>
                    {linkExisting && (
                      <>
                        <label className="text-sm font-semibold">
                          Existing class lesson
                          <select
                            className={inputClass}
                            value={existingId}
                            onChange={(e) => setExistingId(e.target.value)}
                          >
                            <option value="">Choose a lesson…</option>
                            {existingLessons.map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.title}
                              </option>
                            ))}
                          </select>
                        </label>
                        <p className="text-xs text-neutral-500">
                          Linking records the course reference and preserves all
                          existing lesson fields, steps, and materials.
                        </p>
                      </>
                    )}
                    <button
                      className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
                      disabled={
                        dirty ||
                        saved.archived ||
                        selected.archived ||
                        unit.archived ||
                        !classId ||
                        (linkExisting && !existingId)
                      }
                      onClick={createPlan}
                    >
                      {linkExisting
                        ? "Link existing lesson"
                        : "Create class lesson"}
                    </button>
                    {dirty && (
                      <p className="text-xs text-amber-800">
                        Save the map before creating or linking a class lesson.
                      </p>
                    )}
                    {!classes.length && (
                      <Link
                        href="/teacher/classes"
                        className="block text-xs text-teal-800 underline"
                      >
                        Create an active class first
                      </Link>
                    )}
                  </Panel>
                </>
              ) : (
                <Panel title="Select a planned lesson">
                  <p className="text-sm text-neutral-500">
                    Choose a lesson from the sequence, or add a unit and lesson
                    to begin.
                  </p>
                </Panel>
              )}
            </div>
          </div>
        )}
      </fieldset>
    </div>
  );
}
