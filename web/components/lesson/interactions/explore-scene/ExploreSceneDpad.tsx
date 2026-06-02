"use client";

import { clsx } from "clsx";
import { KidButton } from "@/components/kid-ui/KidButton";

type Props = {
  axisX: number;
  axisY: number;
  onAxisChange: (axisX: number, axisY: number) => void;
};

function DirButton({
  label,
  active,
  className,
  onPress,
  onRelease,
}: {
  label: string;
  active: boolean;
  className?: string;
  onPress: () => void;
  onRelease: () => void;
}) {
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
        onPress();
      }}
      onPointerUp={onRelease}
      onPointerLeave={onRelease}
      onPointerCancel={onRelease}
    >
      {label}
    </KidButton>
  );
}

/** On-screen directions merged with keyboard in parent. */
export function ExploreSceneDpad({ axisX, axisY, onAxisChange }: Props) {
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
      />
      <div />
      <DirButton
        label="◀"
        active={axisX < 0}
        onPress={() => set(-1, axisY)}
        onRelease={() => set(0, axisY)}
      />
      <div className="flex items-center justify-center text-xs font-bold text-kid-ink/50">
        Move
      </div>
      <DirButton
        label="▶"
        active={axisX > 0}
        onPress={() => set(1, axisY)}
        onRelease={() => set(0, axisY)}
      />
      <div />
      <DirButton
        label="▼"
        active={axisY > 0}
        onPress={() => set(axisX, 1)}
        onRelease={() => set(0, axisY)}
      />
      <div />
    </div>
  );
}
