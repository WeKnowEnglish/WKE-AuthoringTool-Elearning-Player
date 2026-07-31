"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Coins,
  Gamepad2,
  Home,
  Library,
  Menu,
  School,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { SignOutForm } from "@/components/auth/SignOutForm";
import { PrimaryClassTab } from "@/components/primary/PrimaryClassTab";
import { PrimaryGamesTab } from "@/components/primary/PrimaryGamesTab";
import {
  PrimaryLearnTab,
  type LearnCategoryId,
} from "@/components/primary/PrimaryLearnTab";
import { PrimaryProgressTab } from "@/components/primary/PrimaryProgressTab";
import { PrimaryReviewTab } from "@/components/primary/PrimaryReviewTab";
import { TodaysLearningAssignments } from "@/components/primary/TodaysLearningAssignments";
import { PrimaryHomeResumeRow } from "@/components/primary/PrimaryHomeResumeRow";
import { PrimaryHomeGuide } from "@/components/primary/PrimaryHomeGuide";
import { StudentLiveNowStrip } from "@/components/classroom/StudentLiveNowStrip";
import { useAudioMuted } from "@/lib/audio/use-audio-muted";
import type { StudentHomeworkCard } from "@/lib/class-homework/types";
import type { StudentClassMembership } from "@/lib/data/student-classes";
import type { StudentClassLiveSession } from "@/lib/student-live/types";
import { readActiveStudentClassId } from "@/lib/student-classes/active-class";
import {
  PRIMARY_CHROME_CLASS,
  PRIMARY_CHROME_STYLE,
} from "@/lib/primary/primary-chrome";
import type { PrimaryProgressModel } from "@/lib/primary/build-primary-progress-model";
import type { PrimaryReviewModel } from "@/lib/primary/build-primary-review-model";
import type { VocabSetId } from "@/lib/vocabulary-templates";

export type PrimaryNavId =
  | "home"
  | "learn"
  | "class"
  | "games"
  | "review"
  | "progress";

export type PathStepStatus = "complete" | "current" | "available" | "locked";

export type PrimaryHomeModel = {
  studentName: string;
  avatarInitials: string;
  level: number;
  levelProgress: number;
  gold: number;
  /** Set Continue Learning / path / recommended should open. */
  continueSetId?: VocabSetId;
  resumeScreenIndex?: number;
  today: {
    topicTitle: string;
    goal: string;
    skill: string;
    activitiesDone: number;
    activitiesTotal: number;
    nextActivityLabel: string;
  };
  path: Array<{
    id: string;
    title: string;
    description: string;
    status: PathStepStatus;
  }>;
  recommended: Array<{
    id: string;
    title: string;
    icon: "match" | "cloze" | "listen";
    rewardLabel: string;
  }>;
  words: Array<{
    id: string;
    word: string;
    icon: string;
  }>;
  encouragement?: string;
};

type Props = {
  studentKey?: string;
  primaryTourSeen?: boolean;
  guideEnabled?: boolean;
  model?: Partial<PrimaryHomeModel>;
  /** Live My Progress summary (Phase 4). */
  progressModel?: PrimaryProgressModel;
  /** Live Review list (Phase 5). */
  reviewModel?: PrimaryReviewModel;
  onNavigate?: (destination: PrimaryNavId | string) => void;
  /** Open a vocabulary set in the lesson overlay (Phase 1). */
  onOpenVocabularySet?: (id: VocabSetId) => void;
  /** Open a grammar poster in an overlay (stay on Primary). */
  onOpenGrammarPoster?: (slug: string) => void;
  /** Refresh economy / progress after games (Phase 5). */
  onEconomyChange?: () => void;
  /** Optional controls in the top bar (e.g. class menu). */
  headerExtra?: ReactNode;
  /** Deep-link tab, e.g. `?nav=learn`. */
  initialNav?: string | null;
  /** Teacher-assigned offline work for Today's Learning. */
  assignedHomework?: StudentHomeworkCard[];
  /** Whether the student is enrolled in at least one class. */
  enrolledInClass?: boolean;
  /** Active Virtual Classroom sessions across enrolled classes. */
  liveSessions?: StudentClassLiveSession[];
  /** Classes the student is enrolled in. */
  classMemberships?: StudentClassMembership[];
  /** Open the join / switch class overlay. */
  onOpenClassSelector?: () => void;
};

