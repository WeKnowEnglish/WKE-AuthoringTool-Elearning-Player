"use client";

import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties, type ReactNode } from "react";
import {
  BookOpen,
  Brain,
  Check,
  ChevronRight,
  Coins,
  Gamepad2,
  Headphones,
  Home,
  Library,
  Menu,
  Pencil,
  Play,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { SignOutForm } from "@/components/auth/SignOutForm";
import { PrimaryGamesTab } from "@/components/primary/PrimaryGamesTab";
import { PrimaryLearnTab } from "@/components/primary/PrimaryLearnTab";
import { PrimaryProgressTab } from "@/components/primary/PrimaryProgressTab";
import { PrimaryReviewTab } from "@/components/primary/PrimaryReviewTab";
import { PrimaryVocabularyTab } from "@/components/primary/PrimaryVocabularyTab";
import { useAudioMuted } from "@/lib/audio/use-audio-muted";
import type { StudentHomeworkCard } from "@/lib/class-homework/types";
import type { LearningBand } from "@/lib/learning-band";
import type { PrimaryProgressModel } from "@/lib/primary/build-primary-progress-model";
import type { PrimaryReviewModel } from "@/lib/primary/build-primary-review-model";
import type { VocabSetId } from "@/lib/vocabulary-templates";

export type PrimaryNavId =
  | "home"
  | "learn"
  | "vocabulary"
  | "grammar"
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
  model?: Partial<PrimaryHomeModel>;
  /** Live My Progress summary (Phase 4). */
  progressModel?: PrimaryProgressModel;
  /** Live Review list (Phase 5). */
  reviewModel?: PrimaryReviewModel;
  /** Learning band for secondary entry on Learn (Phase 6). */
  learningBand?: LearningBand | null;
  onNavigate?: (destination: PrimaryNavId | string) => void;
  /** Open a vocabulary set in the lesson overlay (Phase 1). */
  onOpenVocabularySet?: (id: VocabSetId) => void;
  /** Refresh economy / progress after games (Phase 5). */
  onEconomyChange?: () => void;
  /** Optional controls in the top bar (e.g. class menu). */
  headerExtra?: ReactNode;
  /** Deep-link tab, e.g. `?nav=vocabulary`. */
  initialNav?: string | null;
  /** Teacher-assigned offline work for Learn tab. */
  assignedHomework?: StudentHomeworkCard[];
};

const NAV_IDS: PrimaryNavId[] = [
  "home",
  "learn",
  "vocabulary",
  "grammar",
  "games",
  "review",
  "progress",
];

function parseInitialNav(nav: string | null | undefined): PrimaryNavId {
  if (nav && (NAV_IDS as string[]).includes(nav)) return nav as PrimaryNavId;
  return "home";
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
    nextActivityLabel: "Learn words",
  },
  path: [
    {
      id: "learn",
      title: "Learn Words",
      description: "See and hear new words.",
      status: "current",
    },
    {
      id: "practice",
      title: "Practice",
      description: "Match, choose, and spell.",
      status: "available",
    },
    {
      id: "review",
      title: "Review",
      description: "Check what you remember.",
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
    { id: "match", title: "Match the Word", icon: "match", rewardLabel: "+ gold & XP" },
    { id: "cloze", title: "Fill in the Blanks", icon: "cloze", rewardLabel: "+ gold & XP" },
    { id: "listen", title: "Spell the Word", icon: "listen", rewardLabel: "+ gold & XP" },
  ],
  words: [],
  encouragement: "Keep learning — gold and XP unlock new topics!",
};

