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
import { ScratchBoardToolPanel } from "@/components/classroom-tools/ScratchBoardToolPanel";
import { TimerToolPanel } from "@/components/classroom-tools/TimerToolPanel";
import {
  formatTimerMs,
  remainingMs,
  elapsedMs,
} from "@/lib/classroom-tools/timer";
import { teacherToolkitStore } from "@/lib/classroom-tools/toolkit-store";

function toolFabLabel(
  activeTool: "timer" | "picker" | "board",
  displayMs: number,
): string {
  if (activeTool === "timer") return formatTimerMs(displayMs);
  if (activeTool === "picker") return "Picker";
  return "Board";
}

/**
 * Sticky, draggable teacher toolkit floater.
 * Mount once under TeacherSecureShell so it survives route changes.
 * Persists via localStorage (sticky FAB until dismissed).
 */
export function TeacherToolkitFloat() {
  const state = useSyncExternalStore(
    teacherToolkitStore.subscribe,
    teacherToolkitStore.getSnapshot,
    teacherToolkitStore.getServerSnapshot,
  );
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => Date.now());
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

  useEffect(() => {
    if (!state.sticky || state.timer.status !== "running") return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      teacherToolkitStore.tickTimer(t);
    }, 250);
    return () => window.clearInterval(id);
  }, [state.sticky, state.timer.status]);

  const onTick = useCallback((nowMs: number) => {
    setNow(nowMs);
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

  if (!mounted || !state.sticky) return null;

  const portalTarget =
    document.querySelector<HTMLElement>("[data-teacher-root]") ?? document.body;

  const displayMs =
    state.timer.mode === "stopwatch"
      ? elapsedMs(state.timer, now)
      : remainingMs(state.timer, now);

  if (!state.expanded) {
    return createPortal(
      <button
        type="button"
        className="fixed z-[220] flex cursor-grab items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-900 shadow-lg active:cursor-grabbing"
        style={{ left: state.x, top: state.y }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            originX: state.x,
            originY: state.y,
          };
        }}
        onPointerMove={onPointerMove}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          const moved =
            drag != null &&
            (Math.abs(event.clientX - drag.startX) > 4 ||
              Math.abs(event.clientY - drag.startY) > 4);
          onPointerUp(event);
          if (!moved) teacherToolkitStore.expand();
        }}
        onPointerCancel={onPointerUp}
        aria-label="Expand teacher toolkit"
      >
        <span className="text-stone-500" aria-hidden>
          Tools
        </span>
        {toolFabLabel(state.activeTool, displayMs)}
      </button>,
      portalTarget,
    );
  }

  return createPortal(
    <div
      className="fixed z-[220] w-[min(24rem,calc(100vw-1.5rem))] rounded-xl border border-stone-300 bg-white shadow-2xl"
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
        {(
          [
            ["timer", "Timer"],
            ["picker", "Picker"],
            ["board", "Board"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
              state.activeTool === id
                ? "bg-stone-900 text-white"
                : "text-stone-600 hover:bg-stone-200"
            }`}
            onClick={() => teacherToolkitStore.setActiveTool(id)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-stone-600 hover:bg-stone-200"
          onClick={() => teacherToolkitStore.minimize()}
          aria-label="Minimize toolkit"
          title="Minimize (stays sticky)"
        >
          –
        </button>
        <button
          type="button"
          className="rounded px-1.5 py-0.5 text-[11px] font-semibold text-stone-600 hover:bg-stone-200"
          onClick={() => teacherToolkitStore.dismiss()}
          aria-label="Dismiss toolkit"
          title="Dismiss until you open tools again"
        >
          ×
        </button>
      </div>
      <div className="max-h-[min(70vh,36rem)] overflow-y-auto p-3">
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
        ) : null}
        {state.activeTool === "picker" ? (
          <NamePickerToolPanel
            picker={state.picker}
            draft={state.pickerDraft}
            onDraftChange={teacherToolkitStore.setPickerDraft}
            onApplyBank={teacherToolkitStore.applyPickerBank}
            onDraw={teacherToolkitStore.drawPicker}
            onResetCycle={teacherToolkitStore.resetPicker}
          />
        ) : null}
        {state.activeTool === "board" ? <ScratchBoardToolPanel /> : null}
      </div>
    </div>,
    portalTarget,
  );
}
