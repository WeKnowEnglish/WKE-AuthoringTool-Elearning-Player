"use client";

import { clsx } from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { STICKER_LIBRARY } from "@/lib/progress/sticker-library";
import type { PlacedSticker } from "@/lib/student-hub/sticker-book-types";
import {
  clampImagePercent,
  clientToImagePercents,
  containedImageRect,
  type ContainedImageRect,
} from "@/lib/student-hub/sticker-scene-geometry";

type DragSession = {
  instanceId: string;
  startClientX: number;
  startClientY: number;
  origX: number;
  origY: number;
};

type Props = {
  backgroundUrl: string;
  placements: PlacedSticker[];
  selectedInstanceId: string | null;
  onPlacementsChange: (next: PlacedSticker[]) => void;
  onSelectInstance: (instanceId: string | null) => void;
  onTapStage: (xPercent: number, yPercent: number) => void;
  /** When true, canvas fills parent height instead of a fixed aspect ratio. */
  fill?: boolean;
  className?: string;
};

export function StickerSceneCanvas({
  backgroundUrl,
  placements,
  selectedInstanceId,
  onPlacementsChange,
  onSelectInstance,
  onTapStage,
  fill = false,
  className,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<DragSession | null>(null);
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(null);
  const [contentRect, setContentRect] = useState<ContainedImageRect | null>(null);

  const measureContent = useCallback(() => {
    const stage = stageRef.current;
    const img = imgRef.current;
    if (!stage || !img?.naturalWidth || !img.naturalHeight) return;
    const { width, height } = stage.getBoundingClientRect();
    setContentRect(containedImageRect(width, height, img.naturalWidth, img.naturalHeight));
  }, []);

  useEffect(() => {
    setImageSize(null);
    setContentRect(null);
  }, [backgroundUrl]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    measureContent();
    const ro = new ResizeObserver(() => measureContent());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [measureContent, imageSize]);

  const pointerToPercent = useCallback(
    (clientX: number, clientY: number) => {
      const stage = stageRef.current;
      const img = imgRef.current;
      if (!stage || !img?.naturalWidth) return null;
      const raw = clientToImagePercents(
        clientX,
        clientY,
        stage.getBoundingClientRect(),
        img.naturalWidth,
        img.naturalHeight,
      );
      if (!raw) return null;
      return {
        xPercent: clampImagePercent(raw.xPercent),
        yPercent: clampImagePercent(raw.yPercent),
      };
    },
    [],
  );

  const updatePlacement = useCallback(
    (instanceId: string, patch: Partial<PlacedSticker>) => {
      onPlacementsChange(
        placements.map((p) => (p.instanceId === instanceId ? { ...p, ...patch } : p)),
      );
    },
    [onPlacementsChange, placements],
  );

  const onImageAreaPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      const pt = pointerToPercent(e.clientX, e.clientY);
      if (!pt) return;
      onSelectInstance(null);
      onTapStage(pt.xPercent, pt.yPercent);
    },
    [onSelectInstance, onTapStage, pointerToPercent],
  );

  const onStickerPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>, instanceId: string) => {
      e.stopPropagation();
      const placement = placements.find((p) => p.instanceId === instanceId);
      if (!placement) return;
      onSelectInstance(instanceId);
      dragRef.current = {
        instanceId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        origX: placement.xPercent,
        origY: placement.yPercent,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [onSelectInstance, placements],
  );

  const onStickerPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const sess = dragRef.current;
      const stage = stageRef.current;
      const img = imgRef.current;
      if (!sess || !stage || !img?.naturalWidth || !contentRect?.width) return;
      const start = clientToImagePercents(
        sess.startClientX,
        sess.startClientY,
        stage.getBoundingClientRect(),
        img.naturalWidth,
        img.naturalHeight,
      );
      const now = clientToImagePercents(
        e.clientX,
        e.clientY,
        stage.getBoundingClientRect(),
        img.naturalWidth,
        img.naturalHeight,
      );
      if (!start || !now) return;
      updatePlacement(sess.instanceId, {
        xPercent: clampImagePercent(sess.origX + (now.xPercent - start.xPercent)),
        yPercent: clampImagePercent(sess.origY + (now.yPercent - start.yPercent)),
      });
    },
    [contentRect?.width, updatePlacement],
  );

  const onStickerPointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  }, []);

  return (
    <div
      ref={stageRef}
      className={clsx(
        "relative flex w-full items-center justify-center overflow-hidden rounded-2xl border-4 border-kid-ink bg-kid-surface shadow-[4px_4px_0_#1a1a1a]",
        fill ? "h-full min-h-0" : "aspect-[4/3]",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={backgroundUrl}
        alt=""
        draggable={false}
        className="max-h-full max-w-full object-contain select-none"
        onLoad={(e) => {
          const el = e.currentTarget;
          setImageSize({ w: el.naturalWidth, h: el.naturalHeight });
          measureContent();
        }}
      />

      {contentRect && contentRect.width > 0 ? (
        <div
          role="img"
          aria-label="Sticker scene — tap the picture to place a sticker, drag stickers to move them"
          className="absolute touch-none"
          style={{
            left: contentRect.left,
            top: contentRect.top,
            width: contentRect.width,
            height: contentRect.height,
          }}
          onPointerDown={onImageAreaPointerDown}
        >
          {placements.map((p) => {
            const def = STICKER_LIBRARY.find((s) => s.id === p.stickerId);
            if (!def) return null;
            const selected = selectedInstanceId === p.instanceId;
            const sizeRem = 2.25 * p.scale;
            return (
              <button
                key={p.instanceId}
                type="button"
                aria-label={`${def.label} sticker${selected ? ", selected" : ""}`}
                aria-pressed={selected}
                className={clsx(
                  "absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-grab border-0 bg-transparent p-0 leading-none active:cursor-grabbing [touch-action:none]",
                  selected &&
                    "z-20 rounded-lg ring-4 ring-[#0f4ecf] ring-offset-2 ring-offset-transparent",
                )}
                style={{
                  left: `${p.xPercent}%`,
                  top: `${p.yPercent}%`,
                  fontSize: `${sizeRem}rem`,
                }}
                onPointerDown={(e) => onStickerPointerDown(e, p.instanceId)}
                onPointerMove={onStickerPointerMove}
                onPointerUp={onStickerPointerUp}
                onPointerCancel={onStickerPointerUp}
              >
                <span aria-hidden>{def.emoji}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
