"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { KidButton } from "@/components/kid-ui/KidButton";
import type { LiveGameQuestionSetCard } from "@/lib/live-game/question-banks/types";
import { formatQuestionSetCardCount } from "@/lib/live-game/question-banks/question-sets-api-client";

type Props = {
  sets: LiveGameQuestionSetCard[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPlay: (id: string) => void;
  onEdit: (id: string) => void;
  disabled?: boolean;
  editingId?: string | null;
};

export function LiveGameQuestionSetCarousel({
  sets,
  selectedId,
  onSelect,
  onPlay,
  onEdit,
  disabled = false,
  editingId = null,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  const updateScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) {
      setCanScrollBack(false);
      setCanScrollForward(false);
      return;
    }
    setCanScrollBack(track.scrollLeft > 4);
    setCanScrollForward(track.scrollLeft + track.clientWidth < track.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      track.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [sets, updateScrollState]);

  function scrollByCard(direction: -1 | 1) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>("[data-question-set-card]");
    const gap = 12;
    const amount = (card?.offsetWidth ?? 280) + gap;
    track.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {canScrollBack ?
          <button
            type="button"
            aria-label="Previous question sets"
            className="shrink-0 rounded-lg border-4 border-kid-ink bg-kid-panel px-3 py-2 text-lg font-bold text-kid-ink"
            onClick={() => scrollByCard(-1)}
          >
            ◀
          </button>
        : null}

        <div
          ref={trackRef}
          className="flex min-w-0 flex-1 gap-3 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:thin]"
        >
          {sets.map((set) => {
            const selected = set.id === selectedId;
            return (
              <article
                key={set.id}
                data-question-set-card
                className={clsx(
                  "w-[min(100%,17.5rem)] shrink-0 snap-start rounded-lg border-4 border-kid-ink p-3 transition-colors",
                  selected ? "bg-kid-panel ring-2 ring-kid-ink/20" : "bg-white",
                )}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => onSelect(set.id)}
                >
                  <h3 className="text-lg font-extrabold text-kid-ink">{set.title}</h3>
                  <p className="mt-1 text-sm font-bold text-kid-ink/80">
                    {formatQuestionSetCardCount(set)}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm font-semibold text-kid-ink/70">
                    {set.learningObjective}
                  </p>
                </button>

                <div className="mt-3 flex flex-wrap gap-2">
                  <KidButton
                    variant="primary"
                    className="min-h-11 min-w-0 flex-1 px-4 py-2 text-base"
                    disabled={disabled}
                    onClick={() => onPlay(set.id)}
                  >
                    Play
                  </KidButton>
                  <KidButton
                    variant="secondary"
                    className="min-h-11 min-w-0 flex-1 px-4 py-2 text-base"
                    disabled={disabled || editingId != null}
                    onClick={() => onEdit(set.id)}
                  >
                    {editingId === set.id ? "Opening..." : "Edit"}
                  </KidButton>
                </div>
              </article>
            );
          })}
        </div>

        {canScrollForward ?
          <button
            type="button"
            aria-label="Next question sets"
            className="shrink-0 rounded-lg border-4 border-kid-ink bg-kid-panel px-3 py-2 text-lg font-bold text-kid-ink"
            onClick={() => scrollByCard(1)}
          >
            ▶
          </button>
        : null}
      </div>
    </div>
  );
}
