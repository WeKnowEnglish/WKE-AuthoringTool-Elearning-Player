"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Home,
  Megaphone,
} from "lucide-react";
import {
  CLASSROOM_TAB_LABELS,
  DEFAULT_STUDENT_CLASSROOM_TAB_SETTINGS,
  parseClassroomTab,
  visibleClassroomTabs,
  type ClassroomTabId,
  type StudentClassroomTabSettings,
} from "@/lib/classroom/classroom-tabs";
import { ClassroomLiveStatusButton } from "@/components/classroom/ClassroomLiveStatusButton";
import { ClassroomClassSwitcher } from "@/components/classroom/ClassroomClassSwitcher";
import type { StudentClassMembership } from "@/lib/data/student-classes";
import type { StudentClassLiveSession } from "@/lib/student-live/types";

const TAB_ICONS: Record<ClassroomTabId, typeof Home> = {
  stream: Home,
  schedule: CalendarDays,
  noticeboard: Megaphone,
  materials: BookOpen,
};

type Props = {
  classTitle: string;
  currentClass: StudentClassMembership;
  memberships: StudentClassMembership[];
  homeHref: string;
  homeLabel?: string;
  liveSession?: StudentClassLiveSession | null;
  tone?: "primary" | "secondary";
  initialTab?: ClassroomTabId;
  tabSettings?: StudentClassroomTabSettings;
  children: (tab: ClassroomTabId) => ReactNode;
};

export function ClassroomShell({
  classTitle,
  currentClass,
  memberships,
  homeHref,
  homeLabel = "Back to home",
  liveSession = null,
  tone = "primary",
  initialTab = "stream",
  tabSettings = DEFAULT_STUDENT_CLASSROOM_TAB_SETTINGS,
  children,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabs = useMemo(() => visibleClassroomTabs(tabSettings), [tabSettings]);
  const [tab, setTab] = useState<ClassroomTabId>(() =>
    parseClassroomTab(searchParams.get("tab") ?? initialTab, tabSettings),
  );

  useEffect(() => {
    setTab(parseClassroomTab(searchParams.get("tab") ?? initialTab, tabSettings));
  }, [searchParams, initialTab, tabSettings]);

  const selectTab = useCallback(
    (next: ClassroomTabId) => {
      if (!tabs.includes(next)) return;
      setTab(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "stream") params.delete("tab");
      else params.set("tab", next);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams, tabs],
  );

  const isSecondary = tone === "secondary";
  const headerBg = isSecondary
    ? "border-sec-border bg-sec-card"
    : "border-[var(--pl-border)] bg-white";
  const ink = isSecondary ? "text-sec-ink" : "text-[var(--pl-ink)]";
  const muted = isSecondary ? "text-sec-muted" : "text-[var(--pl-muted)]";
  const accentSoft = isSecondary
    ? "bg-sec-panel-muted text-sec-accent"
    : "bg-[var(--pl-purple-soft)] text-[var(--pl-purple)]";
  const accentSolid = isSecondary
    ? "bg-sec-accent text-white"
    : "bg-[var(--pl-purple)] text-white";
  const pageBg = isSecondary ? "bg-sec-bg" : "bg-[var(--pl-bg)]";
  const showNav = tabs.length > 1;

  const navButton = (id: ClassroomTabId, layout: "side" | "top") => {
    const Icon = TAB_ICONS[id];
    const active = tab === id;
    if (layout === "side") {
      return (
        <button
          key={id}
          type="button"
          onClick={() => selectTab(id)}
          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-bold transition ${
            active
              ? accentSoft
              : isSecondary
                ? "text-sec-muted hover:bg-sec-panel-muted hover:text-sec-ink"
                : "text-[var(--pl-muted)] hover:bg-[var(--pl-bg)] hover:text-[var(--pl-ink)]"
          }`}
        >
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              active
                ? accentSolid
                : isSecondary
                  ? "bg-sec-panel-muted"
                  : "bg-[var(--pl-bg)]"
            }`}
          >
            <Icon className="h-4 w-4" />
          </span>
          {CLASSROOM_TAB_LABELS[id]}
        </button>
      );
    }
    return (
      <button
        key={id}
        type="button"
        onClick={() => selectTab(id)}
        className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-extrabold transition sm:text-sm ${
          active
            ? accentSolid
            : isSecondary
              ? "bg-sec-panel-muted text-sec-muted"
              : "bg-[var(--pl-bg)] text-[var(--pl-muted)]"
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
        {CLASSROOM_TAB_LABELS[id]}
      </button>
    );
  };

  return (
    <div className={`flex min-h-dvh flex-col ${pageBg}`}>
      <header className={`shrink-0 border-b ${headerBg}`}>
        <div className="flex items-center gap-3 px-3 py-3 sm:px-5 sm:py-4">
          <Link
            href={homeHref}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-2xl border px-2.5 py-2 text-xs font-extrabold sm:text-sm ${
              isSecondary
                ? "border-sec-border text-sec-muted hover:bg-sec-panel-muted"
                : "border-[var(--pl-border)] text-[var(--pl-muted)] hover:bg-[var(--pl-bg)] hover:text-[var(--pl-ink)]"
            }`}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{homeLabel}</span>
            <span className="sm:hidden">Back</span>
          </Link>

          <div className="min-w-0 flex-1">
            <p
              className={`text-[10px] font-extrabold uppercase tracking-[0.14em] ${
                isSecondary ? "text-sec-accent" : "text-[var(--pl-purple)]"
              }`}
            >
              Classroom
            </p>
            <h1
              className={`truncate text-xl font-extrabold tracking-tight sm:text-2xl ${ink}`}
            >
              {classTitle}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ClassroomLiveStatusButton session={liveSession} tone={tone} />
            <ClassroomClassSwitcher
              currentClass={currentClass}
              memberships={memberships}
              tone={tone}
            />
          </div>
        </div>

        {showNav ? (
          <nav
            className="flex gap-2 overflow-x-auto px-3 pb-3 sm:px-5 lg:hidden"
            aria-label="Classroom sections"
          >
            {tabs.map((id) => navButton(id, "top"))}
          </nav>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1">
        {showNav ? (
          <aside
            className={`hidden w-[220px] shrink-0 border-r p-3 lg:block ${
              isSecondary
                ? "border-sec-border bg-sec-card"
                : "border-[var(--pl-border)] bg-white"
            }`}
          >
            <nav className="flex flex-col gap-1" aria-label="Classroom sections">
              {tabs.map((id) => navButton(id, "side"))}
            </nav>
            <div
              className={`mt-6 rounded-2xl border p-3 ${
                isSecondary
                  ? "border-sec-border bg-sec-panel-muted"
                  : "border-[var(--pl-border)] bg-[var(--pl-bg)]"
              }`}
            >
              <p className={`flex items-center gap-1.5 text-xs font-extrabold ${ink}`}>
                <ClipboardList className="h-3.5 w-3.5" aria-hidden />
                Tip
              </p>
              <p className={`mt-1 text-[11px] font-semibold leading-snug ${muted}`}>
                Check Stream for live class and homework.
                {tabSettings.materials ? " Materials live under Materials." : ""}
              </p>
            </div>
          </aside>
        ) : null}

        <main className="min-w-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-6">
          {children(tab)}
        </main>
      </div>
    </div>
  );
}
