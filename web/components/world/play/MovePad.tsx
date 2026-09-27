"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";

type Stick = { x: number; z: number };

type Props = {
  onChange: (stick: Stick) => void;
  hintClassName?: string;
};

export function MovePad({ onChange, hintClassName = "text-slate-800" }: Props) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const pointerId = useRef<number | null>(null);

  const release = () => {
    pointerId.current = null;
    onChangeRef.current({ x: 0, z: 0 });
  };

  useEffect(() => {
    const onLost = (event: PointerEvent) => {
      if (pointerId.current != null && event.pointerId === pointerId.current) release();
    };
    const onBlur = () => release();
    window.addEventListener("pointerup", onLost);
    window.addEventListener("pointercancel", onLost);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("pointerup", onLost);
      window.removeEventListener("pointercancel", onLost);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const press = (x: number, z: number) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerId.current = event.pointerId;
    onChange({ x, z });
  };

  const btn =
    "rounded-md bg-black/45 px-3 py-2 text-sm font-bold text-white active:bg-black/70 touch-none select-none";
  return (
    <div className="pointer-events-none absolute bottom-5 left-4 z-10">
      <div className="pointer-events-auto grid w-36 grid-cols-3 gap-1">
        <span />
        <button type="button" className={btn} onPointerDown={press(0, -1)} onPointerUp={release} onLostPointerCapture={release}>
          ↑
        </button>
        <span />
        <button type="button" className={btn} onPointerDown={press(-1, 0)} onPointerUp={release} onLostPointerCapture={release}>
          ←
        </button>
        <button type="button" className={btn} onPointerDown={press(0, 1)} onPointerUp={release} onLostPointerCapture={release}>
          ↓
        </button>
        <button type="button" className={btn} onPointerDown={press(1, 0)} onPointerUp={release} onLostPointerCapture={release}>
          →
        </button>
      </div>
      <p className={`mt-1 text-[10px] font-semibold ${hintClassName}`}>or WASD</p>
    </div>
  );
}
