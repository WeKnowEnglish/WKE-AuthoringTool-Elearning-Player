"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { playSfx } from "@/lib/audio/sfx";
import { createClient } from "@/lib/supabase/client";

type GuideStep = {
  target?: string;
  action?: "join-class";
  title: string;
  body: string;
};

const WELCOME_STEP: GuideStep = {
  title: "Welcome to your Learning Home!",
  body: "Let’s take a quick look around. You can skip this tour at any time.",
};

const FINISH_STEP: GuideStep = {
  title: "You’re ready!",
  body: "Choose an assignment or continue learning to begin.",
};

const ENROLLED_STEPS: GuideStep[] = [
  WELCOME_STEP,
  {
    target: "assignments",
    title: "Your assignments",
    body: "Find the activities your teacher has chosen for you here.",
  },
  {
    target: "class",
    title: "Your class",
    body: "Open Class to see what your teacher is helping you learn.",
  },
  {
    target: "continue",
    title: "Continue learning",
    body: "Come back here to carry on from where you stopped.",
  },
  {
    target: "learn",
    title: "Practice and learn",
    body: "Open Learn for vocabulary quizzes and grammar posters.",
  },
  {
    target: "progress",
    title: "Check your progress",
    body: "See what you have completed and what to practise next.",
  },
  FINISH_STEP,
];

const INDEPENDENT_STEPS: GuideStep[] = [
  WELCOME_STEP,
  {
    action: "join-class",
    title: "Join your class",
    body: "Join your teacher’s class to see assignments and what your class is learning.",
  },
  {
    target: "learn",
    title: "Practice and learn",
    body: "Open Learn for vocabulary quizzes and grammar posters.",
  },
  {
    target: "progress",
    title: "Check your progress",
    body: "See what you have completed and what to practise next.",
  },
  {
    ...FINISH_STEP,
    body: "Choose something in Learn to begin practising.",
  },
];

type Rect = { top: number; left: number; width: number; height: number };

type Props = {
  enabled: boolean;
  muted: boolean;
  studentKey: string;
  initiallySeen: boolean;
  enrolledInClass: boolean;
  hasIncompleteHomework: boolean;
  onJoinClass: () => void;
  onGoHome: () => void;
  onGoLearn: () => void;
  onGoProgress: () => void;
  onContinueLearning: () => void;
};

