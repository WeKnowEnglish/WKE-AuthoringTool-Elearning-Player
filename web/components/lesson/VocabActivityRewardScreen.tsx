"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import {
  CheckCircle2,
  ClipboardList,
  Coins,
  Gift,
  RefreshCw,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import { KidConfetti } from "@/components/kid-ui/KidConfetti";
import { playSfx } from "@/lib/audio/sfx";
import {
  PRIMARY_CHROME_CLASS,
  PRIMARY_CHROME_STYLE,
} from "@/lib/primary/primary-chrome";
import type {
  VocabPracticeWordMeta,
  VocabRewardBreakdown,
  VocabRunStats,
} from "@/lib/vocabulary-templates/vocab-run-session";
import { formatVocabElapsed } from "@/lib/vocabulary-templates/vocab-run-session";

function RewardPill({
  label,
  value,
  tone,
  compact,
  icon,
}: {
  label: string;
  value: number;
  tone: "coin" | "xp";
  compact?: boolean;
  icon: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "flex w-full flex-1 flex-col items-center justify-center rounded-2xl border border-[var(--pl-border)]",
        compact ? "px-2 py-1.5" : "px-2 py-2",
        tone === "coin" ? "bg-amber-50" : "bg-[var(--pl-purple-soft)]",
      )}
    >
      <span
        className={clsx(
          "mb-0.5",
          tone === "coin" ? "text-amber-600" : "text-[var(--pl-purple)]",
        )}
      >
        {icon}
      </span>
      <span
        className={clsx(
          "font-black leading-none text-[var(--pl-ink)]",
          compact ? "text-2xl" : "text-3xl sm:text-4xl",
        )}
      >
        {value}
      </span>
      <span
        className={clsx(
          "mt-0.5 font-extrabold",
          compact ? "text-xs" : "text-sm sm:text-base",
          tone === "coin" ? "text-amber-900" : "text-[var(--pl-purple)]",
        )}
      >
        {label}
      </span>
    </div>
  );
}

function SectionLabel({
  children,
  icon,
}: {
  children: string;
  icon?: ReactNode;
}) {
  return (
    <p className="mb-1 flex items-center justify-center gap-1 text-center text-[0.65rem] font-extrabold uppercase tracking-[0.16em] text-[var(--pl-muted)]">
      {icon ? <span className="inline-flex text-[var(--pl-teal)]">{icon}</span> : null}
      {children}
    </p>
  );
}

/** Vertical bar that fills green to `percent`, with a counting percentage label. */
function AccuracyMeter({
  percent,
  compact,
}: {
  percent: number;
  compact?: boolean;
}) {
  const target = Math.max(0, Math.min(100, Math.round(percent)));
  const [fillReady, setFillReady] = useState(false);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      setFillReady(true);
      setDisplay(target);
      return;
    }

    setFillReady(false);
    setDisplay(0);

    let frame = 0;
    let countFrame = 0;
    const start = performance.now();
    const durationMs = 1100;

    // Kick the CSS height transition on the next paint.
    frame = requestAnimationFrame(() => {
      setFillReady(true);
    });

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(eased * target));
      if (t < 1) {
        countFrame = requestAnimationFrame(tick);
      } else {
        setDisplay(target);
      }
    };
    countFrame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(countFrame);
    };
  }, [target]);

  const tone =
    target >= 90 ? "excellent" : target >= 70 ? "good" : target >= 50 ? "ok" : "low";

  return (
    <div
      className={clsx(
        "mx-auto flex items-end justify-center gap-3",
        compact ? "max-w-[14rem]" : "max-w-xs",
      )}
      role="img"
      aria-label={`First-try accuracy ${target} percent`}
    >
      <div className="flex flex-col items-center gap-1">
        <div
          className={clsx(
            "relative w-12 overflow-hidden rounded-xl border-2 border-[var(--pl-border)] bg-white sm:w-14",
            compact ? "h-24" : "h-32 sm:h-36",
          )}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-full flex-col justify-between py-1">
            {[100, 75, 50, 25, 0].map((tick) => (
              <div key={tick} className="flex items-center gap-0.5 px-0.5">
                <span className="h-px w-1.5 bg-[var(--pl-border)]" />
              </div>
            ))}
          </div>
          <div
            className={clsx(
              "absolute inset-x-0 bottom-0 rounded-b-[0.6rem] motion-safe:transition-[height] motion-safe:duration-1000 motion-safe:ease-out",
              tone === "excellent" && "bg-emerald-500",
              tone === "good" && "bg-emerald-400",
              tone === "ok" && "bg-lime-400",
              tone === "low" && "bg-amber-400",
            )}
            style={{ height: fillReady ? `${target}%` : "0%" }}
          >
            <div className="absolute inset-x-0 top-0 h-1.5 bg-white/35" />
          </div>
        </div>
        <span className="text-[0.65rem] font-extrabold uppercase tracking-wide text-[var(--pl-muted)]">
          Score
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-end pb-5">
        <p
          className={clsx(
            "font-extrabold tabular-nums leading-none text-[var(--pl-ink)]",
            compact ? "text-4xl" : "text-5xl sm:text-6xl",
          )}
        >
          {display}
          <span className="text-[0.55em] text-[var(--pl-muted)]">%</span>
        </p>
        <p
          className={clsx(
            "mt-0.5 font-extrabold text-[var(--pl-muted)]",
            compact ? "text-xs" : "text-sm",
          )}
        >
          First-try accuracy
        </p>
      </div>
    </div>
  );
}

