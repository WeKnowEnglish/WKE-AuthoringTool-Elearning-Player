/** Logical board size — all strokes use these coordinates. */
export const BOARD_WIDTH = 1600;
export const BOARD_HEIGHT = 900;
export const BOARD_ASPECT = BOARD_WIDTH / BOARD_HEIGHT;

export type WhiteboardRoundPhase =
  | "DRAFT"
  | "WAITING"
  | "OPEN"
  | "PAUSED"
  | "COLLECTING"
  | "COLLECTED"
  | "REVIEW"
  | "REVISION"
  | "ENDED";

export type BoardStatus =
  | "WAITING"
  | "ACTIVE"
  | "SUBMITTED"
  | "AUTO_SUBMITTED"
  | "RETURNED"
  | "LOCKED"
  | "REVIEWED";

export type WhiteboardMode = "individual" | "group" | "teacher_demo";

export type BoardOwnerType = "teacher" | "student" | "group";

export type Point = {
  x: number;
  y: number;
  pressure?: number;
};

export type StrokeKind = "ink" | "highlight";

export type StrokeElement = {
  id: string;
  type: "stroke";
  points: Point[];
  color: string;
  width: number;
  opacity: number;
  strokeKind?: StrokeKind;
  createdBy: string;
  createdAt: number;
};

export type TextElement = {
  id: string;
  type: "text";
  x: number;
  y: number;
  width: number;
  text: string;
  fontSize: number;
  color: string;
  createdBy: string;
  createdAt: number;
};

export type ShapeKind = "rect" | "ellipse" | "line";

export type ShapeElement = {
  id: string;
  type: "shape";
  shape: ShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  stroke: string;
  strokeWidth: number;
  fill: string;
  opacity: number;
  createdBy: string;
  createdAt: number;
};

export type StampElement = {
  id: string;
  type: "stamp";
  stampId: string;
  label: string;
  x: number;
  y: number;
  size: number;
  createdBy: string;
  createdAt: number;
};

export type ImageElement = {
  id: string;
  type: "image";
  url: string;
  mediaAssetId?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  alt: string;
  createdBy: string;
  createdAt: number;
};

export type WhiteboardElement =
  | StrokeElement
  | TextElement
  | ShapeElement
  | StampElement
  | ImageElement;

export type BoardBackground = {
  assetId: string | null;
  url: string | null;
  fit: "contain" | "cover";
  opacity: number;
};

export type TimerStatus = "idle" | "running" | "paused" | "expired";

export type TimerState = {
  status: TimerStatus;
  durationMs: number;
  startedAt: number | null;
  pausedAt: number | null;
  accumulatedPausedMs: number;
};

export type BoardScope =
  | { type: "teacher" }
  | { type: "student"; studentId: string }
  | { type: "group"; groupId: string };

export type WhiteboardPrompt = {
  title: string;
  instructions: string;
};

export type WhiteboardSettings = {
  allowEarlySubmit: boolean;
  lockAfterSubmit: boolean;
  textEnabled: boolean;
  hideNamesInReview: boolean;
  defaultTimerMs: number;
  stampsEnabled: boolean;
  shapesEnabled: boolean;
  highlighterEnabled: boolean;
  groupSubmitPolicy: GroupSubmitPolicy;
};

export type GroupSubmitPolicy = "any_member" | "leader_only" | "everyone_ready";

export type SubmissionType = "manual" | "teacher_pull" | "timer_expiry";

export type SerializedBoardDocument = {
  id: string;
  ownerType: BoardOwnerType;
  ownerId: string;
  status: BoardStatus;
  revision: number;
  elements: WhiteboardElement[];
  zOrder: string[];
  annotations?: WhiteboardElement[];
  annotationZOrder?: string[];
  privateHint?: string | null;
};

export type WhiteboardAuthRole = "host" | "player";

