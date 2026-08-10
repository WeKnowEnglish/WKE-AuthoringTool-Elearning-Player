"use client";

import {
  useCanRedo,
  useCanUndo,
  useMutation,
  useRedo,
  useStorage,
  useSyncStatus,
  useUndo,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { BoardElementLayer } from "@/components/pilots/whiteboard/BoardElementLayer";
import { useWhiteboardActiveTab } from "@/components/pilots/whiteboard/useWhiteboardActiveTab";
import { TeacherMediaLibraryModal } from "@/components/teacher/media/TeacherMediaLibraryModal";
import {
  openTeacherMediaLibrary,
  type MediaUrlChangeDetail,
} from "@/components/teacher/media/teacherMediaLibraryShared";
import { diagnosticFetch } from "@/lib/collab-diagnostics/client";
import { uploadTeacherMedia } from "@/lib/actions/media";
import { recordWhiteboardSubmitEvidence } from "@/lib/whiteboard/evidence";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  HIGHLIGHT_COLORS,
  HIGHLIGHT_WIDTHS,
  PEN_COLORS,
  PEN_WIDTHS,
  type BoardBackground,
  type BoardOwnerType,
  type BoardStatus,
  type ImageElement,
  type Point,
  type ShapeElement,
  type ShapeKind,
  type StampElement,
  type StrokeElement,
  type TextElement,
  type TimerState,
  type WhiteboardAuthRole,
  type WhiteboardElement,
  type WhiteboardRoundPhase,
  type WhiteboardSettings,
  type WhiteboardToolId,
} from "@/lib/whiteboard/domain";
import { clientToLogical, pointsToPath } from "@/lib/whiteboard/coordinates";
import {
  canEditActivityWork,
  canSubmitActivityWork,
} from "@/lib/activity-runtime/activity-permissions";
import { normalizeWorkStatus, toRuntimePhase } from "@/lib/activity-runtime/activity-phases";
import { canEditBoard } from "@/lib/whiteboard/permissions";
import { elementIntersectsPoint, simplifyStroke } from "@/lib/whiteboard/stroke-simplification";
import { WHITEBOARD_STAMP_PACK } from "@/lib/whiteboard/stamps";
import { formatRemaining, remainingMs } from "@/lib/whiteboard/timer";
import {
  asElementLookup,
  readLiveObjectField,
  readStorageMapValue,
} from "@/lib/whiteboard/liveblocks/storage-read";

type CanvasMode = "edit" | "thumbnail" | "inspect";

type Props = {
  boardId: string;
  mode?: CanvasMode;
  sessionId: string;
  role: WhiteboardAuthRole;
  userId: string;
  showPrompt?: boolean;
  annotationMode?: boolean;
  /**
   * Learn / class board: everyone (teacher + students) can draw on this board.
   * Skips activity phase, ownership, and timer gates.
   */
  sharedEdit?: boolean;
  /** When true, drawing is disabled (view-only). Used to lock student pens. */
  readOnly?: boolean;
};

type BoardView = {
  status: BoardStatus;
  ownerType: BoardOwnerType;
  ownerId: string;
  revision: number;
  elements: { get: (id: string) => WhiteboardElement | undefined };
  zOrder: readonly string[];
  privateHint: string | null;
  annotations: { get: (id: string) => WhiteboardElement | undefined };
  annotationZOrder: readonly string[];
  previewDataUrl: string | null;
};

type ShapePreview = {
  shape: ShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
};

type ImageDrag = {
  id: string;
  mode: "move" | "resize";
  start: Point;
  initial: ImageElement;
};

type LiveBoard = {
  get: (k: string) => unknown;
};

function readRuntimeField<T>(root: unknown, key: string): T | null {
  const runtime = (root as { runtime?: unknown }).runtime;
  if (!runtime) return null;
  return readLiveObjectField<T>(runtime, key) ?? null;
}

function getLiveBoard(storage: { get: (key: never) => unknown }, boardId: string): LiveBoard | null {
  const liveBoards = storage.get("boards" as never) as unknown as {
    get: (id: string) => LiveBoard | undefined;
  };
  return liveBoards?.get(boardId) ?? null;
}

function orderedElements(
  map: { get: (id: string) => WhiteboardElement | undefined } | null | undefined,
  zOrder: readonly string[] | null | undefined,
): WhiteboardElement[] {
  if (!map || !zOrder) return [];
  const list: WhiteboardElement[] = [];
  for (const id of zOrder) {
    const el = map.get(id);
    if (el) list.push(el);
  }
  return list;
}

async function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () =>
        resolve({
          width: image.naturalWidth || image.width,
          height: image.naturalHeight || image.height,
        });
      image.onerror = () => reject(new Error("Could not read the pasted image."));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function readImageUrlDimensions(url: string): Promise<{ width: number; height: number }> {
  return await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      resolve({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      });
    image.onerror = () => reject(new Error("Could not load the selected image."));
    image.src = url;
  });
}

function fitImageDimensions(sourceWidth: number, sourceHeight: number) {
  const ratio = sourceWidth > 0 && sourceHeight > 0 ? sourceWidth / sourceHeight : 1;
  let width = Math.min(720, Math.max(240, sourceWidth));
  let height = width / ratio;
  if (height > 560) {
    height = 560;
    width = height * ratio;
  }
  return { width, height };
}

