"use client";

import { useEffect, useRef } from "react";
import { clsx } from "clsx";
import { KidButton } from "@/components/kid-ui/KidButton";

type Props = {
  axisX: number;
  axisY: number;
  onAxisChange: (axisX: number, axisY: number) => void;
  onNudge?: (axisX: number, axisY: number) => void;
  onRepeat?: (axisX: number, axisY: number) => void;
};

function DirButton({
  label,
  active,
  className,
  onPress,
  onRelease,
  onTap,
  onRepeat,
}: {
  label: string;
  active: boolean;
  className?: string;
  onPress: () => void;
  onRelease: () => void;
  onTap: () => void;
  onRepeat: () => void;
}) {
  const pressedAtRef = useRef(0);
  const releaseTimerRef = useRef<number | null>(null);
  const repeatDelayRef = useRef<number | null>(null);
  const repeatTimerRef = useRef<number | null>(null);

  const clearRepeat = () => {
    if (repeatDelayRef.current !== null) window.clearTimeout(repeatDelayRef.current);
    if (repeatTimerRef.current !== null) window.clearInterval(repeatTimerRef.current);
    repeatDelayRef.current = null;
    repeatTimerRef.current = null;
  };

  useEffect(() => () => {
    if (releaseTimerRef.current !== null) window.clearTimeout(releaseTimerRef.current);
    clearRepeat();
  }, []);

  const release = () => {
    const elapsed = performance.now() - pressedAtRef.current;
    const remainingPulseMs = Math.max(0, 110 - elapsed);
    if (releaseTimerRef.current !== null) window.clearTimeout(releaseTimerRef.current);
    if (remainingPulseMs > 0) {
      releaseTimerRef.current = window.setTimeout(() => {
        releaseTimerRef.current = null;
        onRelease();
      }, remainingPulseMs);
    } else {
      onRelease();
    }
  };

  return (
    <KidButton
      type="button"
      variant="secondary"
      className={clsx(
        "!min-h-11 !min-w-11 !px-0 text-lg font-extrabold",
        active && "!bg-kid-cta",
        className,
      )}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        if (releaseTimerRef.current !== null) window.clearTimeout(releaseTimerRef.current);
        pressedAtRef.current = performance.now();
        onPress();
        clearRepeat();
        repeatDelayRef.current = window.setTimeout(() => {
          repeatTimerRef.current = window.setInterval(onRepeat, 16);
        }, 110);
      }}
      onPointerUp={(e) => {
        clearRepeat();
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
        release();
      }}
      onPointerCancel={() => {
        clearRepeat();
        if (releaseTimerRef.current !== null) window.clearTimeout(releaseTimerRef.current);
        onRelease();
      }}
      onClick={() => {
        if (performance.now() - pressedAtRef.current < 110) onTap();
      }}
    >
      {label}
    </KidButton>
  );
}

/** On-screen directions merged with keyboard in parent. */
export function ExploreSceneDpad({ axisX, axisY, onAxisChange, onNudge, onRepeat }: Props) {
  const set = (dx: number, dy: number) => onAxisChange(dx, dy);

  return (
    <div
      className="pointer-events-auto grid grid-cols-3 grid-rows-3 gap-1"
      aria-label="Move"
    >
      <div />
      <DirButton
        label="▲"
        active={axisY < 0}
        onPress={() => set(axisX, -1)}
        onRelease={() => set(axisX, 0)}
        onTap={() => onNudge?.(0, -1)}
        onRepeat={() => onRepeat?.(0, -1)}
      />
      <div />
      <DirButton
        label="◀"
        active={axisX < 0}
        onPress={() => set(-1, axisY)}
        onRelease={() => set(0, axisY)}
        onTap={() => onNudge?.(-1, 0)}
        onRepeat={() => onRepeat?.(-1, 0)}
      />
      <div className="flex items-center justify-center text-xs font-bold text-kid-ink/50">
        Move
      </div>
      <DirButton
        label="▶"
        active={axisX > 0}
        onPress={() => set(1, axisY)}
        onRelease={() => set(0, axisY)}
        onTap={() => onNudge?.(1, 0)}
        onRepeat={() => onRepeat?.(1, 0)}
      />
      <div />
      <DirButton
        label="▼"
        active={axisY > 0}
        onPress={() => set(axisX, 1)}
        onRelease={() => set(axisX, 0)}
        onTap={() => onNudge?.(0, 1)}
        onRepeat={() => onRepeat?.(0, 1)}
      />
      <div />
    </div>
  );
}
