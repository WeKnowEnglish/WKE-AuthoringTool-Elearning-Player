"use client";

import { useMemo, useState } from "react";
import type { LessonRow, ModuleRow } from "@/lib/data/catalog";
import {
  getProgressSnapshot,
  getStickerCount,
  setAvatarId,
} from "@/lib/progress/local-storage";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { KidStickerStrip } from "@/components/kid-ui/KidStickerStrip";

const BUDDIES = [
  { id: "fox", emoji: "🦊" },
  { id: "robot", emoji: "🤖" },
  { id: "star", emoji: "⭐" },
] as const;

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

  const { completed, skillCounts, totalPublishedLessons, stickers } = useMemo(() => {
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
      stickers: getStickerCount(snap),
    };
  }, [lessons, skillsByLesson]);

  const doneCount = completed.filter((id) =>
    lessons.some((l) => l.id === id),
  ).length;

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
        <h2 className="text-xl font-bold text-kid-ink">Sticker book</h2>
        <p className="mt-1 text-sm text-kid-ink/80">
          One sticker for every three correct answers in lessons.
        </p>
        <div className="mt-3">
          <KidStickerStrip count={stickers} />
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
