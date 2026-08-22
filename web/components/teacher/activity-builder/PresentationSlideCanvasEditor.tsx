"use client";

import { useMemo, useRef, useState, type PointerEvent } from "react";
import {
  clampPresentationElement,
  createPresentationShapeElement,
  createPresentationTextElement,
  presentationElementsForSlide,
  type LearningTrackPresentationElement,
  type LearningTrackPresentationSlide,
} from "@/lib/learning-tracks/composer";

type DragSession = {
  pointerId: number;
  mode: "move" | "resize";
  element: LearningTrackPresentationElement;
  startClientX: number;
  startClientY: number;
};

export function PresentationSlideCanvasEditor({
  slide,
  onChange,
}: {
  slide: LearningTrackPresentationSlide;
  onChange: (slide: LearningTrackPresentationSlide) => void;
}) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragSession | null>(null);
  const elements = useMemo(() => presentationElementsForSlide(slide), [slide]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    elements[0]?.id ?? null,
  );
  const selectedElement =
    elements.find((element) => element.id === selectedElementId) ?? null;

  const saveElements = (next: LearningTrackPresentationElement[]) => {
    onChange({ ...slide, elements: next });
  };

  const patchElement = (
    elementId: string,
    patch: Partial<LearningTrackPresentationElement>,
  ) => {
    saveElements(
      elements.map((element) =>
        element.id === elementId
          ? clampPresentationElement({
              ...element,
              ...patch,
            } as LearningTrackPresentationElement)
          : element,
      ),
    );
  };

  const addText = () => {
    const element = createPresentationTextElement({
      zIndex: Math.max(0, ...elements.map((item) => item.zIndex)) + 1,
    });
    saveElements([...elements, element]);
    setSelectedElementId(element.id);
  };

  const addShape = (shape: "rectangle" | "ellipse") => {
    const element = createPresentationShapeElement(shape, {
      zIndex: Math.max(0, ...elements.map((item) => item.zIndex)) + 1,
    });
    saveElements([...elements, element]);
    setSelectedElementId(element.id);
  };

  const removeSelected = () => {
    if (!selectedElementId) return;
    const index = elements.findIndex((element) => element.id === selectedElementId);
    const next = elements.filter((element) => element.id !== selectedElementId);
    saveElements(next);
    setSelectedElementId(next[Math.min(index, Math.max(0, next.length - 1))]?.id ?? null);
  };

  const beginDrag = (
    event: PointerEvent<HTMLElement>,
    element: LearningTrackPresentationElement,
    mode: DragSession["mode"],
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedElementId(element.id);
    dragRef.current = {
      pointerId: event.pointerId,
      mode,
      element,
      startClientX: event.clientX,
      startClientY: event.clientY,
    };
    canvasRef.current?.setPointerCapture(event.pointerId);
  };

  const movePointer = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas || drag.pointerId !== event.pointerId) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const dx = ((event.clientX - drag.startClientX) / rect.width) * 100;
    const dy = ((event.clientY - drag.startClientY) / rect.height) * 100;
    const next =
      drag.mode === "move"
        ? {
            ...drag.element,
            xPercent: drag.element.xPercent + dx,
            yPercent: drag.element.yPercent + dy,
          }
        : {
            ...drag.element,
            widthPercent: drag.element.widthPercent + dx,
            heightPercent: drag.element.heightPercent + dy,
          };
    patchElement(drag.element.id, clampPresentationElement(next));
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (canvasRef.current?.hasPointerCapture(event.pointerId)) {
      canvasRef.current.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-100 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-slate-900">Editing {slide.title}</p>
          <p className="text-[11px] text-slate-600">Drag to move · use the corner to resize</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className="ltc-btn rounded px-2 py-1 text-xs" onClick={addText}>
            + Text
          </button>
          <button
            type="button"
            className="ltc-btn rounded px-2 py-1 text-xs"
            onClick={() => addShape("rectangle")}
          >
            + Rectangle
          </button>
          <button
            type="button"
            className="ltc-btn rounded px-2 py-1 text-xs"
            onClick={() => addShape("ellipse")}
          >
            + Circle
          </button>
          <button
            type="button"
            className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-40"
            disabled={!selectedElement}
            onClick={removeSelected}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <div
          ref={canvasRef}
          tabIndex={0}
          role="application"
          aria-label={`Editable canvas for ${slide.title}`}
          className="relative aspect-video w-full max-w-5xl touch-none overflow-hidden rounded-lg border-2 border-slate-300 bg-white shadow-lg outline-none focus:ring-2 focus:ring-sky-500"
          style={{
            containerType: "inline-size",
            backgroundColor: slide.backgroundColor,
            ...(slide.backgroundImageUrl
              ? {
                  backgroundImage: `url(${JSON.stringify(slide.backgroundImageUrl)})`,
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: slide.imageFit,
                }
              : {}),
          }}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setSelectedElementId(null);
          }}
          onPointerMove={movePointer}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={(event) => {
            const tag = (event.target as HTMLElement).tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
            if ((event.key === "Delete" || event.key === "Backspace") && selectedElement) {
              event.preventDefault();
              removeSelected();
            }
          }}
        >
          {elements.map((element) => {
            const selected = element.id === selectedElementId;
            return (
              <div
                key={element.id}
                role="button"
                tabIndex={-1}
                aria-label={element.kind === "text" ? `Text box: ${element.text}` : `${element.shape} shape`}
                className={`absolute cursor-move select-none ${
                  selected ? "ring-2 ring-sky-500 ring-offset-2" : "hover:ring-1 hover:ring-sky-300"
                }`}
                style={{
                  left: `${element.xPercent}%`,
                  top: `${element.yPercent}%`,
                  width: `${element.widthPercent}%`,
                  height: `${element.heightPercent}%`,
                  zIndex: 10 + element.zIndex,
                }}
                onPointerDown={(event) => beginDrag(event, element, "move")}
              >
                {element.kind === "text" ? (
                  <div
                    className={`flex h-full w-full items-center justify-center overflow-hidden rounded-md px-2 text-center font-semibold whitespace-pre-wrap break-words ${
                      element.showCard ? "border-2 border-slate-600/40 bg-white/90 shadow-md" : ""
                    }`}
                    style={{
                      color: element.textColor,
                      fontSize: `calc(${element.textSizePx} * 100cqw / 960)`,
                      lineHeight: 1.2,
                    }}
                  >
                    {element.text || "Text"}
                  </div>
                ) : (
                  <div
                    className="h-full w-full shadow-sm"
                    style={{
                      backgroundColor: element.fillColor,
                      borderRadius: element.shape === "ellipse" ? "9999px" : "0.5rem",
                    }}
                  />
                )}
                {selected ? (
                  <span
                    aria-label="Resize element"
                    className="absolute -right-2 -bottom-2 h-4 w-4 cursor-se-resize rounded-sm border-2 border-white bg-sky-600 shadow"
                    onPointerDown={(event) => beginDrag(event, element, "resize")}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {selectedElement ? (
        <div className="mt-2 grid shrink-0 gap-2 rounded-lg border border-slate-200 bg-white p-2 md:grid-cols-[minmax(0,1fr)_auto]">
          {selectedElement.kind === "text" ? (
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_7rem]">
              <label className="text-[11px] font-semibold text-slate-600">
                Text
                <textarea
                  className="mt-1 min-h-14 w-full resize-y rounded border border-slate-300 px-2 py-1 text-xs"
                  value={selectedElement.text}
                  onChange={(event) => patchElement(selectedElement.id, { text: event.target.value })}
                />
              </label>
              <label className="text-[11px] font-semibold text-slate-600">
                Size
                <input
                  type="number"
                  min={10}
                  max={128}
                  className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
                  value={selectedElement.textSizePx}
                  onChange={(event) =>
                    patchElement(selectedElement.id, {
                      textSizePx: Math.min(128, Math.max(10, Number(event.target.value) || 10)),
                    })
                  }
                />
              </label>
              <label className="text-[11px] font-semibold text-slate-600">
                Text color
                <input
                  type="color"
                  className="mt-1 h-8 w-full rounded border border-slate-300 p-0.5"
                  value={selectedElement.textColor}
                  onChange={(event) => patchElement(selectedElement.id, { textColor: event.target.value })}
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700 sm:col-span-3">
                <input
                  type="checkbox"
                  checked={selectedElement.showCard}
                  onChange={(event) => patchElement(selectedElement.id, { showCard: event.target.checked })}
                />
                Show a readable card behind the text
              </label>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-[11px] font-semibold text-slate-600">
                Shape
                <select
                  className="mt-1 block rounded border border-slate-300 px-2 py-1 text-xs"
                  value={selectedElement.shape}
                  onChange={(event) =>
                    patchElement(selectedElement.id, {
                      shape: event.target.value as "rectangle" | "ellipse",
                    })
                  }
                >
                  <option value="rectangle">Rectangle</option>
                  <option value="ellipse">Circle / ellipse</option>
                </select>
              </label>
              <label className="text-[11px] font-semibold text-slate-600">
                Fill
                <input
                  type="color"
                  className="mt-1 block h-8 w-16 rounded border border-slate-300 p-0.5"
                  value={selectedElement.fillColor}
                  onChange={(event) => patchElement(selectedElement.id, { fillColor: event.target.value })}
                />
              </label>
            </div>
          )}
          <div className="flex items-end gap-1">
            <button
              type="button"
              className="ltc-btn rounded px-2 py-1 text-xs"
              onClick={() => patchElement(selectedElement.id, { zIndex: selectedElement.zIndex - 1 })}
            >
              Send back
            </button>
            <button
              type="button"
              className="ltc-btn rounded px-2 py-1 text-xs"
              onClick={() => patchElement(selectedElement.id, { zIndex: selectedElement.zIndex + 1 })}
            >
              Bring forward
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 shrink-0 text-center text-xs text-slate-600">
          Select an element to edit it, or add text and shapes above.
        </p>
      )}
    </div>
  );
}
