/**
 * Local sticky teacher toolkit state (non-live). Survives route changes inside /teacher.
 * Timer + name picker share pure logic from `@/lib/classroom-tools`.
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

export type ToolkitToolId = "timer" | "picker";

export type TeacherToolkitState = {
  open: boolean;
  minimized: boolean;
  activeTool: ToolkitToolId;
  /** Panel top-left in viewport px. */
  x: number;
  y: number;
  timer: GlobalTimerState;
  /** Draft minutes for countdown start/reset. */
  timerMinutes: number;
  picker: StudentPickerState;
  /** Raw bank editor text (one label per line). */
  pickerDraft: string;
};

const STORAGE_KEY = "wke.teacher.toolkit.v1";

const DEFAULT_STATE: TeacherToolkitState = {
  open: false,
  minimized: false,
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

function readStored(): Partial<TeacherToolkitState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<TeacherToolkitState>;
  } catch {
    return null;
  }
}

function persist(state: TeacherToolkitState) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        open: state.open,
        minimized: state.minimized,
        activeTool: state.activeTool,
        x: state.x,
        y: state.y,
        timer: state.timer,
        timerMinutes: state.timerMinutes,
        picker: state.picker,
        pickerDraft: state.pickerDraft,
      }),
    );
  } catch {
    /* ignore quota */
  }
}

type TeacherToolkitStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => TeacherToolkitState;
  getServerSnapshot: () => TeacherToolkitState;
  openTool: (tool: ToolkitToolId) => void;
  close: () => void;
  setMinimized: (minimized: boolean) => void;
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
  let state: TeacherToolkitState = { ...DEFAULT_STATE };
  let hydrated = false;

  function ensureHydrated() {
    if (hydrated || typeof window === "undefined") return;
    hydrated = true;
    const stored = readStored();
    if (!stored) return;
    const pos = clampPosition(stored.x ?? state.x, stored.y ?? state.y);
    state = {
      ...state,
      ...stored,
      x: pos.x,
      y: pos.y,
      timer: stored.timer ?? state.timer,
      picker: stored.picker ?? state.picker,
      pickerDraft: stored.pickerDraft ?? state.pickerDraft,
      timerMinutes: stored.timerMinutes ?? state.timerMinutes,
      activeTool: stored.activeTool === "picker" ? "picker" : "timer",
    };
  }

  function emit(next: TeacherToolkitState) {
    state = next;
    persist(state);
    for (const listener of listeners) listener();
  }

  function patch(partial: Partial<TeacherToolkitState>) {
    ensureHydrated();
    emit({ ...state, ...partial });
  }

  return {
    subscribe(listener) {
      ensureHydrated();
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
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
      emit({ ...state, open: true, minimized: false, activeTool: tool });
    },
    close() {
      patch({ open: false });
    },
    setMinimized(minimized) {
      patch({ minimized });
    },
    setActiveTool(tool) {
      patch({ activeTool: tool, minimized: false, open: true });
    },
    setPosition(x, y) {
      const pos = clampPosition(x, y);
      patch({ x: pos.x, y: pos.y });
    },
    setTimerMinutes(minutes) {
      patch({ timerMinutes: Math.max(1, Math.min(120, Math.round(minutes) || 1)) });
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
