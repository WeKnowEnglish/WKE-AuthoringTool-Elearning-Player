"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";

export type TeacherEditorHeaderPayload = {
  title: string;
  published: boolean;
};

export type EditorSaveState = {
  status: "editing" | "saving" | "saved" | "error";
  lastSavedAt: number | null;
  error: string | null;
};

/** Only the chrome header subscribes — avoids re-rendering the whole lesson editor when toolbar JSX updates. */
const LessonToolbarSlotContext = createContext<ReactNode | null>(null);

type CtxValue = {
  state: TeacherEditorHeaderPayload | null;
  register: (next: TeacherEditorHeaderPayload | null) => void;
  setLessonToolbarSlot: (next: ReactNode | null) => void;
  saveState: EditorSaveState | null;
  setSaveState: (next: EditorSaveState | null) => void;
  /** Increments when the lesson editor reports a successful screen save (for header icon pulse). */
  savePulseSerial: number;
  notifyScreenSaved: () => void;
};

const TeacherEditorHeaderContext = createContext<CtxValue | null>(null);

export function TeacherEditorHeaderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<TeacherEditorHeaderPayload | null>(null);
  const [lessonToolbarSlot, setLessonToolbarSlot] = useState<ReactNode | null>(null);
  const [saveState, setSaveState] = useState<EditorSaveState | null>(null);
  const [savePulseSerial, setSavePulseSerial] = useState(0);
  const register = useCallback((next: TeacherEditorHeaderPayload | null) => {
    setState(next);
  }, []);
  const notifyScreenSaved = useCallback(() => {
    flushSync(() => {
      setSavePulseSerial((n) => n + 1);
    });
  }, []);
  const value = useMemo(
    () => ({
      state,
      register,
      setLessonToolbarSlot,
      saveState,
      setSaveState,
      savePulseSerial,
      notifyScreenSaved,
    }),
    [state, register, saveState, savePulseSerial, notifyScreenSaved],
  );
  return (
    <LessonToolbarSlotContext.Provider value={lessonToolbarSlot}>
      <TeacherEditorHeaderContext.Provider value={value}>{children}</TeacherEditorHeaderContext.Provider>
    </LessonToolbarSlotContext.Provider>
  );
}

export function useTeacherEditorHeader() {
  const ctx = useContext(TeacherEditorHeaderContext);
  if (!ctx) {
    throw new Error(
      "useTeacherEditorHeader must be used within TeacherEditorHeaderProvider",
    );
  }
  return ctx;
}

export function useLessonToolbarSlot(): ReactNode | null {
  return useContext(LessonToolbarSlotContext);
}

/** Call from lesson (or activity) editor pages; clears when the page unmounts. */
export function RegisterTeacherEditorHeader({
  title,
  published,
}: TeacherEditorHeaderPayload) {
  const { register } = useTeacherEditorHeader();
  useLayoutEffect(() => {
    register({ title, published });
    return () => register(null);
  }, [title, published, register]);
  return null;
}

function PublishedIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-5 w-5 shrink-0 text-emerald-600"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function DraftIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-5 w-5 shrink-0 text-orange-500"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function formatSavedTime(ts: number | null): string {
  if (!ts) return "Saved";
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `Saved ${hh}:${mm}`;
}

export function TeacherNavEditorTitle() {
  const { state, savePulseSerial, saveState } = useTeacherEditorHeader();
  if (!state) return null;
  const pulse = savePulseSerial > 0;
  const saveChip =
    !saveState ? null
    : saveState.status === "saving" ? { label: "Saving...", className: "bg-amber-100 text-amber-900 border-amber-200" }
    : saveState.status === "editing" ? { label: "Editing", className: "bg-neutral-100 text-neutral-700 border-neutral-200" }
    : saveState.status === "error" ? {
        label: "Save failed",
        className: "bg-red-100 text-red-900 border-red-200",
      }
    : {
        label: formatSavedTime(saveState.lastSavedAt),
        className: "bg-emerald-100 text-emerald-900 border-emerald-200",
      };
  return (
    <div
      className="flex min-w-0 max-w-[min(36vw,14rem)] items-center gap-1.5 border-l border-neutral-200 pl-2 sm:max-w-[min(42vw,20rem)] sm:gap-2 sm:pl-3"
      title={state.published ? "Published" : "Draft"}
    >
      <span
        key={pulse ? `save-pulse-${savePulseSerial}` : "lesson-status-icon"}
        className={`inline-flex shrink-0${pulse ? " teacher-editor-save-icon-pulse" : ""}`}
      >
        {state.published ? <PublishedIcon /> : <DraftIcon />}
      </span>
      <span className="truncate text-sm font-semibold text-neutral-900 md:text-base">
        {state.title}
      </span>
      {saveChip ? (
        <span
          className={`hidden shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold sm:inline ${saveChip.className}`}
          title={saveState?.error ?? undefined}
        >
          {saveChip.label}
        </span>
      ) : null}
    </div>
  );
}
