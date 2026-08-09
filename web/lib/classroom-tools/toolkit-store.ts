/**
 * Sticky teacher toolkit state (non-live).
 * Persists in localStorage so it survives refresh, new tabs, and browser minimize.
 */

import {
  createEmptyPickerState,
  pickStudents,
  resetPickerCycle,
  syncPickerRoster,
  type StudentPickerState,
} from "@/lib/classroom-tools/picker";
import {
  createIdleGlobalTimer,
  maybeExpireCountdown,
  pauseGlobalTimer,
  resetGlobalTimer,
  resumeGlobalTimer,
  setGlobalTimerMode,
  startGlobalTimer,
  type GlobalTimerMode,
  type GlobalTimerState,
} from "@/lib/classroom-tools/timer";

export type ToolkitToolId = "timer" | "picker" | "board";

export type TeacherToolkitState = {
  /** Toolkit stays available (FAB or panel) until dismissed. */
  sticky: boolean;
  /** Full panel vs compact FAB. */
  expanded: boolean;
  activeTool: ToolkitToolId;
  /** Panel top-left in viewport px. */
  x: number;
  y: number;
  timer: GlobalTimerState;
  timerMinutes: number;
  picker: StudentPickerState;
  pickerDraft: string;
};

const STORAGE_KEY = "wke.teacher.toolkit.v2";
const LEGACY_SESSION_KEY = "wke.teacher.toolkit.v1";

const DEFAULT_STATE: TeacherToolkitState = {
  sticky: false,
  expanded: false,
  activeTool: "timer",
  x: 24,
  y: 88,
  timer: createIdleGlobalTimer(60_000),
  timerMinutes: 1,
  picker: createEmptyPickerState([]),
  pickerDraft: "",
};

function clampPosition(x: number, y: number): { x: number; y: number } {
  if (typeof window === "undefined") return { x, y };
  const maxX = Math.max(8, window.innerWidth - 80);
  const maxY = Math.max(8, window.innerHeight - 80);
  return {
    x: Math.min(maxX, Math.max(8, x)),
    y: Math.min(maxY, Math.max(8, y)),
  };
}

function parseLabels(draft: string): string[] {
  return [
    ...new Set(
      draft
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  ].slice(0, 200);
}

function parseTool(value: unknown): ToolkitToolId {
  if (value === "picker" || value === "board") return value;
  // Legacy toolkit id from collaborative whiteboard experiment
  if (value === "whiteboard") return "board";
  return "timer";
}

function readStored(): Partial<TeacherToolkitState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.sessionStorage.getItem(LEGACY_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<TeacherToolkitState> & {
      open?: boolean;
      minimized?: boolean;
      activeTool?: string;
    };
  } catch {
    return null;
  }
}

function persist(state: TeacherToolkitState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sticky: state.sticky,
        expanded: state.expanded,
        activeTool: state.activeTool,
        x: state.x,
        y: state.y,
        timer: state.timer,
        timerMinutes: state.timerMinutes,
        picker: state.picker,
        pickerDraft: state.pickerDraft,
      }),
    );
    window.sessionStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    /* ignore quota */
  }
}

type TeacherToolkitStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => TeacherToolkitState;
  getServerSnapshot: () => TeacherToolkitState;
  openTool: (tool: ToolkitToolId) => void;
  minimize: () => void;
  expand: () => void;
  dismiss: () => void;
  setActiveTool: (tool: ToolkitToolId) => void;
  setPosition: (x: number, y: number) => void;
  setTimerMinutes: (minutes: number) => void;
  setTimerMode: (mode: GlobalTimerMode) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  tickTimer: (nowMs?: number) => void;
  setPickerDraft: (draft: string) => void;
  applyPickerBank: () => void;
  drawPicker: () => void;
  resetPicker: () => void;
};