function readBoardView(raw: unknown): BoardView | null {
  if (!raw || typeof raw !== "object") return null;
  if (typeof (raw as { get?: unknown }).get === "function") {
    const live = raw as { get: (k: string) => unknown };
    return {
      status: live.get("status") as BoardStatus,
      ownerType: live.get("ownerType") as BoardOwnerType,
      ownerId: live.get("ownerId") as string,
      revision: (live.get("revision") as number) ?? 1,
      elements: asElementLookup(live.get("elements")) as BoardView["elements"],
      zOrder: (live.get("zOrder") as readonly string[]) ?? [],
      privateHint: (live.get("privateHint") as string | null) ?? null,
      annotations: asElementLookup(live.get("annotations")) as BoardView["annotations"],
      annotationZOrder: (live.get("annotationZOrder") as readonly string[]) ?? [],
      previewDataUrl: (live.get("previewDataUrl") as string | null) ?? null,
    };
  }
  const plain = raw as {
    status?: BoardStatus;
    ownerType?: BoardOwnerType;
    ownerId?: string;
    revision?: number;
    elements?: unknown;
    zOrder?: readonly string[];
    privateHint?: string | null;
    annotations?: unknown;
    annotationZOrder?: readonly string[];
    previewDataUrl?: string | null;
  };
  return {
    status: plain.status!,
    ownerType: plain.ownerType!,
    ownerId: plain.ownerId!,
    revision: plain.revision ?? 1,
    elements: asElementLookup(plain.elements) as BoardView["elements"],
    zOrder: plain.zOrder ?? [],
    privateHint: plain.privateHint ?? null,
    annotations: asElementLookup(plain.annotations) as BoardView["annotations"],
    annotationZOrder: plain.annotationZOrder ?? [],
    previewDataUrl: plain.previewDataUrl ?? null,
  };
}

