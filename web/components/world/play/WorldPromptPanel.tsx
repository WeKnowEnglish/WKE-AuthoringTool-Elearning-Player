"use client";

import { useMemo, useState } from "react";
import type { CharacterConfig } from "@/lib/character/character-types";
import { buildWorldPrompt, type WorldPromptId } from "@/lib/world/world-prompts";

type Props = {
  promptId: WorldPromptId;
  config?: CharacterConfig;
  onClose: () => void;
};

export function WorldPromptPanel({ promptId, config, onClose }: Props) {
  const prompt = useMemo(() => buildWorldPrompt(promptId, config), [promptId, config]);
  const [picked, setPicked] = useState<string | null>(null);
  const correct = picked === prompt.answerId;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-end justify-center bg-black/35 p-4 pb-28 sm:items-center sm:pb-4">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl bg-[#fff7ed] p-4 text-slate-900 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{prompt.title}</p>
            <p className="mt-1 text-lg font-extrabold">{prompt.question}</p>
            <p className="mt-1 text-sm text-slate-700">{prompt.hint}</p>
          </div>
          <button
            type="button"
            className="rounded-md bg-white px-2.5 py-1 text-sm font-semibold text-slate-800 hover:bg-slate-100"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2">
          {prompt.choices.map((choice) => {
            const selected = picked === choice.id;
            const showWrong = selected && !correct;
            const showRight = picked != null && choice.id === prompt.answerId && correct;
            return (
              <button
                key={choice.id}
                type="button"
                disabled={correct}
                className={`rounded-xl px-4 py-3 text-left text-sm font-bold ${
                  showRight
                    ? "bg-emerald-300 text-slate-900"
                    : showWrong
                      ? "bg-rose-200 text-slate-900"
                      : "bg-white text-slate-900 hover:bg-amber-100"
                }`}
                onClick={() => setPicked(choice.id)}
              >
                {choice.label}
              </button>
            );
          })}
        </div>
        {correct ? <p className="mt-3 text-sm font-semibold text-emerald-800">{prompt.success}</p> : null}
        {picked && !correct ? <p className="mt-3 text-sm font-semibold text-rose-800">Try again.</p> : null}
      </div>
    </div>
  );
}