const NAV_IDS: PrimaryNavId[] = [
  "home",
  "learn",
  "class",
  "games",
  "review",
  "progress",
];

function parseInitialNav(nav: string | null | undefined): PrimaryNavId {
  // Legacy Vocabulary / Grammar deep-links open the Learn shelf.
  if (nav === "vocabulary" || nav === "grammar") return "learn";
  if (nav && (NAV_IDS as string[]).includes(nav)) return nav as PrimaryNavId;
  return "home";
}

function parseInitialLearnCategory(
  nav: string | null | undefined,
): LearnCategoryId | null {
  if (nav === "vocabulary" || nav === "grammar") return nav;
  return null;
}

const DEFAULT_MODEL: PrimaryHomeModel = {
  studentName: "Student",
  avatarInitials: "S",
  level: 1,
  levelProgress: 0,
  gold: 0,
  continueSetId: "breakfast_food",
  resumeScreenIndex: 0,
  today: {
    topicTitle: "Vocabulary",
    goal: "I can learn new words",
    skill: "Vocabulary",
    activitiesDone: 0,
    activitiesTotal: 5,
    nextActivityLabel: "Flashcards",
  },
  path: [
    {
      id: "learn",
      title: "Flashcards",
      description: "See and hear new words.",
      status: "current",
    },
    {
      id: "practice",
      title: "Practice",
      description: "Spell, match, and choose.",
      status: "available",
    },
    {
      id: "review",
      title: "Review",
      description: "Listen and check what you remember.",
      status: "locked",
    },
    {
      id: "rewards",
      title: "Earn Rewards",
      description: "Get gold and unlock prizes!",
      status: "locked",
    },
  ],
  recommended: [
    { id: "match", title: "Match Pictures", icon: "match", rewardLabel: "+ gold & XP" },
    { id: "cloze", title: "Choose the Word", icon: "cloze", rewardLabel: "+ gold & XP" },
    { id: "listen", title: "Listen and Choose", icon: "listen", rewardLabel: "+ gold & XP" },
  ],
  words: [],
  encouragement: "Keep learning — gold and XP unlock new topics!",
};

const NAV: Array<{ id: PrimaryNavId; label: string; icon: typeof Home }> = [
  { id: "home", label: "Home", icon: Home },
  { id: "learn", label: "Learn", icon: Library },
  { id: "class", label: "Class", icon: School },
  { id: "games", label: "Games", icon: Gamepad2 },
  { id: "progress", label: "My Progress", icon: Trophy },
];

function mergeModel(partial?: Partial<PrimaryHomeModel>): PrimaryHomeModel {
  if (!partial) return DEFAULT_MODEL;
  return {
    ...DEFAULT_MODEL,
    ...partial,
    today: { ...DEFAULT_MODEL.today, ...partial.today },
    path: partial.path ?? DEFAULT_MODEL.path,
    recommended: partial.recommended ?? DEFAULT_MODEL.recommended,
    words: partial.words ?? DEFAULT_MODEL.words,
  };
}