export function WhiteboardCanvas({
  boardId,
  mode = "edit",
  sessionId,
  role,
  userId,
  showPrompt = true,
  annotationMode = false,
  sharedEdit = false,
  readOnly = false,
}: Props) {
  const phase = useStorage((root) => readRuntimeField<string>(root, "phase"));
  const timer = useStorage((root) => readRuntimeField<TimerState>(root, "timer"));
  const prompt = useStorage((root) =>
    readRuntimeField<{ title: string; instructions: string }>(root, "prompt"),
  );
  const settings = useStorage((root) => readRuntimeField<WhiteboardSettings>(root, "settings"));
  const background = useStorage((root) => readRuntimeField<BoardBackground>(root, "background"));
  const hasReviewPush = useStorage((root) => {
    const display = readRuntimeField<string | null>(root, "displayBoardId");
    const compare = readRuntimeField<string[] | null>(root, "compareBoardIds");
    const reviewTask = readRuntimeField<unknown>(root, "reviewTask");
    const review = readRuntimeField<{ targetIds?: string[] } | null>(root, "review");
    return (
      Boolean(display) ||
      Boolean(compare) ||
      Boolean(reviewTask) ||
      Boolean(review?.targetIds?.length)
    );
  });

  const board = useStorage((root) => {
    const boards = (root as unknown as { boards?: unknown }).boards;
    return readBoardView(readStorageMapValue(boards, boardId));
  });

  const memberIds = useStorage((root) => {
    if (!board || board.ownerType !== "group") return undefined;
    const groups = (root as unknown as { groups?: unknown }).groups;
    const group = readStorageMapValue(groups, board.ownerId);
    if (!group) return undefined;
    return readLiveObjectField<string[]>(group, "memberIds");
  });

  const participantReady = useStorage((root) => {
    const participants = (root as unknown as { participants?: unknown }).participants;
    const raw = readStorageMapValue(participants, userId);
    if (!raw) return false;
    return Boolean(readLiveObjectField(raw, "ready"));
  });

  const syncStatus = useSyncStatus();
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const updateMyPresence = useUpdateMyPresence();

  const annotateAllowed =
    role === "host" && (annotationMode || mode === "inspect");

  const [tool, setTool] = useState<WhiteboardToolId>(
    annotateAllowed && mode === "inspect" ? "annotate" : "pen",
  );
  const [color, setColor] = useState<string>(PEN_COLORS[0]);
  const [width, setWidth] = useState<number>(PEN_WIDTHS[1]);
  const [stampId, setStampId] = useState<string>(WHITEBOARD_STAMP_PACK[0]?.id ?? "star");
  const [localStroke, setLocalStroke] = useState<Point[] | null>(null);
  const [shapePreview, setShapePreview] = useState<ShapePreview | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<ImageElement | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaLibraryOwnerId = useId();

  const svgRef = useRef<SVGSVGElement | null>(null);
  const drawingRef = useRef(false);
  const shapeDraggingRef = useRef(false);
  const shapeStartRef = useRef<Point | null>(null);
  const pointsRef = useRef<Point[]>([]);
  const rafRef = useRef<number | null>(null);
  const strokeTargetRef = useRef<"elements" | "annotations">("elements");
  const imageDragRef = useRef<ImageDrag | null>(null);
  const imagePreviewRef = useRef<ImageElement | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const { isActiveTab, otherTabCount } = useWhiteboardActiveTab();

  const isBoardOwner =
    !!board &&
    (board.ownerType === "student"
      ? board.ownerId === userId
      : board.ownerType === "group"
        ? Boolean(memberIds?.includes(userId))
        : false);

  const sharedEditOk = canEditActivityWork({
    phase: phase ? toRuntimePhase(phase) : "waiting",
    workStatus: normalizeWorkStatus(board?.status ?? null),
    role,
    isOwner: isBoardOwner,
    hasReviewPush,
  });

  const sharedSubmitOk = canSubmitActivityWork({
    phase: phase ? toRuntimePhase(phase) : "waiting",
    workStatus: normalizeWorkStatus(board?.status ?? null),
    isOwner: isBoardOwner,
  });

  const canEdit =
    mode === "edit" &&
    isActiveTab &&
    !!board &&
    !readOnly &&
    (sharedEdit ||
      (!!timer &&
        sharedEditOk &&
        canEditBoard({
          phase: phase as WhiteboardRoundPhase,
          boardStatus: board.status,
          timer,
          nowMs,
          userId,
          role,
          boardOwnerType: board.ownerType,
          boardOwnerId: board.ownerId,
          boardMemberIds: memberIds,
        })));

  const canAnnotate =
    annotateAllowed &&
    (phase === "COLLECTED" || phase === "REVIEW" || phase === "OPEN");

  const interactive = canEdit || canAnnotate;
  const isHighlight = tool === "highlighter";
  const isShapeTool =
    tool === "shape-rect" || tool === "shape-ellipse" || tool === "shape-line";
  const activeColors = isHighlight ? HIGHLIGHT_COLORS : PEN_COLORS;
  const activeWidths = isHighlight ? HIGHLIGHT_WIDTHS : PEN_WIDTHS;

  const selectTool = (next: WhiteboardToolId) => {
    setTool(next);
    if (next !== "select") {
      setSelectedImageId(null);
      setImagePreview(null);
      imagePreviewRef.current = null;
    }
    if (next === "highlighter") {
      if (!(HIGHLIGHT_COLORS as readonly string[]).includes(color)) {
        setColor(HIGHLIGHT_COLORS[0]);
      }
      if (!(HIGHLIGHT_WIDTHS as readonly number[]).includes(width)) {
        setWidth(HIGHLIGHT_WIDTHS[1]);
      }
    } else if (next === "pen" || next === "annotate") {
      if (!(PEN_COLORS as readonly string[]).includes(color)) {
        setColor(next === "annotate" ? "#b91c1c" : PEN_COLORS[0]);
      }
      if (!(PEN_WIDTHS as readonly number[]).includes(width)) {
        setWidth(PEN_WIDTHS[1]);
      }
      if (next === "annotate") setColor("#b91c1c");
    }
  };

  const addElement = useMutation(
    ({ storage }, el: WhiteboardElement, target: "elements" | "annotations") => {
      const liveBoard = getLiveBoard(storage, boardId);
      if (!liveBoard) return;
      if (target === "annotations") {
        const annotations = liveBoard.get("annotations") as {
          set: (id: string, value: WhiteboardElement) => void;
        };
        const annotationZOrder = liveBoard.get("annotationZOrder") as {
          push: (id: string) => void;
        };
        annotations.set(el.id, el);
        annotationZOrder.push(el.id);
        return;
      }
      const elements = liveBoard.get("elements") as {
        set: (id: string, value: WhiteboardElement) => void;
      };
      const zOrder = liveBoard.get("zOrder") as { push: (id: string) => void };
      elements.set(el.id, el);
      zOrder.push(el.id);
    },
    [boardId],
  );

  const insertBoardImage = useCallback(
    (input: {
      url: string;
      mediaAssetId?: string | null;
      alt: string;
      sourceWidth: number;
      sourceHeight: number;
    }) => {
      const { width, height } = fitImageDimensions(input.sourceWidth, input.sourceHeight);
      const image: ImageElement = {
        id: `image_${crypto.randomUUID()}`,
        type: "image",
        url: input.url,
        mediaAssetId: input.mediaAssetId ?? null,
        x: Math.round((BOARD_WIDTH - width) / 2),
        y: Math.round((BOARD_HEIGHT - height) / 2),
        width: Math.round(width),
        height: Math.round(height),
        alt: input.alt,
        createdBy: userId,
        createdAt: Date.now(),
      };
      addElement(image, "elements");
      setSelectedImageId(image.id);
      setTool("select");
    },
    [addElement, userId],
  );

  const updateImageElement = useMutation(
    ({ storage }, image: ImageElement) => {
      const liveBoard = getLiveBoard(storage, boardId);
      if (!liveBoard) return;
      const elements = liveBoard.get("elements") as {
        set: (id: string, value: WhiteboardElement) => void;
      };
      elements.set(image.id, image);
    },
    [boardId],
  );

  const deleteImageElement = useMutation(
    ({ storage }, imageId: string) => {
      const liveBoard = getLiveBoard(storage, boardId);
      if (!liveBoard) return;
      const elements = liveBoard.get("elements") as { delete: (id: string) => void };
      const zOrder = liveBoard.get("zOrder") as {
        indexOf: (id: string) => number;
        delete: (index: number) => void;
      };
      elements.delete(imageId);
      const index = zOrder.indexOf(imageId);
      if (index >= 0) zOrder.delete(index);
    },
    [boardId],
  );

  const eraseAt = useMutation(
    ({ storage }, point: Point, target: "elements" | "annotations") => {
      const liveBoard = getLiveBoard(storage, boardId);
      if (!liveBoard) return;
      const mapKey = target === "annotations" ? "annotations" : "elements";
      const orderKey = target === "annotations" ? "annotationZOrder" : "zOrder";
      const elements = liveBoard.get(mapKey) as {
        entries: () => IterableIterator<[string, WhiteboardElement]>;
        delete: (id: string) => void;
      };
      const zOrder = liveBoard.get(orderKey) as {
        indexOf: (id: string) => number;
        delete: (index: number) => void;
      };
      for (const [id, el] of elements.entries()) {
        if (elementIntersectsPoint(el, point)) {
          elements.delete(id);
          const idx = zOrder.indexOf(id);
          if (idx >= 0) zOrder.delete(idx);
          return;
        }
      }
    },
    [boardId],
  );

  const clearLayer = useMutation(
    ({ storage }, target: "elements" | "annotations") => {
      const liveBoard = getLiveBoard(storage, boardId);
      if (!liveBoard) return;
      const mapKey = target === "annotations" ? "annotations" : "elements";
      const orderKey = target === "annotations" ? "annotationZOrder" : "zOrder";
      const elements = liveBoard.get(mapKey) as {
        keys: () => IterableIterator<string>;
        delete: (id: string) => void;
      };
      const zOrder = liveBoard.get(orderKey) as {
        length: number;
        delete: (index: number) => void;
      };
      for (const key of [...elements.keys()]) elements.delete(key);
      while (zOrder.length > 0) zOrder.delete(0);
    },
    [boardId],
  );

  useEffect(() => {
    if (!canEdit || role !== "host") return;
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      const item = Array.from(event.clipboardData?.items ?? []).find((entry) =>
        entry.type.startsWith("image/"),
      );
      const file = item?.getAsFile();
      if (!file) return;
      event.preventDefault();
      setImageUploading(true);
      setError(null);
      void (async () => {
        try {
          const { width: sourceWidth, height: sourceHeight } = await readImageDimensions(file);
          const formData = new FormData();
          formData.set("file", file, file.name || `whiteboard-paste-${Date.now()}.png`);
          formData.set("meta_item_name", "Whiteboard paste");
          formData.set("skip_near_duplicate", "1");
          const uploaded = await uploadTeacherMedia(formData, "image");
          insertBoardImage({
            url: uploaded.url,
            mediaAssetId: uploaded.id,
            alt: file.name || "Pasted image",
            sourceWidth,
            sourceHeight,
          });
        } catch (pasteError) {
          setError(
            pasteError instanceof Error ? pasteError.message : "Could not paste this image.",
          );
        } finally {
          setImageUploading(false);
        }
      })();
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [canEdit, insertBoardImage, role]);

  const insertMediaLibraryImage = async (
    url: string,
    detail?: MediaUrlChangeDetail,
  ) => {
    setImageUploading(true);
    setError(null);
    try {
      const dimensions = await readImageUrlDimensions(url);
      insertBoardImage({
        url,
        mediaAssetId: detail?.mediaAssetId ?? null,
        alt: "Media library image",
        sourceWidth: dimensions.width,
        sourceHeight: dimensions.height,
      });
    } catch (mediaError) {
      setError(
        mediaError instanceof Error ? mediaError.message : "Could not add this image.",
      );
    } finally {
      setImageUploading(false);
    }
  };

  const openMediaLibrary = () => {
    openTeacherMediaLibrary(
      mediaLibraryOwnerId,
      "image",
      (url, detail) => void insertMediaLibraryImage(url, detail),
    );
  };

  useEffect(() => {
    if (!canEdit || role !== "host" || !selectedImageId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      event.preventDefault();
      deleteImageElement(selectedImageId);
      setSelectedImageId(null);
      setImagePreview(null);
      imagePreviewRef.current = null;
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canEdit, deleteImageElement, role, selectedImageId]);

  const [readyBusy, setReadyBusy] = useState(false);

  const flushLocalPreview = useCallback(() => {
    rafRef.current = null;
    setLocalStroke([...pointsRef.current]);
  }, []);

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive || !svgRef.current) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    const point = clientToLogical(
      event.clientX,
      event.clientY,
      svgRef.current.getBoundingClientRect(),
    );

    if (tool === "select" && canEdit && role === "host") {
      const image = [...elements]
        .reverse()
        .find((element): element is ImageElement =>
          element.type === "image" && elementIntersectsPoint(element, point),
        );
      if (!image) {
        setSelectedImageId(null);
        setImagePreview(null);
        imagePreviewRef.current = null;
        imageDragRef.current = null;
        return;
      }
      const resize =
        Math.abs(point.x - (image.x + image.width)) <= 32 &&
        Math.abs(point.y - (image.y + image.height)) <= 32;
      setSelectedImageId(image.id);
      setImagePreview(image);
      imagePreviewRef.current = image;
      imageDragRef.current = {
        id: image.id,
        mode: resize ? "resize" : "move",
        start: point,
        initial: image,
      };
      return;
    }

    if (tool === "eraser") {
      const eraseAnnotations = canAnnotate && (annotationMode || !canEdit);
      if (eraseAnnotations) {
        eraseAt(point, "annotations");
      } else if (canEdit) {
        eraseAt(point, "elements");
      }
      return;
    }

    if (tool === "text") {
      if (!canEdit || settings?.textEnabled === false) return;
      const text = window.prompt("Enter text");
      if (!text?.trim()) return;
      addElement(
        {
          id: `text_${crypto.randomUUID()}`,
          type: "text",
          x: point.x,
          y: point.y,
          width: 320,
          text: text.trim().slice(0, 200),
          fontSize: 36,
          color,
          createdBy: userId,
          createdAt: Date.now(),
        } satisfies TextElement,
        "elements",
      );
      return;
    }

    if (tool === "stamp") {
      if (!canEdit || settings?.stampsEnabled === false) return;
      const stamp = WHITEBOARD_STAMP_PACK.find((s) => s.id === stampId);
      if (!stamp) return;
      addElement(
        {
          id: `stamp_${crypto.randomUUID()}`,
          type: "stamp",
          stampId: stamp.id,
          label: stamp.label,
          x: point.x,
          y: point.y,
          size: 96,
          createdBy: userId,
          createdAt: Date.now(),
        } satisfies StampElement,
        "elements",
      );
      return;
    }

    if (isShapeTool) {
      if (!canEdit || settings?.shapesEnabled === false) return;
      const shape: ShapeKind =
        tool === "shape-rect" ? "rect" : tool === "shape-ellipse" ? "ellipse" : "line";
      shapeDraggingRef.current = true;
      shapeStartRef.current = point;
      setShapePreview({ shape, x: point.x, y: point.y, width: 0, height: 0 });
      return;
    }

    if (tool === "pen" || tool === "highlighter" || tool === "annotate") {
      if (tool === "highlighter" && settings?.highlighterEnabled === false) return;
      const layer = tool === "annotate" ? "annotations" : "elements";
      if (layer === "elements" && !canEdit) return;
      if (layer === "annotations" && !canAnnotate) return;
      strokeTargetRef.current = layer;
      drawingRef.current = true;
      pointsRef.current = [point];
      setLocalStroke([point]);
    }
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const point = clientToLogical(
      event.clientX,
      event.clientY,
      svgRef.current.getBoundingClientRect(),
    );

    const imageDrag = imageDragRef.current;
    if (imageDrag) {
      const dx = point.x - imageDrag.start.x;
      const dy = point.y - imageDrag.start.y;
      if (imageDrag.mode === "move") {
        const nextImage = {
          ...imageDrag.initial,
          x: Math.max(0, Math.min(BOARD_WIDTH - imageDrag.initial.width, imageDrag.initial.x + dx)),
          y: Math.max(0, Math.min(BOARD_HEIGHT - imageDrag.initial.height, imageDrag.initial.y + dy)),
        };
        imagePreviewRef.current = nextImage;
        setImagePreview(nextImage);
      } else {
        const ratio = imageDrag.initial.width / Math.max(1, imageDrag.initial.height);
        const requestedWidth = Math.max(80, imageDrag.initial.width + dx);
        const maxWidth = Math.min(
          BOARD_WIDTH - imageDrag.initial.x,
          (BOARD_HEIGHT - imageDrag.initial.y) * ratio,
        );
        const nextWidth = Math.min(requestedWidth, maxWidth);
        const nextImage = {
          ...imageDrag.initial,
          width: nextWidth,
          height: nextWidth / ratio,
        };
        imagePreviewRef.current = nextImage;
        setImagePreview(nextImage);
      }
      return;
    }

    if (shapeDraggingRef.current && shapeStartRef.current) {
      const start = shapeStartRef.current;
      setShapePreview((prev) =>
        prev
          ? {
              ...prev,
              x: start.x,
              y: start.y,
              width: point.x - start.x,
              height: point.y - start.y,
            }
          : null,
      );
      return;
    }

    if (!drawingRef.current) return;
    if (tool !== "pen" && tool !== "highlighter" && tool !== "annotate") return;
    pointsRef.current.push(point);
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(flushLocalPreview);
    }
  };

  const finishShape = () => {
    if (!shapeDraggingRef.current || !shapeStartRef.current || !shapePreview) {
      shapeDraggingRef.current = false;
      shapeStartRef.current = null;
      setShapePreview(null);
      return;
    }
    shapeDraggingRef.current = false;
    const start = shapeStartRef.current;
    shapeStartRef.current = null;
    const { shape, width: w, height: h } = shapePreview;
    setShapePreview(null);
    if (Math.abs(w) < 4 && Math.abs(h) < 4 && shape !== "line") return;
    if (shape === "line" && Math.hypot(w, h) < 4) return;
    addElement(
      {
        id: `shape_${crypto.randomUUID()}`,
        type: "shape",
        shape,
        x: start.x,
        y: start.y,
        width: w,
        height: h,
        stroke: color,
        strokeWidth: Math.min(width, 8),
        fill: "transparent",
        opacity: 1,
        createdBy: userId,
        createdAt: Date.now(),
      } satisfies ShapeElement,
      "elements",
    );
  };

  const finishStroke = () => {
    if (imageDragRef.current) {
      imageDragRef.current = null;
      if (imagePreviewRef.current) updateImageElement(imagePreviewRef.current);
      imagePreviewRef.current = null;
      setImagePreview(null);
      return;
    }
    if (shapeDraggingRef.current) {
      finishShape();
      return;
    }
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const simplified = simplifyStroke(pointsRef.current);
    pointsRef.current = [];
    setLocalStroke(null);
    if (simplified.length < 1) return;
    const highlight = tool === "highlighter";
    addElement(
      {
        id: `stroke_${crypto.randomUUID()}`,
        type: "stroke",
        points: simplified,
        color,
        width,
        opacity: highlight ? 0.35 : 1,
        strokeKind: highlight ? "highlight" : "ink",
        createdBy: userId,
        createdAt: Date.now(),
      } satisfies StrokeElement,
      strokeTargetRef.current,
    );
  };

  const cancelPointer = () => {
    drawingRef.current = false;
    shapeDraggingRef.current = false;
    shapeStartRef.current = null;
    pointsRef.current = [];
    setLocalStroke(null);
    setShapePreview(null);
    imageDragRef.current = null;
    imagePreviewRef.current = null;
    setImagePreview(null);
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const handleClear = () => {
    if (canAnnotate && (tool === "annotate" || annotationMode) && !canEdit) {
      if (!window.confirm("Clear annotations on this board?")) return;
      clearLayer("annotations");
      return;
    }
    if (!canEdit) return;
    if (!window.confirm("Clear your entire board?")) return;
    clearLayer("elements");
    setSelectedImageId(null);
    setImagePreview(null);
    imagePreviewRef.current = null;
    imageDragRef.current = null;
  };

  const handleDeleteSelectedImage = () => {
    if (!selectedImageId || !canEdit || role !== "host") return;
    deleteImageElement(selectedImageId);
    setSelectedImageId(null);
    setImagePreview(null);
    imagePreviewRef.current = null;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await diagnosticFetch(
        `/api/whiteboard/${sessionId}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ boardId }),
        },
        {
          phase: "submit",
          name: "whiteboard.submit",
          detail: { activity: "whiteboard", sessionId, boardId },
        },
      );
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Submit failed.");
      recordWhiteboardSubmitEvidence({
        studentId: userId,
        roundId: sessionId,
        boardId,
        revision: board?.revision ?? 1,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReadyToggle = () => {
    const next = !participantReady;
    setReadyBusy(true);
    setError(null);
    void (async () => {
      try {
        const response = await diagnosticFetch(
          `/api/whiteboard/${sessionId}/ready`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "SET_READY", ready: next }),
          },
          {
            phase: "command",
            name: "whiteboard.ready",
            detail: {
              activity: "whiteboard",
              sessionId,
              commandType: "SET_READY",
            },
          },
        );
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) throw new Error(payload?.error ?? "Ready update failed.");
        updateMyPresence({ activityStatus: next ? "ready" : "working" } as never);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ready update failed.");
      } finally {
        setReadyBusy(false);
      }
    })();
  };

  const elements = useMemo(
    () => orderedElements(board?.elements, board?.zOrder),
    [board],
  );
  const displayedElements = useMemo(
    () =>
      imagePreview
        ? elements.map((element) =>
            element.id === imagePreview.id ? imagePreview : element,
          )
        : elements,
    [elements, imagePreview],
  );
  const selectedImage =
    imagePreview ??
    (selectedImageId
      ? elements.find(
          (element): element is ImageElement =>
            element.type === "image" && element.id === selectedImageId,
        ) ?? null
      : null);
  const annotations = useMemo(
    () => orderedElements(board?.annotations, board?.annotationZOrder),
    [board],
  );

  const timeLeft = timer ? remainingMs(timer, nowMs) : 0;
  const locked =
    (!canEdit &&
      !sharedEdit &&
      mode === "edit" &&
      (phase === "WAITING" ||
        board?.status === "SUBMITTED" ||
        board?.status === "AUTO_SUBMITTED" ||
        board?.status === "LOCKED" ||
        phase === "PAUSED" ||
        phase === "COLLECTED" ||
        phase === "COLLECTING" ||
        phase === "ENDED" ||
        (phase !== "REVISION" &&
          timer != null &&
          timer.status !== "idle" &&
          timeLeft <= 0))) ||
    (mode === "edit" && !isActiveTab && otherTabCount > 0);

  const showChrome = mode === "edit" || (mode === "inspect" && canAnnotate) || annotationMode;
  const showToolbar = showChrome && (mode === "edit" || canAnnotate);

  const localStrokeOpacity = tool === "highlighter" ? 0.35 : tool === "annotate" ? 0.9 : 0.85;

  const renderBoardSvg = (pointerEvents: boolean) => (
    <svg
      ref={pointerEvents ? svgRef : undefined}
      viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
      className={`h-full w-full ${pointerEvents ? `touch-none ${tool === "select" ? "cursor-move" : ""}` : "pointer-events-none"}`}
      style={{ aspectRatio: `${BOARD_WIDTH} / ${BOARD_HEIGHT}` }}
      onPointerDown={pointerEvents ? onPointerDown : undefined}
      onPointerMove={pointerEvents ? onPointerMove : undefined}
      onPointerUp={pointerEvents ? finishStroke : undefined}
      onPointerCancel={pointerEvents ? cancelPointer : undefined}
    >
      <rect x={0} y={0} width={BOARD_WIDTH} height={BOARD_HEIGHT} fill="#f8fafc" />
      {background?.url && (
        <image
          href={background.url}
          x={0}
          y={0}
          width={BOARD_WIDTH}
          height={BOARD_HEIGHT}
          preserveAspectRatio={
            background.fit === "cover" ? "xMidYMid slice" : "xMidYMid meet"
          }
          opacity={background.opacity ?? 1}
        />
      )}
      <BoardElementLayer elements={displayedElements} />
      <BoardElementLayer elements={annotations} annotationTone />
      {tool === "select" && selectedImage ? (
        <g pointerEvents="none">
          <rect
            x={selectedImage.x}
            y={selectedImage.y}
            width={selectedImage.width}
            height={selectedImage.height}
            fill="none"
            stroke="#0f766e"
            strokeWidth={5}
            strokeDasharray="14 10"
          />
          <rect
            x={selectedImage.x + selectedImage.width - 15}
            y={selectedImage.y + selectedImage.height - 15}
            width={30}
            height={30}
            rx={5}
            fill="#0f766e"
            stroke="white"
            strokeWidth={4}
          />
        </g>
      ) : null}
      {localStroke && localStroke.length > 0 && (
        <path
          d={pointsToPath(localStroke)}
          stroke={color}
          strokeWidth={width}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={localStrokeOpacity}
        />
      )}
      {shapePreview && shapePreview.shape === "rect" && (
        <rect
          x={Math.min(shapePreview.x, shapePreview.x + shapePreview.width)}
          y={Math.min(shapePreview.y, shapePreview.y + shapePreview.height)}
          width={Math.abs(shapePreview.width)}
          height={Math.abs(shapePreview.height)}
          fill="transparent"
          stroke={color}
          strokeWidth={Math.min(width, 8)}
          opacity={0.7}
          strokeDasharray="8 6"
        />
      )}
      {shapePreview && shapePreview.shape === "ellipse" && (
        <ellipse
          cx={shapePreview.x + shapePreview.width / 2}
          cy={shapePreview.y + shapePreview.height / 2}
          rx={Math.abs(shapePreview.width) / 2}
          ry={Math.abs(shapePreview.height) / 2}
          fill="transparent"
          stroke={color}
          strokeWidth={Math.min(width, 8)}
          opacity={0.7}
          strokeDasharray="8 6"
        />
      )}
      {shapePreview && shapePreview.shape === "line" && (
        <line
          x1={shapePreview.x}
          y1={shapePreview.y}
          x2={shapePreview.x + shapePreview.width}
          y2={shapePreview.y + shapePreview.height}
          stroke={color}
          strokeWidth={Math.min(width, 8)}
          opacity={0.7}
          strokeLinecap="round"
          strokeDasharray="8 6"
        />
      )}
    </svg>
  );

  if (mode === "thumbnail") {
    if (board?.previewDataUrl) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={board.previewDataUrl}
          alt=""
          className="h-full w-full object-contain"
        />
      );
    }
    return (
      <div className="relative h-full w-full overflow-hidden bg-[#f8fafc]">
        {renderBoardSvg(false)}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {showChrome && showPrompt && mode !== "inspect" && (
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg bg-white/90 px-3 py-2 text-sm text-slate-700 shadow-sm">
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-slate-900">{prompt?.title ?? "Whiteboard"}</p>
            <p className="truncate text-slate-600">{prompt?.instructions}</p>
          </div>
          <div className="flex items-center gap-3 font-mono text-base font-bold tabular-nums text-slate-800">
            <span>{timer ? formatRemaining(timeLeft) : "—"}</span>
            <span className="text-xs font-medium text-slate-500">
              {syncStatus === "synchronizing"
                ? "Saving…"
                : syncStatus === "synchronized"
                  ? "Saved"
                  : String(syncStatus)}
            </span>
          </div>
        </div>
      )}

      {board?.privateHint && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <span className="font-bold">
            {board.status === "RETURNED" ? "Returned — teacher feedback: " : "Teacher note: "}
          </span>
          {board.privateHint}
        </div>
      )}

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-[#f8fafc]">
        {renderBoardSvg(interactive)}

        {locked && mode === "edit" && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/35 p-4 text-center">
            <div className="max-w-sm rounded-xl bg-white px-5 py-4 shadow-lg">
              <p className="text-lg font-bold text-slate-900">
                {phase === "WAITING"
                  ? "Wait for your teacher to begin."
                  : !isActiveTab && otherTabCount > 0
                    ? "This board is open in another tab."
                  : board?.status === "SUBMITTED" || board?.status === "AUTO_SUBMITTED"
                    ? "Board submitted"
                    : phase === "PAUSED"
                      ? "Paused"
                      : timeLeft <= 0 && timer?.status !== "idle"
                        ? "Time is up."
                        : "Board locked"}
              </p>
              {(board?.status === "SUBMITTED" || board?.status === "AUTO_SUBMITTED") && (
                <p className="mt-1 text-sm text-slate-600">
                  Your teacher can return it for changes.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {showToolbar && (
        <div className="flex flex-col gap-2 rounded-lg bg-white px-3 py-2 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <>
                {role === "host" ? (
                  <>
                    <ToolButton
                      active={tool === "select"}
                      onClick={() => selectTool("select")}
                      disabled={!canEdit}
                    >
                      Move image
                    </ToolButton>
                    <ToolButton onClick={openMediaLibrary} disabled={!canEdit || imageUploading}>
                      Add image
                    </ToolButton>
                  </>
                ) : null}
                <ToolButton active={tool === "pen"} onClick={() => selectTool("pen")} disabled={!canEdit}>
                  Pen
                </ToolButton>
                {settings?.highlighterEnabled !== false && (
                  <ToolButton
                    active={tool === "highlighter"}
                    onClick={() => selectTool("highlighter")}
                    disabled={!canEdit}
                  >
                    Highlighter
                  </ToolButton>
                )}
                <ToolButton
                  active={tool === "eraser"}
                  onClick={() => selectTool("eraser")}
                  disabled={!interactive}
                >
                  Eraser
                </ToolButton>
                {settings?.textEnabled !== false && (
                  <ToolButton
                    active={tool === "text"}
                    onClick={() => selectTool("text")}
                    disabled={!canEdit}
                  >
                    Text
                  </ToolButton>
                )}
                {settings?.shapesEnabled !== false && (
                  <>
                    <ToolButton
                      active={tool === "shape-rect"}
                      onClick={() => selectTool("shape-rect")}
                      disabled={!canEdit}
                    >
                      Rect
                    </ToolButton>
                    <ToolButton
                      active={tool === "shape-ellipse"}
                      onClick={() => selectTool("shape-ellipse")}
                      disabled={!canEdit}
                    >
                      Ellipse
                    </ToolButton>
                    <ToolButton
                      active={tool === "shape-line"}
                      onClick={() => selectTool("shape-line")}
                      disabled={!canEdit}
                    >
                      Line
                    </ToolButton>
                  </>
                )}
                {settings?.stampsEnabled !== false && (
                  <ToolButton
                    active={tool === "stamp"}
                    onClick={() => selectTool("stamp")}
                    disabled={!canEdit}
                  >
                    Stamp
                  </ToolButton>
                )}
              </>
            )}
            {canAnnotate && (
              <>
                <ToolButton
                  active={tool === "annotate"}
                  onClick={() => selectTool("annotate")}
                  disabled={!canAnnotate}
                >
                  Annotate
                </ToolButton>
                {!canEdit && (
                  <ToolButton
                    active={tool === "eraser"}
                    onClick={() => selectTool("eraser")}
                    disabled={!canAnnotate}
                  >
                    Eraser
                  </ToolButton>
                )}
              </>
            )}
            <div className="mx-1 h-6 w-px bg-slate-200" />
            {activeColors.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                disabled={!interactive}
                onClick={() => setColor(c)}
                className="h-7 w-7 rounded-full border-2 disabled:opacity-40"
                style={{ background: c, borderColor: color === c ? "#0f172a" : "transparent" }}
              />
            ))}
            <div className="mx-1 h-6 w-px bg-slate-200" />
            {activeWidths.map((w) => (
              <button
                key={w}
                type="button"
                disabled={!interactive}
                onClick={() => setWidth(w)}
                className={`rounded-md px-2 py-1 text-xs font-semibold disabled:opacity-40 ${
                  width === w ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {w}px
              </button>
            ))}
            <div className="mx-1 h-6 w-px bg-slate-200" />
            <ToolButton onClick={() => undo()} disabled={!interactive || !canUndo}>
              Undo
            </ToolButton>
            <ToolButton onClick={() => redo()} disabled={!interactive || !canRedo}>
              Redo
            </ToolButton>
            <ToolButton onClick={handleClear} disabled={!interactive}>
              Clear
            </ToolButton>
            {tool === "select" && selectedImage ? (
              <ToolButton onClick={handleDeleteSelectedImage} disabled={!canEdit}>
                Delete image
              </ToolButton>
            ) : null}
            {mode === "edit" && !sharedEdit && (
              <>
                <div className="flex-1" />
                <ToolButton
                  active={participantReady}
                  onClick={handleReadyToggle}
                  disabled={
                    readyBusy || (phase !== "OPEN" && phase !== "REVISION")
                  }
                >
                  {readyBusy
                    ? "Saving…"
                    : participantReady
                      ? "Ready"
                      : "Mark ready"}
                </ToolButton>
                <button
                  type="button"
                  disabled={
                    !canEdit ||
                    !sharedSubmitOk ||
                    submitting ||
                    settings?.allowEarlySubmit === false
                  }
                  onClick={() => void handleSubmit()}
                  className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
                >
                  {submitting ? "Submitting…" : "Submit"}
                </button>
              </>
            )}
          </div>
          {canEdit && settings?.stampsEnabled !== false && tool === "stamp" && (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
              {WHITEBOARD_STAMP_PACK.map((stamp) => (
                <button
                  key={stamp.id}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => {
                    setStampId(stamp.id);
                    selectTool("stamp");
                  }}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-bold disabled:opacity-40 ${
                    stampId === stamp.id
                      ? "bg-teal-700 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {stamp.label}
                </button>
              ))}
            </div>
          )}
          {canEdit && role === "host" ? (
            <p className="border-t border-slate-100 pt-2 text-xs text-slate-500">
              {imageUploading
                ? "Adding image…"
                : tool === "select"
                  ? "Drag an image to move it. Drag the green corner to resize. Delete removes it."
                  : "Use Add image or press Ctrl+V to place a movable image on the board."}
            </p>
          ) : null}
        </div>
      )}
      <TeacherMediaLibraryModal ownerId={mediaLibraryOwnerId} />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function ToolButton({
  children,
  onClick,
  active,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-2.5 py-1.5 text-xs font-bold disabled:opacity-40 ${
        active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
