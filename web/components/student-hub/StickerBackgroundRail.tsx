"use client";

import { clsx } from "clsx";
import { StickerBookScrollCard } from "@/components/student-hub/StickerBookScrollCard";
import type { StickerBookBackground } from "@/lib/student-hub/sticker-book-types";

type Props = {
  backgrounds: StickerBookBackground[];
  activeId: string | null;
  loading: boolean;
  error: string | null;
  onSelect: (bg: StickerBookBackground) => void;
};

export function StickerBackgroundRail({
  backgrounds,
  activeId,
  loading,
  error,
  onSelect,
}: Props) {
  return (
    <StickerBookScrollCard title="Scenes" ariaLabel="Scene backgrounds">
      {loading ? (
        <p className="px-1 py-2 text-center text-[0.65rem] font-semibold text-kid-ink/70">…</p>
      ) : error ? (
        <p className="px-1 py-2 text-center text-[0.65rem] font-semibold text-red-800">{error}</p>
      ) : backgrounds.length === 0 ? (
        <p className="px-1 py-2 text-center text-[0.65rem] font-semibold leading-snug text-kid-ink/75">
          Tag images <strong>background</strong> in the media library.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5 pb-1">
          {backgrounds.map((bg) => {
            const active = activeId === bg.id;
            return (
              <li key={bg.id}>
                <button
                  type="button"
                  title={bg.label}
                  aria-label={bg.label}
                  aria-pressed={active}
                  className={clsx(
                    "block w-full overflow-hidden rounded-lg border-2 border-kid-ink transition-transform [touch-action:manipulation] active:scale-95",
                    active ? "ring-2 ring-[#0f4ecf] ring-offset-1" : "",
                  )}
                  onClick={() => onSelect(bg)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bg.url}
                    alt={bg.label}
                    className="aspect-[4/3] w-full object-cover"
                    draggable={false}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </StickerBookScrollCard>
  );
}
