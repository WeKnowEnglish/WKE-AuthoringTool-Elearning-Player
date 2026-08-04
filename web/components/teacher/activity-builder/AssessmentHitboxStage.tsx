"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";

export type AssessmentHitboxRect = {
  id: string;
  label: string;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  /** Extra text after the label (e.g. linked name). */
  detail?: string;
  /** Optional colour accent on the label chip. */
  accentHex?: string;
};

type Geometry = Pick<
  AssessmentHitboxRect,
  "xPercent" | "yPercent" | "widthPercent" | "heightPercent"
>;

type Props = {
  imageSrc: string;
  imageAlt: string;
  emptyHint: string;
  targets: AssessmentHitboxRect[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPatchGeometry: (id: string, next: Geometry) => void;
  /** Tailwind aspect class; default Flyers-friendly 16/10. */
  aspectClassName?: string;
  hint?: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function patchHitboxGeometry(
  current: Geometry,
  next: Partial<Geometry>,
): Geometry {
  const widthPercent = clamp(next.widthPercent ?? current.widthPercent, 4, 100);
  const heightPercent = clamp(
    next.heightPercent ?? current.heightPercent,
    4,
    100,
  );
  const xPercent = clamp(next.xPercent ?? current.xPercent, 0, 100 - widthPercent);
  const yPercent = clamp(
    next.yPercent ?? current.yPercent,
    0,
    100 - heightPercent,
  );
  return {
    xPercent: round1(xPercent),
    yPercent: round1(yPercent),
    widthPercent: round1(widthPercent),
    heightPercent: round1(heightPercent),
  };
}

type StageSurfaceProps = {
  stageRef: RefObject<HTMLDivElement | null>;
  imageSrc: string;
  imageAlt: string;
  emptyHint: string;
  targets: AssessmentHitboxRect[];
  selectedId: string | null;
  aspectClassName: string;
  className?: string;
  onSelect: (id: string) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  beginMove: (
    event: ReactPointerEvent<HTMLElement>,
    target: AssessmentHitboxRect,
  ) => void;
  beginResize: (
    event: ReactPointerEvent<HTMLButtonElement>,
    target: AssessmentHitboxRect,
  ) => void;
};

function StageSurface({
  stageRef,
  imageSrc,
  imageAlt,
  emptyHint,
  targets,
  selectedId,
  aspectClassName,
  className = "",
  onSelect,
  onPointerMove,
  onPointerUp,
  beginMove,
  beginResize,
}: StageSurfaceProps) {
  return (
    <div
      ref={stageRef}
      className={`relative w-full overflow-hidden rounded-xl border-2 border-stone-300 bg-white ${aspectClassName} ${className}`}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- authoring preview; URLs are teacher-controlled
        <img
          src={imageSrc}
          alt={imageAlt || "Scene"}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
      ) : (
        <p className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-stone-400">
          {emptyHint}
        </p>
      )}
      {targets.map((row) => {
        const selected = row.id === selectedId;
        return (
          <div
            key={row.id}
            role="button"
            tabIndex={0}
            aria-label={`Hitbox ${row.label}`}
            onClick={() => onSelect(row.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(row.id);
              }
            }}
            onPointerDown={(event) => {
              if (!selected) {
                onSelect(row.id);
                return;
              }
              beginMove(event, row);
            }}
            className={`absolute flex items-start justify-start border-2 border-dashed ${
              selected
                ? "z-20 cursor-move border-violet-700 bg-violet-500/20"
                : "z-10 border-[#17375e] bg-white/10 hover:bg-white/25"
            }`}
            style={{
              left: `${row.xPercent}%`,
              top: `${row.yPercent}%`,
              width: `${row.widthPercent}%`,
              height: `${row.heightPercent}%`,
            }}
          >
            <span
              className="m-0.5 max-w-full truncate rounded bg-white/90 px-1 py-0.5 text-[9px] font-black text-stone-800"
              style={
                row.accentHex
                  ? { boxShadow: `inset 0 0 0 2px ${row.accentHex}` }
                  : undefined
              }
            >
              {row.label}
              {row.detail ? ` · ${row.detail}` : ""}
            </span>
            {selected ? (
              <button
                type="button"
                aria-label="Resize hitbox"
                className="absolute bottom-0 right-0 h-3.5 w-3.5 cursor-se-resize rounded-sm border border-violet-800 bg-violet-600"
                onPointerDown={(event) => beginResize(event, row)}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function FocusOverlay({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-stone-950/55 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Hitbox editor"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-full w-full max-w-5xl flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3 shadow-xl sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-stone-600">
            Hitbox focus
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close hitbox focus"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
        <p className="text-[10px] font-semibold text-stone-500">
          Drag to move · corner handle to resize · Esc to close
        </p>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Scene image + draggable/resizable hitboxes, with optional full-viewport focus mode
 * for precise placement in the narrow Assessment inspector.
 */
export function AssessmentHitboxStage({
  imageSrc,
  imageAlt,
  emptyHint,
  targets,
  selectedId,
  onSelect,
  onPatchGeometry,
  aspectClassName = "aspect-[16/10]",
  hint = "Select a hitbox, drag to move, corner handle to resize.",
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const inlineRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: "move" | "resize";
    pointerId: number;
    startX: number;
    startY: number;
    origin: Geometry & { id: string };
    stage: "inline" | "focus";
  } | null>(null);

  const activeStageRef = () =>
    dragRef.current?.stage === "focus" ? focusRef : inlineRef;

  const onStagePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const stage = activeStageRef().current;
    if (!drag || !stage || drag.pointerId !== event.pointerId) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const dx = ((event.clientX - drag.startX) / rect.width) * 100;
    const dy = ((event.clientY - drag.startY) / rect.height) * 100;
    if (drag.mode === "move") {
      onPatchGeometry(
        drag.origin.id,
        patchHitboxGeometry(drag.origin, {
          xPercent: drag.origin.xPercent + dx,
          yPercent: drag.origin.yPercent + dy,
        }),
      );
      return;
    }
    onPatchGeometry(
      drag.origin.id,
      patchHitboxGeometry(drag.origin, {
        widthPercent: drag.origin.widthPercent + dx,
        heightPercent: drag.origin.heightPercent + dy,
      }),
    );
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };

  const beginMove = (
    event: ReactPointerEvent<HTMLElement>,
    target: AssessmentHitboxRect,
    stage: "inline" | "focus",
  ) => {
    event.preventDefault();
    const stageEl = stage === "focus" ? focusRef.current : inlineRef.current;
    stageEl?.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode: "move",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: {
        id: target.id,
        xPercent: target.xPercent,
        yPercent: target.yPercent,
        widthPercent: target.widthPercent,
        heightPercent: target.heightPercent,
      },
      stage,
    };
  };

  const beginResize = (
    event: ReactPointerEvent<HTMLButtonElement>,
    target: AssessmentHitboxRect,
    stage: "inline" | "focus",
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const stageEl = stage === "focus" ? focusRef.current : inlineRef.current;
    stageEl?.setPointerCapture(event.pointerId);
    dragRef.current = {
      mode: "resize",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: {
        id: target.id,
        xPercent: target.xPercent,
        yPercent: target.yPercent,
        widthPercent: target.widthPercent,
        heightPercent: target.heightPercent,
      },
      stage,
    };
  };

  const surface = (stage: "inline" | "focus", className?: string) => (
    <StageSurface
      stageRef={stage === "focus" ? focusRef : inlineRef}
      imageSrc={imageSrc}
      imageAlt={imageAlt}
      emptyHint={emptyHint}
      targets={targets}
      selectedId={selectedId}
      aspectClassName={
        stage === "focus"
          ? "min-h-[min(60vh,520px)] aspect-[16/10]"
          : aspectClassName
      }
      className={className}
      onSelect={onSelect}
      onPointerMove={onStagePointerMove}
      onPointerUp={endDrag}
      beginMove={(event, target) => beginMove(event, target, stage)}
      beginResize={(event, target) => beginResize(event, target, stage)}
    />
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold text-stone-700">Scene hitboxes</p>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2 py-1 text-[10px] font-bold text-stone-700 hover:bg-stone-100"
        >
          <Maximize2 className="h-3 w-3" />
          Expand
        </button>
      </div>
      {surface("inline")}
      <p className="text-[10px] font-semibold text-stone-500">{hint}</p>
      <FocusOverlay open={expanded} onClose={() => setExpanded(false)}>
        {surface("focus", "border-stone-400")}
      </FocusOverlay>
    </div>
  );
}
