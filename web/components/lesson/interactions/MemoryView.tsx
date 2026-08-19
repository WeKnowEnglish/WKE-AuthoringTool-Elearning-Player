"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import {
  deterministicShuffle,
  GuideBlock,
  interactionLessonShellClass,
  InteractionShellNav,
  isStageFooterNav,
  type NavProps,
} from "./shared";

type Parsed = Extract<ScreenPayload, { type: "interaction"; subtype: "memory" }>;
type Card = {
  id: string;
  pairId: string;
  kind: "text" | "picture";
  word: string;
  text?: string;
  textKind?: "word" | "definition" | "example";
  clue?: string;
  imageUrl?: string;
  imageFit: "cover" | "contain";
};

export function MemoryView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
  controlsPlacement,
}: { parsed: Parsed; muted: boolean; passed: boolean; onPass: () => void; onWrong: () => void } & NavProps) {
  const stageFooter = isStageFooterNav(controlsPlacement);
  const cards = useMemo(() => deterministicShuffle(
    parsed.pairs.flatMap((pair): Card[] => [
      {
        id: `${pair.id}:text`,
        pairId: pair.id,
        kind: "text",
        word: pair.word,
        text: pair.text ?? pair.word,
        textKind: pair.text_kind,
        imageFit: pair.image_fit,
      },
      {
        id: `${pair.id}:picture`,
        pairId: pair.id,
        kind: "picture",
        word: pair.word,
        clue: pair.clue,
        imageUrl: pair.image_url,
        imageFit: pair.image_fit,
      },
    ]),
    parsed.quiz_group_id ?? parsed.pairs.map((pair) => pair.id).join("|"),
  ), [parsed.pairs, parsed.quiz_group_id]);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(() => new Set());
  const [checking, setChecking] = useState(false);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    if (openIds.length !== 2) return;
    const [left, right] = openIds.map((id) => cards.find((card) => card.id === id)!);
    setMoves((current) => current + 1);
    if (left.pairId === right.pairId) {
      const timer = window.setTimeout(() => {
        const next = new Set(matched);
        next.add(left.pairId);
        setMatched(next);
        setOpenIds([]);
        playSfx("correct", muted);
        if (next.size === parsed.pairs.length) onPass();
      }, 420);
      return () => window.clearTimeout(timer);
    }
    setChecking(true);
    onWrong();
    const timer = window.setTimeout(() => {
      setOpenIds([]);
      setChecking(false);
    }, 850);
    return () => window.clearTimeout(timer);
    // Resolve exactly one selected pair.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIds]);

  function flip(card: Card) {
    if (passed || checking || matched.has(card.pairId) || openIds.includes(card.id) || openIds.length >= 2) return;
    playSfx("tap", muted);
    setOpenIds((current) => [...current, card.id]);
  }

  const columns = cards.length <= 8 ? 4 : cards.length <= 12 ? 4 : 6;
  return (
    <div className={interactionLessonShellClass(controlsPlacement)}>
      <KidPanel className={clsx(stageFooter && "flex min-h-0 flex-1 flex-col overflow-hidden !p-3 sm:!p-4")}>
        <div className="shrink-0 text-center">
          <h2 className="text-xl font-extrabold text-kid-ink sm:text-2xl">{parsed.prompt}</h2>
          <p className="mt-1 text-sm font-bold text-kid-ink/65">
            {passed ? `All pairs found in ${moves} moves!` : `${matched.size}/${parsed.pairs.length} pairs · ${moves} moves`}
          </p>
        </div>
        <div className="mt-3 flex min-h-0 flex-1 items-center justify-center overflow-y-auto [container-type:size]">
          <div
            className="grid w-full max-w-5xl gap-2 sm:gap-3"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {cards.map((card) => {
              const visible = openIds.includes(card.id) || matched.has(card.pairId) || passed;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => flip(card)}
                  disabled={passed || checking || matched.has(card.pairId)}
                  aria-label={visible ? (card.kind === "text" ? card.text ?? card.word : `Picture for ${card.word}`) : "Hidden memory card"}
                  className={clsx(
                    "relative aspect-[4/5] min-h-0 overflow-hidden rounded-xl border-4 border-kid-ink bg-kid-cta p-1.5 text-kid-ink shadow-md transition hover:-translate-y-0.5 disabled:hover:translate-y-0",
                    visible && "bg-white",
                    matched.has(card.pairId) && "border-emerald-700 bg-emerald-50 opacity-75",
                  )}
                >
                  {visible ? (
                    card.kind === "text" ? (
                      <span className="flex h-full flex-col items-center justify-center gap-1 break-words text-center">
                        {card.textKind !== "word" ? (
                          <span className="text-[clamp(0.42rem,1.4cqw,0.7rem)] font-black uppercase tracking-wide text-kid-ink/45">
                            {card.textKind === "definition" ? "Definition" : "Example"}
                          </span>
                        ) : null}
                        <span className="text-[clamp(0.58rem,2.5cqw,1.35rem)] font-black">
                          {card.text ?? card.word}
                        </span>
                      </span>
                    ) : card.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- activity media can be remote or a data URL
                      <img src={card.imageUrl} alt={card.word} className={clsx("h-full w-full rounded-lg", card.imageFit === "cover" ? "object-cover" : "object-contain")} />
                    ) : (
                      <span className="flex h-full items-center justify-center break-words text-center text-[clamp(0.6rem,2.4cqw,1.15rem)] font-extrabold">{card.clue || card.word}</span>
                    )
                  ) : (
                    <span className="flex h-full items-center justify-center text-[clamp(1.5rem,7cqw,4rem)] font-black text-kid-ink/70" aria-hidden>?</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </KidPanel>
      <GuideBlock guide={parsed.guide} />
      <InteractionShellNav showBack={showBack} onBack={onBack} passed={passed} onNext={onNext} controlsPlacement={controlsPlacement} />
    </div>
  );
}
