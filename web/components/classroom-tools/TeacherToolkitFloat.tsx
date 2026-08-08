"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { NamePickerToolPanel } from "@/components/classroom-tools/NamePickerToolPanel";
import { TimerToolPanel } from "@/components/classroom-tools/TimerToolPanel";
import {
  formatTimerMs,
  remainingMs,
  elapsedMs,
} from "@/lib/classroom-tools/timer";
import { teacherToolkitStore } from "@/lib/classroom-tools/toolkit-store";

/**
 * Sticky, draggable teacher toolkit floater.
 * Mount once under TeacherSecureShell so it survives route changes.
 */
export function TeacherToolkitFloat() {
  const state = useSyncExternalStore(
    teacherToolkitStore.subscribe,
    teacherToolkitStore.getSnapshot,
    teacherToolkitStore.getServerSnapshot,
  );
  const [mounted, setMounted] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const onTick = useCallback((nowMs: number) => {
    teacherToolkitStore.tickTimer(nowMs);
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, input, textarea, a, select")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: state.x,
      originY: state.y,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    teacherToolkitStore.setPosition(
      drag.originX + (event.clientX - drag.startX),
      drag.originY + (event.clientY - drag.startY),
    );
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };

  if (!mounted || !state.open) return null;

  const portalTarget =
    document.querySelector<HTMLElement>("[data-teacher-root]") ?? document.body;

  const displayMs =
    state.timer.mode === "stopwatch"
      ? elapsedMs(state.timer, Date.now())
      : remainingMs(state.timer, Date.now());

  if (state.minimized) {
    return createPortal(
      <button
        type="button"
        className="fixed z-[220] flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-900 shadow-lg"
        style={{ left: state.x, top: state.y }}
        onClick={() => teacherToolkitStore.setMinimized(false)}
        aria-label="Expand teacher toolkit"
      >
        <span className="text-stone-500" aria-hidden>
          Tools
        </span>
        {state.activeTool === "timer"
          ? formatTimerMs(displayMs)
          : "Name picker"}
      </button>,
      portalTarget,
    );
  }

  return createPortal(
    <div
      className="fixed z-[220] w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-stone-300 bg-white shadow-2xl"
      style={{ left: state.x, top: state.y }}
      role="dialog"
      aria-label="Teacher toolkit"
    >
      <div
        className="flex cursor-grab items-center gap-1 border-b border-stone-200 bg-stone-50 px-2 py-1.5 active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <p className="min-w-0 flex-1 truncate text-xs font-bold text-stone-800">
          Teacher tools
        </p>
        <button
          type="button"
          className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
            state.activeTool === "timer"
              ? "bg-stone-900 text-white"
              : "text-stone-600 hover:bg-stone-200"
          }`}
          onClick={() => teacherToolkitStore.setActiveTool("timer")}
        >
          Timer
        </button>
        <button
          type="button"
          className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
            state.activeTool === "picker"
              ? "bg-stone-900 text-white"
              : "text-stone-600 hover:bg-stone-200"
          }`}
          onClick={() => teacherToolkitStore.setActiveTool("picker")}
        >
          Picker
        </button>
        <button
          type="button"
          className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-stone-600 hover:bg-stone-200"
          onClick={() => teacherToolkitStore.setMinimized(true)}
          aria-label="Minimize toolkit"
        >
          –
        </button>
        <button
          type="button"
          className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-stone-600 hover:bg-stone-200"
          onClick={() => teacherToolkitStore.close()}
          aria-label="Close toolkit"
        >
          ×
        </button>
      </div>
      <div className="max-h-[min(70vh,32rem)] overflow-y-auto p-3">
        {state.activeTool === "timer" ? (
          <TimerToolPanel
            compact
            timer={state.timer}
            minutes={state.timerMinutes}
            onMinutesChange={teacherToolkitStore.setTimerMinutes}
            onModeChange={teacherToolkitStore.setTimerMode}
            onStart={teacherToolkitStore.startTimer}
            onPause={teacherToolkitStore.pauseTimer}
            onResume={teacherToolkitStore.resumeTimer}
            onReset={teacherToolkitStore.resetTimer}
            onTick={onTick}
          />
        ) : (
          <NamePickerToolPanel
            picker={state.picker}
            draft={state.pickerDraft}
            onDraftChange={teacherToolkitStore.setPickerDraft}
            onApplyBank={teacherToolkitStore.applyPickerBank}
            onDraw={teacherToolkitStore.drawPicker}
            onResetCycle={teacherToolkitStore.resetPicker}
          />
        )}
      </div>
    </div>,
    portalTarget,
  );
}
