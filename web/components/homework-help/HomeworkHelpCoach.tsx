"use client";

import Image from "next/image";
import { HelpCircle, X } from "lucide-react";
import { KidButton } from "@/components/kid-ui/KidButton";
import type { HelpAction, HelpStep } from "@/lib/homework-help";

const ACTION_LABEL: Record<HelpAction, string> = {
  need_more_help: "I still need help",
  show_answer: "Show the answer",
  got_it: "Got it",
};

type TriggerProps = {
  onOpen: () => void;
  label?: string;
  className?: string;
};

/** Footer CTA — sits beside Check my answers. */
export function HomeworkHelpTrigger({
  onOpen,
  label = "I need help",
  className = "",
}: TriggerProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-sky-300 bg-sky-50 px-4 text-sm font-extrabold text-sky-900 transition hover:border-sky-500 hover:bg-sky-100 active:scale-[0.98] ${className}`}
    >
      <HelpCircle className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </button>
  );
}

type HintProps = {
  step: HelpStep;
  onClose: () => void;
  onAction: (action: HelpAction) => void;
};

/** Hint card — placed between the question and the check/footer bar. */
export function HomeworkHelpHintCard({ step, onClose, onAction }: HintProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border-2 border-sky-200 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-4 py-3 shadow-sm sm:px-5"
      role="status"
      aria-label="Homework helper tip"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white hover:text-slate-800"
        aria-label="Close helper"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="pr-8">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">
          Helper · {step.level}
        </p>
        <p className="mt-1 text-base font-black text-[#17375e] sm:text-lg">{step.title}</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">{step.message}</p>
        {step.tip ? (
          <p className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-900">
            {step.tip}
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {step.actions.map((action) => (
          <KidButton
            key={action}
            variant={action === "got_it" ? "secondary" : "primary"}
            onClick={() => onAction(action)}
            className="!min-h-11 !min-w-0 !px-4 !text-sm"
          >
            {ACTION_LABEL[action]}
          </KidButton>
        ))}
      </div>
    </div>
  );
}

type MascotProps = {
  className?: string;
};

/**
 * Large side mascot — sits in a reserved right rail so it doesn't cover content.
 */
export function HomeworkHelpMascot({ className = "" }: MascotProps) {
  return (
    <div
      className={`pointer-events-none flex items-end justify-center ${className}`}
      aria-hidden
    >
      <Image
        src="/assets/primary/tutorial-mascot.png"
        alt=""
        width={280}
        height={280}
        className="h-auto w-[9.5rem] object-contain drop-shadow-md sm:w-[11rem] lg:w-[13rem] xl:w-[15rem]"
        priority
      />
    </div>
  );
}
