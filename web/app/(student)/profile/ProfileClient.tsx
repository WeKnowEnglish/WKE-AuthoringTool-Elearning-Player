"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LessonRow, ModuleRow } from "@/lib/data/catalog";
import {
  getProgressSnapshot,
  isAudioMuted,
  setAvatarId,
} from "@/lib/progress/local-storage";
import { getRewards, purchaseSticker, sellSticker } from "@/lib/progress/rewards";
import { STICKER_LIBRARY, pickRandomSticker, type StickerRarity } from "@/lib/progress/sticker-library";
import { playSfx } from "@/lib/audio/sfx";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidConfetti } from "@/components/kid-ui/KidConfetti";
import { KidPanel } from "@/components/kid-ui/KidPanel";

const BUDDIES = [
  { id: "fox", emoji: "🦊" },
  { id: "robot", emoji: "🤖" },
  { id: "star", emoji: "⭐" },
] as const;

const STICKER_COST_GOLD = 5;
const SELL_PRICE_GOLD = 1;

type Props = {
  modules: ModuleRow[];
  lessons: LessonRow[];
  skillsByLesson: Record<string, string[]>;
  loadError?: string;
};

export function ProfileClient({
  modules,
  lessons,
  skillsByLesson,
  loadError,
}: Props) {
  const [buddy, setBuddy] = useState<string | null>(
    () => getProgressSnapshot().avatarId ?? null,
  );
  const [gold, setGold] = useState(() => getRewards().gold);
  const [ownedStickerIds, setOwnedStickerIds] = useState<string[]>(
    () => getRewards().ownedStickerIds ?? [],
  );
  const [bookOpen, setBookOpen] = useState(false);
  const [unboxedStickerId, setUnboxedStickerId] = useState<string | null>(null);
  const [rollingStickerId, setRollingStickerId] = useState<string | null>(null);
  const [isRollingSticker, setIsRollingSticker] = useState(false);
  const rollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rollFinalizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { completed, skillCounts, totalPublishedLessons } = useMemo(() => {
    const snap = getProgressSnapshot();
    const completed = snap.completedLessonIds;
    const counts: Record<string, number> = {};
    let total = 0;
    for (const les of lessons) {
      total += 1;
      if (!completed.includes(les.id)) continue;
      for (const sk of skillsByLesson[les.id] ?? []) {
        counts[sk] = (counts[sk] ?? 0) + 1;
      }
    }
    return {
      completed,
      skillCounts: counts,
      totalPublishedLessons: total,
    };
  }, [lessons, skillsByLesson]);

  const ownedStickers = useMemo(
    () =>
      ownedStickerIds.map((id) => {
        const fromPool = STICKER_LIBRARY.find((s) => s.id === id);
        return fromPool ?? { id, emoji: "⭐", label: "Sticker", rarity: "common" as StickerRarity };
      }),
    [ownedStickerIds],
  );

  const ownedStickerStacks = useMemo(() => {
    const map = new Map<
      string,
      { key: string; emoji: string; label: string; rarity: StickerRarity; count: number; ids: string[] }
    >();
    for (const id of ownedStickerIds) {
      const def =
        STICKER_LIBRARY.find((s) => s.id === id) ??
        ({ id, emoji: "⭐", label: "Sticker", rarity: "common" } as const);
      const key = def.emoji;
      const current = map.get(key);
      if (current) {
        current.count += 1;
        current.ids.push(id);
      } else {
        map.set(key, {
          key,
          emoji: def.emoji,
          label: def.label,
          rarity: def.rarity,
          count: 1,
          ids: [id],
        });
      }
    }
    const rarityRank: Record<StickerRarity, number> = {
      common: 0,
      uncommon: 1,
      rare: 2,
      epic: 3,
    };
    return Array.from(map.values()).sort((a, b) => {
      const byRarity = rarityRank[b.rarity] - rarityRank[a.rarity];
      if (byRarity !== 0) return byRarity;
      return a.label.localeCompare(b.label);
    });
  }, [ownedStickerIds]);

  const revealedSticker =
    unboxedStickerId ? STICKER_LIBRARY.find((s) => s.id === unboxedStickerId) ?? null : null;
  const rollingSticker =
    rollingStickerId ? STICKER_LIBRARY.find((s) => s.id === rollingStickerId) ?? null : null;

  const doneCount = completed.filter((id) =>
    lessons.some((l) => l.id === id),
  ).length;

  function buyRandomSticker() {
    const picked = pickRandomSticker();
    const next = purchaseSticker({
      stickerId: picked.id,
      costGold: STICKER_COST_GOLD,
    });
    if (!next) return;
    if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
    if (rollFinalizeTimeoutRef.current) clearTimeout(rollFinalizeTimeoutRef.current);
    setIsRollingSticker(true);
    setRollingStickerId(pickRandomSticker().id);
    setGold(next.gold);
    setOwnedStickerIds(next.ownedStickerIds);
    setUnboxedStickerId(picked.id);
    rollIntervalRef.current = setInterval(() => {
      const random = pickRandomSticker();
      setRollingStickerId(random.id);
    }, 85);
    rollFinalizeTimeoutRef.current = setTimeout(() => {
      if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
      rollIntervalRef.current = null;
      setRollingStickerId(picked.id);
      setIsRollingSticker(false);
      playSfx("complete", isAudioMuted());
    }, 1450);
  }

  function sellOneSticker(stickerId: string) {
    const next = sellSticker({ stickerId, goldBack: SELL_PRICE_GOLD });
    if (!next) return;
    setGold(next.gold);
    setOwnedStickerIds(next.ownedStickerIds);
  }

  useEffect(() => {
    return () => {
      if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
      if (rollFinalizeTimeoutRef.current) clearTimeout(rollFinalizeTimeoutRef.current);
    };
  }, []);

  return (
    <div className="space-y-6">
      {loadError ? (
        <KidPanel className="border-red-800 bg-red-50">
          <p className="text-lg font-bold text-red-950">
            Could not load lesson catalog
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-red-900">
            {loadError}
          </p>
        </KidPanel>
      ) : null}
      <KidPanel>
        <h2 className="text-xl font-bold text-kid-ink">Achievements</h2>
        <p className="mt-1 text-sm text-kid-ink/80">
          Earn gold in lessons, then spend it on random sticker packs.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-900">
            Gold: {gold}
          </span>
          <KidButton
            type="button"
            onClick={buyRandomSticker}
            disabled={gold < STICKER_COST_GOLD}
            title={
              gold < STICKER_COST_GOLD ?
                `Need ${STICKER_COST_GOLD} gold to buy a sticker`
              : `Buy random sticker for ${STICKER_COST_GOLD} gold`
            }
          >
            Buy random sticker ({STICKER_COST_GOLD} gold)
          </KidButton>
          <KidButton type="button" variant="secondary" onClick={() => setBookOpen(true)}>
            Open sticker book ({ownedStickers.length})
          </KidButton>
        </div>
      </KidPanel>
      <KidPanel>
        <h2 className="text-xl font-bold text-kid-ink">Your buddy</h2>
        <p className="mt-1 text-sm text-kid-ink/80">
          This friend appears when you finish a lesson.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {buddy ? (
            <span className="text-6xl leading-none" aria-hidden>
              {BUDDIES.find((b) => b.id === buddy)?.emoji ?? "⭐"}
            </span>
          ) : (
            <span className="text-kid-ink/70">Not chosen yet — pick one:</span>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {BUDDIES.map((b) => (
            <KidButton
              key={b.id}
              type="button"
              variant={buddy === b.id ? "primary" : "secondary"}
              className="!min-h-12 !min-w-12 text-3xl"
              onClick={() => {
                setBuddy(b.id);
                setAvatarId(b.id);
              }}
            >
              <span aria-hidden>{b.emoji}</span>
              <span className="sr-only">{b.id}</span>
            </KidButton>
          ))}
        </div>
      </KidPanel>
      <KidPanel>
        <h2 className="text-xl font-bold text-kid-ink">Lessons completed</h2>
        <p className="mt-2 text-3xl font-extrabold">
          {doneCount}{" "}
          <span className="text-lg font-semibold text-neutral-600">
            / {totalPublishedLessons}
          </span>
        </p>
      </KidPanel>
      <KidPanel>
        <h2 className="text-xl font-bold">Skills</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Count of finished lessons that tagged each skill.
        </p>
        <ul className="mt-4 space-y-2">
          {Object.keys(skillCounts).length === 0 ? (
            <li className="text-neutral-600">Play a lesson to see skills!</li>
          ) : (
            Object.entries(skillCounts).map(([skill, n]) => (
              <li
                key={skill}
                className="flex justify-between rounded-md border-2 border-neutral-900 px-3 py-2 font-semibold"
              >
                <span className="capitalize">{skill}</span>
                <span>{n}</span>
              </li>
            ))
          )}
        </ul>
      </KidPanel>
      {unboxedStickerId && revealedSticker ? (
        <div className="fixed left-0 top-0 z-[90] flex h-dvh w-screen items-center justify-center bg-black p-4">
          <KidConfetti active />
          <div className="w-full max-w-2xl rounded-2xl border-4 border-yellow-300 bg-neutral-950 p-8 text-center text-white shadow-2xl">
            <p className="text-base font-semibold uppercase tracking-[0.2em] text-yellow-200">
              {isRollingSticker ? "Picking your sticker..." : "New sticker unlocked"}
            </p>
            <p className="mt-8 text-[11rem] leading-none drop-shadow-[0_0_24px_rgba(255,255,255,0.25)]" aria-hidden>
              {(isRollingSticker ? (rollingSticker ?? revealedSticker) : revealedSticker).emoji}
            </p>
            <p className="mt-6 text-4xl font-extrabold text-yellow-100">
              {(isRollingSticker ? (rollingSticker ?? revealedSticker) : revealedSticker).label}
            </p>
            <p className="mt-2 text-lg font-semibold text-emerald-300">
              Congratulations! ({(isRollingSticker ? (rollingSticker ?? revealedSticker) : revealedSticker).rarity})
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <KidButton
                type="button"
                variant="secondary"
                disabled={isRollingSticker}
                onClick={() => setUnboxedStickerId(null)}
              >
                Close
              </KidButton>
              <KidButton
                type="button"
                disabled={isRollingSticker}
                onClick={() => {
                  setUnboxedStickerId(null);
                  setBookOpen(true);
                }}
              >
                View sticker book
              </KidButton>
              <KidButton
                type="button"
                disabled={isRollingSticker || gold < STICKER_COST_GOLD}
                title={
                  gold < STICKER_COST_GOLD ?
                    `Need ${STICKER_COST_GOLD} gold to buy another sticker`
                  : `Buy another sticker for ${STICKER_COST_GOLD} gold`
                }
                onClick={buyRandomSticker}
              >
                Buy another
              </KidButton>
            </div>
          </div>
        </div>
      ) : null}
      {bookOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4">
          <div className="flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-xl border-4 border-kid-ink bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xl font-bold text-kid-ink">Sticker book</h3>
              <KidButton type="button" variant="secondary" onClick={() => setBookOpen(false)}>
                Close
              </KidButton>
            </div>
            <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
            {ownedStickerStacks.length === 0 ? (
                <p className="text-sm text-kid-ink/80">
                  No stickers yet. Buy one from Achievements.
                </p>
              ) : (
              <div className="grid grid-cols-4 gap-3 pb-1 sm:grid-cols-6">
                  {ownedStickerStacks.map((sticker) => (
                    <div
                      key={sticker.key}
                      className="relative flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-kid-ink/30 bg-kid-panel text-3xl"
                      title={sticker.label}
                      aria-label={sticker.label}
                    >
                      <span>{sticker.emoji}</span>
                      <span className="mt-1 text-[10px] font-semibold text-kid-ink/70">{sticker.rarity}</span>
                      <span className="absolute right-1 top-1 rounded bg-kid-ink px-1 text-[10px] font-bold text-white">
                        x{sticker.count}
                      </span>
                      <button
                        type="button"
                        className="absolute bottom-1 rounded border border-amber-300 bg-amber-50 px-1 py-0.5 text-[9px] font-semibold text-amber-900"
                        onClick={() => sellOneSticker(sticker.ids[sticker.ids.length - 1] ?? "")}
                        title={`Sell one for ${SELL_PRICE_GOLD} gold`}
                      >
                        Sell +{SELL_PRICE_GOLD}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
      <KidPanel>
        <h2 className="text-xl font-bold">Modules</h2>
        <ul className="mt-3 space-y-2">
          {modules
            .slice()
            .sort((a, b) => a.order_index - b.order_index)
            .map((m) => {
              const les = lessons.filter((l) => l.module_id === m.id);
              const c = les.filter((l) => completed.includes(l.id)).length;
              return (
                <li
                  key={m.id}
                  className="flex justify-between rounded-md border-2 border-neutral-800 px-3 py-2"
                >
                  <span className="font-semibold">{m.title}</span>
                  <span className="text-neutral-600">
                    {c}/{les.length}
                  </span>
                </li>
              );
            })}
        </ul>
      </KidPanel>
    </div>
  );
}