export function StudentHomeLanding({
  studentKey = "student",
  primaryTourSeen = false,
  guideEnabled = true,
  model: modelPartial,
  progressModel,
  reviewModel,
  onNavigate,
  onOpenVocabularySet,
  onOpenGrammarPoster,
  onEconomyChange,
  headerExtra,
  initialNav,
  assignedHomework = [],
  enrolledInClass = false,
  liveSessions = [],
  classMemberships = [],
  onOpenClassSelector,
}: Props) {
  const router = useRouter();
  const { muted, toggleMuted } = useAudioMuted();
  const model = mergeModel(modelPartial);
  const [activeNav, setActiveNav] = useState<PrimaryNavId>(() =>
    parseInitialNav(initialNav),
  );
  const [learnCategory, setLearnCategory] = useState<LearnCategoryId | null>(() =>
    parseInitialLearnCategory(initialNav),
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function go(destination: PrimaryNavId | string, message?: string) {
    if (destination === "class") {
      const storedClassId = readActiveStudentClassId();
      const membership =
        (storedClassId
          ? classMemberships.find((item) => item.classId === storedClassId)
          : null) ?? classMemberships[0] ?? null;
      router.push(
        membership
          ? `/primary/class/${encodeURIComponent(membership.classId)}`
          : "/join-class",
      );
      setMobileNavOpen(false);
      return;
    }
    if (destination === "vocabulary" || destination === "grammar") {
      setActiveNav("learn");
      setLearnCategory(destination);
      setMobileNavOpen(false);
      if (message) setToast(message);
      onNavigate?.(destination);
      return;
    }
    if ((NAV_IDS as string[]).includes(destination)) {
      setActiveNav(destination as PrimaryNavId);
      setMobileNavOpen(false);
      if (destination === "learn") {
        setLearnCategory(null);
      }
    }
    if (message) setToast(message);
    onNavigate?.(destination);
  }

  function openContinueLearning() {
    if (model.continueSetId && onOpenVocabularySet) {
      onOpenVocabularySet(model.continueSetId);
      return;
    }
    go("learn");
  }

  const sidebar = (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-[var(--pl-border)] bg-white px-3 py-4">
      <nav className="flex flex-1 flex-col gap-1" aria-label="Primary learning">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = activeNav === item.id;
          return (
            <button
              key={item.id}
              data-guide={item.id === "learn" || item.id === "class" ? item.id : undefined}
              type="button"
              onClick={() => go(item.id)}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-bold transition ${
                active
                  ? "bg-[var(--pl-purple-soft)] text-[var(--pl-purple)]"
                  : "text-[var(--pl-muted)] hover:bg-[var(--pl-bg)] hover:text-[var(--pl-ink)]"
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  active
                    ? "bg-[var(--pl-purple)] text-white"
                    : "bg-[var(--pl-bg)] text-[var(--pl-muted)]"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-4 flex flex-col gap-2">
        {headerExtra ? <div className="lg:hidden">{headerExtra}</div> : null}

        {model.encouragement ? (
          <div className="rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-purple-soft)] p-3">
            <p className="text-xs font-bold leading-5 text-[var(--pl-purple)]">
              {model.encouragement}
            </p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={toggleMuted}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)] px-3 py-2.5 text-sm font-extrabold text-[var(--pl-muted)] transition hover:bg-white hover:text-[var(--pl-ink)]"
          aria-pressed={muted}
          aria-label={muted ? "Turn sound on" : "Turn sound off"}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {muted ? "Sound off" : "Sound on"}
        </button>

        <SignOutForm variant="primary" label="Log out" />
      </div>
    </aside>
  );

  return (
    <div
      className={`flex h-[100dvh] w-full flex-col overflow-hidden ${PRIMARY_CHROME_CLASS}`}
      style={PRIMARY_CHROME_STYLE}
    >
      <header className="z-30 flex shrink-0 items-center justify-between gap-3 border-b border-[var(--pl-border)] bg-white px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--pl-border)] bg-[var(--pl-bg)] text-[var(--pl-ink)] lg:hidden"
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <button
            type="button"
            onClick={() => go("home")}
            className="flex min-w-0 items-center gap-2.5 text-left"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--pl-purple)] text-white shadow-sm">
              <BookOpen className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-extrabold tracking-tight">
                WeKnow <span className="text-[var(--pl-purple)]">English</span>
              </span>
              <span className="hidden text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--pl-muted)] sm:block">
                Primary
              </span>
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {headerExtra ? (
            <div className="hidden min-w-0 sm:block">{headerExtra}</div>
          ) : null}

          <div className="hidden items-center gap-2 rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)] px-3 py-1.5 sm:flex">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--pl-purple)] text-[10px] font-black text-white">
              Lv {model.level}
            </span>
            <div className="w-16">
              <div className="h-1.5 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-[var(--pl-success)]"
                  style={{ width: `${Math.round(model.levelProgress * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)] px-2.5 py-1.5 text-xs font-extrabold tabular-nums">
            <Coins className="h-4 w-4 text-[var(--pl-gold)]" />
            <span className="sm:hidden">{model.gold}</span>
            <span className="hidden sm:inline">{model.gold} Gold</span>
          </div>

          <button
            type="button"
            data-guide="progress"
            onClick={() => go("progress")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--pl-purple)] text-sm font-black text-white"
            aria-label={`${model.studentName} — My Progress`}
          >
            {model.avatarInitials}
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <div className="hidden lg:flex">{sidebar}</div>

        {mobileNavOpen && (
          <div className="absolute inset-0 z-40 flex lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-slate-900/30"
              aria-label="Close menu overlay"
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="relative z-10 h-full shadow-xl">{sidebar}</div>
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-y-auto bg-[var(--pl-bg)] px-4 py-5 sm:px-6 lg:px-8">
          {activeNav === "learn" ? (
            <PrimaryLearnTab
              playerLevel={model.level}
              category={learnCategory}
              onCategoryChange={setLearnCategory}
              onOpenGrammarPoster={onOpenGrammarPoster}
              onOpenSet={(id) => {
                if (onOpenVocabularySet) {
                  onOpenVocabularySet(id);
                  return;
                }
                go(id, "Vocabulary lesson is not available here.");
              }}
            />
          ) : activeNav === "progress" && progressModel ? (
            <PrimaryProgressTab
              model={progressModel}
              studentName={model.studentName}
              onContinueLearning={openContinueLearning}
              onOpenVocabulary={() => go("vocabulary")}
            />
          ) : activeNav === "games" ? (
            <PrimaryGamesTab
              playerLevel={model.level}
              onEconomyChange={onEconomyChange}
              onGoLearn={() => go("learn")}
            />
          ) : activeNav === "class" ? (
            <PrimaryClassTab
              memberships={classMemberships}
              liveSessions={liveSessions}
              onOpenClassSelector={onOpenClassSelector}
            />
          ) : activeNav === "review" && reviewModel ? (
            <PrimaryReviewTab
              model={reviewModel}
              onPracticeSet={(setId) => {
                if (onOpenVocabularySet) {
                  onOpenVocabularySet(setId);
                  return;
                }
                go("learn");
              }}
              onOpenVocabulary={() => go("vocabulary")}
            />
          ) : activeNav !== "home" ? (
            <div className="mx-auto flex max-w-5xl flex-col gap-3 pb-24 lg:pb-8">
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                {NAV.find((item) => item.id === activeNav)?.label ?? "Coming soon"}
              </h1>
              <p className="text-sm font-semibold text-[var(--pl-muted)]">
                This section will be wired next.
              </p>
            </div>
          ) : (
          <div className="mx-auto flex max-w-5xl flex-col gap-5 pb-24 lg:pb-8">
            <StudentLiveNowStrip sessions={liveSessions} tone="primary" />

            <div data-guide="assignments">
              <TodaysLearningAssignments
                enrolled={enrolledInClass}
                items={assignedHomework}
                onJoinClass={onOpenClassSelector}
              />
            </div>

            <div data-guide="continue">
              <PrimaryHomeResumeRow
                progressModel={progressModel}
                today={model.today}
                onContinueLearning={openContinueLearning}
                onOpenProgress={() => go("progress")}
              />
            </div>
          </div>
          )}
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[var(--pl-border)] bg-white px-2 py-2 lg:hidden"
        aria-label="Primary mobile"
      >
        {NAV.filter((item) =>
          ["home", "learn", "class", "games"].includes(item.id),
        ).map((item) => {
          const Icon = item.icon;
          const active = activeNav === item.id;
          return (
            <button
              key={item.id}
              data-guide={item.id === "learn" || item.id === "class" ? item.id : undefined}
              type="button"
              onClick={() => go(item.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-extrabold ${
                active ? "text-[var(--pl-purple)]" : "text-[var(--pl-muted)]"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label === "My Progress" ? "Progress" : item.label}
            </button>
          );
        })}
      </nav>

      {toast && (
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-2xl bg-[var(--pl-ink)] px-4 py-2 text-center text-xs font-bold text-white shadow-lg lg:bottom-6">
          {toast}
          <button
            type="button"
            className="pointer-events-auto ml-3 underline"
            onClick={() => setToast(null)}
          >
            OK
          </button>
        </div>
      )}

      <PrimaryHomeGuide
        enabled={guideEnabled}
        muted={muted}
        studentKey={studentKey}
        initiallySeen={primaryTourSeen}
        enrolledInClass={enrolledInClass}
        hasIncompleteHomework={assignedHomework.some((item) => !item.completedAt)}
        onJoinClass={() => onOpenClassSelector?.()}
        onGoHome={() => go("home")}
        onGoLearn={() => go("learn")}
        onGoProgress={() => go("progress")}
        onContinueLearning={openContinueLearning}
      />
    </div>
  );
}
