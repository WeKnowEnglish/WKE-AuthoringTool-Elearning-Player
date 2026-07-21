"use client";

import { useMutation, useStorage } from "@liveblocks/react/suspense";
import { useCallback, useRef, useState } from "react";
import {
  WORD_CARD_CANVAS_HEIGHT,
  WORD_CARD_CANVAS_WIDTH,
  type WordCardsDrawing,
  type WordCardsStroke,
} from "@/lib/word-cards/liveblocks/types";

type Props = {
  cardId: string;
  canEdit: boolean;
};

function readDrawing(cards: unknown, cardId: string): WordCardsDrawing {
  if (!cards || typeof cards !== "object") return { strokes: [] };
  const map = cards as { get?: (id: string) => unknown };
  const raw = typeof map.get === "function" ? map.get(cardId) : null;
  if (!raw || typeof raw !== "object") return { strokes: [] };
  const card = raw as { get?: (k: string) => unknown; drawing?: WordCardsDrawing };
  const drawing =
    typeof card.get === "function"
      ? (card.get("drawing") as WordCardsDrawing | null)
      : card.drawing;
  if (!drawing || !Array.isArray(drawing.strokes)) return { strokes: [] };
  return drawing;
}

function pointsToPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  return `M ${first!.x} ${first!.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(" ")}`;
}

export function WordCardsMiniCanvas({ cardId, canEdit }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drawingRef = useRef(false);
  const pointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const [localStroke, setLocalStroke] = useState<Array<{ x: number; y: number }> | null>(null);

  const strokes = useStorage((root) => {
    const cards = (root as { cards?: unknown }).cards;
    return readDrawing(cards, cardId).strokes;
  });

  const appendStroke = useMutation(
    ({ storage }, stroke: WordCardsStroke) => {
      const cards = storage.get("cards" as never) as unknown as {
        get: (id: string) => { get: (k: string) => unknown; set: (k: string, v: unknown) => void } | undefined;
      };
      const card = cards?.get(cardId);
      if (!card) return;
      const current = (card.get("drawing") as WordCardsDrawing | null) ?? { strokes: [] };
      card.set("drawing", { strokes: [...(current.strokes ?? []), stroke] });
    },
    [cardId],
  );

  const clearDrawing = useMutation(
    ({ storage }) => {
      const cards = storage.get("cards" as never) as unknown as {
        get: (id: string) => { set: (k: string, v: unknown) => void } | undefined;
      };
      cards?.get(cardId)?.set("drawing", { strokes: [] });
    },
    [cardId],
  );

  const undoStroke = useMutation(
    ({ storage }) => {
      const cards = storage.get("cards" as never) as unknown as {
        get: (id: string) => { get: (k: string) => unknown; set: (k: string, v: unknown) => void } | undefined;
      };
      const card = cards?.get(cardId);
      if (!card) return;
      const current = (card.get("drawing") as WordCardsDrawing | null) ?? { strokes: [] };
      card.set("drawing", { strokes: (current.strokes ?? []).slice(0, -1) });
    },
    [cardId],
  );

  const toLogical = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WORD_CARD_CANVAS_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * WORD_CARD_CANVAS_HEIGHT;
    return {
      x: Math.max(0, Math.min(WORD_CARD_CANVAS_WIDTH, x)),
      y: Math.max(0, Math.min(WORD_CARD_CANVAS_HEIGHT, y)),
    };
  }, []);

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!canEdit) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    pointsRef.current = [toLogical(event)];
    setLocalStroke([...pointsRef.current]);
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drawingRef.current) return;
    pointsRef.current.push(toLogical(event));
    setLocalStroke([...pointsRef.current]);
  };

  const onPointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const points = pointsRef.current;
    pointsRef.current = [];
    setLocalStroke(null);
    if (points.length < 2) return;
    appendStroke({
      id: `stroke_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      color: "#0f172a",
      width: 3,
      points,
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-700">Drawing</span>
        {canEdit && (
          <>
            <button
              type="button"
              onClick={() => undoStroke()}
              className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-800"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Clear the drawing?")) clearDrawing();
              }}
              className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-800"
            >
              Clear
            </button>
          </>
        )}
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WORD_CARD_CANVAS_WIDTH} ${WORD_CARD_CANVAS_HEIGHT}`}
        className={`w-full rounded-lg border border-slate-200 bg-white ${
          canEdit ? "touch-none cursor-crosshair" : ""
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <rect
          width={WORD_CARD_CANVAS_WIDTH}
          height={WORD_CARD_CANVAS_HEIGHT}
          fill="#fafafa"
        />
        {strokes.map((stroke) => (
          <path
            key={stroke.id}
            d={pointsToPath(stroke.points)}
            fill="none"
            stroke={stroke.color}
            strokeWidth={stroke.width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {localStroke && localStroke.length > 1 && (
          <path
            d={pointsToPath(localStroke)}
            fill="none"
            stroke="#0f172a"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.7}
          />
        )}
      </svg>
    </div>
  );
}