const NAV: Array<{ id: PrimaryNavId; label: string; icon: typeof Home }> = [
  { id: "home", label: "Home", icon: Home },
  { id: "learn", label: "Learn", icon: BookOpen },
  { id: "vocabulary", label: "Vocabulary", icon: Library },
  { id: "grammar", label: "Grammar", icon: Pencil },
  { id: "games", label: "Games", icon: Gamepad2 },
  { id: "review", label: "Review", icon: Brain },
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

function RecommendIcon({ kind }: { kind: "match" | "cloze" | "listen" }) {
  if (kind === "cloze") return <Pencil className="h-5 w-5" />;
  if (kind === "listen") return <Headphones className="h-5 w-5" />;
  return <BookOpen className="h-5 w-5" />;
}

function PathIcon({ status, index }: { status: PathStepStatus; index: number }) {
  if (status === "complete") return <Check className="h-5 w-5" />;
  if (index === 0) return <BookOpen className="h-5 w-5" />;
  if (index === 1) return <Pencil className="h-5 w-5" />;
  if (index === 2) return <Headphones className="h-5 w-5" />;
  return <Trophy className="h-5 w-5" />;
}

export function StudentHomeLanding({
  model: modelPartial,
  progressModel,
  reviewModel,
  learningBand = null,
  onNavigate,
  onOpenVocabularySet,
  onEconomyChange,
  headerExtra,
  initialNav,
  assignedHomework = [],
}: Props) {
  const router = useRouter();
  const { muted, toggleMuted } = useAudioMuted();
  const model = mergeModel(modelPartial);
  const [activeNav, setActiveNav] = useState<PrimaryNavId>(() =>
    parseInitialNav(initialNav),
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const progressPct = Math.round(
    (model.today.activitiesDone / Math.max(1, model.today.activitiesTotal)) * 100,
  );
  const continueLabel =
    model.today.activitiesDone === 0 ? "Start Learning" : "Continue Learning";

  function go(destination: PrimaryNavId | string, message?: string) {
    if (destination === "grammar") {
      setMobileNavOpen(false);
      onNavigate?.(destination);
      router.push("/grammar");
      return;
    }
    if ((NAV_IDS as string[]).includes(destination)) {
      setActiveNav(destination as PrimaryNavId);
      setMobileNavOpen(false);
    }
    if (message) setToast(message);
    onNavigate?.(destination);
  }

  function openContinueLearning() {
    if (model.continueSetId && onOpenVocabularySet) {
      onOpenVocabularySet(model.continueSetId);
      return;
    }
    go("vocabulary");
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
      className="flex h-[100dvh] w-full flex-col overflow-hidden font-[family-name:var(--font-nunito)] text-[var(--pl-ink)]"
      style={
        {
          "--pl-bg": "#f3f0f8",
          "--pl-card": "#ffffff",
          "--pl-ink": "#1e293b",
          "--pl-muted": "#64748b",
          "--pl-border": "#e8e2f0",
          "--pl-purple": "#7c3aed",
          "--pl-purple-soft": "#ede9fe",
          "--pl-teal": "#0d9488",
          "--pl-teal-hover": "#0f766e",
          "--pl-gold": "#f59e0b",
          "--pl-success": "#22c55e",
        } as CSSProperties
      }
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
                Learning dashboard
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
            onClick={() => go("progress")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--pl-purple)] text-sm font-black text-white"
            aria-label={`${model.studentName} — My Progress`}
          >
            {model.avatarInitials}
          </button>

          <SignOutForm
            variant="primary"
            label="Log out"
            className="hidden lg:block"
            buttonClassName="!w-auto px-3.5 py-2"
          />
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
          {activeNav === "vocabulary" ? (
            <PrimaryVocabularyTab
              playerLevel={model.level}
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
          ) : activeNav === "review" && reviewModel ? (
            <PrimaryReviewTab
              model={reviewModel}
              onPracticeSet={(setId) => {
                if (onOpenVocabularySet) {
                  onOpenVocabularySet(setId);
                  return;
                }
                go("vocabulary");
              }}
              onOpenVocabulary={() => go("vocabulary")}
            />
          ) : activeNav === "learn" ? (
            <PrimaryLearnTab
              model={model}
              reviewWordCount={reviewModel?.items.length ?? 0}
              learningBand={learningBand}
              continueLabel={continueLabel}
              assignedHomework={assignedHomework}
              onContinue={openContinueLearning}
              onOpenReview={() => go("review")}
              onOpenVocabulary={() => go("vocabulary")}
              onOpenProgress={() => go("progress")}
              onOpenGrammar={() => go("grammar")}
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
            {/* Today’s Learning */}
            <section
              aria-labelledby="todays-learning-heading"
              className="overflow-hidden rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] p-4 shadow-sm sm:p-6"
            >
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--pl-purple)]">
                Today&apos;s Learning
              </p>

              <div className="mt-4 grid gap-5 md:grid-cols-[120px_1fr] lg:grid-cols-[140px_1fr_220px] lg:items-center">
                <div
                  className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-[var(--pl-purple-soft)] text-[var(--pl-purple)] md:mx-0 md:h-[120px] md:w-full lg:h-[140px]"
                  aria-hidden
                >
                  <BookOpen className="h-12 w-12 md:h-14 md:w-14" strokeWidth={1.5} />
                </div>

                <div className="min-w-0 text-center md:text-left">
                  <h1
                    id="todays-learning-heading"
                    className="text-2xl font-extrabold tracking-tight text-[var(--pl-ink)] sm:text-3xl"
                  >
                    {model.today.topicTitle}
                  </h1>
                  <p className="mt-2 text-sm font-semibold text-[var(--pl-muted)] sm:text-base">
                    Goal: {model.today.goal}
                  </p>
                  <span className="mt-3 inline-flex rounded-full bg-[var(--pl-purple-soft)] px-3 py-1 text-xs font-extrabold text-[var(--pl-purple)]">
                    {model.today.skill}
                  </span>
                </div>

                <div className="flex w-full flex-col gap-3 md:col-span-2 lg:col-span-1">
                  <div className="rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)] p-3">
                    <div className="flex items-center justify-between gap-2 text-xs font-extrabold text-[var(--pl-muted)]">
                      <span>Progress</span>
                      <span>
                        {model.today.activitiesDone}/{model.today.activitiesTotal}{" "}
                        activities done
                      </span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-[var(--pl-success)] transition-[width]"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={openContinueLearning}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--pl-teal)] px-5 text-sm font-extrabold text-white transition hover:bg-[var(--pl-teal-hover)] active:scale-[0.98]"
                  >
                    {continueLabel}
                    <Play className="h-4 w-4 fill-current" />
                  </button>
                  <p className="text-center text-xs font-semibold text-[var(--pl-muted)] lg:text-left">
                    Next: {model.today.nextActivityLabel}
                  </p>
                </div>
              </div>
            </section>

            {/* Today’s Path */}
            <section
              aria-labelledby="todays-path-heading"
              className="rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] p-4 shadow-sm sm:p-6"
            >
              <h2
                id="todays-path-heading"
                className="text-lg font-extrabold tracking-tight sm:text-xl"
              >
                Today&apos;s Path
              </h2>

              <ol className="mt-5 flex gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
                {model.path.map((step, index) => {
                  const current = step.status === "current";
                  const complete = step.status === "complete";
                  const locked = step.status === "locked";
                  return (
                    <li key={step.id} className="relative min-w-[160px] flex-1 lg:min-w-0">
                      {index < model.path.length - 1 && (
                        <span
                          className="pointer-events-none absolute left-[calc(50%+28px)] top-7 hidden h-0.5 w-[calc(100%-24px)] bg-[var(--pl-border)] lg:block"
                          aria-hidden
                        />
                      )}
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => {
                          if (step.id === "rewards") {
                            go("progress");
                            return;
                          }
                          if (step.id === "review") {
                            go("review");
                            return;
                          }
                          openContinueLearning();
                        }}
                        className={`relative flex w-full flex-col items-start rounded-2xl border-2 p-3 text-left transition ${
                          current
                            ? "border-[var(--pl-purple)] bg-[var(--pl-purple-soft)]"
                            : complete
                              ? "border-[var(--pl-success)]/40 bg-emerald-50"
                              : locked
                                ? "cursor-not-allowed border-[var(--pl-border)] bg-[var(--pl-bg)] opacity-60"
                                : "border-[var(--pl-border)] bg-white hover:border-[var(--pl-purple)]/50"
                        }`}
                      >
                        <span
                          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                            current
                              ? "bg-[var(--pl-purple)] text-white"
                              : complete
                                ? "bg-[var(--pl-success)] text-white"
                                : "bg-[var(--pl-bg)] text-[var(--pl-muted)]"
                          }`}
                        >
                          <PathIcon status={step.status} index={index} />
                        </span>
                        <span className="mt-3 text-sm font-extrabold">{step.title}</span>
                        <span className="mt-1 text-xs font-semibold text-[var(--pl-muted)]">
                          {step.description}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>

            {/* Bottom grid */}
            <div className="grid gap-5 lg:grid-cols-2">
              <section
                aria-labelledby="recommended-heading"
                className="rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] p-4 shadow-sm sm:p-6"
              >
                <h2
                  id="recommended-heading"
                  className="text-lg font-extrabold tracking-tight"
                >
                  Recommended for You
                </h2>
                <ul className="mt-4 space-y-3">
                  {model.recommended.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)] p-3"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--pl-teal)] shadow-sm">
                        <RecommendIcon kind={item.icon} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold">{item.title}</p>
                        <p className="text-xs font-bold text-[var(--pl-gold)]">
                          {item.rewardLabel}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={openContinueLearning}
                        className="shrink-0 rounded-xl bg-[var(--pl-teal)] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-[var(--pl-teal-hover)]"
                      >
                        Start
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              <section
                aria-labelledby="words-heading"
                className="rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] p-4 shadow-sm sm:p-6"
              >
                <h2 id="words-heading" className="text-lg font-extrabold tracking-tight">
                  Words You&apos;re Learning
                </h2>
                <ul className="mt-4 space-y-2">
                  {model.words.length === 0 ? (
                    <li className="rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)] px-3 py-3 text-sm font-semibold text-[var(--pl-muted)]">
                      Open Vocabulary to pick a topic and start learning words.
                    </li>
                  ) : (
                    model.words.map((item) => {
                      const isImage =
                        item.icon.startsWith("/") || item.icon.startsWith("http");
                      return (
                        <li
                          key={item.id}
                          className="flex items-center gap-3 rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)] px-3 py-2.5"
                        >
                          {isImage ? (
                            <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-white">
                              <NextImage
                                src={item.icon}
                                alt=""
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </span>
                          ) : (
                            <span className="text-xl" aria-hidden>
                              {item.icon}
                            </span>
                          )}
                          <span className="text-sm font-extrabold capitalize">
                            {item.word}
                          </span>
                        </li>
                      );
                    })
                  )}
                </ul>
                <button
                  type="button"
                  onClick={() => go("vocabulary")}
                  className="mt-4 inline-flex w-full items-center justify-center gap-1 rounded-2xl border border-[var(--pl-border)] bg-white py-2.5 text-sm font-extrabold text-[var(--pl-purple)] hover:bg-[var(--pl-purple-soft)]"
                >
                  See All Words
                  <ChevronRight className="h-4 w-4" />
                </button>
              </section>
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
          ["home", "learn", "vocabulary", "games"].includes(item.id),
        ).map((item) => {
          const Icon = item.icon;
          const active = activeNav === item.id;
          return (
            <button
              key={item.id}
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
    </div>
  );
}
