"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import { speakText, speakTextAndWait } from "@/lib/audio/tts";
import { countKeywordMatchesInText } from "@/lib/essay-keyword-feedback";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import { GuideBlock, NavProps, unopt, deterministicShuffle } from "./shared";

type ListenColorWriteTool =
  | { mode: "color"; id: string }
  | { mode: "text"; id: string };

export function ListenColorWriteView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "listen_color_write" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textOptions = useMemo(
    () =>
      parsed.shuffle_text_options
        ? deterministicShuffle(parsed.text_options, `${parsed.image_url}:${parsed.targets.length}`)
        : parsed.text_options,
    [parsed.shuffle_text_options, parsed.text_options, parsed.image_url, parsed.targets.length],
  );
  const [activeTool, setActiveTool] = useState<ListenColorWriteTool>(() => ({
    mode: "color",
    id: parsed.palette[0]?.id ?? "",
  }));
  const [answers, setAnswers] = useState<
    Record<string, { mode: "color" | "text"; value: string }>
  >({});

  function playPrompt() {
    if (!parsed.prompt_audio_url) return;
    playSfx("tap", muted);
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = 0;
    void el.play().catch(() => null);
  }

  function applyTarget(targetId: string) {
    if (passed) return;
    if (!activeTool.id) return;
    playSfx("tap", muted);
    setAnswers((prev) => {
      if (!parsed.allow_overwrite && prev[targetId]) return prev;
      return {
        ...prev,
        [targetId]: { mode: activeTool.mode, value: activeTool.id },
      };
    });
  }

  function labelForAnswer(answer?: { mode: "color" | "text"; value: string }) {
    if (!answer) return null;
    if (answer.mode === "color") {
      return parsed.palette.find((p) => p.id === answer.value)?.label ?? answer.value;
    }
    return textOptions.find((t) => t.id === answer.value)?.label ?? answer.value;
  }

  function check() {
    playSfx("tap", muted);
    const required = parsed.require_all_targets ? parsed.targets : parsed.targets.filter((t) => answers[t.id]);
    if (required.length === 0) {
      onWrong();
      return;
    }
    const ok = required.every((target) => {
      const answer = answers[target.id];
      return (
        answer &&
        answer.mode === target.expected_mode &&
        answer.value === target.expected_value
      );
    });
    if (ok) onPass();
    else onWrong();
  }

  const answeredCount = Object.keys(answers).length;

  return (
    <div>
      {parsed.prompt_audio_url ? (
        <audio ref={audioRef} src={parsed.prompt_audio_url} preload="auto" className="hidden" />
      ) : null}
      <KidPanel>
        {parsed.body_text ? (
          <p className="mb-4 text-xl font-semibold">{parsed.body_text}</p>
        ) : null}
        <div className="mb-4 flex flex-wrap gap-2">
          {parsed.prompt_audio_url ? (
            <KidButton type="button" variant="accent" onClick={playPrompt}>
              Play prompt audio
            </KidButton>
          ) : null}
          <p className="text-sm font-semibold text-kid-ink">
            Marked {answeredCount}/{parsed.targets.length}
          </p>
        </div>

        <div className="mb-4 grid gap-3 lg:grid-cols-[260px_1fr]">
          <div className="space-y-3 rounded-lg border-2 border-kid-ink/20 bg-white p-3">
            <p className="text-sm font-bold text-kid-ink">Colors</p>
            <div className="flex flex-wrap gap-2">
              {parsed.palette.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={passed}
                  onClick={() => setActiveTool({ mode: "color", id: c.id })}
                  className={clsx(
                    "inline-flex items-center gap-2 rounded-full border-2 px-2.5 py-1 text-sm font-semibold",
                    activeTool.mode === "color" && activeTool.id === c.id
                      ? "border-kid-ink bg-kid-panel"
                      : "border-neutral-300 bg-white",
                  )}
                >
                  <span
                    className="inline-block h-4 w-4 rounded-full border border-neutral-500"
                    style={{ backgroundColor: c.color_hex }}
                    aria-hidden
                  />
                  {c.label}
                </button>
              ))}
            </div>
            <p className="text-sm font-bold text-kid-ink">Words</p>
            <div className="flex flex-wrap gap-2">
              {textOptions.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={passed}
                  onClick={() => setActiveTool({ mode: "text", id: t.id })}
                  className={clsx(
                    "rounded-full border-2 px-3 py-1 text-sm font-semibold",
                    activeTool.mode === "text" && activeTool.id === t.id
                      ? "border-kid-ink bg-kid-panel"
                      : "border-neutral-300 bg-white",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative aspect-video w-full overflow-hidden rounded-lg border-4 border-kid-ink">
            <Image
              src={parsed.image_url}
              alt="Scene"
              fill
              className="object-cover"
              unoptimized={unopt(parsed.image_url)}
            />
            {parsed.targets.map((target) => {
              const answer = answers[target.id];
              const isCorrect =
                passed &&
                answer &&
                answer.mode === target.expected_mode &&
                answer.value === target.expected_value;
              const isWrong =
                passed &&
                answer &&
                (answer.mode !== target.expected_mode || answer.value !== target.expected_value);
              const answerLabel = labelForAnswer(answer);
              const fillColor =
                answer?.mode === "color"
                  ? (parsed.palette.find((p) => p.id === answer.value)?.color_hex ?? "#94a3b8")
                  : undefined;
              return (
                <button
                  key={target.id}
                  type="button"
                  disabled={passed || (!parsed.allow_overwrite && !!answer)}
                  className={clsx(
                    "absolute border-4 border-dashed bg-white/10 transition-colors hover:bg-white/20 disabled:opacity-80",
                    isCorrect && "border-kid-success",
                    isWrong && "border-red-700",
                    !isCorrect && !isWrong && "border-kid-accent",
                  )}
                  style={{
                    left: `${target.x_percent}%`,
                    top: `${target.y_percent}%`,
                    width: `${target.w_percent}%`,
                    height: `${target.h_percent}%`,
                    backgroundColor: fillColor ? `${fillColor}66` : undefined,
                  }}
                  onClick={() => applyTarget(target.id)}
                  aria-label={target.label ?? "Target"}
                >
                  {answerLabel ? (
                    <span className="rounded bg-white/85 px-1.5 py-0.5 text-xs font-bold text-neutral-900">
                      {answerLabel}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <KidButton type="button" variant="secondary" disabled={passed} onClick={() => setAnswers({})}>
            Clear
          </KidButton>
          <KidButton type="button" disabled={passed} onClick={check}>
            Check
          </KidButton>
        </div>
      </KidPanel>
      <GuideBlock guide={parsed.guide} />
      <div className="mt-6 flex flex-wrap gap-3">
        {showBack ? (
          <KidButton type="button" variant="secondary" onClick={onBack}>
            Back
          </KidButton>
        ) : null}
        <KidButton type="button" disabled={!passed} onClick={() => onNext()}>
          Next
        </KidButton>
      </div>
    </div>
  );
}
