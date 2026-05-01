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

export function SortingGameView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "sorting_game" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const objects = useMemo(
    () => (parsed.shuffle_objects ? deterministicShuffle(parsed.objects, parsed.prompt) : parsed.objects),
    [parsed.shuffle_objects, parsed.objects, parsed.prompt],
  );
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [placement, setPlacement] = useState<Record<string, string>>({});
  const [draggingObject, setDraggingObject] = useState<string | null>(null);
  const [lockedCorrectIds, setLockedCorrectIds] = useState<Set<string>>(new Set());
  const [wrongIds, setWrongIds] = useState<Set<string>>(new Set());
  const wrongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
    };
  }, []);

  function place(containerId: string) {
    if (passed || !selectedObject || lockedCorrectIds.has(selectedObject)) return;
    playSfx("tap", muted);
    if (wrongIds.has(selectedObject)) {
      setWrongIds((prev) => {
        const next = new Set(prev);
        next.delete(selectedObject);
        return next;
      });
    }
    setPlacement((prev) => ({ ...prev, [selectedObject]: containerId }));
    if (!parsed.allow_reassign) setSelectedObject(null);
  }

  function check() {
    playSfx("tap", muted);
    const correctNow = objects
      .filter((o) => placement[o.id] === o.target_container_id)
      .map((o) => o.id);
    const wrongNow = objects
      .filter((o) => placement[o.id] && placement[o.id] !== o.target_container_id)
      .map((o) => o.id);

    const nextLocked = new Set(lockedCorrectIds);
    for (const id of correctNow) nextLocked.add(id);
    setLockedCorrectIds(nextLocked);
    const allLocked = objects.every((o) => nextLocked.has(o.id));

    setLockedCorrectIds(nextLocked);
    if (allLocked) onPass();
    else onWrong();

    setWrongIds(new Set(wrongNow));
    if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
    if (wrongNow.length > 0) {
      wrongTimerRef.current = setTimeout(() => {
        setPlacement((prev) => {
          const next = { ...prev };
          for (const id of wrongNow) delete next[id];
          return next;
        });
        setWrongIds(new Set());
      }, 520);
    }
  }

  const placedIds = new Set(Object.keys(placement));
  const showObjectText = (o: (typeof objects)[number]) =>
    (o.display.show_text ?? true) && !!o.display.text?.trim();
  const showObjectImage = (o: (typeof objects)[number]) =>
    (o.display.show_image ?? true) && !!o.display.image_url?.trim();
  const showContainerText = (c: (typeof parsed.containers)[number]) =>
    (c.display.show_text ?? true) && !!c.display.text?.trim();
  const showContainerImage = (c: (typeof parsed.containers)[number]) =>
    (c.display.show_image ?? true) && !!c.display.image_url?.trim();

  return (
    <div>
      <KidPanel>
        <p className="text-xl font-semibold">{parsed.prompt}</p>
        <p className="mt-2 text-sm text-neutral-700">Tap an object, then tap a container. Drag-and-drop also works.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {objects.map((o) => (
            <button
              key={o.id}
              type="button"
              draggable={!passed}
              onDragStart={() => setDraggingObject(o.id)}
              onDragEnd={() => setDraggingObject(null)}
              onClick={() => {
                if (lockedCorrectIds.has(o.id)) return;
                setSelectedObject(o.id);
              }}
              disabled={passed || lockedCorrectIds.has(o.id)}
              className={clsx(
                "rounded border-2 px-3 py-2 text-sm font-semibold transition-all",
                selectedObject === o.id ? "border-kid-ink bg-kid-accent/40" : "border-neutral-300 bg-white",
                placedIds.has(o.id) && "opacity-70",
                lockedCorrectIds.has(o.id) &&
                  "border-emerald-700 bg-emerald-100 text-emerald-900 opacity-100 kid-feedback-glow-correct",
                wrongIds.has(o.id) && "border-red-600 bg-red-100 text-red-900 kid-animate-shake",
              )}
            >
              {showObjectImage(o) ? (
                <Image
                  src={o.display.image_url!}
                  alt=""
                  width={28}
                  height={28}
                  className={clsx(
                    "mr-1 inline-block rounded",
                    (o.display.image_fit ?? "contain") === "cover" ? "object-cover" : "object-contain",
                  )}
                  unoptimized={unopt(o.display.image_url!)}
                />
              ) : null}
              {showObjectText(o) ? (o.display.text ?? o.id) : null}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {parsed.containers.map((c) => {
            const inContainer = objects.filter((o) => placement[o.id] === c.id);
            return (
              <button
                key={c.id}
                type="button"
                className="min-h-28 rounded-lg border-2 border-dashed border-kid-ink/60 bg-white p-2 text-left"
                onClick={() => place(c.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dragged = draggingObject || e.dataTransfer.getData("text/plain");
                  if (!dragged) return;
                  if (passed) return;
                  if (lockedCorrectIds.has(dragged)) return;
                  setPlacement((prev) => ({ ...prev, [dragged]: c.id }));
                }}
              >
                {showContainerText(c) ? (
                  <p className="font-semibold">{c.display.text ?? c.id}</p>
                ) : null}
                {showContainerImage(c) ? (
                  <Image
                    src={c.display.image_url!}
                    alt=""
                    width={42}
                    height={42}
                    className={clsx(
                      "mt-1 rounded",
                      (c.display.image_fit ?? "contain") === "cover" ? "object-cover" : "object-contain",
                    )}
                    unoptimized={unopt(c.display.image_url!)}
                  />
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1">
                  {inContainer.map((o) => (
                    <span
                      key={o.id}
                      className={clsx(
                        "rounded px-2 py-0.5 text-xs font-semibold transition-all",
                        lockedCorrectIds.has(o.id) && "bg-emerald-100 text-emerald-800",
                        wrongIds.has(o.id) && "bg-red-100 text-red-800 kid-animate-shake",
                        !lockedCorrectIds.has(o.id) &&
                          !wrongIds.has(o.id) &&
                          "bg-kid-panel text-kid-ink",
                      )}
                    >
                      {(o.display.show_text ?? true) ? (o.display.text ?? o.id) : o.id}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-4">
          <KidButton type="button" disabled={passed} onClick={check}>Check</KidButton>
        </div>
      </KidPanel>
      <GuideBlock guide={parsed.guide} />
      <div className="mt-6 flex flex-wrap gap-3">
        {showBack ? <KidButton type="button" variant="secondary" onClick={onBack}>Back</KidButton> : null}
        <KidButton type="button" disabled={!passed} onClick={() => onNext()}>Next</KidButton>
      </div>
    </div>
  );
}
