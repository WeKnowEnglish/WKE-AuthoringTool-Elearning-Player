"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Download, Layers3, Plus, Save, Trash2 } from "lucide-react";
import { ComicPageCanvas } from "@/components/comic/ComicPageCanvas";
import {
  comicElementKinds,
  comicSpeakerIds,
  createEmptyComicOverlay,
  type ComicLetteringElement,
  type ComicPageOverlay,
} from "@/lib/comic/overlay";
import type { ComicPage } from "@/lib/comic/types";

type Props = {
  page: ComicPage;
  disabled?: boolean;
  onSave: (overlay: ComicPageOverlay) => void;
};

type DragState = {
  id: string;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  canvasWidth: number;
  canvasHeight: number;
};

const labelClass = "block text-xs font-black uppercase tracking-wide text-stone-600";
const inputClass = "mt-1 w-full rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-sm text-stone-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function ComicOverlayEditor({ page, disabled = false, onSave }: Props) {
  const initialOverlay = useMemo(
    () =>
      page.overlay ??
      createEmptyComicOverlay(page.imageWidth ?? 1024, page.imageHeight ?? 1536),
    [page],
  );
  const [overlay, setOverlay] = useState(initialOverlay);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialOverlay.elements[0]?.id ?? null,
  );
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = ((event.clientX - drag.startClientX) / drag.canvasWidth) * 100;
      const dy = ((event.clientY - drag.startClientY) / drag.canvasHeight) * 100;
      setOverlay((current) => ({
        ...current,
        elements: current.elements.map((element) =>
          element.id === drag.id
            ? {
                ...element,
                bounds: {
                  ...element.bounds,
                  x: clamp(drag.startX + dx, 0, 100 - element.bounds.width),
                  y: clamp(drag.startY + dy, 0, 100 - element.bounds.height),
                },
              }
            : element,
        ),
      }));
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const selected = overlay.elements.find((element) => element.id === selectedId) ?? null;
  const previewPage: ComicPage = { ...page, overlay };

  const patchSelected = (patch: Partial<ComicLetteringElement>) => {
    if (!selectedId) return;
    setOverlay((current) => ({
      ...current,
      elements: current.elements.map((element) =>
        element.id === selectedId ? { ...element, ...patch } : element,
      ),
    }));
  };

  const patchBounds = (key: keyof ComicLetteringElement["bounds"], value: number) => {
    if (!selected) return;
    const bounds = { ...selected.bounds, [key]: value };
    bounds.width = clamp(bounds.width, 1, 100 - bounds.x);
    bounds.height = clamp(bounds.height, 1, 100 - bounds.y);
    bounds.x = clamp(bounds.x, 0, 100 - bounds.width);
    bounds.y = clamp(bounds.y, 0, 100 - bounds.height);
    patchSelected({ bounds });
  };

  const addElement = (kind: ComicLetteringElement["kind"]) => {
    const id = `${kind}-${Date.now().toString(36)}`;
    const readOrder =
      kind === "speech" || kind === "thought" || kind === "narration"
        ? Math.max(0, ...overlay.elements.map((element) => element.readOrder ?? 0)) + 1
        : undefined;
    const element: ComicLetteringElement = {
      id,
      kind,
      text: kind === "panel_number" ? "1" : "New text",
      ...(kind === "speech" ? { speakerId: "mia" as const } : {}),
      bounds: { x: 10, y: 10, width: kind === "panel_number" ? 6 : 24, height: kind === "panel_number" ? 5 : 9 },
      ...(kind === "speech" ? { tail: { side: "bottom" as const, offset: 50 } } : {}),
      ...(readOrder ? { readOrder } : {}),
      fontScale: 1,
      vocabularyIds: [],
      emphasis: "normal",
    };
    setOverlay((current) => ({ ...current, elements: [...current.elements, element] }));
    setSelectedId(id);
  };

  const exportJson = () => {
    const blob = new Blob([`${JSON.stringify(overlay, null, 2)}\n`], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${page.originalFilename.replace(/\.[^.]+$/, "")}.overlay.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const beginDrag = (
    element: ComicLetteringElement,
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    const canvas = canvasWrapRef.current?.firstElementChild?.getBoundingClientRect();
    if (!canvas) return;
    setSelectedId(element.id);
    dragRef.current = {
      id: element.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: element.bounds.x,
      startY: element.bounds.y,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    };
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div ref={canvasWrapRef} className="mx-auto w-full max-w-[760px] rounded-xl bg-stone-900 p-2">
        <ComicPageCanvas
          page={previewPage}
          selectedElementId={selectedId}
          onElementPointerDown={beginDrag}
        />
      </div>

      <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-black text-stone-900">
            <Layers3 className="h-4 w-4 text-sky-700" /> Lettering layers
          </h3>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => addElement("speech")} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-stone-300 bg-white px-2 text-xs font-bold text-stone-700 hover:border-sky-400">
              <Plus className="h-3.5 w-3.5" /> Speech
            </button>
            <button type="button" onClick={() => addElement("narration")} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-stone-300 bg-white px-2 text-xs font-bold text-stone-700 hover:border-sky-400">
              <Plus className="h-3.5 w-3.5" /> Caption
            </button>
          </div>
        </div>

        <label className={labelClass}>
          Select layer
          <select value={selectedId ?? ""} onChange={(event) => setSelectedId(event.target.value || null)} className={inputClass}>
            <option value="">Choose a layer</option>
            {overlay.elements.map((element) => (
              <option key={element.id} value={element.id}>
                {element.kind} · {element.text.slice(0, 34)}
              </option>
            ))}
          </select>
        </label>

        {selected ? (
          <div className="space-y-3 border-t border-stone-200 pt-3">
            <label className={labelClass}>
              Text
              <textarea value={selected.text} onChange={(event) => patchSelected({ text: event.target.value })} rows={3} className={`${inputClass} resize-y`} />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className={labelClass}>
                Style
                <select value={selected.kind} onChange={(event) => patchSelected({ kind: event.target.value as ComicLetteringElement["kind"] })} className={inputClass}>
                  {comicElementKinds.map((kind) => <option key={kind} value={kind}>{kind.replace("_", " ")}</option>)}
                </select>
              </label>
              <label className={labelClass}>
                Speaker
                <select value={selected.speakerId ?? ""} onChange={(event) => patchSelected({ speakerId: (event.target.value || undefined) as ComicLetteringElement["speakerId"] })} className={inputClass}>
                  <option value="">None</option>
                  {comicSpeakerIds.map((speaker) => <option key={speaker} value={speaker}>{speaker}</option>)}
                </select>
              </label>
            </div>

            <p className="text-xs font-semibold text-stone-500">Drag the selected layer on the page, or enter exact percentage values.</p>
            <div className="grid grid-cols-4 gap-2">
              {(["x", "y", "width", "height"] as const).map((key) => (
                <label key={key} className={labelClass}>
                  {key}
                  <input type="number" min={0} max={100} step={0.1} value={Number(selected.bounds[key].toFixed(1))} onChange={(event) => patchBounds(key, Number(event.target.value))} className={inputClass} />
                </label>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className={labelClass}>
                Read order
                <input type="number" min={1} max={100} value={selected.readOrder ?? ""} onChange={(event) => patchSelected({ readOrder: event.target.value ? Number(event.target.value) : undefined })} className={inputClass} />
              </label>
              <label className={labelClass}>
                Text scale
                <input type="number" min={0.5} max={2} step={0.05} value={selected.fontScale} onChange={(event) => patchSelected({ fontScale: Number(event.target.value) })} className={inputClass} />
              </label>
            </div>

            <button
              type="button"
              onClick={() => {
                setOverlay((current) => ({ ...current, elements: current.elements.filter((element) => element.id !== selected.id) }));
                setSelectedId(null);
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-sm font-bold text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" /> Delete layer
            </button>
          </div>
        ) : (
          <p className="rounded-lg bg-white p-3 text-sm text-stone-500">Choose a layer, or add a new speech bubble.</p>
        )}

        <label className={labelClass}>
          Student discussion prompt
          <textarea value={overlay.discussionPrompt ?? ""} onChange={(event) => setOverlay((current) => ({ ...current, discussionPrompt: event.target.value || undefined }))} rows={2} className={`${inputClass} resize-y`} />
        </label>

        <div className="flex flex-wrap gap-2 border-t border-stone-200 pt-3">
          <button type="button" disabled={disabled} onClick={() => onSave(overlay)} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 text-sm font-bold text-white disabled:opacity-50">
            <Save className="h-4 w-4" /> {disabled ? "Saving…" : "Save lettering"}
          </button>
          <button type="button" onClick={exportJson} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 text-sm font-bold text-stone-700 hover:bg-stone-100">
            <Download className="h-4 w-4" /> JSON
          </button>
        </div>
      </div>
    </div>
  );
}
