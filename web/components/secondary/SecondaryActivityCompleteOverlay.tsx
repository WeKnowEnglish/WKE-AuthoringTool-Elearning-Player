"use client";

import clsx from "clsx";
import { CheckCircle2 } from "lucide-react";
import { useRef } from "react";
import { SecondaryButton } from "@/components/secondary/SecondaryButton";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";
import { useModalFocus } from "@/lib/hooks/use-modal-focus";
import type { SecondaryActivityScoreSummary } from "@/lib/secondary/secondary-scaffold";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";

type Props = {
  open: boolean;
  activityLabel: string;
  summary: SecondaryActivityScoreSummary;
  onContinue: () => void;
  onTryAgain?: () => void;
};

function statTile(label: string, value: number, highlight?: "good" | "warn") {
  return (
    <div
      className={clsx(
        "rounded-xl border-2 px-3 py-3 text-center",
        highlight === "warn" && value > 0
          ? "border-red-300 bg-red-50"
          : "border-emerald-200 bg-emerald-50/80",
      )}
    >
      <p className="text-2xl font-extrabold tabular-nums text-sec-ink">{value}</p>
      <p className={`mt-0.5 ${secondaryUi.caption} text-sec-muted`}>{label}</p>
    </div>
  );
}

/** Centered success overlay after a Secondary practice activity finishes. */
export function SecondaryActivityCompleteOverlay({
  open,
  activityLabel,
  summary,
  onContinue,
  onTryAgain,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useBodyScrollLock(open);
  useModalFocus({
    open,
    containerRef: dialogRef,
    returnFocusRef,
    initialFocusRef: continueRef,
  });

  if (!open) return null;

  const understoodCount = summary.firstTry + summary.secondTry + summary.thirdTry;
  const perfect = summary.percentUnderstood === 100 && summary.neededHelp === 0;
  const headline = perfect ? "Great work!" : "Nice effort!";
  const titleId = "secondary-activity-complete-title";
  const descriptionId = "secondary-activity-complete-description";

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/45" aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="fixed inset-0 z-[81] flex items-center justify-center p-4"
      >
        <div className="w-full max-w-sm rounded-2xl border-2 border-emerald-600 bg-white p-5 shadow-2xl sm:max-w-md sm:p-6">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-8 w-8" aria-hidden />
            </span>
            <p className={`mt-3 ${secondaryUi.eyebrow} text-emerald-800`}>{headline}</p>
            <h2 className={`mt-1 ${secondaryUi.sectionTitle}`} id={titleId}>
              {activityLabel} complete
            </h2>
            <p className={`mt-3 text-5xl font-extrabold tabular-nums text-emerald-700`}>
              {summary.percentUnderstood}%
            </p>
            <p className={`mt-1 ${secondaryUi.body} text-sec-ink/85`} id={descriptionId}>
              Understood today · {understoodCount}/{summary.total} words
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3">
            {statTile("First try", summary.firstTry)}
            {statTile("Second try", summary.secondTry)}
            {statTile("Third try", summary.thirdTry)}
            {statTile("Needed help", summary.neededHelp, "warn")}
          </div>

          {summary.neededHelp > 0 ? (
            <p className={`mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 ${secondaryUi.caption} text-amber-950`}>
              Words you needed help with stay on your focus list — we&apos;ll practise them again
              soon.
            </p>
          ) : null}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              ref={continueRef}
              className={`w-full sm:flex-1 ${secondaryUi.btnPrimary}`}
              onClick={onContinue}
              type="button"
            >
              See my answers
            </button>
            {onTryAgain ? (
              <SecondaryButton
                className="w-full sm:flex-1"
                onClick={onTryAgain}
                variant="secondary"
              >
                Try again
              </SecondaryButton>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
