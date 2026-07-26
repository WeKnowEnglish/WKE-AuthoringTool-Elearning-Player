"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_OBJECT_HIGHLIGHT,
  detectActivityHotspotContour,
  downloadExploreHotspotsJson,
  getStudioExploreHotspots,
  HOBBIES_HOTSPOT_ACTIVITY,
  hotspotGeometrySeedPoints,
  listStudioExploreHotspots,
  saveExploreHotspotsToStudio,
  useHotspotSamModel,
  validateExploreHotspotsDocument,
  type DialogueTurn,
  type ExploreHotspotsDocument,
  type HotspotElement,
  type HotspotGeometry,
  type HotspotVisualShape,
  type NormalizedPoint,
  type NormalizedSamPrompt,
  type StudioExploreHotspotsRef,
} from "@/lib/hotspots";
import { wkeActivityToLessonScreen } from "@/lib/wke-activity";
import {
  HotspotMediaCanvas,
  type HotspotCanvasTool,
} from "./HotspotMediaCanvas";

const LessonPlayer = dynamic(
  () =>
    import("@/components/lesson/LessonPlayer").then((m) => ({
      default: m.LessonPlayer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-stone-200 bg-white px-6 py-10 text-center">
        <p className="text-sm font-semibold text-stone-700">Loading preview…</p>
      </div>
    ),
  },
);

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900";

function cloneDocument(document: ExploreHotspotsDocument): ExploreHotspotsDocument {
  return structuredClone(document);
}

function readImage(
  file: File,
): Promise<{ src: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () =>
        reject(new Error("The selected file is not a supported image."));
      image.onload = () =>
        resolve({
          src: String(reader.result),
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function geometryNumber(geometry: HotspotGeometry, field: string): number {
  return (geometry as unknown as Record<string, number>)[field] ?? 0;
}

function patchRectangleGeometry(
  geometry: Extract<HotspotGeometry, { shape: "rectangle" }>,
  field: "x" | "y" | "width" | "height",
  value: number,
): HotspotGeometry {
  return { ...geometry, [field]: value };
}

function patchEllipseGeometry(
  geometry: Extract<HotspotGeometry, { shape: "ellipse" }>,
  field: "cx" | "cy" | "rx" | "ry",
  value: number,
): HotspotGeometry {
  return { ...geometry, [field]: value };
}

export function ExploreHotspotsWorkspace() {
  const searchParams = useSearchParams();
  const [document, setDocument] = useState<ExploreHotspotsDocument>(() =>
    cloneDocument(HOBBIES_HOTSPOT_ACTIVITY),
  );
  const [mode, setMode] = useState<"layout" | "preview">("layout");
  const [tool, setTool] = useState<HotspotCanvasTool>("select");
  const [selectedId, setSelectedId] = useState<string | null>("mia-drawing");
  const [notice, setNotice] = useState<string | null>(null);
  const [previewGeneration, setPreviewGeneration] = useState(0);
  const [segmentationMode, setSegmentationMode] = useState(false);
  const [segmentationPrompts, setSegmentationPrompts] = useState<NormalizedSamPrompt[]>(
    [],
  );
  const [segmentationPreview, setSegmentationPreview] =
    useState<HotspotVisualShape | null>(null);
  const [segmentationPromptLabel, setSegmentationPromptLabel] = useState<1 | 0>(1);
  const [useAutoSeeds, setUseAutoSeeds] = useState(true);
  const [autoSeedPoints, setAutoSeedPoints] = useState<NormalizedPoint[]>([]);
  const [detectingObject, setDetectingObject] = useState(false);
  const [bankActivityId, setBankActivityId] = useState<string | null>(null);
  const [bankEntries, setBankEntries] = useState<StudioExploreHotspotsRef[]>([]);
  const [bankBusy, setBankBusy] = useState(false);
  const [showBankPanel, setShowBankPanel] = useState(false);
  const openRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const segmentationRequestRef = useRef(0);
  const { samStatus, samReady, samError, retrySam } =
    useHotspotSamModel(segmentationMode);

  const media = document.assets.find((asset) => asset.kind === "image")!;
  const hotspots = document.layout.elements.filter(
    (element): element is HotspotElement => element.kind === "hotspot",
  );
  const selected = hotspots.find((hotspot) => hotspot.id === selectedId) ?? null;
  const selectedDialogue =
    document.interaction.dialogues.find(
      (dialogue) => dialogue.hotspotId === selectedId,
    ) ?? null;

  const lessonId = `activity-${document.id}`;

  const validation = useMemo(() => {
    try {
      validateExploreHotspotsDocument(document);
      return { ok: true as const, message: "Ready to save to Activity Bank." };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "Activity is not valid.",
      };
    }
  }, [document]);

  /** Only build when valid — parse must not throw during layout edits (e.g. zero hotspots). */
  const previewScreens = useMemo(() => {
    if (!validation.ok) return null;
    try {
      return [wkeActivityToLessonScreen(document, lessonId)];
    } catch {
      return null;
    }
  }, [document, lessonId, validation.ok]);

  const refreshBank = async () => {
    try {
      const entries = await listStudioExploreHotspots();
      setBankEntries(entries);
    } catch (error) {
      setBankEntries([]);
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not load hotspot activities from Activity Bank.",
      );
    }
  };

  const loadFromBank = async (activityId: string) => {
    setBankBusy(true);
    try {
      const loaded = await getStudioExploreHotspots(activityId);
      stopSegmentation();
      setDocument(cloneDocument(loaded.document));
      setSelectedId(
        loaded.document.layout.elements.find((element) => element.kind === "hotspot")
          ?.id ?? null,
      );
      setBankActivityId(loaded.id);
      setMode("layout");
      setNotice(`Opened “${loaded.document.name}” from Activity Bank.`);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not open hotspot activity.",
      );
    } finally {
      setBankBusy(false);
    }
  };

  useEffect(() => {
    const activityId = searchParams.get("activity");
    if (activityId) void loadFromBank(activityId);
    // Mount-only load from ?activity=
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (showBankPanel) void refreshBank();
  }, [showBankPanel]);

  const patchHotspot = (id: string, patch: Partial<HotspotElement>) =>
    setDocument((current) => ({
      ...current,
      layout: {
        ...current.layout,
        elements: current.layout.elements.map((element) =>
          element.id === id ? ({ ...element, ...patch } as HotspotElement) : element,
        ),
      },
    }));

  const stopSegmentation = () => {
    segmentationRequestRef.current += 1;
    setSegmentationMode(false);
    setSegmentationPrompts([]);
    setSegmentationPreview(null);
    setSegmentationPromptLabel(1);
    setUseAutoSeeds(true);
    setAutoSeedPoints([]);
    setDetectingObject(false);
  };

  const selectHotspot = (id: string) => {
    stopSegmentation();
    setSelectedId(id);
    setTool("select");
  };

  const runSegmentation = async (
    nextPrompts: NormalizedSamPrompt[],
    pendingNotice: string,
    nextUseAutoSeeds = useAutoSeeds,
  ) => {
    if (!selected) return;
    const request = segmentationRequestRef.current + 1;
    segmentationRequestRef.current = request;
    setSegmentationPrompts(nextPrompts);
    setDetectingObject(true);
    setNotice(pendingNotice);
    setAutoSeedPoints(
      nextUseAutoSeeds ? hotspotGeometrySeedPoints(selected.geometry) : [],
    );
    try {
      const result = await detectActivityHotspotContour(
        media,
        nextPrompts,
        selected.geometry,
        { useAutoSeeds: nextUseAutoSeeds },
      );
      if (segmentationRequestRef.current !== request) return;
      setSegmentationPreview(result.visualShape);
      setAutoSeedPoints(result.usedAutoSeeds);
      const droppedNote =
        result.droppedAutoSeeds.length > 0
          ? ` · dropped ${result.droppedAutoSeeds.length} hole seed${result.droppedAutoSeeds.length === 1 ? "" : "s"}`
          : "";
      setNotice(
        `Object outline ready${result.visualShape.score ? ` · confidence ${Math.round(result.visualShape.score * 100)}%` : ""}${droppedNote}. Review it, refine it, then accept.`,
      );
    } catch (error) {
      if (segmentationRequestRef.current !== request) return;
      setSegmentationPreview(null);
      setNotice(error instanceof Error ? error.message : "Object detection failed.");
    } finally {
      if (segmentationRequestRef.current === request) setDetectingObject(false);
    }
  };

  const beginSegmentation = () => {
    setTool("select");
    setSegmentationMode(true);
    setSegmentationPrompts([]);
    setSegmentationPreview(null);
    setUseAutoSeeds(true);
    void runSegmentation([], "Detecting the object inside the hotspot bounds…", true);
  };

  const toggleAutoSeeds = () => {
    const next = !useAutoSeeds;
    setUseAutoSeeds(next);
    void runSegmentation(
      segmentationPrompts,
      next
        ? "Re-detecting with automatic centerline seeds…"
        : "Re-detecting without automatic seeds (box + your points only)…",
      next,
    );
  };

  const addSegmentationPrompt = (prompt: NormalizedSamPrompt) => {
    const nextPrompts = [...segmentationPrompts, prompt];
    void runSegmentation(
      nextPrompts,
      prompt.label === 1
        ? "Adding the selected character region…"
        : "Removing nearby interference…",
    );
  };

  const removeSegmentationPrompt = (index: number) => {
    const nextPrompts = segmentationPrompts.filter(
      (_, promptIndex) => promptIndex !== index,
    );
    void runSegmentation(
      nextPrompts,
      nextPrompts.length
        ? "Recalculating without that refinement point…"
        : "Restoring the automatic outline…",
    );
  };

  const clearSegmentationPrompts = () => {
    void runSegmentation([], "Restoring the automatic outline…");
  };

  const createHotspot = (geometry: HotspotGeometry) => {
    let number = hotspots.length + 1;
    while (hotspots.some((hotspot) => hotspot.id === `hotspot-${number}`)) number += 1;
    const id = `hotspot-${number}`;
    const name = `Child ${number}`;
    setDocument((current) => ({
      ...current,
      layout: {
        ...current.layout,
        elements: [
          ...current.layout.elements,
          {
            id,
            kind: "hotspot",
            regionId: "main-media",
            name,
            accessibleLabel: `${name} in the activity picture`,
            geometry,
            tabOrder: hotspots.length + 1,
            required: true,
          },
        ],
      },
      interaction: {
        ...current.interaction,
        dialogues: [
          ...current.interaction.dialogues,
          {
            id: `dialogue-${id}`,
            hotspotId: id,
            title: `${name}'s hobby`,
            turns: [
              { speaker: "AJ", text: "What do you like doing?" },
              { speaker: name, text: "I like…" },
            ],
          },
        ],
      },
    }));
    setSelectedId(id);
    setTool("select");
  };

  const removeSelected = () => {
    if (!selected) return;
    if (hotspots.length <= 1) {
      setNotice("Keep at least one hotspot. Draw a new one before deleting this.");
      return;
    }
    setDocument((current) => ({
      ...current,
      layout: {
        ...current.layout,
        elements: current.layout.elements.filter(
          (element) => element.id !== selected.id,
        ),
      },
      interaction: {
        ...current.interaction,
        dialogues: current.interaction.dialogues.filter(
          (dialogue) => dialogue.hotspotId !== selected.id,
        ),
      },
    }));
    stopSegmentation();
    setSelectedId(
      hotspots.find((hotspot) => hotspot.id !== selected.id)?.id ?? null,
    );
  };

  const patchDialogue = (
    patch: Partial<NonNullable<typeof selectedDialogue>>,
  ) => {
    if (!selectedDialogue) return;
    setDocument((current) => ({
      ...current,
      interaction: {
        ...current.interaction,
        dialogues: current.interaction.dialogues.map((dialogue) =>
          dialogue.id === selectedDialogue.id ? { ...dialogue, ...patch } : dialogue,
        ),
      },
    }));
  };

  const updateTurns = (nextTurns: DialogueTurn[]) => {
    patchDialogue({ turns: nextTurns });
  };

  const addTurn = () => {
    if (!selectedDialogue || !selected) return;
    const last = selectedDialogue.turns[selectedDialogue.turns.length - 1];
    const speaker = last?.speaker?.trim() || selected.name || "Child";
    updateTurns([...selectedDialogue.turns, { speaker, text: "" }]);
  };

  const removeTurn = (index: number) => {
    if (!selectedDialogue || selectedDialogue.turns.length <= 1) return;
    updateTurns(selectedDialogue.turns.filter((_, turnIndex) => turnIndex !== index));
  };

  const moveTurn = (index: number, direction: -1 | 1) => {
    if (!selectedDialogue) return;
    const target = index + direction;
    if (target < 0 || target >= selectedDialogue.turns.length) return;
    const next = [...selectedDialogue.turns];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    updateTurns(next);
  };

  const applyTurnTemplate = (template: "ask-answer" | "one-line" | "three-turn") => {
    if (!selectedDialogue || !selected) return;
    const childName = selected.name || "Child";
    if (template === "one-line") {
      updateTurns([
        {
          speaker: childName,
          text: selectedDialogue.turns[0]?.text || "…",
        },
      ]);
      return;
    }
    if (template === "three-turn") {
      updateTurns([
        { speaker: "AJ", text: "What do you like doing?" },
        { speaker: childName, text: "I like…" },
        { speaker: "AJ", text: "That sounds fun!" },
      ]);
      return;
    }
    updateTurns([
      { speaker: "AJ", text: "What do you like doing?" },
      { speaker: childName, text: "I like…" },
    ]);
  };

  const saveToBank = async () => {
    setBankBusy(true);
    try {
      const entry = await saveExploreHotspotsToStudio({
        activityId: bankActivityId,
        document,
      });
      setBankActivityId(entry.id);
      setNotice(`Saved “${entry.name}” to Activity Bank.`);
      await refreshBank();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBankBusy(false);
    }
  };

  const openDocumentFile = async (file: File) => {
    try {
      const loaded = validateExploreHotspotsDocument(JSON.parse(await file.text()));
      stopSegmentation();
      setDocument(cloneDocument(loaded));
      setSelectedId(
        loaded.layout.elements.find((element) => element.kind === "hotspot")?.id ??
          null,
      );
      setBankActivityId(null);
      setMode("layout");
      setNotice(`Opened ${file.name}.`);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not open the activity.",
      );
    }
  };

  const replaceImage = async (file: File) => {
    try {
      const next = await readImage(file);
      stopSegmentation();
      setDocument((current) => ({
        ...current,
        assets: current.assets.map((asset) =>
          asset.id === media.id
            ? {
                ...asset,
                src: next.src,
                mimeType: file.type,
                alt: asset.alt || file.name,
                intrinsicSize: { width: next.width, height: next.height },
              }
            : asset,
        ),
        layout: {
          ...current.layout,
          elements: current.layout.elements.map((element) =>
            element.kind === "hotspot"
              ? { ...element, visualShape: undefined }
              : element,
          ),
        },
      }));
      setNotice(
        `Imported ${file.name} (${next.width} × ${next.height}). Existing detected outlines were cleared because they belonged to the previous image.`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not import the image.");
    }
  };

  const rectangleFields =
    selected?.geometry.shape === "rectangle"
      ? (["x", "y", "width", "height"] as const)
      : null;
  const ellipseFields =
    selected?.geometry.shape === "ellipse"
      ? (["cx", "cy", "rx", "ry"] as const)
      : null;

  const togglePreview = () => {
    setMode((current) => {
      if (current === "layout") {
        setPreviewGeneration((value) => value + 1);
        return "preview";
      }
      return "layout";
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-stone-50">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-stone-200 bg-white/70 px-3 py-2.5 sm:px-4">
        <Link
          href="/teacher/activity-builder"
          className="text-xs font-medium text-sky-800 hover:underline"
        >
          ← Activity Builder
        </Link>
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-stone-900">Explore hotspots</h1>
          <p className="truncate text-xs text-stone-500">
            {document.name}
            {bankActivityId ? " · in Activity Bank" : " · unsaved"}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <button
            type="button"
            className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800"
            onClick={() => {
              setShowBankPanel((current) => !current);
            }}
          >
            Open from bank
          </button>
          <button
            type="button"
            className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800"
            onClick={() => openRef.current?.click()}
          >
            Open file…
          </button>
          <button
            type="button"
            className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800"
            onClick={() => imageRef.current?.click()}
          >
            Replace image
          </button>
          <button
            type="button"
            className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800 disabled:opacity-40"
            disabled={!validation.ok}
            onClick={() => {
              try {
                downloadExploreHotspotsJson(document);
                setNotice("Activity document downloaded.");
              } catch (error) {
                setNotice(
                  error instanceof Error ? error.message : "Activity is not valid.",
                );
              }
            }}
          >
            Save JSON
          </button>
          <button
            type="button"
            className="rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            disabled={!validation.ok || bankBusy}
            onClick={() => void saveToBank()}
          >
            {bankBusy ? "Saving…" : "Save to bank"}
          </button>
          <button
            type="button"
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${
              mode === "preview"
                ? "border border-amber-300 bg-amber-100 text-amber-950"
                : "bg-sky-800 text-white"
            }`}
            onClick={togglePreview}
          >
            {mode === "layout" ? "Preview" : "Layout"}
          </button>
        </div>
        <input
          ref={openRef}
          hidden
          type="file"
          accept=".json,.wkeactivity.json,application/json"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (file) await openDocumentFile(file);
            event.target.value = "";
          }}
        />
        <input
          ref={imageRef}
          hidden
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (file) await replaceImage(file);
            event.target.value = "";
          }}
        />
      </header>

      {notice ? (
        <button
          type="button"
          className="shrink-0 border-b border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-950"
          onClick={() => setNotice(null)}
        >
          {notice} ×
        </button>
      ) : null}

      {showBankPanel ? (
        <section className="shrink-0 border-b border-stone-200 bg-white px-3 py-3 sm:px-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
              Activity Bank
            </h2>
            <button
              type="button"
              className="text-xs text-stone-500 hover:text-stone-800"
              onClick={() => setShowBankPanel(false)}
            >
              Close
            </button>
          </div>
          {bankEntries.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">
              No explore-hotspots activities saved yet.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {bankEntries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-stone-900">{entry.name}</p>
                    <p className="text-xs text-stone-500">
                      Updated {new Date(entry.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                    disabled={bankBusy}
                    onClick={() => void loadFromBank(entry.id)}
                  >
                    Open
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <div
        className={`shrink-0 border-b px-3 py-2 text-sm ${
          validation.ok
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-rose-200 bg-rose-50 text-rose-900"
        }`}
      >
        {validation.message}
      </div>

      {mode === "layout" ? (
        <div className="grid min-h-0 flex-1 lg:grid-cols-[300px_minmax(0,1fr)_300px]">
          <aside className="min-h-0 overflow-y-auto border-r border-stone-200 bg-white p-3 sm:p-4">
            <section>
              <h2 className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
                Learning content
              </h2>
              <label className="mt-3 block text-xs text-stone-600">
                Activity name
                <input
                  className={inputClass}
                  value={document.name}
                  onChange={(event) =>
                    setDocument({ ...document, name: event.target.value })
                  }
                />
              </label>
              <label className="mt-3 block text-xs text-stone-600">
                Student instruction
                <textarea
                  rows={2}
                  className={inputClass}
                  value={document.content.instruction}
                  onChange={(event) =>
                    setDocument({
                      ...document,
                      content: { ...document.content, instruction: event.target.value },
                    })
                  }
                />
              </label>
            </section>

            <section className="mt-6 rounded-xl border border-stone-200 bg-stone-50/80 p-3">
              <h2 className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                Playback
              </h2>
              <label className="mt-3 flex items-start gap-2 text-sm text-stone-800">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-stone-300"
                  checked={document.interaction.autoPlayOnSelect ?? true}
                  onChange={(event) =>
                    setDocument((current) => ({
                      ...current,
                      interaction: {
                        ...current.interaction,
                        autoPlayOnSelect: event.target.checked,
                      },
                    }))
                  }
                />
                <span>
                  <span className="font-medium">Auto-play speech on select</span>
                  <span className="mt-1 block text-xs text-stone-500">
                    When off, students see the transcript first and tap Listen to hear it.
                  </span>
                </span>
              </label>
              <label className="mt-4 block text-xs text-stone-600">
                Count as heard when
                <select
                  className={inputClass}
                  value={document.interaction.visitedWhen ?? "dialogue-started"}
                  onChange={(event) =>
                    setDocument((current) => ({
                      ...current,
                      interaction: {
                        ...current.interaction,
                        visitedWhen: event.target.value as
                          | "dialogue-started"
                          | "dialogue-finished"
                          | "dialogue-completed",
                      },
                    }))
                  }
                >
                  <option value="dialogue-started">Dialogue starts playing</option>
                  <option value="dialogue-finished">Dialogue finishes playing</option>
                  <option value="dialogue-completed">Dialogue completed</option>
                </select>
              </label>
            </section>

            <section className="mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  Hotspots
                </h2>
                <span className="text-xs text-stone-400">{hotspots.length}</span>
              </div>
              <div className="mt-2 space-y-2">
                {hotspots.map((hotspot) => (
                  <button
                    key={hotspot.id}
                    type="button"
                    onClick={() => selectHotspot(hotspot.id)}
                    className={`w-full rounded-lg border p-3 text-left ${
                      selectedId === hotspot.id
                        ? "border-sky-400 bg-sky-50"
                        : "border-stone-200 bg-white hover:border-stone-300"
                    }`}
                  >
                    <span className="font-medium text-stone-900">
                      {hotspot.tabOrder}. {hotspot.name ?? "Child"}
                    </span>
                    <span className="mt-1 block truncate text-xs text-stone-500">
                      {hotspot.visualShape
                        ? "Precise object outline"
                        : `${hotspot.geometry.shape} click target`}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </aside>

          <section className="min-h-0 overflow-y-auto bg-stone-50 p-3 sm:p-4">
            <div className="mx-auto max-w-6xl">
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-white p-2">
                {(["select", "rectangle", "ellipse", "polygon"] as HotspotCanvasTool[]).map(
                  (candidate) => (
                    <button
                      key={candidate}
                      type="button"
                      onClick={() => setTool(candidate)}
                      className={`rounded-lg px-3 py-2 text-sm capitalize ${
                        tool === candidate
                          ? "bg-sky-800 text-white"
                          : "text-stone-600 hover:bg-stone-100"
                      }`}
                    >
                      {candidate === "select" ? "Select / resize" : `Draw ${candidate}`}
                    </button>
                  ),
                )}
                {tool === "polygon" ? (
                  <p className="ml-auto text-xs text-amber-800">
                    Click points · Enter or double-click to finish · Esc to cancel
                  </p>
                ) : null}
              </div>
              <HotspotMediaCanvas
                key={`${tool}-${segmentationMode ? "segment" : "layout"}`}
                media={media}
                hotspots={hotspots}
                mode="author"
                selectedId={selectedId}
                tool={tool}
                onSelect={selectHotspot}
                onCreate={createHotspot}
                onGeometryChange={(id, geometry) => patchHotspot(id, { geometry })}
                segmentationMode={segmentationMode}
                segmentationPrompts={segmentationPrompts}
                segmentationPreview={segmentationPreview}
                segmentationPromptLabel={segmentationPromptLabel}
                autoSeedPoints={autoSeedPoints}
                onSegmentationPrompt={addSegmentationPrompt}
                onRemoveSegmentationPrompt={removeSegmentationPrompt}
              />
              <p className="mt-3 text-center text-xs text-stone-500">
                Hotspots are stored as image-relative coordinates and stay aligned at
                every display size.
              </p>
            </div>
          </section>

          <aside className="min-h-0 overflow-y-auto border-l border-stone-200 bg-white p-3 sm:p-4">
            {selected && selectedDialogue ? (
              <div className="space-y-5">
                <section>
                  <div className="flex items-center justify-between">
                    <h2 className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
                      Selected hotspot
                    </h2>
                    <button
                      type="button"
                      className="text-xs text-rose-700 hover:underline disabled:opacity-40"
                      disabled={hotspots.length <= 1}
                      title={
                        hotspots.length <= 1
                          ? "Keep at least one hotspot"
                          : "Delete selected hotspot"
                      }
                      onClick={removeSelected}
                    >
                      Delete
                    </button>
                  </div>
                  <label className="mt-3 block text-xs text-stone-600">
                    Display name
                    <input
                      className={inputClass}
                      value={selected.name ?? ""}
                      onChange={(event) =>
                        patchHotspot(selected.id, { name: event.target.value })
                      }
                    />
                  </label>
                  <label className="mt-3 block text-xs text-stone-600">
                    Accessible label
                    <textarea
                      rows={2}
                      className={inputClass}
                      value={selected.accessibleLabel ?? ""}
                      onChange={(event) =>
                        patchHotspot(selected.id, {
                          accessibleLabel: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="mt-3 flex items-center gap-2 text-sm text-stone-800">
                    <input
                      type="checkbox"
                      className="rounded border-stone-300"
                      checked={selected.required ?? true}
                      onChange={(event) =>
                        patchHotspot(selected.id, { required: event.target.checked })
                      }
                    />
                    Required for completion
                  </label>
                </section>

                {rectangleFields ? (
                  <section>
                    <h2 className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                      Normalized geometry
                    </h2>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {rectangleFields.map((field) => (
                        <label key={field} className="text-xs text-stone-600">
                          {field}
                          <input
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                            className={inputClass}
                            value={geometryNumber(selected.geometry, field)}
                            onChange={(event) => {
                              if (selected.geometry.shape !== "rectangle") return;
                              patchHotspot(selected.id, {
                                geometry: patchRectangleGeometry(
                                  selected.geometry,
                                  field,
                                  Number(event.target.value),
                                ),
                              });
                            }}
                          />
                        </label>
                      ))}
                    </div>
                  </section>
                ) : null}

                {ellipseFields ? (
                  <section>
                    <h2 className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                      Normalized geometry
                    </h2>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {ellipseFields.map((field) => (
                        <label key={field} className="text-xs text-stone-600">
                          {field}
                          <input
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                            className={inputClass}
                            value={geometryNumber(selected.geometry, field)}
                            onChange={(event) => {
                              if (selected.geometry.shape !== "ellipse") return;
                              patchHotspot(selected.id, {
                                geometry: patchEllipseGeometry(
                                  selected.geometry,
                                  field,
                                  Number(event.target.value),
                                ),
                              });
                            }}
                          />
                        </label>
                      ))}
                    </div>
                  </section>
                ) : null}

                {selected.geometry.shape === "polygon" ? (
                  <p className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600">
                    Polygon with {selected.geometry.points.length} points. Drag the white
                    vertex handles on the canvas to edit it.
                  </p>
                ) : null}

                <section className="rounded-xl border border-stone-200 bg-stone-50/80 p-3">
                  <h2 className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                    Object highlight
                  </h2>
                  {!segmentationMode ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs leading-relaxed text-stone-600">
                        Resize the hotspot closely around the intended character. Its
                        bounds guide detection and suppress nearby objects.
                      </p>
                      <button
                        type="button"
                        onClick={beginSegmentation}
                        className="w-full rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600"
                      >
                        {selected.visualShape ? "Redetect object" : "Detect object"}
                      </button>
                      {selected.visualShape ? (
                        <button
                          type="button"
                          onClick={() =>
                            patchHotspot(selected.id, { visualShape: undefined })
                          }
                          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700"
                        >
                          Remove precise outline
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <p className="text-xs leading-relaxed text-stone-700">
                        The dashed hotspot boundary guides the first outline automatically.
                        Amber dots are auto seeds (dropped if they land in a hole). Choose
                        Include for missing character regions or Exclude for chairs, props,
                        and background. Shift-click is also a shortcut for Exclude.
                      </p>
                      <p className="text-xs text-stone-500">
                        {samReady
                          ? detectingObject
                            ? "Detecting boundary…"
                            : `${segmentationPrompts.length} refinement point${segmentationPrompts.length === 1 ? "" : "s"}`
                          : samError
                            ? `Model unavailable: ${samError}`
                            : `Loading SlimSAM… ${Math.round(samStatus.progress * 100)}%`}
                      </p>
                      {samError ? (
                        <button
                          type="button"
                          onClick={() => void retrySam()}
                          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800"
                        >
                          Retry model
                        </button>
                      ) : null}
                      <label className="flex items-start gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700">
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded border-stone-300"
                          checked={useAutoSeeds}
                          disabled={detectingObject}
                          onChange={toggleAutoSeeds}
                        />
                        <span>
                          <span className="font-medium text-stone-900">Use auto seeds</span>
                          <span className="mt-0.5 block text-[11px] leading-relaxed text-stone-500">
                            Centerline seeds help solid objects. Turn off for rings/windows,
                            or when seeds keep landing in empty space.
                          </span>
                        </span>
                      </label>
                      <div
                        role="group"
                        aria-label="Refinement point type"
                        className="grid grid-cols-2 gap-2"
                      >
                        <button
                          type="button"
                          aria-pressed={segmentationPromptLabel === 1}
                          onClick={() => setSegmentationPromptLabel(1)}
                          className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                            segmentationPromptLabel === 1
                              ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                              : "border-stone-300 text-stone-600"
                          }`}
                        >
                          + Include
                        </button>
                        <button
                          type="button"
                          aria-pressed={segmentationPromptLabel === 0}
                          onClick={() => setSegmentationPromptLabel(0)}
                          className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                            segmentationPromptLabel === 0
                              ? "border-rose-400 bg-rose-50 text-rose-900"
                              : "border-stone-300 text-stone-600"
                          }`}
                        >
                          − Exclude
                        </button>
                      </div>
                      {segmentationPrompts.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-[11px] text-stone-500">
                            Click a marker or remove it here:
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {segmentationPrompts.map((prompt, index) => (
                              <button
                                key={`${prompt.x}-${prompt.y}-${index}`}
                                type="button"
                                onClick={() => removeSegmentationPrompt(index)}
                                className={`flex items-center justify-between rounded-lg border px-2 py-1.5 text-xs ${
                                  prompt.label === 1
                                    ? "border-emerald-300 text-emerald-800"
                                    : "border-rose-300 text-rose-800"
                                }`}
                              >
                                <span>
                                  {prompt.label === 1 ? "+ Include" : "− Exclude"} {index + 1}
                                </span>
                                <span aria-hidden="true">×</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={!segmentationPreview || detectingObject}
                          onClick={() => {
                            if (!segmentationPreview) return;
                            patchHotspot(selected.id, {
                              visualShape: segmentationPreview,
                              highlight: selected.highlight ?? DEFAULT_OBJECT_HIGHLIGHT,
                            });
                            stopSegmentation();
                            setNotice("Precise object highlight saved.");
                          }}
                          className="rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-40"
                        >
                          Accept outline
                        </button>
                        <button
                          type="button"
                          onClick={stopSegmentation}
                          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800"
                        >
                          Cancel
                        </button>
                      </div>
                      {segmentationPrompts.length > 0 ? (
                        <button
                          type="button"
                          onClick={clearSegmentationPrompts}
                          className="w-full text-xs text-stone-500 hover:text-stone-800"
                        >
                          Remove all refinement points
                        </button>
                      ) : null}
                    </div>
                  )}
                  {selected.visualShape && !segmentationMode ? (
                    <div className="mt-4 space-y-3">
                      <label className="block text-xs text-stone-600">
                        Highlight style
                        <select
                          className={inputClass}
                          value={
                            selected.highlight?.style ?? DEFAULT_OBJECT_HIGHLIGHT.style
                          }
                          onChange={(event) =>
                            patchHotspot(selected.id, {
                              highlight: {
                                ...(selected.highlight ?? DEFAULT_OBJECT_HIGHLIGHT),
                                style: event.target.value as
                                  | "outline"
                                  | "soft-glow"
                                  | "spotlight-outline",
                              },
                            })
                          }
                        >
                          <option value="spotlight-outline">Spotlight + outline</option>
                          <option value="soft-glow">Soft glow</option>
                          <option value="outline">Outline only</option>
                        </select>
                      </label>
                      <label className="block text-xs text-stone-600">
                        Highlight color
                        <input
                          type="color"
                          className="mt-1 h-9 w-full rounded border border-stone-300"
                          value={
                            selected.highlight?.color ?? DEFAULT_OBJECT_HIGHLIGHT.color
                          }
                          onChange={(event) =>
                            patchHotspot(selected.id, {
                              highlight: {
                                ...(selected.highlight ?? DEFAULT_OBJECT_HIGHLIGHT),
                                color: event.target.value,
                              },
                            })
                          }
                        />
                      </label>
                    </div>
                  ) : null}
                </section>

                <section>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                      Dialogue card
                    </h2>
                    <span className="text-[11px] text-stone-500">
                      {selectedDialogue.turns.length} turn
                      {selectedDialogue.turns.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <label className="mt-3 block text-xs text-stone-600">
                    Card title
                    <input
                      className={inputClass}
                      value={selectedDialogue.title}
                      onChange={(event) => patchDialogue({ title: event.target.value })}
                    />
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-[11px] text-stone-700 hover:bg-stone-50"
                      onClick={() => applyTurnTemplate("ask-answer")}
                    >
                      Ask + answer
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-[11px] text-stone-700 hover:bg-stone-50"
                      onClick={() => applyTurnTemplate("one-line")}
                    >
                      1 line
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-stone-300 px-2.5 py-1.5 text-[11px] text-stone-700 hover:bg-stone-50"
                      onClick={() => applyTurnTemplate("three-turn")}
                    >
                      3 turns
                    </button>
                  </div>
                  {selectedDialogue.turns.map((turn, index) => (
                    <div
                      key={index}
                      className="mt-3 rounded-lg border border-stone-200 bg-stone-50/80 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                          Turn {index + 1}
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label={`Move turn ${index + 1} up`}
                            disabled={index === 0}
                            className="rounded px-1.5 py-0.5 text-xs text-stone-500 hover:bg-stone-200 disabled:opacity-30"
                            onClick={() => moveTurn(index, -1)}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            aria-label={`Move turn ${index + 1} down`}
                            disabled={index === selectedDialogue.turns.length - 1}
                            className="rounded px-1.5 py-0.5 text-xs text-stone-500 hover:bg-stone-200 disabled:opacity-30"
                            onClick={() => moveTurn(index, 1)}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove turn ${index + 1}`}
                            disabled={selectedDialogue.turns.length <= 1}
                            className="rounded px-1.5 py-0.5 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-30"
                            onClick={() => removeTurn(index)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <label className="block text-xs text-stone-600">
                        Speaker
                        <input
                          className={inputClass}
                          value={turn.speaker}
                          onChange={(event) =>
                            patchDialogue({
                              turns: selectedDialogue.turns.map((item, turnIndex) =>
                                turnIndex === index
                                  ? { ...item, speaker: event.target.value }
                                  : item,
                              ),
                            })
                          }
                        />
                      </label>
                      <label className="mt-2 block text-xs text-stone-600">
                        Line
                        <textarea
                          rows={2}
                          className={inputClass}
                          value={turn.text}
                          onChange={(event) =>
                            patchDialogue({
                              turns: selectedDialogue.turns.map((item, turnIndex) =>
                                turnIndex === index
                                  ? { ...item, text: event.target.value }
                                  : item,
                              ),
                            })
                          }
                        />
                      </label>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="mt-3 w-full rounded-lg border border-dashed border-stone-300 px-3 py-2 text-sm text-stone-800 hover:border-sky-400 hover:bg-sky-50/50"
                    onClick={addTurn}
                  >
                    + Add turn
                  </button>
                  {selectedDialogue.turns.length >= 8 ? (
                    <p className="mt-2 text-[11px] leading-relaxed text-amber-800">
                      Long dialogues can be hard for A1 listeners. Consider splitting into
                      another hotspot.
                    </p>
                  ) : null}
                </section>
              </div>
            ) : (
              <p className="text-sm text-stone-500">
                Select a hotspot to edit its label, geometry, and dialogue.
              </p>
            )}
          </aside>
        </div>
      ) : (
        <section className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
          <div className="mx-auto min-h-[min(75dvh,640px)] max-w-5xl">
            {validation.ok && previewScreens ? (
              <LessonPlayer
                key={previewGeneration}
                lessonId={lessonId}
                lessonTitle={document.name}
                screens={previewScreens}
                mode="preview"
              />
            ) : (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
                Preview unavailable:{" "}
                {validation.ok
                  ? "Could not build the learner preview from this document."
                  : validation.message}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