function visibleTarget(name: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(`[data-guide="${name}"]`))
    .find((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
}

export function PrimaryHomeGuide({
  enabled,
  muted,
  studentKey,
  initiallySeen,
  enrolledInClass,
  hasIncompleteHomework,
  onJoinClass,
  onGoHome,
  onGoLearn,
  onGoProgress,
  onContinueLearning,
}: Props) {
  const storageKey = `wke-primary-home-tour:v2:${studentKey}`;
  const [step, setStep] = useState<number | null>(null);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [tipOpen, setTipOpen] = useState(false);

  const tip = useMemo(() => {
    if (!enrolledInClass) {
      return {
        text: "Join your teacher’s class to receive assignments and see class learning.",
        label: "Explore Learn",
        action: onGoLearn,
      };
    }
    if (hasIncompleteHomework) {
      return {
        text: "You have teacher work waiting. Start with Your assignments!",
        label: "Show me",
        action: onGoHome,
      };
    }
    return {
      text: "Ready for a quick win? Continue your vocabulary practice.",
      label: "Continue",
      action: onContinueLearning,
    };
  }, [enrolledInClass, hasIncompleteHomework, onContinueLearning, onGoHome, onGoLearn]);

  const steps = enrolledInClass ? ENROLLED_STEPS : INDEPENDENT_STEPS;

  useEffect(() => {
    if (!enabled) return;
    if (initiallySeen) return;
    if (window.localStorage.getItem(storageKey)) return;
    const timer = window.setTimeout(() => setStep(0), 450);
    return () => window.clearTimeout(timer);
  }, [enabled, initiallySeen, storageKey]);

  const finish = useCallback((status: "completed" | "skipped") => {
    window.localStorage.setItem(storageKey, status);
    setStep(null);
    setTargetRect(null);
    void createClient().auth.updateUser({
      data: { primary_home_tour_version: 2 },
    });
  }, [storageKey]);

  const replayTour = useCallback(() => {
    playSfx("correct", muted);
    setTipOpen(false);
    onGoHome();
    window.setTimeout(() => setStep(0), 150);
  }, [muted, onGoHome]);

  useEffect(() => {
    if (step === null) return;
    const current = steps[step];
    const update = () => {
      if (!current.target) {
        setTargetRect(null);
        return;
      }
      const element = visibleTarget(current.target);
      if (!element) {
        setTargetRect(null);
        return;
      }
      element.scrollIntoView({ block: "center", behavior: "smooth" });
      window.setTimeout(() => {
        const rect = element.getBoundingClientRect();
        setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
      }, 220);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [step, steps]);

  const current = step === null ? null : steps[step];
  const currentStep = step ?? 0;
  // The guide grows for greetings and celebration, and stays compact while
  // pointing so it never competes with the highlighted learning control.
  const mascotSizes = enrolledInClass
    ? [148, 104, 112, 116, 104, 116, 148]
    : [148, 132, 104, 116, 148];
  const mascotSize = mascotSizes[currentStep] ?? 112;
  const mascotStyle = targetRect
    ? {
        left: Math.max(12, Math.min(window.innerWidth - mascotSize - 12, targetRect.left + targetRect.width - mascotSize * 0.4)),
        top: Math.max(76, Math.min(window.innerHeight - mascotSize - 12, targetRect.top + targetRect.height + 10)),
        width: mascotSize,
      }
    : { width: mascotSize };

  return (
    <>
      {current && enabled ? (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Learning Home tour">
          <div className="absolute inset-0 bg-slate-950/55" />
          {targetRect ? (
            <div
              className="pointer-events-none absolute rounded-3xl ring-4 ring-amber-300 transition-all duration-300"
              style={{
                top: targetRect.top - 8,
                left: targetRect.left - 8,
                width: targetRect.width + 16,
                height: targetRect.height + 16,
                boxShadow: "0 0 0 9999px rgb(15 23 42 / 0.55)",
              }}
            />
          ) : null}

          <div
            className={`absolute z-10 w-[min(90vw,22rem)] rounded-3xl border-2 border-purple-200 bg-white p-5 shadow-2xl ${
              targetRect ? "bottom-5 left-1/2 -translate-x-1/2 sm:bottom-8" : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            }`}
          >
            <button
              type="button"
              onClick={() => finish("skipped")}
              className="absolute right-3 top-3 rounded-full p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Skip tour"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="pr-8 text-xl font-black text-slate-900">{current.title}</p>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{current.body}</p>
            <div className="mt-5 flex items-center justify-between gap-3">
              <button type="button" onClick={() => finish("skipped")} className="text-sm font-extrabold text-slate-500 underline">
                Skip tour
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs font-extrabold text-slate-400">{currentStep + 1} of {steps.length}</span>
                {current.action === "join-class" ? (
                  <button
                    type="button"
                    onClick={() => {
                      playSfx("tap", muted);
                      setStep(currentStep + 1);
                    }}
                    className="rounded-xl px-3 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-100"
                  >
                    Not now
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    if (current.action === "join-class") {
                      playSfx("correct", muted);
                      onJoinClass();
                      return;
                    }
                    if (currentStep === steps.length - 1) {
                      playSfx("complete", muted);
                      finish("completed");
                      return;
                    }
                    playSfx("correct", muted);
                    setStep(currentStep + 1);
                  }}
                  className="rounded-2xl bg-purple-600 px-5 py-2.5 text-sm font-black text-white shadow-sm hover:bg-purple-700"
                >
                  {current.action === "join-class"
                    ? "Join class"
                    : currentStep === steps.length - 1
                      ? "Start learning"
                      : "Next"}
                </button>
              </div>
            </div>
          </div>

          <div
            className={`pointer-events-none absolute z-20 transition-all duration-500 ease-out ${targetRect ? "" : "bottom-[calc(50%+8rem)] left-1/2 -translate-x-1/2"}`}
            style={mascotStyle}
          >
            <Image
              src="/assets/primary/tutorial-mascot.png"
              alt="Friendly learning guide"
              width={160}
              height={160}
              priority
              className="h-auto w-full drop-shadow-xl motion-safe:animate-[guide-pulse_1.8s_ease-in-out_infinite]"
            />
          </div>
        </div>
      ) : null}

      <div className="fixed bottom-20 right-3 z-40 flex flex-col items-end gap-2 lg:bottom-4 lg:right-5">
        {tipOpen ? (
          <div className="w-[min(82vw,18rem)] rounded-3xl border-2 border-purple-200 bg-white p-4 shadow-xl" role="status">
            <p className="text-sm font-extrabold leading-5 text-slate-700">{tip.text}</p>
            <button
              type="button"
              onClick={replayTour}
              className="mt-3 w-full rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-black text-purple-700 hover:bg-purple-100"
            >
              Replay tour
            </button>
            {!enrolledInClass ? (
              <button
                type="button"
                onClick={() => {
                  playSfx("correct", muted);
                  setTipOpen(false);
                  onJoinClass();
                }}
                className="mt-2 w-full rounded-xl bg-amber-300 px-3 py-2 text-xs font-black text-purple-950 hover:bg-amber-200"
              >
                Join class
              </button>
            ) : null}
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => { setTipOpen(false); onGoProgress(); }} className="rounded-xl px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50">
                My progress
              </button>
              <button type="button" onClick={() => { setTipOpen(false); onGoLearn(); }} className="rounded-xl px-3 py-2 text-xs font-black text-purple-700 hover:bg-purple-50">
                Explore Learn
              </button>
              <button type="button" onClick={() => { setTipOpen(false); tip.action(); }} className="rounded-xl bg-purple-600 px-3 py-2 text-xs font-black text-white">
                {tip.label}
              </button>
            </div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => {
            playSfx("tap", muted);
            setTipOpen((open) => !open);
          }}
          className="group relative rounded-full bg-white/95 p-1 shadow-xl ring-2 ring-purple-200 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-400"
          aria-label={tipOpen ? "Close learning tip" : "Get a learning tip"}
          aria-expanded={tipOpen}
        >
          <Image src="/assets/primary/tutorial-mascot.png" alt="" width={96} height={96} className="h-auto w-20" />
          <span className="absolute -left-1 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-amber-300 text-sm font-black text-purple-950 shadow">?</span>
        </button>
      </div>

      <style jsx global>{`
        @keyframes guide-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="guide-pulse"] { animation: none !important; }
        }
      `}</style>
    </>
  );
}
