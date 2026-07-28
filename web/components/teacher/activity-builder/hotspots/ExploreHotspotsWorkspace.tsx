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
  createBlankExploreHotspotsDocument,
  hotspotGeometrySeedPoints,
  listStudioExploreHotspots,
  saveExploreHotspotsToStudio,
  useHotspotSamModel,
  validateExploreHotspotsDocument,
  buildHotspotClipboardPayload,
  imageFileFromClipboardData,
  imageFileFromSystemClipboard,
  insertHotspotClipboardPayload,
  isEditableKeyboardTarget,
  parseHotspotClipboardPayload,
  type DialogueTurn,
  type ExploreHotspotsDocument,
  type HotspotClipboardPayload,
  type HotspotElement,
  type HotspotGeometry,
  type HotspotVisualShape,
  type NormalizedPoint,
  type NormalizedSamPrompt,
  type StudioExploreHotspotsRef,
} from "@/lib/hotspots";
import {
  duplicateImageAsset,
  ensurePhases,
  forkPhaseImageAsset,
  hotspotsForPhase,
  movePhaseInDocument,
  nextPhaseId,
  nextPhaseImageAssetId,
  withEnsuredPhases,
} from "@/lib/hotspots/phases";
import {
  normalizedSpriteAspect,
  prepareSpriteImage,
  removeSpriteSolidBackground,
} from "@/lib/hotspots/sprite-background";
import { defaultSpriteGeometry, isShapeHotspot, isSpriteHotspot, isTextHotspot } from "@/lib/hotspots/sprites";
import {
  nextZIndex,
  reorderZIndex,
  type LayerReorderDirection,
} from "@/lib/hotspots/layers";
import type {
  WkeObjectAction,
  WkeObjectInteractionKind,
  WkePhase,
  WkeResponseCard,
} from "@/lib/wke-activity/types";
import {
  resolveOnTapActions,
  responseCardToAction,
  syncResponseCardsFromOnTap,
} from "@/lib/wke-activity/on-tap-actions";
import { wkeActivityToLessonScreen } from "@/lib/wke-activity";
import {
  HotspotMediaCanvas,
  type HotspotCanvasTool,
} from "./HotspotMediaCanvas";
import { ExploreHotspotsStartup } from "./ExploreHotspotsStartup";
import {
  getExploreHotspotsLibraryRef,
  loadExploreHotspotsLibraryExample,
} from "@/lib/hotspots/wke-library";
import { HotspotObjectTray } from "./HotspotObjectTray";
import { HotspotAnimationsPanel } from "./HotspotAnimationsPanel";
import { HotspotSceneEnterTimeline } from "./HotspotSceneEnterTimeline";
import { SCENE_ENTER_AUDIO_ID } from "@/lib/hotspots/scene-enter";
import { AudioClipControls } from "@/components/teacher/activity-builder/AudioClipControls";
import {
  recordAppDiagnostic,
  startAppDiagnosticSpan,
} from "@/lib/app-diagnostics/client";

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
  const deepLinkActivityId = searchParams.get("activity");

  useEffect(() => {
    recordAppDiagnostic("teacher", "mark", "hotspots_workspace_ready");
  }, []);

  const [sessionStarted, setSessionStarted] = useState(false);
  const [openingDeepLink, setOpeningDeepLink] = useState(!!deepLinkActivityId);
  const [document, setDocument] = useState<ExploreHotspotsDocument>(() =>
    cloneDocument(createBlankExploreHotspotsDocument()),
  );
  const [mode, setMode] = useState<"layout" | "preview">("layout");
  const [rightPanelTab, setRightPanelTab] = useState<"properties" | "animations">(
    "properties",
  );
  const [motionPreviewEnabled, setMotionPreviewEnabled] = useState(false);
  const [tool, setTool] = useState<HotspotCanvasTool>("select");
  const [selectedId, setSelectedId] = useState<string | null>("hotspot-1");
  const [notice, setNotice] = useState<string | null>(null);
  const [flash, setFlash] = useState<{
    id: number;
    tone: "amber" | "emerald" | "rose";
    message: string;
  } | null>(null);
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
  const [bankListBusy, setBankListBusy] = useState(false);
  const [showBankPanel, setShowBankPanel] = useState(false);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);
  const [spriteBgBusy, setSpriteBgBusy] = useState(false);
  const openRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const spriteRef = useRef<HTMLInputElement>(null);
  const segmentationRequestRef = useRef(0);
  const documentRef = useRef(document);
  documentRef.current = document;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const historyRef = useRef<ExploreHotspotsDocument[]>([]);
  const objectClipboardRef = useRef<HotspotClipboardPayload | null>(null);
  const { samStatus, samReady, samError, retrySam } =
    useHotspotSamModel(segmentationMode);

  const phases = ensurePhases(document);
  const resolvedPhaseId = activePhaseId ?? phases[0]?.id ?? null;
  const activePhase =
    phases.find((phase) => phase.id === resolvedPhaseId) ?? phases[0] ?? null;
  const phaseAsset =
    document.assets.find((asset) => asset.id === activePhase?.imageAssetId) ??
    document.assets.find((asset) => asset.kind === "image")!;
  const media = phaseAsset;
  const hotspots = hotspotsForPhase(document, resolvedPhaseId);
  const allHotspots = document.layout.elements.filter(
    (element): element is HotspotElement => element.kind === "hotspot",
  );
  const selected = allHotspots.find((hotspot) => hotspot.id === selectedId) ?? null;
  const selectedDialogue =
    document.interaction.dialogues.find(
      (dialogue) => dialogue.hotspotId === selectedId,
    ) ?? null;

  const spriteSources = useMemo(() => {
    const sources: Record<string, string> = {};
    for (const hotspot of hotspots) {
      if (!isSpriteHotspot(hotspot) || !hotspot.spriteAssetId) continue;
      const asset = document.assets.find((entry) => entry.id === hotspot.spriteAssetId);
      if (asset?.src) sources[hotspot.id] = asset.src;
    }
    return sources;
  }, [hotspots, document.assets]);

  const spriteAspectRatios = useMemo(() => {
    const mediaSize = media.intrinsicSize ?? { width: 16, height: 9 };
    const ratios: Record<string, number> = {};
    for (const hotspot of hotspots) {
      if (!isSpriteHotspot(hotspot) || !hotspot.spriteAssetId) continue;
      const asset = document.assets.find((entry) => entry.id === hotspot.spriteAssetId);
      const spriteW = asset?.intrinsicSize?.width ?? 1;
      const spriteH = asset?.intrinsicSize?.height ?? 1;
      ratios[hotspot.id] = normalizedSpriteAspect(
        spriteW,
        spriteH,
        mediaSize.width,
        mediaSize.height,
      );
    }
    return ratios;
  }, [hotspots, document.assets, media.intrinsicSize]);

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

  useEffect(() => {
    if (!notice) return;
    setFlash({ id: Date.now(), tone: "amber", message: notice });
  }, [notice]);

  useEffect(() => {
    setFlash({
      id: Date.now(),
      tone: validation.ok ? "emerald" : "rose",
      message: validation.message,
    });
  }, [validation.ok, validation.message]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => {
      setFlash(null);
      setNotice(null);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [flash]);

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
    setBankListBusy(true);
    const finish = startAppDiagnosticSpan("teacher", "hotspots", "bank_list");
    try {
      const entries = await listStudioExploreHotspots();
      setBankEntries(entries);
      finish({ count: entries.length });
    } catch (error) {
      setBankEntries([]);
      finish(undefined, error);
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not load hotspot activities from Activity Bank.",
      );
    } finally {
      setBankListBusy(false);
    }
  };

  // Prefetch bank metadata while the chooser is visible so "Load from bank" feels instant.
  useEffect(() => {
    if (sessionStarted || deepLinkActivityId) return;
    void refreshBank();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const pushHistory = () => {
    historyRef.current = [
      ...historyRef.current.slice(-49),
      cloneDocument(documentRef.current),
    ];
  };

  const applyDocument = (
    next: ExploreHotspotsDocument,
    options?: { bankActivityId?: string | null; notice?: string; clone?: boolean },
  ) => {
    stopSegmentation();
    setDocument(options?.clone === false ? next : cloneDocument(next));
    setActivePhaseId(ensurePhases(next)[0]?.id ?? null);
    setSelectedId(
      next.layout.elements.find((element) => element.kind === "hotspot")?.id ?? null,
    );
    setBankActivityId(options?.bankActivityId ?? null);
    setMode("layout");
    setShowBankPanel(false);
    setSessionStarted(true);
    if (options?.notice) setNotice(options.notice);
  };

  const startNewActivity = () => {
    applyDocument(createBlankExploreHotspotsDocument(), {
      notice: "Started a new explore-hotspots activity.",
    });
  };

  const loadFromBank = async (activityId: string) => {
    setBankBusy(true);
    const finish = startAppDiagnosticSpan("teacher", "hotspots", "bank_load", {
      activityId,
    });
    try {
      const loaded = await getStudioExploreHotspots(activityId);
      applyDocument(loaded.document, {
        bankActivityId: loaded.id,
        notice: `Opened “${loaded.document.name}” from Activity Bank.`,
        clone: false,
      });
      finish({ name: loaded.document.name });
    } catch (error) {
      finish(undefined, error);
      setNotice(
        error instanceof Error ? error.message : "Could not open hotspot activity.",
      );
    } finally {
      setBankBusy(false);
    }
  };

  useEffect(() => {
    if (!deepLinkActivityId) return;
    void loadFromBank(deepLinkActivityId).finally(() => setOpeningDeepLink(false));
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

  const reorderLayer = (id: string, direction: LayerReorderDirection) => {
    const updates = reorderZIndex(hotspots, id, direction);
    if (!updates) return;
    pushHistory();
    setDocument((current) => ({
      ...current,
      layout: {
        ...current.layout,
        elements: current.layout.elements.map((element) => {
          if (element.kind !== "hotspot") return element;
          const zIndex = updates[element.id];
          return zIndex != null
            ? ({ ...element, zIndex } as HotspotElement)
            : element;
        }),
      },
    }));
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
    const finish = startAppDiagnosticSpan("teacher", "hotspots", "detect_contour", {
      promptCount: nextPrompts.length,
      useAutoSeeds: nextUseAutoSeeds,
      geometry: selected.geometry.shape,
    });
    try {
      const result = await detectActivityHotspotContour(
        media,
        nextPrompts,
        selected.geometry,
        { useAutoSeeds: nextUseAutoSeeds },
      );
      if (segmentationRequestRef.current !== request) {
        finish({ cancelled: true });
        return;
      }
      setSegmentationPreview(result.visualShape);
      setAutoSeedPoints(result.usedAutoSeeds);
      finish({
        score: result.visualShape.score ?? null,
        pathCount: result.visualShape.paths.length,
        droppedAutoSeeds: result.droppedAutoSeeds.length,
      });
      const droppedNote =
        result.droppedAutoSeeds.length > 0
          ? ` · dropped ${result.droppedAutoSeeds.length} hole seed${result.droppedAutoSeeds.length === 1 ? "" : "s"}`
          : "";
      setNotice(
        `Object outline ready${result.visualShape.score ? ` · confidence ${Math.round(result.visualShape.score * 100)}%` : ""}${droppedNote}. Review it, refine it, then accept.`,
      );
    } catch (error) {
      if (segmentationRequestRef.current !== request) {
        finish({ cancelled: true });
        return;
      }
      setSegmentationPreview(null);
      finish(undefined, error);
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
    pushHistory();
    let number = allHotspots.length + 1;
    while (allHotspots.some((hotspot) => hotspot.id === `hotspot-${number}`)) number += 1;
    const id = `hotspot-${number}`;
    const name = `Object ${number}`;
    const zIndex = nextZIndex(hotspots);
    setDocument((current) => {
      const withPhases = withEnsuredPhases(current);
      const targetPhaseId =
        resolvedPhaseId ?? ensurePhases(withPhases)[0]?.id ?? null;
      const nextPhases = ensurePhases(withPhases).map((phase) =>
        phase.id === targetPhaseId
          ? { ...phase, hotspotIds: [...phase.hotspotIds, id] }
          : phase,
      );
      return {
        ...withPhases,
        layout: {
          ...withPhases.layout,
          elements: [
            ...withPhases.layout.elements,
            {
              id,
              kind: "hotspot" as const,
              regionId: "main-media",
              name,
              accessibleLabel: `${name} in the activity picture`,
              geometry,
              tabOrder: allHotspots.length + 1,
              required: true,
              interactionKind: "dialogue" as const,
              presentation: "target" as const,
              orderIndex: hotspots.length,
              zIndex,
              initialState: "available" as const,
            },
          ],
        },
        interaction: {
          ...withPhases.interaction,
          phases: nextPhases,
          dialogues: [
            ...withPhases.interaction.dialogues,
            {
              id: `dialogue-${id}`,
              hotspotId: id,
              title: name,
              turns: [
                { speaker: "AJ", text: "What is this?" },
                { speaker: "Student", text: "It is…" },
              ],
            },
          ],
        },
      };
    });
    setSelectedId(id);
    setTool("select");
  };

  const nextObjectId = (prefix: string) => {
    let number = allHotspots.length + 1;
    while (allHotspots.some((hotspot) => hotspot.id === `${prefix}-${number}`)) {
      number += 1;
    }
    return `${prefix}-${number}`;
  };

  const insertPanelObject = (kind: "shape" | "text" | "hotspot") => {
    if (kind === "hotspot") {
      createHotspot({
        shape: "rectangle",
        x: 0.35,
        y: 0.35,
        width: 0.28,
        height: 0.22,
      });
      return;
    }

    pushHistory();
    const id = nextObjectId(kind);
    const name = kind === "text" ? "Text" : "Shape";
    const zIndex = nextZIndex(hotspots);
    const geometry =
      kind === "text"
        ? { shape: "rectangle" as const, x: 0.3, y: 0.4, width: 0.4, height: 0.1 }
        : { shape: "rectangle" as const, x: 0.38, y: 0.35, width: 0.24, height: 0.2 };

    setDocument((current) => {
      const withPhases = withEnsuredPhases(current);
      const targetPhaseId =
        resolvedPhaseId ?? ensurePhases(withPhases)[0]?.id ?? null;
      const nextPhases = ensurePhases(withPhases).map((phase) =>
        phase.id === targetPhaseId
          ? { ...phase, hotspotIds: [...phase.hotspotIds, id] }
          : phase,
      );
      return {
        ...withPhases,
        layout: {
          ...withPhases.layout,
          elements: [
            ...withPhases.layout.elements,
            {
              id,
              kind: "hotspot" as const,
              regionId: "main-media",
              name,
              accessibleLabel: name,
              geometry,
              tabOrder: allHotspots.length + 1,
              required: false,
              interactionKind: "none" as const,
              presentation: kind,
              orderIndex: hotspots.length,
              zIndex,
              initialState: "available" as const,
              ...(kind === "text" ? { labelText: "New text" } : {}),
              highlight: {
                ...DEFAULT_OBJECT_HIGHLIGHT,
                color: kind === "text" ? "#1c1917" : "#38bdf8",
                style: "outline" as const,
              },
            },
          ],
        },
        interaction: {
          ...withPhases.interaction,
          phases: nextPhases,
        },
      };
    });
    setSelectedId(id);
    setTool("select");
    setNotice(
      kind === "text"
        ? "Added a text overlay. Edit the wording in Object properties."
        : "Added a shape overlay. Edit fill color in Object properties.",
    );
  };

  const removeSelectedSpriteBackground = async () => {
    if (!selected || !isSpriteHotspot(selected) || !selected.spriteAssetId) return;
    const asset = document.assets.find((entry) => entry.id === selected.spriteAssetId);
    if (!asset?.src) return;
    setSpriteBgBusy(true);
    const finish = startAppDiagnosticSpan("teacher", "hotspots", "sprite_bg_remove");
    try {
      const keyed = await removeSpriteSolidBackground(asset.src);
      setDocument((current) => ({
        ...current,
        assets: current.assets.map((entry) =>
          entry.id === selected.spriteAssetId
            ? {
                ...entry,
                src: keyed.src,
                intrinsicSize: { width: keyed.width, height: keyed.height },
              }
            : entry,
        ),
      }));
      finish({ width: keyed.width, height: keyed.height });
      setNotice("Removed solid background from PNG.");
    } catch (error) {
      finish(undefined, error);
      setNotice(
        error instanceof Error ? error.message : "Could not remove background.",
      );
    } finally {
      setSpriteBgBusy(false);
    }
  };

  const addSpriteFromFile = async (file: File) => {
    const finish = startAppDiagnosticSpan("teacher", "hotspots", "sprite_prepare", {
      fileName: file.name,
      fileSize: file.size,
    });
    try {
      const loaded = await readImage(file);
      const next = await prepareSpriteImage(loaded.src);
      finish({ width: next.width, height: next.height });
      const currentDoc = documentRef.current;
      const currentHotspots = currentDoc.layout.elements.filter(
        (element) => element.kind === "hotspot",
      );
      let number = currentHotspots.length + 1;
      let id = `sprite-${number}`;
      let assetId = `sprite-asset-${number}`;
      const usedIds = new Set([
        ...currentHotspots.map((hotspot) => hotspot.id),
        ...currentDoc.assets.map((asset) => asset.id),
      ]);
      while (usedIds.has(id) || usedIds.has(assetId)) {
        number += 1;
        id = `sprite-${number}`;
        assetId = `sprite-asset-${number}`;
      }
      const name = `Prop ${number}`;
      const phaseAsset =
        currentDoc.assets.find(
          (asset) =>
            asset.id ===
            (ensurePhases(currentDoc).find((phase) => phase.id === resolvedPhaseId)
              ?.imageAssetId ?? ""),
        ) ?? currentDoc.assets.find((asset) => asset.kind === "image");
      const mediaSize = phaseAsset?.intrinsicSize ?? { width: 16, height: 9 };
      const geometry = defaultSpriteGeometry(
        next.width,
        next.height,
        mediaSize.width,
        mediaSize.height,
      );
      pushHistory();
      setDocument((current) => {
        const withPhases = withEnsuredPhases(current);
        const targetPhaseId =
          resolvedPhaseId ?? ensurePhases(withPhases)[0]?.id ?? null;
        const phaseHotspots = hotspotsForPhase(withPhases, targetPhaseId);
        const phaseHotspotCount = phaseHotspots.length;
        const zIndex = nextZIndex(phaseHotspots);
        const nextPhases = ensurePhases(withPhases).map((phase) =>
          phase.id === targetPhaseId
            ? { ...phase, hotspotIds: [...phase.hotspotIds, id] }
            : phase,
        );
        return {
          ...withPhases,
          assets: [
            ...withPhases.assets,
            {
              id: assetId,
              kind: "image" as const,
              src: next.src,
              mimeType: file.type || "image/png",
              alt: file.name,
              intrinsicSize: { width: next.width, height: next.height },
            },
          ],
          layout: {
            ...withPhases.layout,
            elements: [
              ...withPhases.layout.elements,
              {
                id,
                kind: "hotspot" as const,
                regionId: "main-media",
                name,
                accessibleLabel: name,
                geometry,
                tabOrder: currentHotspots.length + 1,
                required: false,
                presentation: "sprite" as const,
                spriteAssetId: assetId,
                interactionKind: "silent" as const,
                orderIndex: phaseHotspotCount,
                zIndex,
                initialState: "available" as const,
              },
            ],
          },
          interaction: {
            ...withPhases.interaction,
            phases: nextPhases,
          },
        };
      });
      setSelectedId(id);
      setTool("select");
      setNotice(
        file.name.startsWith("pasted-image")
          ? "Pasted image as a PNG object on this scene."
          : `Added ${file.name} as a PNG object. Drag the handles to position it.`,
      );
    } catch (error) {
      finish(undefined, error);
      setNotice(error instanceof Error ? error.message : "Could not import the PNG.");
    }
  };

  const removeSelected = () => {
    const id = selectedIdRef.current;
    if (!id) return;
    const currentDoc = documentRef.current;
    const hotspotCount = currentDoc.layout.elements.filter(
      (element) => element.kind === "hotspot",
    ).length;
    if (hotspotCount <= 1) {
      setNotice("Keep at least one object. Draw a new one before deleting this.");
      return;
    }
    pushHistory();
    const phaseHotspotIds = new Set(
      hotspotsForPhase(currentDoc, resolvedPhaseId).map((hotspot) => hotspot.id),
    );
    setDocument((current) => {
      const withPhases = withEnsuredPhases(current);
      return {
        ...withPhases,
        layout: {
          ...withPhases.layout,
          elements: withPhases.layout.elements.filter(
            (element) => element.id !== id,
          ),
        },
        interaction: {
          ...withPhases.interaction,
          dialogues: withPhases.interaction.dialogues.filter(
            (dialogue) => dialogue.hotspotId !== id,
          ),
          phases: ensurePhases(withPhases).map((phase) => ({
            ...phase,
            hotspotIds: phase.hotspotIds.filter((hotspotId) => hotspotId !== id),
          })),
        },
      };
    });
    stopSegmentation();
    const fallback =
      [...phaseHotspotIds].find((hotspotId) => hotspotId !== id) ??
      currentDoc.layout.elements.find(
        (element) => element.kind === "hotspot" && element.id !== id,
      )?.id ??
      null;
    setSelectedId(fallback);
  };

  const undoLastChange = () => {
    const previous = historyRef.current.pop();
    if (!previous) {
      setNotice("Nothing to undo.");
      return;
    }
    stopSegmentation();
    setDocument(previous);
    setSelectedId(null);
    setTool("select");
    setNotice("Undid last change.");
  };

  const copySelectedObject = async () => {
    const id = selectedIdRef.current;
    if (!id) {
      setNotice("Select an object to copy.");
      return;
    }
    const payload = buildHotspotClipboardPayload(documentRef.current, id);
    if (!payload) {
      setNotice("Could not copy that object.");
      return;
    }
    objectClipboardRef.current = payload;
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload));
    } catch {
      // Internal clipboard still works if system clipboard is blocked.
    }
    setNotice("Object copied.");
  };

  const pasteObjectPayload = (payload: HotspotClipboardPayload) => {
    pushHistory();
    const inserted = insertHotspotClipboardPayload(documentRef.current, payload, {
      phaseId: resolvedPhaseId,
      offset: true,
    });
    setDocument(inserted.document);
    setSelectedId(inserted.newId);
    setTool("select");
    setNotice("Pasted object.");
  };

  const pasteFromInternalOrText = async (text?: string | null) => {
    if (text?.trim()) {
      try {
        const parsed = parseHotspotClipboardPayload(JSON.parse(text));
        if (parsed) {
          objectClipboardRef.current = parsed;
          pasteObjectPayload(parsed);
          return true;
        }
      } catch {
        // Not an object payload — fall through to internal clipboard.
      }
    }
    if (objectClipboardRef.current) {
      pasteObjectPayload(objectClipboardRef.current);
      return true;
    }
    return false;
  };

  const duplicateSelectedObject = () => {
    const id = selectedIdRef.current;
    if (!id) {
      setNotice("Select an object to duplicate.");
      return;
    }
    const payload = buildHotspotClipboardPayload(documentRef.current, id);
    if (!payload) return;
    objectClipboardRef.current = payload;
    pasteObjectPayload(payload);
    setNotice("Duplicated object.");
  };

  useEffect(() => {
    if (!sessionStarted || mode !== "layout") return;

    const onKeyDown = (event: KeyboardEvent) => {
      const editable = isEditableKeyboardTarget(event.target);
      const mod = event.metaKey || event.ctrlKey;

      if (event.key === "Escape") {
        event.preventDefault();
        stopSegmentation();
        setSelectedId(null);
        setTool("select");
        const active = window.document.activeElement;
        if (active instanceof HTMLElement) active.blur();
        return;
      }

      if (editable) return;

      if ((event.key === "Delete" || event.key === "Backspace") && selectedIdRef.current) {
        event.preventDefault();
        removeSelected();
        return;
      }

      if (!mod) return;

      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undoLastChange();
        return;
      }
      if (key === "c") {
        event.preventDefault();
        void copySelectedObject();
        return;
      }
      if (key === "d") {
        event.preventDefault();
        duplicateSelectedObject();
        return;
      }
      if (key === "v") {
        event.preventDefault();
        void (async () => {
          const image = await imageFileFromSystemClipboard();
          if (image) {
            await addSpriteFromFile(image);
            return;
          }
          let text: string | null = null;
          try {
            text = await navigator.clipboard.readText();
          } catch {
            text = null;
          }
          const pasted = await pasteFromInternalOrText(text);
          if (!pasted) setNotice("Clipboard has nothing to paste here.");
        })();
      }
    };

    const onPaste = (event: ClipboardEvent) => {
      if (isEditableKeyboardTarget(event.target)) return;
      void (async () => {
        const image = await imageFileFromClipboardData(event.clipboardData);
        if (image) {
          event.preventDefault();
          await addSpriteFromFile(image);
          return;
        }
        const text = event.clipboardData?.getData("text/plain");
        const pasted = await pasteFromInternalOrText(text);
        if (pasted) event.preventDefault();
      })();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("paste", onPaste);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStarted, mode, resolvedPhaseId]);

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
    const finish = startAppDiagnosticSpan("teacher", "hotspots", "bank_save", {
      activityId: bankActivityId,
      hotspotCount: allHotspots.length,
    });
    try {
      const entry = await saveExploreHotspotsToStudio({
        activityId: bankActivityId,
        document,
      });
      setBankActivityId(entry.id);
      setNotice(`Saved “${entry.name}” to Activity Bank.`);
      await refreshBank();
      finish({ savedId: entry.id });
    } catch (error) {
      finish(undefined, error);
      setNotice(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBankBusy(false);
    }
  };

  const openDocumentFile = async (file: File) => {
    try {
      const loaded = validateExploreHotspotsDocument(JSON.parse(await file.text()));
      applyDocument(loaded, { notice: `Opened ${file.name}.` });
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not open the activity.",
      );
    }
  };

  const openLibraryExample = async (exampleId: string) => {
    setBankBusy(true);
    const finish = startAppDiagnosticSpan("teacher", "hotspots", "library_open", {
      exampleId,
    });
    try {
      const loaded = await loadExploreHotspotsLibraryExample(exampleId);
      const ref = getExploreHotspotsLibraryRef(exampleId);
      applyDocument(loaded, {
        notice: `Opened “${ref?.title ?? loaded.name}” from WKE Library.`,
      });
      finish({ name: loaded.name });
    } catch (error) {
      finish(undefined, error);
      setNotice(
        error instanceof Error ? error.message : "Could not open library example.",
      );
    } finally {
      setBankBusy(false);
    }
  };

  const replaceImage = async (file: File) => {
    try {
      const next = await readImage(file);
      stopSegmentation();
      const activePhaseId = activePhase?.id ?? null;
      const phaseHotspotIds = new Set(activePhase?.hotspotIds ?? []);
      setDocument((current) => {
        let withPhases = withEnsuredPhases(current);
        if (activePhaseId) {
          withPhases = forkPhaseImageAsset(withPhases, activePhaseId);
        }
        const resolvedPhase = activePhaseId
          ? ensurePhases(withPhases).find((phase) => phase.id === activePhaseId)
          : null;
        const targetAssetId =
          resolvedPhase?.imageAssetId ??
          withPhases.assets.find((asset) => asset.kind === "image")?.id;
        if (!targetAssetId) return withPhases;
        return {
          ...withPhases,
          assets: withPhases.assets.map((asset) =>
            asset.id === targetAssetId
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
            ...withPhases.layout,
            elements: withPhases.layout.elements.map((element) =>
              element.kind === "hotspot" &&
              (phaseHotspotIds.size === 0 || phaseHotspotIds.has(element.id))
                ? { ...element, visualShape: undefined }
                : element,
            ),
          },
        };
      });
      setNotice(
        `Imported ${file.name} (${next.width} × ${next.height}) for this scene. Outlines on this scene were cleared.`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not import the image.");
    }
  };

  const addPhase = () => {
    const nextId = nextPhaseId(phases);
    setDocument((current) => {
      const withPhases = withEnsuredPhases(current);
      const currentPhases = ensurePhases(withPhases);
      const sourcePhase =
        activePhase ??
        currentPhases[0] ??
        null;
      const sourceAssetId =
        sourcePhase?.imageAssetId ??
        withPhases.assets.find((asset) => asset.kind === "image")?.id;
      if (!sourceAssetId) return withPhases;
      const newAssetId = nextPhaseImageAssetId(withPhases);
      const withAsset = duplicateImageAsset(withPhases, sourceAssetId, newAssetId);
      return {
        ...withAsset,
        interaction: {
          ...withAsset.interaction,
          phases: [
            ...currentPhases,
            {
              id: nextId,
              title: `Scene ${currentPhases.length + 1}`,
              imageAssetId: newAssetId,
              hotspotIds: [],
              ...(sourcePhase?.objective
                ? { objective: sourcePhase.objective }
                : withAsset.interaction.objective
                  ? { objective: withAsset.interaction.objective }
                  : {}),
              strictOrder:
                sourcePhase?.strictOrder ?? withAsset.interaction.strictOrder,
              hintPulseEnabled:
                sourcePhase?.hintPulseEnabled ??
                withAsset.interaction.hintPulseEnabled,
              visitedWhen:
                sourcePhase?.visitedWhen ?? withAsset.interaction.visitedWhen,
              autoPlayOnSelect:
                sourcePhase?.autoPlayOnSelect ??
                withAsset.interaction.autoPlayOnSelect,
            },
          ],
        },
      };
    });
    setActivePhaseId(nextId);
    setSelectedId(null);
    setNotice("Added a new scene. Replace the image and draw objects for this phase.");
  };

  const removeActivePhase = () => {
    if (phases.length <= 1 || !activePhase) {
      setNotice("Keep at least one scene.");
      return;
    }
    const removingIds = new Set(activePhase.hotspotIds);
    setDocument((current) => {
      const withPhases = withEnsuredPhases(current);
      const remaining = ensurePhases(withPhases).filter(
        (phase) => phase.id !== activePhase.id,
      );
      return {
        ...withPhases,
        layout: {
          ...withPhases.layout,
          elements: withPhases.layout.elements.filter(
            (element) =>
              element.kind !== "hotspot" || !removingIds.has(element.id),
          ),
        },
        interaction: {
          ...withPhases.interaction,
          dialogues: withPhases.interaction.dialogues.filter(
            (dialogue) => !removingIds.has(dialogue.hotspotId),
          ),
          phases: remaining,
        },
      };
    });
    const nextPhase =
      phases.find((phase) => phase.id !== activePhase.id) ?? null;
    setActivePhaseId(nextPhase?.id ?? null);
    setSelectedId(null);
    setNotice("Removed scene and its objects.");
  };

  const patchPhase = (phaseId: string, patch: Partial<Omit<WkePhase, "id">>) => {
    setDocument((current) => {
      const withPhases = withEnsuredPhases(current);
      return {
        ...withPhases,
        interaction: {
          ...withPhases.interaction,
          phases: ensurePhases(withPhases).map((phase) =>
            phase.id === phaseId ? { ...phase, ...patch } : phase,
          ),
        },
      };
    });
  };

  const sceneEnterAudioUrl = (() => {
    const action = activePhase?.onEnter?.find(
      (entry) => entry.type === "play_audio" && entry.id === SCENE_ENTER_AUDIO_ID,
    );
    return action?.type === "play_audio" ? action.audioUrl : "";
  })();

  const setSceneEnterAudio = (url: string) => {
    if (!activePhase) return;
    const trimmed = url.trim();
    const current = activePhase.onEnter ?? [];
    const without = current.filter(
      (entry) => !(entry.type === "play_audio" && entry.id === SCENE_ENTER_AUDIO_ID),
    );
    if (!trimmed) {
      patchPhase(activePhase.id, {
        onEnter: without.length > 0 ? without : undefined,
      });
      return;
    }
    const audioAction: WkeObjectAction = {
      id: SCENE_ENTER_AUDIO_ID,
      type: "play_audio",
      audioUrl: trimmed,
      label: "Scene audio",
      wait: true,
    };
    const existingIndex = current.findIndex(
      (entry) => entry.type === "play_audio" && entry.id === SCENE_ENTER_AUDIO_ID,
    );
    if (existingIndex >= 0) {
      const next = [...current];
      next[existingIndex] = audioAction;
      patchPhase(activePhase.id, { onEnter: next });
      return;
    }
    patchPhase(activePhase.id, { onEnter: [audioAction, ...without] });
  };

  const moveActivePhase = (direction: -1 | 1) => {
    if (!activePhase) return;
    const index = phases.findIndex((phase) => phase.id === activePhase.id);
    if (index < 0) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= phases.length) return;
    setDocument((current) => movePhaseInDocument(current, activePhase.id, direction));
  };

  const ensureDialogueForSelected = () => {
    if (!selected || selectedDialogue) return;
    const id = selected.id;
    const name = selected.name ?? "Object";
    setDocument((current) => ({
      ...current,
      interaction: {
        ...current.interaction,
        dialogues: [
          ...current.interaction.dialogues,
          {
            id: `dialogue-${id}`,
            hotspotId: id,
            title: name,
            turns: [
              { speaker: "AJ", text: "What is this?" },
              { speaker: "Student", text: "It is…" },
            ],
          },
        ],
      },
    }));
  };

  const writeOnTap = (hotspotId: string, actions: WkeObjectAction[]) => {
    patchHotspot(hotspotId, {
      onTap: actions,
      responseCards: syncResponseCardsFromOnTap(actions),
    });
  };

  const selectedOnTap = selected ? resolveOnTapActions(selected) : [];

  const addResponseCard = (kind: WkeResponseCard["kind"]) => {
    if (!selected) return;
    const hotspotId = selected.id;
    const actions = resolveOnTapActions(selected);
    const id = `card-${hotspotId}-${actions.length + 1}`;
    let card: WkeResponseCard;
    switch (kind) {
      case "info":
        card = { id, kind: "info", text: "New info card" };
        break;
      case "audio":
        card = { id, kind: "audio", audioUrl: "", label: "Listen" };
        break;
      case "dialogue":
        card = { id, kind: "dialogue" };
        break;
      case "question":
        card = {
          id,
          kind: "question",
          prompt: "True or false?",
          questionType: "true_false",
          choices: [
            { id: "true", label: "True" },
            { id: "false", label: "False" },
          ],
          correctChoiceId: "true",
          gateDiscover: true,
        };
        break;
    }
    const nextActions = [...actions, responseCardToAction(card)];
    const needsDialogue =
      kind === "dialogue" &&
      !document.interaction.dialogues.some((d) => d.hotspotId === hotspotId);
    const name = selected.name ?? "Object";
    setDocument((current) => ({
      ...current,
      layout: {
        ...current.layout,
        elements: current.layout.elements.map((element) => {
          if (element.id !== hotspotId || element.kind !== "hotspot") return element;
          const hotspot = element as HotspotElement;
          return {
            ...hotspot,
            onTap: nextActions,
            responseCards: syncResponseCardsFromOnTap(nextActions),
          };
        }),
      },
      interaction: {
        ...current.interaction,
        dialogues: needsDialogue
          ? [
              ...current.interaction.dialogues,
              {
                id: `dialogue-${hotspotId}`,
                hotspotId,
                title: name,
                turns: [
                  { speaker: "AJ", text: "What is this?" },
                  { speaker: "Student", text: "It is…" },
                ],
              },
            ]
          : current.interaction.dialogues,
      },
    }));
  };

  const patchOnTapAction = (actionId: string, patch: Partial<WkeObjectAction>) => {
    if (!selected) return;
    const actions = resolveOnTapActions(selected).map((action) =>
      action.id === actionId ? ({ ...action, ...patch } as WkeObjectAction) : action,
    );
    writeOnTap(selected.id, actions);
  };

  const removeOnTapAction = (actionId: string) => {
    if (!selected) return;
    writeOnTap(
      selected.id,
      resolveOnTapActions(selected).filter((action) => action.id !== actionId),
    );
  };

  const addStageAction = (
    type:
      | "wait"
      | "set_object_state"
      | "swap_sprite_asset"
      | "tween_object"
      | "enter_object"
      | "pulse_object"
      | "complete_object",
  ) => {
    if (!selected) return;
    const actions = resolveOnTapActions(selected);
    const id = `action-${selected.id}-${actions.length + 1}`;
    const targetId = selected.id;
    const rect =
      selected.geometry.shape === "rectangle"
        ? {
            x: selected.geometry.x,
            y: selected.geometry.y,
            width: selected.geometry.width,
            height: selected.geometry.height,
          }
        : { x: 0.35, y: 0.35, width: 0.3, height: 0.3 };
    let action: WkeObjectAction;
    switch (type) {
      case "wait":
        action = { id, type: "wait", ms: 400 };
        break;
      case "set_object_state":
        action = {
          id,
          type: "set_object_state",
          targetId,
          state: "visible",
        };
        break;
      case "swap_sprite_asset":
        action = {
          id,
          type: "swap_sprite_asset",
          targetId,
          spriteAssetId: selected.spriteAssetId ?? "",
        };
        break;
      case "tween_object":
        action = {
          id,
          type: "tween_object",
          targetId,
          to: { ...rect, x: Math.min(0.7, rect.x + 0.15) },
          durationMs: 600,
          easing: "easeOut",
          wait: true,
        };
        break;
      case "enter_object":
        action = {
          id,
          type: "enter_object",
          targetId,
          to: rect,
          durationMs: 700,
          wait: true,
        };
        break;
      case "pulse_object":
        action = {
          id,
          type: "pulse_object",
          targetId,
          enabled: true,
        };
        break;
      case "complete_object":
        action = { id, type: "complete_object", targetId };
        break;
    }
    writeOnTap(selected.id, [...actions, action]);
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

  if (!sessionStarted) {
    if (openingDeepLink) {
      return (
        <div className="flex min-h-0 flex-1 items-center justify-center bg-stone-100 p-8 text-sm text-stone-500">
          Opening activity from Activity Bank…
        </div>
      );
    }
    return (
      <ExploreHotspotsStartup
        bankEntries={bankEntries}
        bankBusy={bankBusy}
        bankListBusy={bankListBusy}
        onRefreshBank={refreshBank}
        onOpenFromBank={(activityId) => void loadFromBank(activityId)}
        onOpenFile={(file) => void openDocumentFile(file)}
        onOpenLibraryExample={(exampleId) => void openLibraryExample(exampleId)}
        onStartNew={startNewActivity}
      />
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-stone-50">
      {flash ? (
        <div className="pointer-events-none absolute inset-x-0 top-14 z-40 flex justify-center px-3 sm:top-16 sm:px-4">
          <button
            type="button"
            className={`pointer-events-auto max-w-xl rounded-xl border px-4 py-2.5 text-left text-sm shadow-lg ${
              flash.tone === "amber"
                ? "border-amber-200 bg-amber-50 text-amber-950"
                : flash.tone === "emerald"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
            onClick={() => {
              setFlash(null);
              setNotice(null);
            }}
          >
            {flash.message}
          </button>
        </div>
      ) : null}

      <header className="flex shrink-0 flex-wrap items-start gap-2 border-b border-stone-200 bg-white/70 px-3 py-2.5 sm:items-center sm:px-4">
        <Link
          href="/teacher/activity-builder"
          aria-label="Back to Activity Builder"
          title="Back to Activity Builder"
          className="mt-0.5 flex shrink-0 items-center justify-center rounded-lg p-1 text-sky-800 hover:bg-sky-50 sm:mt-0"
        >
          <svg
            viewBox="0 0 24 40"
            className="h-10 w-6"
            fill="currentColor"
            aria-hidden
          >
            {/* Thick left chevron — solid block arms, no shaft */}
            <path d="M18 4 L6 20 L18 36 L22 32 L13 20 L22 8 Z" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1 basis-[16rem]">
          <div className="flex flex-wrap items-center gap-2">
            <input
              aria-label="Activity name"
              className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1.5 py-0.5 text-base font-semibold text-stone-900 outline-none hover:border-stone-200 focus:border-sky-300 focus:bg-white"
              value={document.name}
              placeholder="Activity name"
              onChange={(event) =>
                setDocument({ ...document, name: event.target.value })
              }
            />
            <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-500">
              {bankActivityId ? "In Activity Bank" : "Unsaved"}
            </span>
          </div>
          <input
            aria-label="Shown to students"
            className="mt-0.5 w-full rounded-lg border border-transparent bg-transparent px-1.5 py-0.5 text-sm text-stone-600 outline-none placeholder:text-stone-400 hover:border-stone-200 focus:border-sky-300 focus:bg-white"
            value={document.content.instruction}
            placeholder="Shown to students…"
            onChange={(event) =>
              setDocument({
                ...document,
                content: { ...document.content, instruction: event.target.value },
              })
            }
          />
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
        <input
          ref={spriteRef}
          hidden
          type="file"
          accept="image/png,image/webp,image/gif"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (file) await addSpriteFromFile(file);
            event.target.value = "";
          }}
        />
      </header>

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

      {mode === "layout" ? (
        <div className="grid min-h-0 flex-1 lg:grid-cols-[300px_minmax(0,1fr)_300px]">
          <aside className="min-h-0 overflow-y-auto border-r border-stone-200 bg-white p-3 sm:p-4">
            <section className="rounded-xl border border-stone-200 bg-stone-50/80 p-3">
              <h2 className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
                Scene settings
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 hover:bg-stone-50 disabled:opacity-40"
                  disabled={!activePhase}
                  onClick={() => imageRef.current?.click()}
                >
                  Change scene background
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 hover:bg-stone-50"
                  onClick={() => spriteRef.current?.click()}
                >
                  Insert PNG sprite
                </button>
              </div>
              <div className="mt-3">
                <AudioClipControls
                  label="Scene open audio"
                  hint="Shortcut for the first scene-open audio step. Full sequence is below."
                  value={sceneEnterAudioUrl}
                  disabled={!activePhase}
                  onChange={setSceneEnterAudio}
                />
              </div>
              <div className="mt-3 border-t border-stone-200 pt-3">
                <HotspotSceneEnterTimeline
                  actions={activePhase?.onEnter ?? []}
                  phaseHotspots={hotspots}
                  inputClass={inputClass}
                  disabled={!activePhase}
                  onPreviewSceneOpen={togglePreview}
                  onChange={(onEnter) => {
                    if (!activePhase) return;
                    patchPhase(activePhase.id, {
                      onEnter: onEnter.length > 0 ? onEnter : undefined,
                    });
                  }}
                />
              </div>
              <label className="mt-3 block text-xs text-stone-600">
                Objectives - for students
                <input
                  className={inputClass}
                  value={
                    activePhase?.objective?.label ??
                    document.interaction.objective?.label ??
                    ""
                  }
                  placeholder="Find Mia’s morning objects"
                  disabled={!activePhase}
                  onChange={(event) => {
                    if (!activePhase) return;
                    patchPhase(activePhase.id, {
                      objective: { label: event.target.value },
                    });
                  }}
                />
              </label>
              <label className="mt-3 flex items-start gap-2 text-sm text-stone-800">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-stone-300"
                  checked={
                    activePhase?.strictOrder ??
                    document.interaction.strictOrder ??
                    false
                  }
                  disabled={!activePhase}
                  onChange={(event) => {
                    if (!activePhase) return;
                    patchPhase(activePhase.id, {
                      strictOrder: event.target.checked,
                    });
                  }}
                />
                <span>
                  <span className="font-medium">Strict object order</span>
                  <span className="mt-1 block text-xs text-stone-500">
                    Students must finish objects by order index in this scene.
                  </span>
                </span>
              </label>
              <label className="mt-3 flex items-start gap-2 text-sm text-stone-800">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-stone-300"
                  checked={
                    activePhase?.hintPulseEnabled ??
                    document.interaction.hintPulseEnabled ??
                    false
                  }
                  disabled={!activePhase}
                  onChange={(event) => {
                    if (!activePhase) return;
                    patchPhase(activePhase.id, {
                      hintPulseEnabled: event.target.checked,
                    });
                  }}
                />
                <span>
                  <span className="font-medium">Hint pulse</span>
                  <span className="mt-1 block text-xs text-stone-500">
                    Students can pulse the next available object in this scene.
                  </span>
                </span>
              </label>
              <label className="mt-3 flex items-start gap-2 text-sm text-stone-800">
                <input
                  type="checkbox"
                  className="mt-1 rounded border-stone-300"
                  checked={
                    activePhase?.autoPlayOnSelect ??
                    document.interaction.autoPlayOnSelect ??
                    true
                  }
                  disabled={!activePhase}
                  onChange={(event) => {
                    if (!activePhase) return;
                    patchPhase(activePhase.id, {
                      autoPlayOnSelect: event.target.checked,
                    });
                  }}
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
                  value={
                    activePhase?.visitedWhen ??
                    document.interaction.visitedWhen ??
                    "dialogue-started"
                  }
                  disabled={!activePhase}
                  onChange={(event) => {
                    if (!activePhase) return;
                    patchPhase(activePhase.id, {
                      visitedWhen: event.target.value as
                        | "dialogue-started"
                        | "dialogue-finished"
                        | "dialogue-completed",
                    });
                  }}
                >
                  <option value="dialogue-started">Dialogue starts playing</option>
                  <option value="dialogue-finished">Dialogue finishes playing</option>
                  <option value="dialogue-completed">Dialogue completed</option>
                </select>
              </label>
            </section>
          </aside>

          <section className="flex min-h-0 flex-col overflow-hidden bg-stone-50">
            <div className="mx-3 mt-3 shrink-0 sm:mx-4 sm:mt-4">
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-white p-2">
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
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden px-3 py-2 sm:px-4">
              <div className="flex h-full min-h-0 w-full items-center justify-center [container-type:size]">
                <HotspotMediaCanvas
                  key={`${tool}-${segmentationMode ? "segment" : "layout"}`}
                  media={media}
                  hotspots={hotspots}
                  spriteSources={spriteSources}
                  spriteAspectRatios={spriteAspectRatios}
                  mode="author"
                  contain
                  selectedId={selectedId}
                  tool={tool}
                  onSelect={selectHotspot}
                  onClearSelection={() => setSelectedId(null)}
                  onCreate={createHotspot}
                  onGeometryChange={(id, geometry) => patchHotspot(id, { geometry })}
                  onRotationChange={(id, rotationDeg) =>
                    patchHotspot(id, { rotationDeg })
                  }
                  motionPreview={motionPreviewEnabled}
                  segmentationMode={segmentationMode}
                  segmentationPrompts={segmentationPrompts}
                  segmentationPreview={segmentationPreview}
                  segmentationPromptLabel={segmentationPromptLabel}
                  autoSeedPoints={autoSeedPoints}
                  onSegmentationPrompt={addSegmentationPrompt}
                  onRemoveSegmentationPrompt={removeSegmentationPrompt}
                />
              </div>
            </div>

            <div className="mx-3 shrink-0 sm:mx-4">
              <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-2 py-1.5 shadow-sm">
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-sky-800">
                  Scenes
                </span>
                <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {phases.map((phase, index) => (
                    <button
                      key={phase.id}
                      type="button"
                      onClick={() => {
                        stopSegmentation();
                        setActivePhaseId(phase.id);
                        setSelectedId(null);
                      }}
                      className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-medium ${
                        phase.id === resolvedPhaseId
                          ? "bg-sky-800 text-white"
                          : "border border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300"
                      }`}
                    >
                      {phase.title?.trim() || `Scene ${index + 1}`}
                    </button>
                  ))}
                </div>
                {activePhase ? (
                  <input
                    className="w-28 shrink-0 rounded-md border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] text-stone-800 sm:w-36"
                    placeholder="Scene title"
                    value={activePhase.title ?? ""}
                    onChange={(event) =>
                      patchPhase(activePhase.id, { title: event.target.value })
                    }
                    aria-label="Scene title"
                  />
                ) : null}
                <div className="ml-auto flex shrink-0 items-center gap-1 border-l border-stone-200 pl-2">
                  <button
                    type="button"
                    className="rounded-md px-1.5 py-1 text-[11px] font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-40"
                    disabled={
                      !activePhase ||
                      phases.findIndex((phase) => phase.id === activePhase.id) <= 0
                    }
                    onClick={() => moveActivePhase(-1)}
                    title="Move scene earlier"
                    aria-label="Move scene earlier"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="rounded-md px-1.5 py-1 text-[11px] font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-40"
                    disabled={
                      !activePhase ||
                      phases.findIndex((phase) => phase.id === activePhase.id) >=
                        phases.length - 1
                    }
                    onClick={() => moveActivePhase(1)}
                    title="Move scene later"
                    aria-label="Move scene later"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    className="rounded-md px-1.5 py-1 text-[11px] font-medium text-sky-800 hover:bg-sky-50"
                    onClick={addPhase}
                    title="Add scene"
                  >
                    + Add
                  </button>
                  <button
                    type="button"
                    className="rounded-md px-1.5 py-1 text-[11px] text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                    disabled={phases.length <= 1}
                    onClick={removeActivePhase}
                    title="Remove active scene"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-2 shrink-0 border-t border-stone-200 bg-white px-3 py-2 sm:px-4">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <h2 className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  Layers
                </h2>
                <span className="text-[11px] text-stone-400">{hotspots.length}</span>
              </div>
              <HotspotObjectTray
                hotspots={hotspots}
                selectedId={selectedId}
                onSelect={selectHotspot}
                onReorderZ={reorderLayer}
              />
            </div>
          </section>

          <aside className="flex min-h-0 flex-col border-l border-stone-200 bg-white">
            <div className="flex shrink-0 gap-1 border-b border-stone-200 px-3 pt-3 sm:px-4">
              {(
                [
                  { id: "properties", label: "Properties" },
                  { id: "animations", label: "Animations" },
                ] as const
              ).map((tab) => {
                const active = rightPanelTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRightPanelTab(tab.id)}
                    className={`rounded-t-lg px-3 py-2 text-xs font-semibold ${
                      active
                        ? "bg-sky-50 text-sky-900 ring-1 ring-inset ring-sky-200"
                        : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
            {rightPanelTab === "animations" ? (
              <HotspotAnimationsPanel
                selected={selected}
                inputClass={inputClass}
                motionPreviewEnabled={motionPreviewEnabled}
                onMotionPreviewChange={setMotionPreviewEnabled}
                onPatchAnimation={(hotspotId, animation) =>
                  patchHotspot(hotspotId, { animation })
                }
              />
            ) : !selected ? (
              <section className="rounded-xl border border-stone-200 bg-stone-50/80 p-3">
                <h2 className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
                  Add object
                </h2>
                <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
                  Create an object, then edit it here.
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-stone-300 bg-white px-3 py-3 text-left text-sm text-stone-800 hover:border-sky-300 hover:bg-sky-50"
                    onClick={() => insertPanelObject("shape")}
                  >
                    <span className="font-semibold text-stone-900">Create shape</span>
                    <span className="mt-0.5 block text-xs text-stone-500">
                      Rectangle overlay — color and size in properties.
                    </span>
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-stone-300 bg-white px-3 py-3 text-left text-sm text-stone-800 hover:border-sky-300 hover:bg-sky-50"
                    onClick={() => insertPanelObject("text")}
                  >
                    <span className="font-semibold text-stone-900">Create text</span>
                    <span className="mt-0.5 block text-xs text-stone-500">
                      Simple label on the scene — edit wording here.
                    </span>
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-stone-300 bg-white px-3 py-3 text-left text-sm text-stone-800 hover:border-sky-300 hover:bg-sky-50"
                    onClick={() => insertPanelObject("hotspot")}
                  >
                    <span className="font-semibold text-stone-900">Create hotspot</span>
                    <span className="mt-0.5 block text-xs text-stone-500">
                      Tap target with dialogue, audio, or other responses.
                    </span>
                  </button>
                </div>
              </section>
            ) : (
              <div className="space-y-4">
                <section className="rounded-xl border border-stone-200 bg-stone-50/80 p-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
                      Identity
                    </h2>
                    <button
                      type="button"
                      className="text-xs text-rose-700 hover:underline disabled:opacity-40"
                      disabled={allHotspots.length <= 1}
                      title={
                        allHotspots.length <= 1
                          ? "Keep at least one object"
                          : "Delete selected object"
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
                </section>

                <section className="rounded-xl border border-stone-200 bg-stone-50/80 p-3">
                  <h2 className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
                    Appearance
                  </h2>
                  {isTextHotspot(selected) ? (
                    <>
                      <label className="mt-3 block text-xs text-stone-600">
                        Text on scene
                        <input
                          className={inputClass}
                          value={selected.labelText ?? ""}
                          placeholder="New text"
                          onChange={(event) =>
                            patchHotspot(selected.id, {
                              labelText: event.target.value,
                              name: event.target.value || selected.name,
                            })
                          }
                        />
                      </label>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <label className="block text-xs text-stone-600">
                          Role
                          <select
                            className={inputClass}
                            value={selected.textStyle?.role ?? "body"}
                            onChange={(event) =>
                              patchHotspot(selected.id, {
                                textStyle: {
                                  ...selected.textStyle,
                                  role: event.target.value as
                                    | "title"
                                    | "body"
                                    | "caption",
                                },
                              })
                            }
                          >
                            <option value="title">Title</option>
                            <option value="body">Body</option>
                            <option value="caption">Caption</option>
                          </select>
                        </label>
                        <label className="block text-xs text-stone-600">
                          Align
                          <select
                            className={inputClass}
                            value={selected.textStyle?.align ?? "center"}
                            onChange={(event) =>
                              patchHotspot(selected.id, {
                                textStyle: {
                                  ...selected.textStyle,
                                  align: event.target.value as
                                    | "left"
                                    | "center"
                                    | "right",
                                },
                              })
                            }
                          >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                          </select>
                        </label>
                      </div>
                    </>
                  ) : null}
                  {isShapeHotspot(selected) || isTextHotspot(selected) ? (
                    <label className="mt-3 block text-xs text-stone-600">
                      {isTextHotspot(selected) ? "Text color" : "Fill color"}
                      <input
                        type="color"
                        className="mt-1 h-9 w-full rounded border border-stone-300"
                        value={
                          selected.highlight?.color ??
                          (isTextHotspot(selected) ? "#1c1917" : "#38bdf8")
                        }
                        onChange={(event) =>
                          patchHotspot(selected.id, {
                            highlight: {
                              ...(selected.highlight ?? DEFAULT_OBJECT_HIGHLIGHT),
                              color: event.target.value,
                              style: "outline",
                            },
                          })
                        }
                      />
                    </label>
                  ) : null}
                  {isSpriteHotspot(selected) ||
                  isShapeHotspot(selected) ||
                  isTextHotspot(selected) ? (
                    <label className="mt-3 block text-xs text-stone-600">
                      Rotation (degrees)
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="number"
                          min={-180}
                          max={180}
                          step={1}
                          className={inputClass}
                          value={Math.round(selected.rotationDeg ?? 0)}
                          onChange={(event) => {
                            const raw = Number(event.target.value);
                            if (!Number.isFinite(raw)) return;
                            const clamped = Math.max(-180, Math.min(180, raw));
                            patchHotspot(selected.id, {
                              rotationDeg: clamped === 0 ? undefined : clamped,
                            });
                          }}
                        />
                        <button
                          type="button"
                          className="shrink-0 rounded-md border border-stone-300 bg-white px-2 py-1.5 text-[11px] text-stone-700 hover:bg-stone-100"
                          onClick={() =>
                            patchHotspot(selected.id, { rotationDeg: undefined })
                          }
                        >
                          Reset
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
                        Drag the top handle on the canvas, or enter an exact angle.
                      </p>
                    </label>
                  ) : null}
                  {isSpriteHotspot(selected) ? (
                    <>
                      <button
                        type="button"
                        className="mt-3 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 hover:bg-stone-100 disabled:opacity-50"
                        disabled={spriteBgBusy}
                        onClick={() => void removeSelectedSpriteBackground()}
                      >
                        {spriteBgBusy ? "Removing background…" : "Remove white background"}
                      </button>
                      <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
                        Drag to move; corner handles resize with locked proportions.
                      </p>
                    </>
                  ) : null}
                  {!isSpriteHotspot(selected) &&
                  !isShapeHotspot(selected) &&
                  !isTextHotspot(selected) ? (
                    <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
                      Outline and detect tools are in Highlight below.
                    </p>
                  ) : null}
                </section>

                {!isShapeHotspot(selected) && !isTextHotspot(selected) ? (
                  <section className="rounded-xl border border-stone-200 bg-stone-50/80 p-3">
                    <h2 className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                      Interaction
                    </h2>
                    <label className="mt-3 block text-xs text-stone-600">
                      Kind
                      <select
                        className={inputClass}
                        value={
                          selected.interactionKind ??
                          (isSpriteHotspot(selected) ? "silent" : "dialogue")
                        }
                        onChange={(event) => {
                          const kind = event.target.value as WkeObjectInteractionKind;
                          const existing = resolveOnTapActions(selected);
                          const nextActions =
                            kind === "audio" &&
                            !existing.some((action) => action.type === "play_audio")
                              ? [
                                  ...existing,
                                  responseCardToAction({
                                    id: `card-${selected.id}-audio`,
                                    kind: "audio" as const,
                                    audioUrl: "",
                                    label: "Listen",
                                  }),
                                ]
                              : existing;
                          patchHotspot(selected.id, {
                            interactionKind: kind,
                            ...(kind === "none" ? { required: false } : {}),
                            ...(kind !== "none" &&
                            kind !== "silent" &&
                            isSpriteHotspot(selected)
                              ? { required: selected.required ?? true }
                              : {}),
                            onTap: nextActions,
                            responseCards: syncResponseCardsFromOnTap(nextActions),
                          });
                          if (kind === "dialogue") ensureDialogueForSelected();
                        }}
                      >
                        {isSpriteHotspot(selected) ? (
                          <>
                            <option value="audio">Play audio</option>
                            <option value="dialogue">Dialogue</option>
                            <option value="info">Info card</option>
                            <option value="question">Question</option>
                            <option value="silent">Silent tap (no card)</option>
                            <option value="none">Decorative only</option>
                          </>
                        ) : (
                          <>
                            <option value="dialogue">Dialogue</option>
                            <option value="info">Info card</option>
                            <option value="audio">Audio</option>
                            <option value="question">Question</option>
                          </>
                        )}
                      </select>
                    </label>
                    <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
                      On tap sequence below runs when students select this object.
                    </p>
                  </section>
                ) : null}

                <section className="rounded-xl border border-stone-200 bg-stone-50/80 p-3">
                  <h2 className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
                    Rules
                  </h2>
                  <label className="mt-3 flex items-center gap-2 text-sm text-stone-800">
                    <input
                      type="checkbox"
                      className="rounded border-stone-300"
                      checked={selected.required ?? true}
                      disabled={
                        isShapeHotspot(selected) ||
                        isTextHotspot(selected) ||
                        selected.interactionKind === "none"
                      }
                      onChange={(event) =>
                        patchHotspot(selected.id, { required: event.target.checked })
                      }
                    />
                    Required for completion
                  </label>
                  <label className="mt-3 block text-xs text-stone-600">
                    Start state
                    <select
                      className={inputClass}
                      value={selected.initialState ?? "available"}
                      onChange={(event) =>
                        patchHotspot(selected.id, {
                          initialState: event.target.value as
                            | "locked"
                            | "available"
                            | "hidden",
                        })
                      }
                    >
                      <option value="available">Available</option>
                      <option value="locked">Locked</option>
                      <option value="hidden">Hidden (enter later)</option>
                    </select>
                  </label>
                  <label className="mt-3 block text-xs text-stone-600">
                    Order index
                    <input
                      type="number"
                      min={0}
                      step={1}
                      className={inputClass}
                      value={selected.orderIndex ?? 0}
                      onChange={(event) =>
                        patchHotspot(selected.id, {
                          orderIndex: Number(event.target.value) || 0,
                        })
                      }
                    />
                  </label>
                  <label className="mt-3 block text-xs text-stone-600">
                    Wrong-order hint
                    <input
                      className={inputClass}
                      value={selected.wrongOrderHint ?? ""}
                      placeholder="Try another object first"
                      onChange={(event) =>
                        patchHotspot(selected.id, {
                          wrongOrderHint: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="mt-3 flex items-center gap-2 text-sm text-stone-800">
                    <input
                      type="checkbox"
                      className="rounded border-stone-300"
                      checked={selected.enableHintPulse ?? false}
                      onChange={(event) =>
                        patchHotspot(selected.id, {
                          enableHintPulse: event.target.checked,
                        })
                      }
                    />
                    Eligible for hint pulse
                  </label>
                </section>

                {(!isSpriteHotspot(selected) ||
                  ((selected.interactionKind ?? "silent") !== "silent" &&
                    selected.interactionKind !== "none")) &&
                !isShapeHotspot(selected) &&
                !isTextHotspot(selected) ? (
                <section className="rounded-xl border border-stone-200 bg-stone-50/80 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                      On tap sequence
                    </h2>
                    <div className="flex flex-wrap justify-end gap-1">
                      {(
                        [
                          ["info", "Info"],
                          ["audio", "Audio"],
                          ["dialogue", "Dialogue"],
                          ["question", "Q"],
                        ] as const
                      ).map(([kind, label]) => (
                        <button
                          key={kind}
                          type="button"
                          className="rounded border border-stone-300 bg-white px-1.5 py-0.5 text-[10px] text-stone-700 hover:border-sky-400"
                          onClick={() => addResponseCard(kind)}
                        >
                          + {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(
                      [
                        ["wait", "Wait"],
                        ["set_object_state", "Show/hide"],
                        ["enter_object", "Enter"],
                        ["pulse_object", "Pulse"],
                        ["tween_object", "Move"],
                        ["swap_sprite_asset", "Swap PNG"],
                        ["complete_object", "Complete"],
                      ] as const
                    ).map(([type, label]) => (
                      <button
                        key={type}
                        type="button"
                        className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-900 hover:border-amber-400"
                        onClick={() => addStageAction(type)}
                      >
                        + {label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
                    Runs in order on tap. Content steps show cards; stage steps
                    show/hide, move, or swap sprites.
                  </p>
                  <div className="mt-3 space-y-2">
                    {selectedOnTap.map((action, index) => (
                      <div
                        key={action.id}
                        className="rounded-lg border border-stone-200 bg-white p-2.5"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                            {index + 1}. {action.type.replaceAll("_", " ")}
                          </p>
                          <button
                            type="button"
                            className="text-xs text-rose-700 hover:underline"
                            onClick={() => removeOnTapAction(action.id)}
                          >
                            Remove
                          </button>
                        </div>
                        {action.type === "show_info" ? (
                          <textarea
                            rows={2}
                            className={inputClass}
                            value={action.text}
                            onChange={(event) =>
                              patchOnTapAction(action.id, { text: event.target.value })
                            }
                          />
                        ) : null}
                        {action.type === "play_audio" ? (
                          <>
                            <AudioClipControls
                              label="Clip"
                              hint="Record, upload, or pick from your library. Preview plays this clip instead of TTS."
                              value={action.audioUrl}
                              onChange={(url) =>
                                patchOnTapAction(action.id, {
                                  audioUrl: url.trim(),
                                })
                              }
                            />
                            <label className="mt-2 block text-xs text-stone-600">
                              Label
                              <input
                                className={inputClass}
                                placeholder="Listen"
                                value={action.label ?? ""}
                                onChange={(event) =>
                                  patchOnTapAction(action.id, {
                                    label: event.target.value,
                                  })
                                }
                              />
                            </label>
                          </>
                        ) : null}
                        {action.type === "show_dialogue" ? (
                          <p className="text-xs text-stone-500">
                            Uses this object’s dialogue below.
                          </p>
                        ) : null}
                        {action.type === "ask_question" ? (
                          <>
                            <textarea
                              rows={2}
                              className={inputClass}
                              value={action.prompt}
                              onChange={(event) =>
                                patchOnTapAction(action.id, {
                                  prompt: event.target.value,
                                })
                              }
                            />
                            <select
                              className={`${inputClass} mt-2`}
                              value={action.questionType}
                              onChange={(event) =>
                                patchOnTapAction(action.id, {
                                  questionType: event.target.value as
                                    | "mc"
                                    | "true_false",
                                })
                              }
                            >
                              <option value="true_false">True / false</option>
                              <option value="mc">Multiple choice</option>
                            </select>
                            <label className="mt-2 block text-xs text-stone-600">
                              Correct choice id
                              <input
                                className={inputClass}
                                value={action.correctChoiceId}
                                onChange={(event) =>
                                  patchOnTapAction(action.id, {
                                    correctChoiceId: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <div className="mt-2 space-y-1">
                              {action.choices.map((choice, choiceIndex) => (
                                <div key={choice.id} className="flex gap-1">
                                  <input
                                    className={inputClass}
                                    value={choice.id}
                                    onChange={(event) => {
                                      const choices = action.choices.map((item, i) =>
                                        i === choiceIndex
                                          ? { ...item, id: event.target.value }
                                          : item,
                                      );
                                      patchOnTapAction(action.id, { choices });
                                    }}
                                  />
                                  <input
                                    className={inputClass}
                                    value={choice.label}
                                    onChange={(event) => {
                                      const choices = action.choices.map((item, i) =>
                                        i === choiceIndex
                                          ? { ...item, label: event.target.value }
                                          : item,
                                      );
                                      patchOnTapAction(action.id, { choices });
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          </>
                        ) : null}
                        {action.type === "wait" ? (
                          <label className="block text-xs text-stone-600">
                            Milliseconds
                            <input
                              type="number"
                              min={0}
                              className={inputClass}
                              value={action.ms}
                              onChange={(event) =>
                                patchOnTapAction(action.id, {
                                  ms: Number(event.target.value) || 0,
                                })
                              }
                            />
                          </label>
                        ) : null}
                        {action.type === "pulse_object" ? (
                          <div className="grid grid-cols-2 gap-2">
                            <label className="text-xs text-stone-600">
                              Target id
                              <input
                                className={inputClass}
                                value={action.targetId}
                                onChange={(event) =>
                                  patchOnTapAction(action.id, {
                                    targetId: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <label className="flex items-end gap-2 pb-2 text-sm text-stone-800">
                              <input
                                type="checkbox"
                                className="rounded border-stone-300"
                                checked={action.enabled !== false}
                                onChange={(event) =>
                                  patchOnTapAction(action.id, {
                                    enabled: event.target.checked,
                                  })
                                }
                              />
                              Pulse on
                            </label>
                          </div>
                        ) : null}
                        {action.type === "set_object_state" ? (
                          <div className="grid grid-cols-2 gap-2">
                            <label className="text-xs text-stone-600">
                              Target id
                              <input
                                className={inputClass}
                                value={action.targetId}
                                onChange={(event) =>
                                  patchOnTapAction(action.id, {
                                    targetId: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <label className="text-xs text-stone-600">
                              State
                              <select
                                className={inputClass}
                                value={action.state}
                                onChange={(event) =>
                                  patchOnTapAction(action.id, {
                                    state: event.target.value as
                                      | "hidden"
                                      | "visible"
                                      | "locked"
                                      | "available",
                                  })
                                }
                              >
                                <option value="visible">Visible</option>
                                <option value="hidden">Hidden</option>
                                <option value="locked">Locked</option>
                                <option value="available">Available</option>
                              </select>
                            </label>
                          </div>
                        ) : null}
                        {action.type === "swap_sprite_asset" ? (
                          <div className="grid grid-cols-1 gap-2">
                            <label className="text-xs text-stone-600">
                              Target id
                              <input
                                className={inputClass}
                                value={action.targetId}
                                onChange={(event) =>
                                  patchOnTapAction(action.id, {
                                    targetId: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <label className="text-xs text-stone-600">
                              Sprite asset id
                              <select
                                className={inputClass}
                                value={action.spriteAssetId}
                                onChange={(event) =>
                                  patchOnTapAction(action.id, {
                                    spriteAssetId: event.target.value,
                                  })
                                }
                              >
                                <option value="">Select asset…</option>
                                {document.assets
                                  .filter((asset) => asset.kind === "image")
                                  .map((asset) => (
                                    <option key={asset.id} value={asset.id}>
                                      {asset.id}
                                    </option>
                                  ))}
                              </select>
                            </label>
                          </div>
                        ) : null}
                        {action.type === "tween_object" ||
                        action.type === "enter_object" ? (
                          <div className="space-y-2">
                            <label className="block text-xs text-stone-600">
                              Target id
                              <input
                                className={inputClass}
                                value={action.targetId}
                                onChange={(event) =>
                                  patchOnTapAction(action.id, {
                                    targetId: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {(
                                ["x", "y", "width", "height"] as const
                              ).map((field) => (
                                <label key={field} className="text-xs text-stone-600">
                                  to.{field}
                                  <input
                                    type="number"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    className={inputClass}
                                    value={action.to[field]}
                                    onChange={(event) =>
                                      patchOnTapAction(action.id, {
                                        to: {
                                          ...action.to,
                                          [field]: Number(event.target.value),
                                        },
                                      })
                                    }
                                  />
                                </label>
                              ))}
                            </div>
                            <label className="block text-xs text-stone-600">
                              Duration (ms)
                              <input
                                type="number"
                                min={0}
                                className={inputClass}
                                value={action.durationMs}
                                onChange={(event) =>
                                  patchOnTapAction(action.id, {
                                    durationMs: Number(event.target.value) || 0,
                                  })
                                }
                              />
                            </label>
                          </div>
                        ) : null}
                        {action.type === "complete_object" ? (
                          <label className="block text-xs text-stone-600">
                            Target id (blank = tapped object)
                            <input
                              className={inputClass}
                              value={action.targetId ?? ""}
                              onChange={(event) =>
                                patchOnTapAction(action.id, {
                                  targetId: event.target.value || undefined,
                                })
                              }
                            />
                          </label>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
                ) : null}

                {rectangleFields ? (
                  <details className="rounded-xl border border-stone-200 bg-stone-50/80 p-3">
                    <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                      Geometry
                    </summary>
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
                  </details>
                ) : null}

                {ellipseFields ? (
                  <details className="rounded-xl border border-stone-200 bg-stone-50/80 p-3">
                    <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                      Geometry
                    </summary>
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
                  </details>
                ) : null}

                {selected.geometry.shape === "polygon" ? (
                  <p className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600">
                    Polygon with {selected.geometry.points.length} points. Drag the white
                    vertex handles on the canvas to edit it.
                  </p>
                ) : null}

                {!isSpriteHotspot(selected) &&
                !isShapeHotspot(selected) &&
                !isTextHotspot(selected) ? (
                <section className="rounded-xl border border-stone-200 bg-stone-50/80 p-3">
                  <h2 className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                    Highlight
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
                ) : null}

                {selectedDialogue &&
                !isShapeHotspot(selected) &&
                !isTextHotspot(selected) &&
                (!isSpriteHotspot(selected) ||
                  selected.interactionKind === "dialogue" ||
                  (selected.responseCards ?? []).some((card) => card.kind === "dialogue") ||
                  selectedOnTap.some((action) => action.type === "show_dialogue")) ? (
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
                      <div className="mt-3 border-t border-stone-200/80 pt-3">
                        <AudioClipControls
                          label="Turn audio (optional)"
                          hint="Record or upload a clip for this turn. When set, play uses the clip instead of TTS."
                          value={turn.audioUrl ?? ""}
                          onChange={(url) =>
                            patchDialogue({
                              turns: selectedDialogue.turns.map((item, turnIndex) => {
                                if (turnIndex !== index) return item;
                                const next = url.trim();
                                if (!next) {
                                  const { audioUrl: _removed, ...rest } = item;
                                  return rest;
                                }
                                return { ...item, audioUrl: next };
                              }),
                            })
                          }
                        />
                      </div>
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
                      another object.
                    </p>
                  ) : null}
                </section>
                ) : !isShapeHotspot(selected) &&
                  !isTextHotspot(selected) &&
                  (!isSpriteHotspot(selected) ||
                    selected.interactionKind === "dialogue") ? (
                  <button
                    type="button"
                    className="w-full rounded-lg border border-dashed border-stone-300 px-3 py-2 text-sm text-stone-800 hover:border-sky-400 hover:bg-sky-50/50"
                    onClick={ensureDialogueForSelected}
                  >
                    + Add dialogue for this object
                  </button>
                ) : null}
              </div>
            )}
            </div>
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
