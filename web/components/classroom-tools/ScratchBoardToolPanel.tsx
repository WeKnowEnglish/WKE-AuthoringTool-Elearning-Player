"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

type Point = { x: number; y: number };
type Stroke = {
  points: Point[];
  color: string;
  width: number;
  erase: boolean;
};

const COLORS = ["#18181b", "#dc2626", "#2563eb", "#16a34a", "#ca8a04"] as const;
const WIDTHS = [2, 4, 8] as const;

/** Survives tool switches / minimize while the teacher app stays loaded. */
let scratchStrokes: Stroke[] = [];

function redraw(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strokes: Stroke[],
) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue;
    ctx.beginPath();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = stroke.width;
    ctx.strokeStyle = stroke.erase ? "#ffffff" : stroke.color;
    ctx.globalCompositeOperation = stroke.erase ? "destination-out" : "source-over";
    // destination-out needs opaque stroke; use source-over white for erase on white bg
    if (stroke.erase) {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#ffffff";
    }
    ctx.moveTo(stroke.points[0]!.x, stroke.points[0]!.y);
    for (let i = 1; i < stroke.points.length; i += 1) {
      ctx.lineTo(stroke.points[i]!.x, stroke.points[i]!.y);
    }
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";
}

/**
 * Local-only scratch board for screen-sharing (Zoom/Meet/etc.).
 * No Liveblocks, websockets, or student join — teacher drawing only.
 */
export function ScratchBoardToolPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState<(typeof COLORS)[number]>("#18181b");
  const [width, setWidth] = useState<(typeof WIDTHS)[number]>(4);
  const [erase, setErase] = useState(false);
  const drawingRef = useRef<Stroke | null>(null);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    redraw(ctx, canvas.width, canvas.height, scratchStrokes);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const w = Math.max(280, Math.floor(parent?.clientWidth ?? 320));
    const h = 220;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    paint();
  }, [paint]);

  const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const stroke: Stroke = {
      points: [pointFromEvent(event)],
      color,
      width,
      erase,
    };
    drawingRef.current = stroke;
    scratchStrokes = [...scratchStrokes, stroke];
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const stroke = drawingRef.current;
    if (!stroke) return;
    stroke.points.push(pointFromEvent(event));
    paint();
  };

  const onPointerUp = () => {
    drawingRef.current = null;
    paint();
  };

  const clearBoard = () => {
    scratchStrokes = [];
    drawingRef.current = null;
    paint();
  };

  const undo = () => {
    scratchStrokes = scratchStrokes.slice(0, -1);
    paint();
  };

  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-sm font-semibold text-stone-900">Scratch board</h2>
        <p className="text-[11px] text-stone-500">
          Local only — for screen share. Nothing syncs to students.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Color ${c}`}
            className={`h-6 w-6 rounded-full border-2 ${
              !erase && color === c ? "border-stone-900" : "border-stone-200"
            }`}
            style={{ backgroundColor: c }}
            onClick={() => {
              setColor(c);
              setErase(false);
            }}
          />
        ))}
        <button
          type="button"
          className={`rounded-md px-2 py-1 text-[11px] font-bold ${
            erase ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700"
          }`}
          onClick={() => setErase(true)}
        >
          Eraser
        </button>
        {WIDTHS.map((w) => (
          <button
            key={w}
            type="button"
            className={`rounded-md px-2 py-1 text-[11px] font-bold ${
              width === w ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700"
            }`}
            onClick={() => setWidth(w)}
          >
            {w}px
          </button>
        ))}
        <button
          type="button"
          className="rounded-md bg-stone-100 px-2 py-1 text-[11px] font-bold text-stone-700"
          onClick={undo}
        >
          Undo
        </button>
        <button
          type="button"
          className="rounded-md bg-stone-100 px-2 py-1 text-[11px] font-bold text-stone-700"
          onClick={clearBoard}
        >
          Clear
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-300 bg-white">
        <canvas
          ref={canvasRef}
          className="block w-full touch-none cursor-crosshair"
          style={{ height: 220 }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
    </section>
  );
}

export function clearScratchBoardMemory() {
  scratchStrokes = [];
}