export type WhiteboardToolId =
  | "pen"
  | "highlighter"
  | "eraser"
  | "text"
  | "shape-rect"
  | "shape-ellipse"
  | "shape-line"
  | "stamp"
  | "select"
  | "annotate";

export type WhiteboardTemplateConfig = {
  id?: string;
  title: string;
  instructions: string;
  mode: WhiteboardMode;
  timerMinutes: number;
  background: BoardBackground;
  settings: Partial<WhiteboardSettings>;
  stampPackId: string;
};

export const PEN_COLORS = [
  "#1e293b",
  "#dc2626",
  "#2563eb",
  "#16a34a",
  "#ca8a04",
  "#ea580c",
] as const;

export const HIGHLIGHT_COLORS = [
  "#fde047",
  "#86efac",
  "#93c5fd",
  "#f9a8d4",
] as const;

export const PEN_WIDTHS = [3, 6, 12] as const;
export const HIGHLIGHT_WIDTHS = [18, 28, 40] as const;

export const DEFAULT_TIMER_MS = 4 * 60 * 1000;

export const EMPTY_BACKGROUND: BoardBackground = {
  assetId: null,
  url: null,
  fit: "contain",
  opacity: 1,
};

export const DEFAULT_SETTINGS: WhiteboardSettings = {
  allowEarlySubmit: true,
  lockAfterSubmit: true,
  textEnabled: true,
  hideNamesInReview: true,
  defaultTimerMs: DEFAULT_TIMER_MS,
  stampsEnabled: true,
  shapesEnabled: true,
  highlighterEnabled: true,
  groupSubmitPolicy: "any_member",
};

/** Curated worksheet backgrounds (SVG data URLs — no Liveblocks blob storage). */
export const WORKSHEET_PRESETS: { id: string; label: string; url: string }[] = [
  {
    id: "lined",
    label: "Lined paper",
    url:
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
          <rect width="1600" height="900" fill="#fffef8"/>
          ${Array.from({ length: 17 }, (_, i) => {
            const y = 80 + i * 48;
            return `<line x1="80" y1="${y}" x2="1520" y2="${y}" stroke="#cbd5e1" stroke-width="2"/>`;
          }).join("")}
        </svg>`,
      ),
  },
  {
    id: "grid",
    label: "Grid",
    url:
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
          <rect width="1600" height="900" fill="#f8fafc"/>
          <defs>
            <pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" stroke-width="1"/>
            </pattern>
          </defs>
          <rect width="1600" height="900" fill="url(#g)"/>
        </svg>`,
      ),
  },
  {
    id: "bedroom",
    label: "Room outline",
    url:
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
          <rect width="1600" height="900" fill="#f1f5f9"/>
          <rect x="120" y="100" width="1360" height="700" fill="none" stroke="#94a3b8" stroke-width="6"/>
          <rect x="200" y="180" width="360" height="220" fill="none" stroke="#94a3b8" stroke-width="4" stroke-dasharray="12 10"/>
          <rect x="900" y="420" width="420" height="280" fill="none" stroke="#94a3b8" stroke-width="4" stroke-dasharray="12 10"/>
          <text x="220" y="170" fill="#64748b" font-size="28" font-family="Nunito,sans-serif">bed</text>
          <text x="920" y="410" fill="#64748b" font-size="28" font-family="Nunito,sans-serif">desk</text>
        </svg>`,
      ),
  },
];

export function createIdleTimer(durationMs: number): TimerState {
  return {
    status: "idle",
    durationMs,
    startedAt: null,
    pausedAt: null,
    accumulatedPausedMs: 0,
  };
}

export function boardIdForScope(scope: BoardScope): string {
  if (scope.type === "teacher") return "board:teacher";
  if (scope.type === "student") return `board:student:${scope.studentId}`;
  return `board:group:${scope.groupId}`;
}

export function submissionIdempotencyKey(
  roundId: string,
  boardId: string,
  revision: number,
): string {
  return `${roundId}:${boardId}:${revision}`;
}