/**
 * Product A finish screen — Primary chrome when nested under VocabularySetOverlay.
 * `layout="report"` emphasizes Review → Reward → Replay for Vocabulary Player.
 */
export function VocabActivityRewardScreen({
  lessonTitle,
  stats,
  breakdown,
  practiceWords,
  muted,
  onPlayAgain,
  onFinish,
  finishHref,
  finishLabel = "Finish",
  playAgainLabel = "Play again",
  layout = "default",
}: {
  lessonTitle: string;
  stats: VocabRunStats;
  breakdown: VocabRewardBreakdown;
  practiceWords: VocabPracticeWordMeta[];
  muted: boolean;
  onPlayAgain: () => void;
  onFinish?: () => void;
  finishHref?: string;
  finishLabel?: string;
  playAgainLabel?: string;
  layout?: "default" | "report";
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const report = layout === "report";
  const reviewWords = stats.reviewWordIds
    .map((id) => practiceWords.find((w) => w.id === id))
    .filter((w): w is VocabPracticeWordMeta => w != null);

  const firstTryLine =
    stats.firstTryGraded > 0
      ? `${stats.firstTryCorrect} of ${stats.firstTryGraded} correct on the first try`
      : null;
  const extraLine = `${stats.wordsMastered} super word${stats.wordsMastered === 1 ? "" : "s"} · ${formatVocabElapsed(stats.elapsedMs)}`;

  const bonusRows: { label: string; coins: number }[] = [];
  if (stats.practiceGold > 0) {
    bonusRows.push({ label: "During the lesson", coins: stats.practiceGold });
  }
  bonusRows.push({ label: "Finish bonus", coins: breakdown.baseGold });
  if (breakdown.accuracyBonusGold > 0) {
    bonusRows.push({ label: "First-try bonus", coins: breakdown.accuracyBonusGold });
  }
  if (breakdown.masteryBonusGold > 0) {
    bonusRows.push({ label: "Super words", coins: breakdown.masteryBonusGold });
  }
  if (breakdown.timeBonusGold > 0) {
    bonusRows.push({ label: "Speed bonus", coins: breakdown.timeBonusGold });
  }

  const primaryBtn = clsx(
    "inline-flex items-center justify-center gap-1.5 rounded-2xl bg-[var(--pl-teal)] px-4 text-sm font-extrabold text-white transition hover:bg-[var(--pl-teal-hover)] active:scale-[0.98]",
    report ? "min-h-10" : "min-h-12 px-5",
  );
  const secondaryBtn = clsx(
    "inline-flex items-center justify-center gap-1.5 rounded-2xl border border-[var(--pl-border)] bg-white px-4 text-sm font-extrabold text-[var(--pl-ink)] transition hover:border-[var(--pl-purple)]",
    report ? "min-h-10" : "min-h-12 px-5",
  );

  const finishControl = onFinish ? (
    <button
      type="button"
      className={report ? secondaryBtn : primaryBtn}
      onClick={() => {
        playSfx("tap", muted);
        onFinish();
      }}
    >
      {report ? <Sparkles className="h-4 w-4" aria-hidden /> : null}
      {finishLabel}
    </button>
  ) : finishHref ? (
    <Link
      href={finishHref}
      className={report ? secondaryBtn : primaryBtn}
      onClick={() => playSfx("tap", muted)}
    >
      {report ? <Sparkles className="h-4 w-4" aria-hidden /> : null}
      {finishLabel}
    </Link>
  ) : (
    <Link href="/primary?nav=vocabulary" className={report ? secondaryBtn : primaryBtn}>
      {report ? <Sparkles className="h-4 w-4" aria-hidden /> : null}
      {finishLabel}
    </Link>
  );

  return (
    <div
      className={clsx(
        "relative box-border flex min-h-0 flex-1 flex-col",
        report ? "overflow-hidden px-2 py-2 sm:px-3 sm:py-3" : "overflow-y-auto px-3 py-4 sm:px-6 sm:py-6",
        PRIMARY_CHROME_CLASS,
      )}
      style={PRIMARY_CHROME_STYLE}
    >
      <KidConfetti active />
      <div
        className={clsx(
          "relative m-auto flex w-full flex-col rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] shadow-sm",
          report
            ? "max-h-full max-w-md gap-2 overflow-hidden p-3 sm:p-3.5"
            : "max-w-lg gap-3 p-4 sm:gap-4 sm:p-5",
        )}
      >
        <div className="shrink-0 text-center">
          <p
            className={clsx(
              "inline-flex items-center justify-center gap-1.5 font-extrabold leading-tight text-[var(--pl-ink)]",
              report ? "text-2xl" : "text-3xl sm:text-4xl",
            )}
          >
            <Trophy
              className={clsx(
                "shrink-0 text-amber-500",
                report ? "h-6 w-6" : "h-8 w-8",
              )}
              aria-hidden
            />
            {report ? "Run complete!" : "Awesome!"}
          </p>
          <p
            className={clsx(
              "font-bold text-[var(--pl-muted)]",
              report ? "mt-0.5 text-sm" : "mt-1 text-base sm:text-lg",
            )}
          >
            <span className="font-extrabold text-[var(--pl-ink)]">{lessonTitle}</span>
            <span>{report ? " — here’s how you did" : " — done!"}</span>
          </p>
        </div>

        <section
          className={clsx(
            "shrink-0 rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)]",
            report ? "px-2.5 py-2" : "px-3 py-3 sm:px-4",
          )}
        >
          {report ? (
            <SectionLabel icon={<ClipboardList className="h-3.5 w-3.5" aria-hidden />}>
              Review
            </SectionLabel>
          ) : null}

          {report ? (
            <AccuracyMeter percent={stats.firstTryAccuracyPercent} compact />
          ) : (
            <div className="text-center">
              <p className="text-5xl font-extrabold leading-none text-[var(--pl-ink)] sm:text-6xl">
                {stats.firstTryAccuracyPercent}%
              </p>
              <p className="mt-1 text-sm font-extrabold text-[var(--pl-muted)]">
                First-try accuracy
              </p>
            </div>
          )}

          <div className={clsx("text-center", report ? "mt-1" : "mt-1")}>
            {firstTryLine ? (
              <p
                className={clsx(
                  "inline-flex items-center justify-center gap-1 font-semibold text-[var(--pl-ink)]",
                  report ? "text-xs" : "text-sm",
                )}
              >
                <CheckCircle2
                  className={clsx(
                    "shrink-0 text-emerald-600",
                    report ? "h-3.5 w-3.5" : "h-4 w-4",
                  )}
                  aria-hidden
                />
                {firstTryLine}
              </p>
            ) : null}
            <p className="mt-0.5 text-xs font-semibold text-[var(--pl-muted)]">{extraLine}</p>
          </div>

          {reviewWords.length > 0 ? (
            <div className={report ? "mt-1.5" : "mt-3"}>
              <p
                className={clsx(
                  "text-center font-extrabold text-[var(--pl-ink)]",
                  report ? "mb-1 text-xs" : "mb-2 text-sm",
                )}
              >
                {report ? "Words to review" : "Practice these next time"}
              </p>
              <ul className="flex snap-x snap-mandatory justify-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {reviewWords.map((w) => (
                  <li
                    key={w.id}
                    className={clsx(
                      "flex shrink-0 snap-center flex-col items-center gap-0.5 rounded-xl border border-[var(--pl-border)] bg-[var(--pl-purple-soft)]",
                      report ? "w-14 p-1" : "w-20 gap-1 rounded-2xl p-1.5",
                    )}
                  >
                    <div
                      className={clsx(
                        "relative overflow-hidden rounded-lg border border-[var(--pl-border)] bg-white",
                        report ? "h-10 w-10" : "h-16 w-16 rounded-xl sm:h-[4.5rem] sm:w-[4.5rem]",
                      )}
                    >
                      <Image
                        src={w.imageUrl}
                        alt=""
                        fill
                        className="object-contain p-0.5"
                        sizes={report ? "40px" : "72px"}
                        unoptimized={
                          w.imageUrl.endsWith(".svg") ||
                          w.imageUrl.includes("supabase.co") ||
                          w.imageUrl.includes("placehold.co")
                        }
                      />
                    </div>
                    <span
                      className={clsx(
                        "text-center font-extrabold text-[var(--pl-ink)]",
                        report ? "text-[0.65rem] leading-tight" : "text-sm",
                      )}
                    >
                      {w.lemma}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p
              className={clsx(
                "inline-flex w-full items-center justify-center gap-1 text-center font-extrabold text-[var(--pl-teal)]",
                report ? "mt-1.5 text-sm" : "mt-3 text-base sm:text-lg",
              )}
            >
              <Star className={report ? "h-4 w-4" : "h-5 w-5"} aria-hidden />
              Every word — first try!
            </p>
          )}
        </section>

        <section
          className={clsx(
            "shrink-0 rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)]",
            report ? "px-2.5 py-2" : "px-3 py-3 sm:px-4",
          )}
        >
          {report ? (
            <SectionLabel icon={<Gift className="h-3.5 w-3.5" aria-hidden />}>
              Reward
            </SectionLabel>
          ) : null}
          <div className="flex gap-2">
            <RewardPill
              label="Coins"
              value={breakdown.totalGold}
              tone="coin"
              compact={report}
              icon={<Coins className={report ? "h-4 w-4" : "h-5 w-5"} aria-hidden />}
            />
            <RewardPill
              label="XP"
              value={breakdown.experienceDelta}
              tone="xp"
              compact={report}
              icon={<Sparkles className={report ? "h-4 w-4" : "h-5 w-5"} aria-hidden />}
            />
          </div>
          <button
            type="button"
            className={clsx(
              "mx-auto block font-bold text-[var(--pl-muted)] underline decoration-2 underline-offset-2 hover:text-[var(--pl-purple)]",
              report ? "mt-1 text-xs" : "mt-2 text-sm",
            )}
            onClick={() => {
              playSfx("tap", muted);
              setShowBreakdown((v) => !v);
            }}
          >
            {showBreakdown ? "Hide details" : "How you earned coins"}
          </button>
          {showBreakdown ? (
            <ul
              className={clsx(
                "mt-1.5 max-h-24 space-y-0.5 overflow-y-auto rounded-xl border border-[var(--pl-border)] bg-white px-2.5 py-1.5 font-semibold text-[var(--pl-ink)]",
                report ? "text-xs" : "text-sm",
              )}
            >
              {bonusRows.map((row) => (
                <li key={row.label} className="flex justify-between gap-3">
                  <span>{row.label}</span>
                  <span className="font-extrabold">+{row.coins}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="shrink-0">
          <div
            className={clsx(
              "flex items-stretch justify-center gap-2",
              report ? "flex-row flex-wrap" : "flex-col sm:flex-row sm:flex-wrap",
            )}
          >
            <button
              type="button"
              className={clsx(report ? primaryBtn : secondaryBtn, report && "flex-1")}
              onClick={() => {
                playSfx("tap", muted);
                onPlayAgain();
              }}
            >
              {report ? <RefreshCw className="h-4 w-4" aria-hidden /> : null}
              {playAgainLabel}
            </button>
            <div className={clsx(report && "flex flex-1 [&>a]:w-full [&>button]:w-full")}>
              {finishControl}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
