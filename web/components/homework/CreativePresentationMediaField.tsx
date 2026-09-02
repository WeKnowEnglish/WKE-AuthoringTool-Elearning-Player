"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ImagePlus, Pencil, RotateCcw, Save, Undo2, X } from "lucide-react";
import { saveHomeworkCollectionMedia } from "@/lib/actions/homework-collection-media";

type Point = { x: number; y: number };
type Stroke = { points: Point[]; erase: boolean };

export function CreativePresentationMediaField({
  homeworkId,
  partId,
  slotId,
  value,
  onChange,
  previewMode = false,
  compact = false,
}: {
  homeworkId?: string;
  partId: string;
  slotId: string;
  value: string;
  onChange: (value: string) => void;
  previewMode?: boolean;
  compact?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentStroke = useRef<Stroke | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [erase, setErase] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const paintCanvas = useCallback((next: Stroke[]) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (const stroke of next) {
      if (stroke.points.length < 2) continue;
      context.beginPath();
      context.moveTo(stroke.points[0]!.x, stroke.points[0]!.y);
      stroke.points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
      context.strokeStyle = stroke.erase ? "#ffffff" : "#17343a";
      context.lineWidth = stroke.erase ? 24 : 6;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.stroke();
    }
  }, []);

  useEffect(() => {
    if (!drawing) return;
    const frame = requestAnimationFrame(() => paintCanvas(strokes));
    return () => cancelAnimationFrame(frame);
  }, [drawing, paintCanvas, strokes]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const uploadFile = (file: File) => {
    setNotice(null);
    if (previewMode || !homeworkId) {
      const reader = new FileReader();
      reader.onload = () => onChange(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => setNotice("Could not open this picture.");
      reader.readAsDataURL(file);
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("homework_id", homeworkId);
      formData.set("part_id", partId);
      formData.set("slot_id", slotId);
      formData.set("file", file);
      const result = await saveHomeworkCollectionMedia(formData);
      if (!result.ok) {
        setNotice(result.error);
        return;
      }
      onChange(result.url);
      setDrawing(false);
    });
  };

  const saveDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) {
        setNotice("Could not save this drawing.");
        return;
      }
      uploadFile(new File([blob], "vlog-drawing.png", { type: "image/png" }));
      if (previewMode || !homeworkId) setDrawing(false);
    }, "image/png");
  };

  if (drawing) {
    return (
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-extrabold text-teal-950">Draw your picture</p>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setErase(false)} className={`min-h-10 rounded-lg px-3 text-xs font-bold ${!erase ? "bg-teal-700 text-white" : "bg-white text-stone-700"}`}>Pen</button>
            <button type="button" onClick={() => setErase(true)} className={`min-h-10 rounded-lg px-3 text-xs font-bold ${erase ? "bg-teal-700 text-white" : "bg-white text-stone-700"}`}>Eraser</button>
            <button type="button" onClick={() => setStrokes((current) => { const next = current.slice(0, -1); requestAnimationFrame(() => paintCanvas(next)); return next; })} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-white px-3 text-xs font-bold text-stone-700"><Undo2 className="h-4 w-4" />Undo</button>
            <button type="button" onClick={() => { setStrokes([]); paintCanvas([]); }} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-white px-3 text-xs font-bold text-stone-700"><RotateCcw className="h-4 w-4" />Clear</button>
          </div>
        </div>
        <canvas
          ref={canvasRef}
          width={720}
          height={405}
          aria-label="Drawing space"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            const stroke = { points: [pointFromEvent(event)], erase };
            currentStroke.current = stroke;
          }}
          onPointerMove={(event) => {
            const stroke = currentStroke.current;
            if (!stroke) return;
            const nextPoint = pointFromEvent(event);
            const previous = stroke.points.at(-1)!;
            stroke.points.push(nextPoint);
            const context = event.currentTarget.getContext("2d");
            if (!context) return;
            context.beginPath();
            context.moveTo(previous.x, previous.y);
            context.lineTo(nextPoint.x, nextPoint.y);
            context.strokeStyle = stroke.erase ? "#ffffff" : "#17343a";
            context.lineWidth = stroke.erase ? 24 : 6;
            context.lineCap = "round";
            context.stroke();
          }}
          onPointerUp={() => {
            const stroke = currentStroke.current;
            currentStroke.current = null;
            if (stroke?.points.length) setStrokes((current) => [...current, stroke]);
          }}
          onPointerCancel={() => { currentStroke.current = null; }}
          className="aspect-video w-full touch-none rounded-lg border border-teal-200 bg-white"
        />
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={() => setDrawing(false)} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-stone-300 bg-white px-3 text-sm font-bold text-stone-700"><X className="h-4 w-4" />Cancel</button>
          <button type="button" disabled={pending || strokes.length === 0} onClick={saveDrawing} className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-teal-700 px-4 text-sm font-extrabold text-white disabled:opacity-50"><Save className="h-4 w-4" />{pending ? "Saving…" : "Use drawing"}</button>
        </div>
        {notice ? <p className="mt-2 text-xs font-bold text-rose-700">{notice}</p> : null}
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl border-2 border-dashed border-teal-200 bg-teal-50 ${compact ? "p-2" : "p-3"}`}>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element -- authenticated homework media route or local preview data
        <img src={value} alt="Student VLOG visual" className={`${compact ? "h-32" : "h-52"} w-full rounded-lg bg-white object-contain`} />
      ) : (
        <div className={`${compact ? "h-24" : "h-36"} grid place-items-center text-center`}>
          <div><ImagePlus className="mx-auto h-7 w-7 text-teal-700" /><p className="mt-1 text-xs font-bold text-teal-900">Add or draw</p></div>
        </div>
      )}
      <input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadFile(file); event.target.value = ""; }} />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" disabled={pending} onClick={() => fileRef.current?.click()} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-teal-200 bg-white px-2 text-xs font-extrabold text-teal-900 disabled:opacity-50"><ImagePlus className="h-4 w-4" />{value ? "Change" : "Add photo"}</button>
        <button type="button" disabled={pending} onClick={() => { setStrokes([]); setDrawing(true); }} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-teal-200 bg-white px-2 text-xs font-extrabold text-teal-900 disabled:opacity-50"><Pencil className="h-4 w-4" />Draw</button>
      </div>
      {notice ? <p className="mt-2 text-xs font-bold text-rose-700">{notice}</p> : null}
    </div>
  );
}
