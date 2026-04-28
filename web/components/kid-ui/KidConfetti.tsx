"use client";

import { useMemo } from "react";

type Props = { active: boolean };

export function KidConfetti({ active }: Props) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        left: `${(i * 11 + (i % 7) * 3) % 100}%`,
        delay: `${(i % 10) * 0.08}s`,
        color: ["var(--kid-cta)", "var(--kid-accent)", "var(--kid-surface)", "#ffffff", "var(--kid-ink)"][
          i % 5
        ],
      })),
    [],
  );

  if (!active) return null;

  return (
    <div className="kid-confetti-layer" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="kid-confetti-piece"
          style={{
            left: p.left,
            background: p.color,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}
