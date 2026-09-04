"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Calendar,
  Check,
  ChevronRight,
  Copy,
  History,
  MessageSquare,
  MoreHorizontal,
  Radio,
  Settings,
  Timer,
  Users,
  Video,
  X,
} from "lucide-react";
import {
  SCENARIO_ORDER,
  SCENARIOS,
  type MockStudent,
  type NeedItem,
  type NeedPanel,
  type Scenario,
  type ScenarioId,
} from "./scenarios";

type PanelId = NeedPanel | "more" | "settings" | "student" | "tools";

type PanelState = {
  id: PanelId;
  studentId?: string;
};

const TONE_STYLES: Record<NeedItem["tone"], string> = {
  now: "border-amber-300/80 bg-amber-50 text-amber-950",
  soon: "border-sky-200 bg-sky-50 text-sky-950",
  gentle: "border-stone-200 bg-white text-stone-800",
};

function presenceLabel(student: MockStudent): string {
  if (student.presence === "waiting") return "Waiting";
  if (student.presence === "in_class") return "In class";
  if (student.presence === "absent") return "Absent";
  return student.note;
}

export function ClassHubMvpPilot() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>("starting_soon");
  const [panel, setPanel] = useState<PanelState | null>(null);
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState(12 * 60);
  const [clockReady, setClockReady] = useState(false);
  const scenario = SCENARIOS[scenarioId];

  useEffect(() => {
    setClockReady(true);
  }, []);

  useEffect(() => {
    setPanel(null);
    setCopied(false);
    setRemaining(12 * 60);
  }, [scenarioId]);

  useEffect(() => {
    if (!clockReady || scenarioId !== "starting_soon") return;
    const timer = window.setInterval(() => {
      setRemaining((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [clockReady, scenarioId]);

  const countdown = useMemo(() => {
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [remaining]);

  const selectedStudent = scenario.students.find((row) => row.id === panel?.studentId) ?? null;

  const runPrimary = () => {
    if (scenario.now.kind === "go_live") {
      setScenarioId("live");
      return;
    }
    if (scenario.now.kind === "live") {
      setPanel({ id: "tools" });
      return;
    }
    if (scenario.now.kind === "wrap") {
      setPanel({ id: "writing" });
      return;
    }
    if (scenario.now.kind === "plan") {
      setPanel({ id: "lesson" });
      return;
    }
    if (scenario.now.kind === "clear") {
      setPanel({ id: "lesson" });
      return;
    }
    void copyJoinLink();
  };

  const runSecondary = () => {
    if (scenario.now.kind === "go_live") {
      setPanel({ id: "lesson" });
      return;
    }
    if (scenario.now.kind === "live") {
      setScenarioId("just_ended");
      return;
    }
    if (scenario.now.kind === "wrap") {
      setPanel({ id: "homework" });
      return;
    }
    if (scenario.now.kind === "plan") {
      setPanel({ id: "homework" });
      return;
    }
    if (scenario.now.kind === "clear") {
      setPanel({ id: "stream" });
      return;
    }
    setPanel({ id: "schedule" });
  };

  const copyJoinLink = async () => {
    try {
      await navigator.clipboard.writeText(`https://wke.example/join-class?code=${scenario.joinCode}`);
    } catch {
      // Looks-only: still show copied so the motion is reviewable.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="classhub-mvp min-h-screen bg-[#f4efe6] text-stone-900">
      <style>{`
        .classhub-mvp {
          font-feature-settings: "ss01" on, "cv11" on;
        }
        @keyframes classhub-scene {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes classhub-live {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.35); opacity: 0.55; }
        }
        @keyframes classhub-wait {
          0%, 100% { box-shadow: 0 0 0 0 rgba(13, 148, 136, 0.45); }
          70% { box-shadow: 0 0 0 10px rgba(13, 148, 136, 0); }
        }
        .classhub-scene { animation: classhub-scene 380ms cubic-bezier(0.22, 1, 0.36, 1); }
        .classhub-live-dot { animation: classhub-live 1.5s ease-in-out infinite; }
        .classhub-waiting { animation: classhub-wait 1.8s ease-out infinite; }
      `}</style>

      <PilotDock
        scenarioId={scenarioId}
        onChange={setScenarioId}
        hint={scenario.dockHint}
      />

      <header className="border-b border-stone-200/80 bg-[#fbf8f2]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <Link href="/pilots" className="text-sm font-semibold text-stone-500 hover:text-stone-800">
            Pilots
          </Link>
          <span className="text-stone-300" aria-hidden>
            /
          </span>
          <span className="text-sm font-semibold text-stone-700">Classes</span>
          <span className="text-stone-300" aria-hidden>
            /
          </span>
          <span className="truncate text-sm font-bold">{scenario.classTitle}</span>
          <span className="ml-auto hidden text-xs font-semibold uppercase tracking-wider text-stone-400 sm:inline">
            {scenario.weekday} · {scenario.clock}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div key={scenarioId} className="classhub-scene space-y-6">
          <ClassHeader
            scenario={scenario}
            copied={copied}
            onCopy={() => void copyJoinLink()}
            onOpenMore={() => setPanel({ id: "more" })}
          />

          <NowStage
            scenario={scenario}
            countdown={countdown}
            showCountdown={clockReady && scenarioId === "starting_soon"}
            onPrimary={runPrimary}
            onSecondary={runSecondary}
          />

          {scenario.needs.length > 0 ? (
            <section>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-stone-500">
                  Needs you
                </h2>
                <p className="text-xs text-stone-400">Only what is actually waiting — never empty tabs.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {scenario.needs.map((need) => (
                  <button
                    key={need.id}
                    type="button"
                    onClick={() => setPanel({ id: need.panel })}
                    className={`rounded-2xl border px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${TONE_STYLES[need.tone]}`}
                  >
                    <p className="text-sm font-bold">{need.title}</p>
                    <p className="mt-1 text-sm opacity-80">{need.detail}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide">
                      {need.action}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-dashed border-emerald-300/80 bg-emerald-50/60 px-4 py-4 text-emerald-950">
              <p className="text-sm font-bold">Inbox zero for this class</p>
              <p className="mt-1 text-sm opacity-80">
                No reviews, no missing plans, no late homework. The page stays quiet on purpose.
              </p>
            </section>
          )}

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.9fr)]">
            <div>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-stone-500">
                  The class
                </h2>
                <button
                  type="button"
                  onClick={() => setPanel({ id: "roster" })}
                  className="text-xs font-bold text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline"
                >
                  Full roster
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {scenario.students.map((student) => (
                  <StudentChip
                    key={student.id}
                    student={student}
                    onOpen={() => setPanel({ id: "student", studentId: student.id })}
                  />
                ))}
              </div>
            </div>

            <aside className="space-y-3">
              {scenario.lesson ? (
                <button
                  type="button"
                  onClick={() => setPanel({ id: "lesson" })}
                  className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm hover:border-stone-300"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-400">Next lesson</p>
                  <p className="mt-1 font-bold">{scenario.lesson.title}</p>
                  <p className="mt-0.5 text-sm text-stone-500">{scenario.lesson.status}</p>
                  <ol className="mt-3 space-y-1.5">
                    {scenario.lesson.steps.map((step) => (
                      <li
                        key={step.label}
                        className={`flex items-center justify-between rounded-lg px-2 py-1 text-sm ${
                          step.active
                            ? "bg-teal-50 font-semibold text-teal-900"
                            : step.done
                              ? "text-stone-400 line-through"
                              : "text-stone-600"
                        }`}
                      >
                        <span>{step.label}</span>
                        <span className="text-xs">{step.minutes}m</span>
                      </li>
                    ))}
                  </ol>
                </button>
              ) : (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-400">Next lesson</p>
                  <p className="mt-1 font-bold">No lesson yet</p>
                  <p className="mt-1 text-sm text-stone-500">
                    Hide the planner until there are people and a time. Don’t make a new class look like a CMS.
                  </p>
                </div>
              )}

              {scenario.homework ? (
                <button
                  type="button"
                  onClick={() => setPanel({ id: "homework" })}
                  className="w-full rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm hover:border-stone-300"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-400">Homework</p>
                  <p className="mt-1 font-bold">{scenario.homework.title}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <ProgressPips done={scenario.homework.done} total={scenario.homework.total} />
                    <span className="text-sm font-semibold text-stone-600">
                      {scenario.homework.done}/{scenario.homework.total}
                    </span>
                  </div>
                  {scenario.homework.missing.length > 0 ? (
                    <p className="mt-2 text-sm text-amber-800">
                      Still out: {scenario.homework.missing.join(", ")}
                    </p>
                  ) : scenario.homework.done === 0 ? (
                    <p className="mt-2 text-sm text-stone-500">Not assigned yet.</p>
                  ) : (
                    <p className="mt-2 text-sm text-emerald-800">Everyone is in.</p>
                  )}
                </button>
              ) : null}
            </aside>
          </section>
        </div>
      </main>

      {panel ? (
        <PeekPanel
          scenario={scenario}
          panel={panel}
          student={selectedStudent}
          onClose={() => setPanel(null)}
          onOpen={(next) => setPanel(next)}
        />
      ) : null}
    </div>
  );
}

function PilotDock({
  scenarioId,
  onChange,
  hint,
}: {
  scenarioId: ScenarioId;
  onChange: (id: ScenarioId) => void;
  hint: string;
}) {
  return (
    <div className="border-b border-amber-300/80 bg-amber-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-800">
              Looks-only MVP · production class page unchanged
            </p>
            <p className="mt-1 max-w-2xl text-sm text-amber-950/80">{hint}</p>
          </div>
          <p className="max-w-xs text-xs leading-relaxed text-amber-900/70">
            Today this lives in six tabs. Flip scenes to see a page that rearranges around what is actually happening.
          </p>
        </div>
        <div role="radiogroup" aria-label="Classroom scene" className="flex flex-wrap gap-1.5">
          {SCENARIO_ORDER.map((id) => {
            const selected = scenarioId === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  selected
                    ? "bg-stone-900 text-white shadow-sm"
                    : "bg-white/80 text-stone-700 ring-1 ring-amber-200 hover:bg-white"
                }`}
              >
                {SCENARIOS[id].dockLabel}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ClassHeader({
  scenario,
  copied,
  onCopy,
  onOpenMore,
}: {
  scenario: Scenario;
  copied: boolean;
  onCopy: () => void;
  onOpenMore: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-stone-500">{scenario.nextMeeting}</p>
        <h1 className="mt-0.5 text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
          {scenario.classTitle}
        </h1>
        <p className="mt-1 text-sm text-stone-500">{scenario.studentCountLabel}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCopy}
          className={`rounded-full border px-3 py-1.5 font-mono text-xs font-bold tracking-[0.2em] ${
            copied
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-teal-200 bg-white text-teal-900 hover:bg-teal-50"
          }`}
        >
          {copied ? "Copied" : scenario.joinCode}
        </button>
        <button
          type="button"
          onClick={onOpenMore}
          aria-label="More class tools"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function NowStage({
  scenario,
  countdown,
  showCountdown,
  onPrimary,
  onSecondary,
}: {
  scenario: Scenario;
  countdown: string;
  showCountdown: boolean;
  onPrimary: () => void;
  onSecondary: () => void;
}) {
  const kind = scenario.now.kind;
  const light = kind === "clear" || kind === "plan";
  const shell =
    kind === "live"
      ? "bg-stone-950 text-stone-50"
      : kind === "go_live"
        ? "bg-[#0f3d38] text-[#f3faf8]"
        : kind === "wrap"
          ? "bg-[#3b2414] text-[#fff6ea]"
          : kind === "invite"
            ? "bg-[#1e3a5f] text-[#eef5ff]"
            : kind === "clear"
              ? "border border-emerald-200 bg-[#ecf4ea] text-stone-900"
              : "border border-stone-200 bg-white text-stone-900";

  return (
    <section className={`overflow-hidden rounded-3xl p-5 shadow-sm sm:p-7 ${shell}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] opacity-80">
            {kind === "live" ? (
              <span className="classhub-live-dot inline-block h-2 w-2 rounded-full bg-red-400" />
            ) : (
              <Radio className="h-3.5 w-3.5" />
            )}
            {showCountdown ? `In ${countdown}` : scenario.now.kicker}
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{scenario.now.title}</h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed opacity-90">{scenario.now.body}</p>
          <p className="mt-3 max-w-xl text-sm italic opacity-70">{scenario.now.because}</p>
        </div>
        <div className="flex min-w-[12rem] flex-col gap-2">
          <button
            type="button"
            onClick={onPrimary}
            className={
              light
                ? "rounded-2xl bg-stone-900 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-stone-800"
                : "rounded-2xl bg-white px-4 py-3 text-sm font-bold text-stone-900 shadow-sm hover:bg-stone-100"
            }
          >
            {scenario.now.primary}
          </button>
          {scenario.now.secondary ? (
            <button
              type="button"
              onClick={onSecondary}
              className={
                light
                  ? "rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-bold text-stone-800 hover:bg-stone-50"
                  : "rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-bold hover:bg-white/20"
              }
            >
              {scenario.now.secondary}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function StudentChip({
  student,
  onOpen,
}: {
  student: MockStudent;
  onOpen: () => void;
}) {
  const waiting = student.presence === "waiting";
  const live = student.presence === "in_class";
  const absent = student.presence === "absent";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex items-center gap-3 rounded-2xl border bg-white px-3 py-2.5 text-left shadow-sm hover:border-stone-300 ${
        absent ? "border-stone-200 opacity-60" : "border-stone-200"
      }`}
    >
      <span
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${
          waiting ? "classhub-waiting" : ""
        }`}
        style={{ background: student.color }}
      >
        {student.short}
        {live ? (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{student.name}</span>
        <span className="block truncate text-xs text-stone-500">{presenceLabel(student)}</span>
      </span>
      {student.flag === "writing" ? (
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-800">
          Writing
        </span>
      ) : null}
      {student.flag === "late_hw" ? (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
          HW
        </span>
      ) : null}
    </button>
  );
}

function ProgressPips({ done, total }: { done: number; total: number }) {
  return (
    <div className="flex gap-1" aria-hidden>
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={`h-2.5 w-2.5 rounded-full ${index < done ? "bg-teal-600" : "bg-stone-200"}`}
        />
      ))}
    </div>
  );
}

function PeekPanel({
  scenario,
  panel,
  student,
  onClose,
  onOpen,
}: {
  scenario: Scenario;
  panel: PanelState;
  student: MockStudent | null;
  onClose: () => void;
  onOpen: (next: PanelState) => void;
}) {
  const title = panelTitle(panel.id, student);

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 bg-stone-900/30"
        onClick={onClose}
      />
      <aside className="absolute inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border border-stone-200 bg-[#fbf8f2] p-5 shadow-2xl md:inset-y-0 md:right-0 md:left-auto md:h-full md:w-[26rem] md:rounded-none md:rounded-l-3xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-400">Looks only</p>
            <h2 className="text-xl font-extrabold">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <PanelBody scenario={scenario} panel={panel} student={student} onOpen={onOpen} />
      </aside>
    </div>
  );
}

function panelTitle(id: PanelId, student: MockStudent | null): string {
  if (id === "student") return student?.name ?? "Student";
  if (id === "more") return "Everything else";
  if (id === "writing") return "Writing to review";
  if (id === "homework") return "Homework";
  if (id === "lesson") return "Lesson plan";
  if (id === "schedule") return "Schedule";
  if (id === "stream") return "Class stream";
  if (id === "roster") return "Roster";
  if (id === "settings") return "Class settings";
  return "Classroom tools";
}

function PanelBody({
  scenario,
  panel,
  student,
  onOpen,
}: {
  scenario: Scenario;
  panel: PanelState;
  student: MockStudent | null;
  onOpen: (next: PanelState) => void;
}) {
  if (panel.id === "more") {
    const items: Array<{ id: PanelId; label: string; icon: typeof Settings; detail: string }> = [
      { id: "lesson", label: "Plan lesson", icon: Calendar, detail: "Was its own tab" },
      { id: "homework", label: "Homework", icon: Check, detail: "Was buried in Students" },
      { id: "stream", label: "Class stream", icon: MessageSquare, detail: "Was a tab" },
      { id: "schedule", label: "Schedule", icon: Calendar, detail: "Was a tab" },
      { id: "roster", label: "Roster details", icon: Users, detail: "Was a spreadsheet tab" },
      { id: "settings", label: "Settings", icon: Settings, detail: "Student tabs, archive" },
      { id: "tools", label: "Live tools", icon: Timer, detail: "Timer, picker, history" },
    ];
    return (
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onOpen({ id: item.id })}
              className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-3 text-left hover:bg-stone-50"
            >
              <item.icon className="h-4 w-4 text-stone-500" />
              <span className="flex-1">
                <span className="block font-bold">{item.label}</span>
                <span className="block text-xs text-stone-500">{item.detail}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-stone-400" />
            </button>
          </li>
        ))}
      </ul>
    );
  }

  if (panel.id === "student" && student) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ background: student.color }}
          >
            {student.short}
          </span>
          <div>
            <p className="font-bold">{student.name}</p>
            <p className="text-sm text-stone-500">{student.note}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-3 text-sm">
          <p>Last class: Thursday · {student.presence === "absent" ? "absent" : "present"}</p>
          <p className="mt-1">Homework: {student.flag === "late_hw" ? "still open" : "in"}</p>
          <p className="mt-1">Writing: {student.flag === "writing" ? "waiting for you" : "none"}</p>
        </div>
        <p className="text-sm text-stone-500">
          In the real hub this would open the student progress page. Here it stays a peek so the class home never becomes a table.
        </p>
      </div>
    );
  }

  if (panel.id === "writing") {
    return (
      <div className="space-y-3">
        {[
          { who: "Linh Pham", text: "My name is Linh. I am nine. I like cats and drawing." },
          { who: "Khoa Le", text: "I am Khoa. I live in Da Nang. I like football." },
        ].map((row) => (
          <article key={row.who} className="rounded-2xl border border-stone-200 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-stone-400">{row.who}</p>
            <p className="mt-2 text-sm leading-relaxed">{row.text}</p>
            <div className="mt-3 flex gap-2">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">Looks good</span>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600">Ask for more</span>
            </div>
          </article>
        ))}
      </div>
    );
  }

  if (panel.id === "homework") {
    return (
      <div className="space-y-3 text-sm">
        <p className="font-bold">{scenario.homework?.title ?? "No homework yet"}</p>
        {scenario.students.map((row) => (
          <div key={row.id} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-2">
            <span>{row.name}</span>
            <span className={row.flag === "late_hw" ? "font-bold text-amber-800" : "text-emerald-700"}>
              {row.flag === "late_hw" ? "Missing" : "Done"}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (panel.id === "lesson") {
    if (!scenario.lesson) {
      return <p className="text-sm text-stone-600">No lesson until the class has a time and a few students.</p>;
    }
    return (
      <ol className="space-y-2">
        {scenario.lesson.steps.map((step, index) => (
          <li key={step.label} className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-stone-400">Step {index + 1}</p>
            <p className="font-bold">{step.label}</p>
            <p className="text-sm text-stone-500">{step.minutes} minutes</p>
          </li>
        ))}
      </ol>
    );
  }

  if (panel.id === "schedule") {
    return (
      <div className="space-y-3 text-sm">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="font-bold">Thursday 4:00–4:45 PM</p>
          <p className="mt-1 text-stone-500">Weekly · 6 seats</p>
        </div>
        <div className="rounded-2xl border border-dashed border-stone-300 p-4 text-stone-500">
          Offering extra windows and parent ranking stays here — not as a default tab.
        </div>
      </div>
    );
  }

  if (panel.id === "stream") {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-stone-400">Draft note</p>
          <p className="mt-2 text-sm">Tuan missed class today. We’ll send the Meet me worksheet home.</p>
        </div>
        <p className="text-sm text-stone-500">Posts, photos, and homework announcements live behind the moment that needs them.</p>
      </div>
    );
  }

  if (panel.id === "roster") {
    return (
      <div className="space-y-2">
        {scenario.students.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onOpen({ id: "student", studentId: row.id })}
            className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-2 text-left text-sm"
          >
            <span className="font-semibold">{row.name}</span>
            <span className="text-stone-500">{presenceLabel(row)}</span>
          </button>
        ))}
      </div>
    );
  }

  if (panel.id === "settings") {
    return (
      <div className="space-y-3 text-sm">
        {["Student schedule tab", "Noticeboard", "Materials"].map((label) => (
          <label key={label} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-2">
            <span>{label}</span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-500">Off</span>
          </label>
        ))}
        <p className="text-stone-500">Archive, join code, and student-tab toggles stay out of the daily path.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        { label: "Timer", icon: Timer },
        { label: "Name picker", icon: Users },
        { label: "Open VC", icon: Video },
        { label: "Copy link", icon: Copy },
        { label: "History", icon: History },
        { label: "Notify parents", icon: Bell },
      ].map((tool) => (
        <div
          key={tool.label}
          className="flex flex-col items-center gap-2 rounded-2xl border border-stone-200 bg-white px-3 py-4 text-xs font-bold"
        >
          <tool.icon className="h-4 w-4" />
          {tool.label}
        </div>
      ))}
    </div>
  );
}
