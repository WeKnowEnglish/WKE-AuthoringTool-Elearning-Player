"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import { isPresentationInteractionPassSatisfied } from "@/lib/presentation-interactive-pass";
import { GuideBlock, NavProps, unopt } from "./shared";

export function PresentationInteractiveView({
  parsed,
  muted,
  passed,
  onPass,
  onWrong,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "presentation_interactive" }>;
  muted: boolean;
  passed: boolean;
  onPass: () => void;
  onWrong: () => void;
} & NavProps) {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [visibleBySlide, setVisibleBySlide] = useState<Record<string, Record<string, boolean>>>(
    () =>
      Object.fromEntries(
        parsed.slides.map((slide) => [
          slide.id,
          Object.fromEntries(slide.elements.map((el) => [el.id, el.visible !== false])),
        ]),
      ),
  );
  const [freeDragPos, setFreeDragPos] = useState<Record<string, { x_percent: number; y_percent: number }>>(
    {},
  );
  const [dragCheckDone, setDragCheckDone] = useState<Record<string, boolean>>({});
  const [visitedSlides, setVisitedSlides] = useState<Record<string, true>>(() =>
    parsed.slides[0] ? { [parsed.slides[0].id]: true } : {},
  );
  const [popup, setPopup] = useState<{
    title?: string;
    body?: string;
    image_url?: string;
    video_url?: string;
  } | null>(null);

  useEffect(() => {
    const firstId = parsed.slides[0]?.id;
    queueMicrotask(() => {
      setActiveSlideIndex(0);
      setVisibleBySlide(
        Object.fromEntries(
          parsed.slides.map((slide) => [
            slide.id,
            Object.fromEntries(slide.elements.map((el) => [el.id, el.visible !== false])),
          ]),
        ),
      );
      setFreeDragPos({});
      setDragCheckDone({});
      setVisitedSlides(firstId ? { [firstId]: true } : {});
      setPopup(null);
    });
  }, [parsed]);

  const slide = parsed.slides[activeSlideIndex] ?? parsed.slides[0];
  const dragStartRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  function setSlide(nextIndex: number) {
    const clamped = Math.max(0, Math.min(parsed.slides.length - 1, nextIndex));
    const nextSlide = parsed.slides[clamped];
    if (!nextSlide) return;
    setActiveSlideIndex(clamped);
    setVisitedSlides((prev) => ({ ...prev, [nextSlide.id]: true }));
  }

  const runPassCheck = useCallback(
    (nextDragDone?: Record<string, boolean>, nextVisited?: Record<string, true>) => {
      if (passed) return;
      if (
        isPresentationInteractionPassSatisfied({
          pass_rule: parsed.pass_rule,
          slides: parsed.slides,
          dragCheckDone: nextDragDone ?? dragCheckDone,
          visitedSlides: nextVisited ?? visitedSlides,
        })
      ) {
        onPass();
      }
    },
    [passed, parsed.pass_rule, parsed.slides, dragCheckDone, visitedSlides, onPass],
  );

  function toggleVisibility(slideId: string, elementId: string, mode: "show" | "hide" | "toggle") {
    setVisibleBySlide((prev) => {
      const currentSlide = prev[slideId] ?? {};
      const current = currentSlide[elementId] ?? true;
      const nextValue = mode === "show" ? true : mode === "hide" ? false : !current;
      return {
        ...prev,
        [slideId]: { ...currentSlide, [elementId]: nextValue },
      };
    });
  }

  function applyAction(
    action: NonNullable<Extract<ScreenPayload, { type: "interaction"; subtype: "presentation_interactive" }>["slides"][number]["elements"][number]["actions"]>[number],
  ) {
    if (!slide) return;
    if (action.type === "info_popup") {
      setPopup({
        title: action.title,
        body: action.body,
        image_url: action.image_url,
        video_url: action.video_url,
      });
      return;
    }
    if (action.type === "navigate_slide") {
      if (action.target === "next") setSlide(activeSlideIndex + 1);
      else if (action.target === "prev") setSlide(activeSlideIndex - 1);
      else if (action.target === "slide_id") {
        const idx = parsed.slides.findIndex((s) => s.id === action.slide_id);
        if (idx >= 0) setSlide(idx);
      }
      return;
    }
    if (action.type === "show_element") toggleVisibility(slide.id, action.element_id, "show");
    if (action.type === "hide_element") toggleVisibility(slide.id, action.element_id, "hide");
    if (action.type === "toggle_element") toggleVisibility(slide.id, action.element_id, "toggle");
  }

  useEffect(() => {
    if (!slide) return;
    function onMove(e: PointerEvent) {
      const drag = dragStartRef.current;
      const rect = stageRef.current?.getBoundingClientRect();
      if (!drag || !rect) return;
      const el = slide.elements.find((x) => x.id === drag.id);
      if (!el) return;
      const nx = ((e.clientX - rect.left - drag.dx) / rect.width) * 100;
      const ny = ((e.clientY - rect.top - drag.dy) / rect.height) * 100;
      setFreeDragPos((prev) => ({
        ...prev,
        [drag.id]: {
          x_percent: Math.max(0, Math.min(100 - el.w_percent, nx)),
          y_percent: Math.max(0, Math.min(100 - el.h_percent, ny)),
        },
      }));
    }
    function onUp() {
      const drag = dragStartRef.current;
      if (!drag) return;
      const dragged = slide.elements.find((x) => x.id === drag.id);
      if (
        dragged &&
        dragged.draggable_mode === "check_target" &&
        dragged.drop_target_id
      ) {
        const pos = freeDragPos[dragged.id] ?? { x_percent: dragged.x_percent, y_percent: dragged.y_percent };
        const target = slide.elements.find((x) => x.id === dragged.drop_target_id);
        if (target) {
          const cx = pos.x_percent + dragged.w_percent / 2;
          const cy = pos.y_percent + dragged.h_percent / 2;
          const hit =
            cx >= target.x_percent &&
            cx <= target.x_percent + target.w_percent &&
            cy >= target.y_percent &&
            cy <= target.y_percent + target.h_percent;
          if (hit) {
            setDragCheckDone((prev) => {
              const next = { ...prev, [dragged.id]: true };
              runPassCheck(next);
              return next;
            });
          } else {
            onWrong();
          }
        }
      }
      dragStartRef.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [freeDragPos, onWrong, slide, passed, runPassCheck]);

  useEffect(() => {
    runPassCheck(undefined, visitedSlides);
  }, [visitedSlides, runPassCheck]);

  if (!slide) return null;

  return (
    <div>
      <KidPanel>
        {parsed.title ? <p className="mb-1 text-xl font-bold text-kid-ink">{parsed.title}</p> : null}
        {parsed.body_text ? <p className="mb-3 text-base text-kid-ink">{parsed.body_text}</p> : null}
        <div className="mb-2 flex items-center justify-between text-sm font-semibold text-kid-ink">
          <span>{slide.title || `Slide ${activeSlideIndex + 1}`}</span>
          <span>
            {activeSlideIndex + 1} / {parsed.slides.length}
          </span>
        </div>
        <div
          ref={stageRef}
          className="relative aspect-video w-full overflow-hidden rounded-lg border-4 border-kid-ink bg-white"
          style={{
            backgroundColor: slide.background_color ?? "#ffffff",
          }}
        >
          <div className="absolute inset-0 z-0">
            {slide.video_url?.trim() ? (
              <video
                src={slide.video_url.trim()}
                controls
                playsInline
                className={
                  (slide.image_fit ?? "cover") === "contain" ?
                    "h-full w-full object-contain"
                  : "h-full w-full object-cover"
                }
              />
            ) : slide.background_image_url ? (
              <Image
                src={slide.background_image_url}
                alt=""
                fill
                className={(slide.image_fit ?? "cover") === "contain" ? "object-contain" : "object-cover"}
                unoptimized={unopt(slide.background_image_url)}
              />
            ) : null}
          </div>
          {slide.elements
            .filter((el) => (visibleBySlide[slide.id]?.[el.id] ?? el.visible ?? true))
            .sort((a, b) => (a.z_index ?? 0) - (b.z_index ?? 0))
            .map((el) => {
              const pos = freeDragPos[el.id] ?? { x_percent: el.x_percent, y_percent: el.y_percent };
              const draggable = el.draggable_mode === "free" || el.draggable_mode === "check_target";
              return (
                <button
                  key={el.id}
                  type="button"
                  className={clsx(
                    "absolute z-[1] overflow-hidden rounded border-2 text-left",
                    el.kind === "button" ? "border-kid-accent bg-kid-accent/30" : "border-kid-ink/50 bg-white/40",
                    dragCheckDone[el.id] && "border-kid-success bg-kid-success/30",
                  )}
                  style={{
                    left: `${pos.x_percent}%`,
                    top: `${pos.y_percent}%`,
                    width: `${el.w_percent}%`,
                    height: `${el.h_percent}%`,
                    zIndex: el.z_index ?? 0,
                    color: el.color_hex ?? undefined,
                  }}
                  onPointerDown={(e) => {
                    if (!draggable || passed) return;
                    const rect = stageRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    dragStartRef.current = {
                      id: el.id,
                      dx: e.clientX - rect.left - (pos.x_percent / 100) * rect.width,
                      dy: e.clientY - rect.top - (pos.y_percent / 100) * rect.height,
                    };
                  }}
                  onClick={() => {
                    if (passed) return;
                    playSfx("tap", muted);
                    for (const action of el.actions ?? []) applyAction(action);
                  }}
                >
                  {el.image_url ? (
                    <Image
                      src={el.image_url}
                      alt={el.label ?? ""}
                      fill
                      className="object-cover"
                      unoptimized={unopt(el.image_url)}
                    />
                  ) : (
                    <span className="line-clamp-2 p-1 text-xs font-semibold text-kid-ink">
                      {el.text || el.label || el.kind}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <KidButton type="button" variant="secondary" onClick={() => setSlide(activeSlideIndex - 1)} disabled={activeSlideIndex <= 0}>
            Prev slide
          </KidButton>
          <KidButton
            type="button"
            variant="secondary"
            onClick={() => setSlide(activeSlideIndex + 1)}
            disabled={activeSlideIndex >= parsed.slides.length - 1}
          >
            Next slide
          </KidButton>
        </div>
      </KidPanel>
      {popup ? (
        <KidPanel className="mt-4 border-kid-accent bg-kid-accent/10">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-2">
              {popup.title ? <p className="text-lg font-bold text-kid-ink">{popup.title}</p> : null}
              {popup.body ? <p className="text-sm text-kid-ink">{popup.body}</p> : null}
              {popup.image_url ? (
                <div className="relative h-40 w-full max-w-sm overflow-hidden rounded border-2 border-kid-ink">
                  <Image src={popup.image_url} alt="" fill className="object-cover" unoptimized={unopt(popup.image_url)} />
                </div>
              ) : null}
              {popup.video_url ? (
                <video controls src={popup.video_url} className="w-full max-w-sm rounded border-2 border-kid-ink" />
              ) : null}
            </div>
            <KidButton type="button" variant="secondary" onClick={() => setPopup(null)}>
              Close
            </KidButton>
          </div>
        </KidPanel>
      ) : null}
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
