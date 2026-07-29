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
  duplicatePhaseInDocument,
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
  WkeDialoguePanelElement,
  WkeNormalizedRect,
  WkePhase,
  WkeResponseCard,
} from "@/lib/wke-activity/types";
import {
  applyInteractionKindTemplate,
  rectFromGeometry,
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
import { ActionStartTimingSelect } from "./ActionStartTimingSelect";
import { HotspotCollapsibleCard } from "./HotspotCollapsibleCard";
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

/** Selection must belong to the active scene — never a hotspot from another phase. */
function selectedIdForPhase(
  document: ExploreHotspotsDocument,
  phaseId: string | null,
): string | null {
  return hotspotsForPhase(document, phaseId)[0]?.id ?? null;
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
  const [leftSettingsOpenId, setLeftSettingsOpenId] = useState<string | null>(
    "scene-open",
  );
  const [rightSettingsOpenId, setRightSettingsOpenId] = useState<string | null>(
    "identity",
  );
  const [motionPreviewEnabled, setMotionPreviewEnabled] = useState(false);
  const [tool, setTool] = useState<HotspotCanvasTool>("select");
  const [createIntent, setCreateIntent] = useState<"target" | "shape" | null>(null);
  const [addObjectMenu, setAddObjectMenu] = useState<"shape" | "hotspot" | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [flash, setFlash] = useState<{
    id: number;
    tone: "amber" | "emerald" | "rose";
    message: string;
  } | null>(null);
  const [previewGeneration, setPreviewGeneration] = useState(0);
  const [previewPhaseIndex, setPreviewPhaseIndex] = useState<number>(0);
  const [showPreviewMenu, setShowPreviewMenu] = useState(false);
  const previewMenuRef = useRef<HTMLDivElement | null>(null);
  const [movePlacement, setMovePlacement] = useState<{
    actionId: string;
    ownerHotspotId: string;
    targetId: string;
    originalGeometry: HotspotGeometry;
  } | null>(null);
  const movePreviewRafRef = useRef<number | null>(null);
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
  const objectDisplayLabel = (hotspot: HotspotElement) =>
    hotspot.name?.trim() || hotspot.labelText?.trim() || hotspot.id;
  const sceneTitleForHotspot = (hotspotId: string) => {
    const phaseIndex = phases.findIndex((phase) => phase.hotspotIds.includes(hotspotId));
    if (phaseIndex < 0) return undefined;
    const phase = phases[phaseIndex];
    return phase.title?.trim() || `Scene ${phaseIndex + 1}`;
  };
  const sceneRequirementObjects = useMemo(
    () =>
      hotspots.map((hotspot) => ({
        id: hotspot.id,
        label: objectDisplayLabel(hotspot),
      })),
    [hotspots],
  );
  const activityRequirementObjects = useMemo(
    () =>
      allHotspots.map((hotspot) => ({
        id: hotspot.id,
        label: objectDisplayLabel(hotspot),
        sceneLabel: sceneTitleForHotspot(hotspot.id),
      })),
    [allHotspots, phases],
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
    if (selectedId) setRightSettingsOpenId("identity");
  }, [selectedId]);

  // Drop stale selection when the active scene does not own that object.
  useEffect(() => {
    if (!selectedId) return;
    const onActiveScene = hotspotsForPhase(document, resolvedPhaseId).some(
      (hotspot) => hotspot.id === selectedId,
    );
    if (!onActiveScene) setSelectedId(null);
  }, [document, resolvedPhaseId, selectedId]);

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
    const phaseId = ensurePhases(next)[0]?.id ?? null;
    setActivePhaseId(phaseId);
    setSelectedId(selectedIdForPhase(next, phaseId));
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

  const patchDialoguePanel = (patch: Partial<WkeDialoguePanelElement>) => {
    setDocument((current) => ({
      ...current,
      layout: {
        ...current.layout,
        elements: current.layout.elements.map((element) =>
          element.kind === "dialogue-panel"
            ? ({ ...element, ...patch } as WkeDialoguePanelElement)
            : element,
        ),
      },
    }));
  };

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
    setCreateIntent(null);
    setAddObjectMenu(null);
    const hotspot = allHotspots.find((entry) => entry.id === id);
    if (!hotspot) return;
    if (isShapeHotspot(hotspot) || isTextHotspot(hotspot)) {
      setRightSettingsOpenId("appearance");
      return;
    }
    setRightSettingsOpenId("identity");
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
    setRightPanelTab("properties");
    setRightSettingsOpenId("highlight");
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

  const exitDrawTool = () => {
    setTool("select");
    setCreateIntent(null);
  };

  const beginCreateDraw = (
    intent: "target" | "shape",
    shapeTool: Exclude<HotspotCanvasTool, "select">,
  ) => {
    setAddObjectMenu(intent === "shape" ? "shape" : "hotspot");
    setCreateIntent(intent);
    setTool(shapeTool);
    setSelectedId(null);
    setRightPanelTab("properties");
    setNotice(
      intent === "shape"
        ? `Draw a ${shapeTool} on the picture. Esc cancels.`
        : `Draw a ${shapeTool} hotspot on the picture. Esc cancels.`,
    );
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
    setAddObjectMenu(null);
    exitDrawTool();
    setRightSettingsOpenId("identity");
  };

  const nextObjectId = (prefix: string) => {
    let number = allHotspots.length + 1;
    while (allHotspots.some((hotspot) => hotspot.id === `${prefix}-${number}`)) {
      number += 1;
    }
    return `${prefix}-${number}`;
  };

  const createShapeFromGeometry = (geometry: HotspotGeometry) => {
    pushHistory();
    const id = nextObjectId("shape");
    const name = "Shape";
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
              accessibleLabel: name,
              geometry,
              tabOrder: allHotspots.length + 1,
              required: false,
              interactionKind: "none" as const,
              presentation: "shape" as const,
              orderIndex: hotspots.length,
              zIndex,
              initialState: "available" as const,
              highlight: {
                ...DEFAULT_OBJECT_HIGHLIGHT,
                color: "#38bdf8",
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
    setAddObjectMenu(null);
    exitDrawTool();
    setNotice("Added a shape overlay. Edit fill color in Object properties.");
  };

  const handleCanvasCreate = (geometry: HotspotGeometry) => {
    if (createIntent === "shape") {
      createShapeFromGeometry(geometry);
      return;
    }
    createHotspot(geometry);
  };

  const insertPanelObject = (kind: "text") => {
    pushHistory();
    const id = nextObjectId(kind);
    const name = "Text";
    const zIndex = nextZIndex(hotspots);
    const geometry = {
      shape: "rectangle" as const,
      x: 0.3,
      y: 0.4,
      width: 0.4,
      height: 0.1,
    };

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
              presentation: "text" as const,
              orderIndex: hotspots.length,
              zIndex,
              initialState: "available" as const,
              labelText: "New text",
              highlight: {
                ...DEFAULT_OBJECT_HIGHLIGHT,
                color: "#1c1917",
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
    setAddObjectMenu(null);
    exitDrawTool();
    setNotice("Added a text overlay. Edit the wording in Object properties.");
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
        if (movePlacement) {
          cancelMovePlacement(true);
          setSelectedId(movePlacement.ownerHotspotId);
          setNotice(null);
          return;
        }
        stopSegmentation();
        setSelectedId(null);
        setTool("select");
        setCreateIntent(null);
        setAddObjectMenu(null);
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
  }, [sessionStarted, mode, resolvedPhaseId, movePlacement]);

  useEffect(() => {
    return () => {
      if (movePreviewRafRef.current != null) {
        window.cancelAnimationFrame(movePreviewRafRef.current);
      }
    };
  }, []);

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
            // Only clear outlines for hotspots on this scene. An empty hotspotIds
            // list must NOT wipe outlines across the whole activity.
            elements:
              phaseHotspotIds.size === 0
                ? withPhases.layout.elements
                : withPhases.layout.elements.map((element) =>
                    element.kind === "hotspot" && phaseHotspotIds.has(element.id)
                      ? { ...element, visualShape: undefined }
                      : element,
                  ),
          },
        };
      });
      setNotice(
        phaseHotspotIds.size === 0
          ? `Imported ${file.name} (${next.width} × ${next.height}) for this scene.`
          : `Imported ${file.name} (${next.width} × ${next.height}) for this scene. Outlines on this scene were cleared.`,
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

  const duplicateActivePhase = () => {
    if (!activePhase) {
      setNotice("Select a scene to duplicate.");
      return;
    }
    pushHistory();
    const result = duplicatePhaseInDocument(document, activePhase.id);
    if (!result) {
      setNotice("Could not duplicate that scene.");
      return;
    }
    setDocument(result.document);
    setActivePhaseId(result.newPhaseId);
    setSelectedId(null);
    setNotice("Duplicated scene with its objects.");
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
  const selectedKind: WkeObjectInteractionKind | null = selected
    ? (selected.interactionKind ??
      (isSpriteHotspot(selected) ? "silent" : "dialogue"))
    : null;
  const showInteractionChrome =
    !!selected && !isShapeHotspot(selected) && !isTextHotspot(selected);
  const primaryInfoAction = selectedOnTap.find((action) => action.type === "show_info");
  const primaryAudioAction = selectedOnTap.find((action) => action.type === "play_audio");

  const addResponseCard = (kind: WkeResponseCard["kind"]) => {
    if (!selected) return;
    const hotspotId = selected.id;
    const actions = resolveOnTapActions(selected);
    const id = `card-${hotspotId}-${crypto.randomUUID().slice(0, 8)}`;
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

  const moveOnTapAction = (actionId: string, direction: -1 | 1) => {
    if (!selected) return;
    const actions = resolveOnTapActions(selected);
    const index = actions.findIndex((action) => action.id === actionId);
    if (index < 0) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= actions.length) return;

    const nextActions = [...actions];
    const [moved] = nextActions.splice(index, 1);
    nextActions.splice(nextIndex, 0, moved);
    writeOnTap(selected.id, nextActions);
  };

  const objectRect = (hotspotId: string): WkeNormalizedRect => {
    const hotspot = allHotspots.find((item) => item.id === hotspotId);
    return (
      (hotspot ? rectFromGeometry(hotspot.geometry) : null) ?? {
        x: 0.35,
        y: 0.35,
        width: 0.12,
        height: 0.12,
      }
    );
  };

  const setHotspotRectangle = (hotspotId: string, rect: WkeNormalizedRect) => {
    patchHotspot(hotspotId, {
      geometry: {
        shape: "rectangle",
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
    });
  };

  const cancelMovePlacement = (restore = true) => {
    if (movePlacement && restore) {
      patchHotspot(movePlacement.targetId, {
        geometry: movePlacement.originalGeometry,
      });
    }
    setMovePlacement(null);
  };

  const beginPlaceMoveEnd = (actionId: string, targetId: string) => {
    const target = allHotspots.find((item) => item.id === targetId);
    if (!target || !selected) return;
    if (movePreviewRafRef.current != null) {
      window.cancelAnimationFrame(movePreviewRafRef.current);
      movePreviewRafRef.current = null;
    }
    const ownerActions = resolveOnTapActions(selected);
    const action = ownerActions.find(
      (item) => item.id === actionId && item.type === "tween_object",
    );
    const startRect =
      (action && action.type === "tween_object" ? action.from : undefined) ??
      rectFromGeometry(target.geometry) ??
      objectRect(targetId);
    setHotspotRectangle(targetId, startRect);
    setMovePlacement({
      actionId,
      ownerHotspotId: selected.id,
      targetId,
      originalGeometry: {
        shape: "rectangle",
        x: startRect.x,
        y: startRect.y,
        width: startRect.width,
        height: startRect.height,
      },
    });
    setSelectedId(targetId);
    setTool("select");
    setCreateIntent(null);
    setNotice(
      "Drag the object to its final position, then click Set final position.",
    );
  };

  const commitMoveEndPosition = () => {
    if (!movePlacement) return;
    const owner = allHotspots.find((item) => item.id === movePlacement.ownerHotspotId);
    const target = allHotspots.find((item) => item.id === movePlacement.targetId);
    if (!owner || !target) return;
    const action = resolveOnTapActions(owner).find(
      (item) => item.id === movePlacement.actionId && item.type === "tween_object",
    );
    const startRect =
      (action && action.type === "tween_object" ? action.from : undefined) ??
      rectFromGeometry(movePlacement.originalGeometry) ??
      objectRect(movePlacement.targetId);
    const live = rectFromGeometry(target.geometry) ?? startRect;
    const to: WkeNormalizedRect = {
      x: live.x,
      y: live.y,
      width: startRect.width,
      height: startRect.height,
    };
    writeOnTap(
      owner.id,
      resolveOnTapActions(owner).map((item) =>
        item.id === movePlacement.actionId && item.type === "tween_object"
          ? ({ ...item, to } as WkeObjectAction)
          : item,
      ),
    );
    setHotspotRectangle(movePlacement.targetId, startRect);
    setMovePlacement(null);
    setSelectedId(owner.id);
    setNotice("Final position saved. Object returned to the start position.");
  };

  const setMoveStartFromCanvas = (actionId: string, targetId: string) => {
    const rect = objectRect(targetId);
    const action = selected
      ? resolveOnTapActions(selected).find((item) => item.id === actionId)
      : null;
    const nextTo =
      action && action.type === "tween_object"
        ? {
            x: action.to.x,
            y: action.to.y,
            width: rect.width,
            height: rect.height,
          }
        : { ...rect, x: Math.min(0.85, rect.x + 0.12) };
    patchOnTapAction(actionId, { from: rect, to: nextTo, targetId });
    setNotice("Starting position captured from the object on the canvas.");
  };

  const previewMoveAction = (action: Extract<WkeObjectAction, { type: "tween_object" }>) => {
    const target = allHotspots.find((item) => item.id === action.targetId);
    if (!target) return;
    const size = objectRect(action.targetId);
    const from: WkeNormalizedRect = action.from
      ? { ...action.from, width: size.width, height: size.height }
      : size;
    const to: WkeNormalizedRect = {
      x: action.to.x,
      y: action.to.y,
      width: size.width,
      height: size.height,
    };
    if (movePreviewRafRef.current != null) {
      window.cancelAnimationFrame(movePreviewRafRef.current);
      movePreviewRafRef.current = null;
    }
    const restoreGeometry = target.geometry;
    setHotspotRectangle(action.targetId, from);
    const duration = Math.max(0, action.durationMs || 600);
    const start = performance.now();
    const tick = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) * (1 - t);
      setHotspotRectangle(action.targetId, {
        x: from.x + (to.x - from.x) * eased,
        y: from.y + (to.y - from.y) * eased,
        width: size.width,
        height: size.height,
      });
      if (t < 1) {
        movePreviewRafRef.current = window.requestAnimationFrame(tick);
        return;
      }
      movePreviewRafRef.current = null;
      window.setTimeout(() => {
        patchHotspot(action.targetId, { geometry: restoreGeometry });
      }, 250);
    };
    movePreviewRafRef.current = window.requestAnimationFrame(tick);
  };

  const addStageAction = (
    type:
      | "wait"
      | "set_object_state"
      | "swap_sprite_asset"
      | "tween_object"
      | "enter_object"
      | "pulse_object"
      | "complete_object"
      | "advance_scene"
      | "click_advance_scene",
  ) => {
    if (!selected) return;
    const actions = resolveOnTapActions(selected);
    const id = `action-${selected.id}-${crypto.randomUUID().slice(0, 8)}`;
    const targetId = selected.id;
    const rect = objectRect(targetId);
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
          from: rect,
          to: { ...rect, x: Math.min(0.85, rect.x + 0.12) },
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
      case "advance_scene":
        action = { id, type: "advance_scene" };
        break;
      case "click_advance_scene":
        action = {
          id,
          type: "click_advance_scene",
          targetId,
        };
        break;
    }
    writeOnTap(selected.id, [...actions, action]);
    if (type === "tween_object") {
      setNotice(
        "Move added. Set the starting position, drag to the end, then preview.",
      );
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

  useEffect(() => {
    if (!showPreviewMenu) return;
    const handler = (event: MouseEvent) => {
      const menuEl = previewMenuRef.current;
      // If the user clicked inside the dropdown, don't close it.
      if (menuEl && event.target instanceof Node && menuEl.contains(event.target)) {
        return;
      }
      setShowPreviewMenu(false);
    };
    window.addEventListener("mousedown", handler, { capture: true });
    return () =>
      window.removeEventListener("mousedown", handler, { capture: true });
  }, [showPreviewMenu]);

  const togglePreview = (phaseIndex?: number) => {
    setMode((current) => {
      if (current === "layout") {
        setPreviewPhaseIndex(phaseIndex ?? 0);
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
          {mode === "preview" ? (
            <button
              type="button"
              className="rounded-lg border border-amber-300 bg-amber-100 px-2.5 py-1.5 text-xs font-medium text-amber-950"
              onClick={() => togglePreview()}
            >
              Layout
            </button>
          ) : (
            <div className="relative flex">
              <button
                type="button"
                className="rounded-l-lg bg-sky-800 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
                onClick={() => {
                  setShowPreviewMenu(false);
                  togglePreview(0);
                }}
              >
                Preview
              </button>
              <button
                type="button"
                className="rounded-r-lg border-l border-sky-600 bg-sky-800 px-1.5 py-1.5 text-xs text-white hover:bg-sky-700"
                onClick={() => setShowPreviewMenu((v) => !v)}
                aria-label="Preview options"
              >
                ▾
              </button>
              {showPreviewMenu && (
                <div
                  ref={previewMenuRef}
                  className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg"
                >
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50"
                    onClick={() => {
                      setShowPreviewMenu(false);
                      togglePreview(0);
                    }}
                  >
                    From beginning
                  </button>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-xs text-stone-700 hover:bg-stone-50"
                    onClick={() => {
                      setShowPreviewMenu(false);
                      const idx = phases.findIndex((p) => p.id === resolvedPhaseId);
                      togglePreview(idx < 0 ? 0 : idx);
                    }}
                  >
                    From current scene
                  </button>
                </div>
              )}
            </div>
          )}
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
          <aside className="min-h-0 space-y-3 overflow-y-auto border-r border-stone-200 bg-white p-3 sm:p-4">
            <HotspotCollapsibleCard
              id="scene-media"
              title="Scene media"
              openId={leftSettingsOpenId}
              onOpenChange={setLeftSettingsOpenId}
            >
              <div className="mt-2 grid grid-cols-1 gap-2">
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
            </HotspotCollapsibleCard>

            <HotspotCollapsibleCard
              id="scene-open"
              title="Scene open"
              openId={leftSettingsOpenId}
              onOpenChange={setLeftSettingsOpenId}
            >
              <div className="mt-2">
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
            </HotspotCollapsibleCard>

            <HotspotCollapsibleCard
              id="scene-rules"
              title="Scene rules"
              openId={leftSettingsOpenId}
              onOpenChange={setLeftSettingsOpenId}
            >
              <label className="mt-2 block text-xs text-stone-600">
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
              <label className="mt-3 block text-xs text-stone-600">
                Side panel prompt (before tap)
                <input
                  className={inputClass}
                  value={
                    document.layout.elements.find(
                      (element): element is WkeDialoguePanelElement =>
                        element.kind === "dialogue-panel",
                    )?.emptyStateText ?? ""
                  }
                  placeholder="Choose something in the picture to explore."
                  disabled={!activePhase}
                  onChange={(event) => {
                    patchDialoguePanel({
                      emptyStateText: event.target.value,
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
            </HotspotCollapsibleCard>
          </aside>

          <section className="flex min-h-0 flex-col overflow-hidden bg-stone-50">
            {tool !== "select" ? (
              <div className="mx-3 mt-3 shrink-0 sm:mx-4 sm:mt-4">
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="text-xs text-amber-900">
                    Drawing{" "}
                    <span className="font-semibold capitalize">{tool}</span>{" "}
                    {createIntent === "shape" ? "shape" : "hotspot"}
                    {tool === "polygon"
                      ? " · Click points · Enter or double-click to finish"
                      : " · Drag on the picture"}
                    {" · Esc cancels"}
                  </p>
                  <button
                    type="button"
                    className="ml-auto rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
                    onClick={() => {
                      setTool("select");
                      setCreateIntent(null);
                      setNotice(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
            {movePlacement ? (
              <div className="mx-3 mt-3 shrink-0 sm:mx-4 sm:mt-4">
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2">
                  <p className="text-xs text-sky-900">
                    Placing move end · Drag the object · click{" "}
                    <span className="font-semibold">Set final position</span> when ready · Esc
                    cancels
                  </p>
                  <button
                    type="button"
                    className="ml-auto rounded-lg border border-sky-300 bg-white px-2.5 py-1 text-xs font-medium text-sky-900 hover:bg-sky-100"
                    onClick={commitMoveEndPosition}
                  >
                    Set final position
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                    onClick={() => cancelMovePlacement(true)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

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
                  onCreate={handleCanvasCreate}
                  onGeometryChange={(id, geometry) => {
                    if (movePlacement && id === movePlacement.targetId) {
                      const locked =
                        rectFromGeometry(movePlacement.originalGeometry) ??
                        objectRect(id);
                      if (geometry.shape === "rectangle") {
                        patchHotspot(id, {
                          geometry: {
                            shape: "rectangle",
                            x: geometry.x,
                            y: geometry.y,
                            width: locked.width,
                            height: locked.height,
                          },
                        });
                        return;
                      }
                    }
                    patchHotspot(id, { geometry });
                  }}
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
                    className="rounded-md px-1.5 py-1 text-[11px] font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-40"
                    disabled={!activePhase}
                    onClick={duplicateActivePhase}
                    title="Duplicate active scene"
                  >
                    Duplicate
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
                sceneRequirementObjects={sceneRequirementObjects}
                activityRequirementObjects={activityRequirementObjects}
                onPatchAnimation={(hotspotId, animation) =>
                  patchHotspot(hotspotId, { animation })
                }
                onPatchHotspot={(hotspotId, patch) => patchHotspot(hotspotId, patch)}
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
                  <div className="rounded-lg border border-stone-300 bg-white">
                    <button
                      type="button"
                      className={`w-full rounded-lg px-3 py-3 text-left text-sm text-stone-800 hover:border-sky-300 hover:bg-sky-50 ${
                        addObjectMenu === "shape" ? "bg-sky-50" : ""
                      }`}
                      onClick={() =>
                        setAddObjectMenu((current) =>
                          current === "shape" ? null : "shape",
                        )
                      }
                    >
                      <span className="font-semibold text-stone-900">Create shape</span>
                      <span className="mt-0.5 block text-xs text-stone-500">
                        Decorative overlay — pick a shape, then draw it.
                      </span>
                    </button>
                    {addObjectMenu === "shape" ? (
                      <div className="grid grid-cols-3 gap-1.5 border-t border-stone-200 px-2 pb-2 pt-2">
                        {(
                          [
                            ["rectangle", "Rectangle"],
                            ["ellipse", "Ellipse"],
                            ["polygon", "Polygon"],
                          ] as const
                        ).map(([shapeTool, label]) => {
                          const active =
                            createIntent === "shape" && tool === shapeTool;
                          return (
                            <button
                              key={shapeTool}
                              type="button"
                              className={`rounded-md px-2 py-2 text-center text-xs font-medium ${
                                active
                                  ? "bg-sky-800 text-white"
                                  : "bg-stone-100 text-stone-700 hover:bg-sky-100 hover:text-sky-900"
                              }`}
                              onClick={() => beginCreateDraw("shape", shapeTool)}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
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
                  <div className="rounded-lg border border-stone-300 bg-white">
                    <button
                      type="button"
                      className={`w-full rounded-lg px-3 py-3 text-left text-sm text-stone-800 hover:border-sky-300 hover:bg-sky-50 ${
                        addObjectMenu === "hotspot" ? "bg-sky-50" : ""
                      }`}
                      onClick={() =>
                        setAddObjectMenu((current) =>
                          current === "hotspot" ? null : "hotspot",
                        )
                      }
                    >
                      <span className="font-semibold text-stone-900">
                        Create hotspot
                      </span>
                      <span className="mt-0.5 block text-xs text-stone-500">
                        Tap target — pick a shape, then draw it on the picture.
                      </span>
                    </button>
                    {addObjectMenu === "hotspot" ? (
                      <div className="grid grid-cols-3 gap-1.5 border-t border-stone-200 px-2 pb-2 pt-2">
                        {(
                          [
                            ["rectangle", "Rectangle"],
                            ["ellipse", "Ellipse"],
                            ["polygon", "Polygon"],
                          ] as const
                        ).map(([shapeTool, label]) => {
                          const active =
                            createIntent === "target" && tool === shapeTool;
                          return (
                            <button
                              key={shapeTool}
                              type="button"
                              className={`rounded-md px-2 py-2 text-center text-xs font-medium ${
                                active
                                  ? "bg-sky-800 text-white"
                                  : "bg-stone-100 text-stone-700 hover:bg-sky-100 hover:text-sky-900"
                              }`}
                              onClick={() => beginCreateDraw("target", shapeTool)}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : (
              <div className="space-y-3">
                <HotspotCollapsibleCard
                  id="identity"
                  title="Identity"
                  openId={rightSettingsOpenId}
                  onOpenChange={setRightSettingsOpenId}
                  headerEnd={
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
                  }
                >
                  <label className="mt-2 block text-xs text-stone-600">
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
                  {showInteractionChrome ? (
                    <label className="mt-3 block text-xs text-stone-600">
                      Interaction kind
                      <select
                        className={inputClass}
                        value={selectedKind ?? "dialogue"}
                        onChange={(event) => {
                          const kind = event.target.value as WkeObjectInteractionKind;
                          const nextActions = applyInteractionKindTemplate(
                            selected,
                            kind,
                          );
                          patchHotspot(selected.id, {
                            interactionKind: kind,
                            required:
                              kind === "none" || kind === "silent"
                                ? false
                                : (selected.required ?? true),
                            onTap: nextActions.length > 0 ? nextActions : undefined,
                            responseCards: syncResponseCardsFromOnTap(nextActions),
                          });
                          if (kind === "dialogue") {
                            ensureDialogueForSelected();
                            setRightSettingsOpenId("dialogue");
                          } else if (kind === "question") {
                            setRightSettingsOpenId("on-tap");
                          } else {
                            setRightSettingsOpenId("identity");
                          }
                        }}
                      >
                        <option value="dialogue">Dialogue</option>
                        <option value="audio">Audio</option>
                        <option value="info">Info card</option>
                        <option value="question">Tap sequence</option>
                        <option value="silent">Silent tap (no card)</option>
                        <option value="none">Decorative only</option>
                      </select>
                    </label>
                  ) : null}
                  {showInteractionChrome && selectedKind === "none" ? (
                    <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
                      Decorative only — no tap response.
                    </p>
                  ) : null}
                  {showInteractionChrome && selectedKind === "silent" ? (
                    <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
                      Silent tap — counts as visited with no card or audio.
                    </p>
                  ) : null}
                </HotspotCollapsibleCard>

                {showInteractionChrome && selectedKind === "info" ? (
                  <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                    <h2 className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                      Info card
                    </h2>
                    {primaryInfoAction?.type === "show_info" ? (
                      <label className="mt-2 block text-xs text-stone-600">
                        Text
                        <textarea
                          rows={4}
                          className={inputClass}
                          value={primaryInfoAction.text}
                          onChange={(event) =>
                            patchOnTapAction(primaryInfoAction.id, {
                              text: event.target.value,
                            })
                          }
                        />
                      </label>
                    ) : (
                      <p className="mt-2 text-xs text-stone-500">
                        No info content yet — reselect Info card kind to reset the template.
                      </p>
                    )}
                  </section>
                ) : null}

                {showInteractionChrome && selectedKind === "audio" ? (
                  <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                    <h2 className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                      Audio
                    </h2>
                    {primaryAudioAction?.type === "play_audio" ? (
                      <>
                        <div className="mt-2">
                          <AudioClipControls
                            label="Clip"
                            hint="Record, upload, or pick from your library."
                            value={primaryAudioAction.audioUrl}
                            onChange={(url) =>
                              patchOnTapAction(primaryAudioAction.id, {
                                audioUrl: url.trim(),
                              })
                            }
                          />
                        </div>
                        <label className="mt-2 block text-xs text-stone-600">
                          Label
                          <input
                            className={inputClass}
                            placeholder="Listen"
                            value={primaryAudioAction.label ?? ""}
                            onChange={(event) =>
                              patchOnTapAction(primaryAudioAction.id, {
                                label: event.target.value,
                              })
                            }
                          />
                        </label>
                      </>
                    ) : (
                      <p className="mt-2 text-xs text-stone-500">
                        No audio step yet — reselect Audio kind to reset the template.
                      </p>
                    )}
                  </section>
                ) : null}

                {selectedKind === "dialogue" &&
                selectedDialogue &&
                showInteractionChrome ? (
                <HotspotCollapsibleCard
                  id="dialogue"
                  title="Dialogue"
                  tone="amber"
                  openId={rightSettingsOpenId}
                  onOpenChange={setRightSettingsOpenId}
                  headerEnd={
                    <span className="text-[11px] text-stone-500">
                      {selectedDialogue.turns.length} turn
                      {selectedDialogue.turns.length === 1 ? "" : "s"}
                    </span>
                  }
                >
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
                </HotspotCollapsibleCard>
                ) : selectedKind === "dialogue" && showInteractionChrome ? (
                  <button
                    type="button"
                    className="w-full rounded-lg border border-dashed border-stone-300 px-3 py-2 text-sm text-stone-800 hover:border-sky-400 hover:bg-sky-50/50"
                    onClick={ensureDialogueForSelected}
                  >
                    + Add dialogue for this object
                  </button>
                ) : null}

                {showInteractionChrome && selectedKind === "question" ? (
                <HotspotCollapsibleCard
                  id="on-tap"
                  title="Tap sequence"
                  tone="amber"
                  openId={rightSettingsOpenId}
                  onOpenChange={setRightSettingsOpenId}
                >
                  <div className="mt-2 flex flex-wrap gap-1">
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
                        ["advance_scene", "Advance scene"],
                        ["click_advance_scene", "Wait for tap"],
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
                    Runs on tap. Use After previous or With previous to sequence or
                    overlap steps. Content cards still pause for Continue. Advance
                    scene moves to the next scene when this step runs (e.g. Start
                    Learning).
                  </p>
                  <div className="mt-3 space-y-2">
                    {selectedOnTap.map((action, index) => (
                      <div
                        key={action.id}
                        className="rounded-lg border border-stone-200 bg-white p-2.5"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                            {index + 1}.{" "}
                            {action.type === "advance_scene"
                              ? "Advance scene"
                              : action.type === "click_advance_scene"
                                ? "Wait for tap then advance"
                                : action.type.replaceAll("_", " ")}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className={`text-xs hover:underline ${
                                index === 0
                                  ? "cursor-not-allowed text-stone-300"
                                  : "text-stone-600"
                              }`}
                              disabled={index === 0}
                              aria-label="Move up"
                              onClick={() => moveOnTapAction(action.id, -1)}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className={`text-xs hover:underline ${
                                index === selectedOnTap.length - 1
                                  ? "cursor-not-allowed text-stone-300"
                                  : "text-stone-600"
                              }`}
                              disabled={index === selectedOnTap.length - 1}
                              aria-label="Move down"
                              onClick={() => moveOnTapAction(action.id, 1)}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              className="text-xs text-rose-700 hover:underline"
                              onClick={() => removeOnTapAction(action.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="mb-2">
                          <ActionStartTimingSelect
                            index={index}
                            inputClass={inputClass}
                            value={action.timing}
                            onChange={(timing) =>
                              patchOnTapAction(action.id, { timing })
                            }
                          />
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
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <label className="text-xs text-stone-600">
                                Object
                                <select
                                  className={inputClass}
                                  value={action.targetId}
                                  onChange={(event) =>
                                    patchOnTapAction(action.id, {
                                      targetId: event.target.value,
                                    })
                                  }
                                >
                                  {allHotspots.map((h) => (
                                    <option key={h.id} value={h.id}>
                                      {h.name?.trim() || h.labelText?.trim() || h.id}
                                    </option>
                                  ))}
                                </select>
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
                            <label className="block text-xs text-stone-600">
                              Duration (ms, blank = indefinite)
                              <input
                                type="number"
                                min={0}
                                placeholder="indefinite"
                                className={inputClass}
                                value={action.durationMs ?? ""}
                                onChange={(event) =>
                                  patchOnTapAction(action.id, {
                                    durationMs: event.target.value
                                      ? Number(event.target.value)
                                      : undefined,
                                  })
                                }
                              />
                            </label>
                          </div>
                        ) : null}
                        {action.type === "set_object_state" ? (
                          <div className="grid grid-cols-2 gap-2">
                            <label className="text-xs text-stone-600">
                              Object
                              <select
                                className={inputClass}
                                value={action.targetId}
                                onChange={(event) =>
                                  patchOnTapAction(action.id, {
                                    targetId: event.target.value,
                                  })
                                }
                              >
                                {allHotspots.map((h) => (
                                  <option key={h.id} value={h.id}>
                                    {h.name?.trim() || h.labelText?.trim() || h.id}
                                  </option>
                                ))}
                              </select>
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
                              Object
                              <select
                                className={inputClass}
                                value={action.targetId}
                                onChange={(event) =>
                                  patchOnTapAction(action.id, {
                                    targetId: event.target.value,
                                  })
                                }
                              >
                                {allHotspots.map((h) => (
                                  <option key={h.id} value={h.id}>
                                    {h.name?.trim() || h.labelText?.trim() || h.id}
                                  </option>
                                ))}
                              </select>
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
                        {action.type === "tween_object" ? (
                          <div className="space-y-2">
                            <label className="block text-xs text-stone-600">
                              Object to move
                              <select
                                className={inputClass}
                                value={action.targetId}
                                onChange={(event) => {
                                  const nextTargetId = event.target.value;
                                  const rect = objectRect(nextTargetId);
                                  patchOnTapAction(action.id, {
                                    targetId: nextTargetId,
                                    from: rect,
                                    to: {
                                      ...rect,
                                      x: Math.min(0.85, rect.x + 0.12),
                                    },
                                  });
                                }}
                              >
                                {allHotspots.map((h) => (
                                  <option key={h.id} value={h.id}>
                                    {h.name?.trim() || h.labelText?.trim() || h.id}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <div className="rounded-lg border border-sky-100 bg-sky-50/70 p-2">
                              <p className="text-[11px] leading-relaxed text-sky-900">
                                1. Set start · 2. Drag to the end on the canvas · 3. Set
                                final · Preview anytime. Size stays locked.
                              </p>
                              <div className="mt-2 grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  className="rounded-md border border-sky-200 bg-white px-2 py-1.5 text-[11px] font-medium text-sky-900 hover:bg-sky-100"
                                  onClick={() =>
                                    setMoveStartFromCanvas(action.id, action.targetId)
                                  }
                                >
                                  Set starting position
                                </button>
                                {movePlacement?.actionId === action.id ? (
                                  <button
                                    type="button"
                                    className="rounded-md bg-sky-800 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-sky-700"
                                    onClick={commitMoveEndPosition}
                                  >
                                    Set final position
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="rounded-md border border-sky-200 bg-white px-2 py-1.5 text-[11px] font-medium text-sky-900 hover:bg-sky-100"
                                    onClick={() =>
                                      beginPlaceMoveEnd(action.id, action.targetId)
                                    }
                                  >
                                    Place end on canvas
                                  </button>
                                )}
                              </div>
                              {movePlacement?.actionId === action.id ? (
                                <button
                                  type="button"
                                  className="mt-1.5 w-full rounded-md border border-stone-300 bg-white px-2 py-1 text-[11px] text-stone-600 hover:bg-stone-50"
                                  onClick={() => cancelMovePlacement(true)}
                                >
                                  Cancel placing
                                </button>
                              ) : null}
                              <p className="mt-2 text-[10px] text-stone-500">
                                Start:{" "}
                                {action.from
                                  ? `${action.from.x.toFixed(2)}, ${action.from.y.toFixed(2)}`
                                  : "object’s current position"}
                                {" · "}
                                End: {action.to.x.toFixed(2)}, {action.to.y.toFixed(2)}
                              </p>
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
                            <button
                              type="button"
                              className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950 hover:bg-amber-100"
                              onClick={() => previewMoveAction(action)}
                            >
                              Preview movement
                            </button>
                          </div>
                        ) : null}
                        {action.type === "enter_object" ? (
                          <div className="space-y-2">
                            <label className="block text-xs text-stone-600">
                              Object
                              <select
                                className={inputClass}
                                value={action.targetId}
                                onChange={(event) =>
                                  patchOnTapAction(action.id, {
                                    targetId: event.target.value,
                                  })
                                }
                              >
                                {allHotspots.map((h) => (
                                  <option key={h.id} value={h.id}>
                                    {h.name?.trim() || h.labelText?.trim() || h.id}
                                  </option>
                                ))}
                              </select>
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
                            Object (blank = tapped object)
                            <select
                              className={inputClass}
                              value={action.targetId ?? ""}
                              onChange={(event) =>
                                patchOnTapAction(action.id, {
                                  targetId: event.target.value || undefined,
                                })
                              }
                            >
                              <option value="">— tapped object —</option>
                              {allHotspots.map((h) => (
                                <option key={h.id} value={h.id}>
                                  {h.name?.trim() || h.labelText?.trim() || h.id}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                        {action.type === "advance_scene" ? (
                          <p className="text-[10px] leading-snug text-stone-500">
                            Moves to the next scene when this step runs (after any
                            earlier tap-sequence steps).
                          </p>
                        ) : null}
                        {action.type === "click_advance_scene" ? (
                          <div className="space-y-2">
                            <label className="block text-xs text-stone-600">
                              Object to tap
                              <select
                                className={inputClass}
                                value={action.targetId}
                                onChange={(event) =>
                                  patchOnTapAction(action.id, {
                                    targetId: event.target.value,
                                  })
                                }
                              >
                                {hotspots.length === 0 ? (
                                  <option value="">No objects in scene</option>
                                ) : (
                                  hotspots.map((hotspot) => (
                                    <option key={hotspot.id} value={hotspot.id}>
                                      {hotspot.name?.trim() ||
                                        hotspot.labelText?.trim() ||
                                        hotspot.id}
                                    </option>
                                  ))
                                )}
                              </select>
                            </label>
                            <p className="text-[10px] leading-snug text-stone-500">
                              Sequence pauses until students tap this glowing object,
                              then advances to the next scene.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </HotspotCollapsibleCard>
                ) : null}

                {!isSpriteHotspot(selected) &&
                !isShapeHotspot(selected) &&
                !isTextHotspot(selected) ? (
                <HotspotCollapsibleCard
                  id="highlight"
                  title="Highlight"
                  tone="amber"
                  openId={rightSettingsOpenId}
                  onOpenChange={setRightSettingsOpenId}
                >
                  {!segmentationMode ? (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs leading-relaxed text-stone-600">
                        Detect a precise outline from the picture, then set highlight style
                        and color.
                      </p>
                      <button
                        type="button"
                        onClick={beginSegmentation}
                        className="w-full rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600"
                      >
                        {selected.visualShape ? "Redetect outline" : "Detect precise outline"}
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
                    <div className="mt-2 space-y-3">
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
                  <div className="mt-4 space-y-3 border-t border-stone-200 pt-3">
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
                </HotspotCollapsibleCard>
                ) : null}

                {isSpriteHotspot(selected) ||
                isShapeHotspot(selected) ||
                isTextHotspot(selected) ? (
                <HotspotCollapsibleCard
                  id="appearance"
                  title="Appearance"
                  openId={rightSettingsOpenId}
                  onOpenChange={setRightSettingsOpenId}
                >
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
                </HotspotCollapsibleCard>
                ) : null}

                <HotspotCollapsibleCard
                  id="rules"
                  title="Rules"
                  openId={rightSettingsOpenId}
                  onOpenChange={setRightSettingsOpenId}
                >
                  <label className="mt-2 flex items-center gap-2 text-sm text-stone-800">
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
                </HotspotCollapsibleCard>


                {rectangleFields ? (
                  <HotspotCollapsibleCard
                    id="geometry"
                    title="Geometry"
                    tone="stone"
                    openId={rightSettingsOpenId}
                    onOpenChange={setRightSettingsOpenId}
                  >
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
                  </HotspotCollapsibleCard>
                ) : null}

                {ellipseFields ? (
                  <HotspotCollapsibleCard
                    id="geometry"
                    title="Geometry"
                    tone="stone"
                    openId={rightSettingsOpenId}
                    onOpenChange={setRightSettingsOpenId}
                  >
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
                  </HotspotCollapsibleCard>
                ) : null}

                {selected.geometry.shape === "polygon" ? (
                  <p className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600">
                    Polygon with {selected.geometry.points.length} points. Drag the white
                    vertex handles on the canvas to edit it.
                  </p>
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
                initialPhaseIndex={previewPhaseIndex}
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