function createTeacherToolkitStore(): TeacherToolkitStore {
  const listeners = new Set<() => void>();
  let state: TeacherToolkitState = {
    ...DEFAULT_STATE,
    timer: createIdleGlobalTimer(60_000),
    picker: createEmptyPickerState([]),
  };
  let hydrated = false;

  function notify() {
    for (const listener of listeners) listener();
  }

  function ensureHydrated() {
    if (hydrated || typeof window === "undefined") return;
    hydrated = true;
    const stored = readStored();
    if (!stored) return;

    const legacy = stored as Partial<TeacherToolkitState> & {
      open?: boolean;
      minimized?: boolean;
    };
    const sticky =
      typeof legacy.sticky === "boolean" ? legacy.sticky : Boolean(legacy.open);
    const expanded =
      typeof legacy.expanded === "boolean"
        ? legacy.expanded
        : Boolean(legacy.open) && !legacy.minimized;

    const pos = clampPosition(stored.x ?? state.x, stored.y ?? state.y);
    state = {
      ...state,
      sticky,
      expanded: sticky ? expanded : false,
      x: pos.x,
      y: pos.y,
      timer: stored.timer ?? state.timer,
      picker: stored.picker ?? state.picker,
      pickerDraft: stored.pickerDraft ?? state.pickerDraft,
      timerMinutes: stored.timerMinutes ?? state.timerMinutes,
      activeTool: parseTool(stored.activeTool),
    };
    persist(state);
    notify();
  }

  function emit(next: TeacherToolkitState) {
    state = next;
    persist(state);
    notify();
  }

  function patch(partial: Partial<TeacherToolkitState>) {
    ensureHydrated();
    emit({ ...state, ...partial });
  }

  return {
    subscribe(listener) {
      ensureHydrated();
      listeners.add(listener);
      const onStorage = (event: StorageEvent) => {
        if (event.key !== STORAGE_KEY && event.key !== null) return;
        hydrated = false;
        ensureHydrated();
      };
      if (typeof window !== "undefined") {
        window.addEventListener("storage", onStorage);
      }
      return () => {
        listeners.delete(listener);
        if (typeof window !== "undefined") {
          window.removeEventListener("storage", onStorage);
        }
      };
    },
    getSnapshot() {
      ensureHydrated();
      return state;
    },
    getServerSnapshot() {
      return DEFAULT_STATE;
    },
    openTool(tool) {
      ensureHydrated();
      emit({
        ...state,
        sticky: true,
        expanded: true,
        activeTool: tool,
      });
    },
    minimize() {
      patch({ sticky: true, expanded: false });
    },
    expand() {
      patch({ sticky: true, expanded: true });
    },
    dismiss() {
      patch({ sticky: false, expanded: false });
    },
    setActiveTool(tool) {
      patch({ activeTool: tool, sticky: true, expanded: true });
    },
    setPosition(x, y) {
      const pos = clampPosition(x, y);
      patch({ x: pos.x, y: pos.y });
    },
    setTimerMinutes(minutes) {
      patch({
        timerMinutes: Math.max(1, Math.min(120, Math.round(minutes) || 1)),
      });
    },
    setTimerMode(mode) {
      ensureHydrated();
      emit({ ...state, timer: setGlobalTimerMode(state.timer, mode) });
    },
    startTimer() {
      ensureHydrated();
      const now = Date.now();
      const durationMs =
        state.timer.mode === "countdown"
          ? state.timerMinutes * 60_000
          : state.timer.durationMs;
      emit({ ...state, timer: startGlobalTimer(state.timer, now, durationMs) });
    },
    pauseTimer() {
      ensureHydrated();
      emit({ ...state, timer: pauseGlobalTimer(state.timer, Date.now()) });
    },
    resumeTimer() {
      ensureHydrated();
      emit({ ...state, timer: resumeGlobalTimer(state.timer, Date.now()) });
    },
    resetTimer() {
      ensureHydrated();
      const durationMs =
        state.timer.mode === "countdown"
          ? state.timerMinutes * 60_000
          : state.timer.durationMs;
      emit({ ...state, timer: resetGlobalTimer(state.timer, durationMs) });
    },
    tickTimer(nowMs = Date.now()) {
      ensureHydrated();
      const next = maybeExpireCountdown(state.timer, nowMs);
      if (next === state.timer) return;
      emit({ ...state, timer: next });
    },
    setPickerDraft(draft) {
      patch({ pickerDraft: draft });
    },
    applyPickerBank() {
      ensureHydrated();
      const labels = parseLabels(state.pickerDraft);
      emit({
        ...state,
        picker: syncPickerRoster(state.picker, labels),
        pickerDraft: labels.join("\n"),
      });
    },
    drawPicker() {
      ensureHydrated();
      emit({ ...state, picker: pickStudents(state.picker) });
    },
    resetPicker() {
      ensureHydrated();
      emit({ ...state, picker: resetPickerCycle(state.picker) });
    },
  };
}

export const teacherToolkitStore = createTeacherToolkitStore();
