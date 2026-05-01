"use client";

import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import type { LessonScreenRow } from "@/lib/data/catalog";

const PREVIEW_MIN_W = 360;
const PREVIEW_MIN_H = 280;

type Prefs = { x: number; y: number; w: number; h: number };

function loadPrefs(lessonId: string): Prefs {
  if (typeof window === "undefined") {
    return { x: 80, y: 80, w: 720, h: 540 };
  }
  try {
    const raw = window.localStorage.getItem(`lesson-editor-preview:${lessonId}`);
    if (!raw) return { x: 80, y: 80, w: 720, h: 540 };
    const p = JSON.parse(raw) as Partial<Prefs>;
    return {
      x: typeof p.x === "number" ? p.x : 80,
      y: typeof p.y === "number" ? p.y : 80,
      w: typeof p.w === "number" ? Math.max(PREVIEW_MIN_W, p.w) : 720,
      h: typeof p.h === "number" ? Math.max(PREVIEW_MIN_H, p.h) : 540,
    };
  } catch {
    return { x: 80, y: 80, w: 720, h: 540 };
  }
}

function savePrefs(lessonId: string, p: Prefs) {
  try {
    window.localStorage.setItem(`lesson-editor-preview:${lessonId}`, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

type Props = {
  open: boolean;
  onClose: () => void;
  lessonId: string;
  lessonTitle: string;
  screens: LessonScreenRow[];
  initialScreenIndex: number;
};

function LessonPreviewOverlayPortal({
  onClose,
  lessonId,
  lessonTitle,
  screens,
  initialScreenIndex,
}: Props) {
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs(lessonId));
  const dragRef = useRef<{
    kind: "move" | "resize";
    startX: number;
    startY: number;
    orig: Prefs;
  } | null>(null);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (d.kind === "move") {
        const next = {
          ...d.orig,
          x: Math.max(8, d.orig.x + dx),
          y: Math.max(8, d.orig.y + dy),
        };
        setPrefs(next);
        return;
      }
      const next = {
        ...d.orig,
        w: Math.max(PREVIEW_MIN_W, d.orig.w + dx),
        h: Math.max(PREVIEW_MIN_H, d.orig.h + dy),
      };
      setPrefs(next);
    },
    [],
  );

  const endDrag = useCallback(() => {
    if (dragRef.current) {
      dragRef.current = null;
      setPrefs((p) => {
        savePrefs(lessonId, p);
        return p;
      });
    }
  }, [lessonId]);

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [onPointerMove, endDrag]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100]"
      style={{ isolation: "isolate" }}
    >
      <div
        className="pointer-events-auto absolute flex flex-col overflow-hidden rounded-lg border-2 border-neutral-800 bg-white shadow-2xl"
        style={{
          left: prefs.x,
          top: prefs.y,
          width: prefs.w,
          height: prefs.h,
          maxWidth: "calc(100vw - 16px)",
          maxHeight: "calc(100vh - 16px)",
        }}
      >
        <div
          className="flex cursor-move select-none items-center justify-between border-b border-neutral-200 bg-neutral-100 px-2 py-1.5"
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest("button")) return;
            e.preventDefault();
            dragRef.current = {
              kind: "move",
              startX: e.clientX,
              startY: e.clientY,
              orig: { ...prefs },
            };
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
        >
          <span className="text-xs font-semibold text-neutral-800">Student preview</span>
          <button
            type="button"
            className="rounded border border-neutral-300 bg-white px-2 py-0.5 text-xs font-semibold hover:bg-neutral-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-amber-50/40 p-2">
          {screens.length > 0 ? (
            <LessonPlayer
              key={`${lessonId}-${initialScreenIndex}`}
              mode="preview"
              lessonId={lessonId}
              lessonTitle={lessonTitle}
              screens={screens}
              initialScreenIndex={initialScreenIndex}
            />
          ) : (
            <p className="text-sm text-neutral-600">No screens.</p>
          )}
        </div>
        <button
          type="button"
          aria-label="Resize preview"
          className="pointer-events-auto absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize bg-neutral-400/80 hover:bg-sky-400"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            dragRef.current = {
              kind: "resize",
              startX: e.clientX,
              startY: e.clientY,
              orig: { ...prefs },
            };
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
        />
      </div>
    </div>
  );
}

export function LessonPreviewOverlay(props: Props) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!isClient || !props.open) return null;

  return createPortal(<LessonPreviewOverlayPortal {...props} />, document.body);
}
