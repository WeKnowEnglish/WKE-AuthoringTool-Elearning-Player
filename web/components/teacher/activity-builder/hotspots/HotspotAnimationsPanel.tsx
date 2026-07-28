"use client";

import {
  OBJECT_ENTRANCE_LABELS,
  OBJECT_ENTRANCE_PRESETS,
  OBJECT_IDLE_LABELS,
  OBJECT_IDLE_PRESETS,
  type ObjectEntrancePreset,
  type ObjectIdlePreset,
} from "@wke/explore-hotspots-play";
import type { HotspotElement } from "@/lib/hotspots/types";

type Props = {
  selected: HotspotElement | null;
  inputClass: string;
  motionPreviewEnabled?: boolean;
  onMotionPreviewChange?: (enabled: boolean) => void;
  onPatchAnimation: (
    hotspotId: string,
    animation: HotspotElement["animation"] | undefined,
  ) => void;
};

function normalizeAnimation(
  animation: HotspotElement["animation"] | undefined,
): NonNullable<HotspotElement["animation"]> {
  return {
    entrance: animation?.entrance ?? "none",
    entranceDurationMs: animation?.entranceDurationMs ?? 500,
    entranceDelayMs: animation?.entranceDelayMs ?? 0,
    idle: animation?.idle ?? "none",
  };
}

function compactAnimation(
  next: NonNullable<HotspotElement["animation"]>,
): HotspotElement["animation"] | undefined {
  const entrance = next.entrance && next.entrance !== "none" ? next.entrance : undefined;
  const idle = next.idle && next.idle !== "none" ? next.idle : undefined;
  if (!entrance && !idle) return undefined;
  return {
    ...(entrance ? { entrance } : {}),
    ...(entrance
      ? {
          entranceDurationMs: next.entranceDurationMs ?? 500,
          ...(next.entranceDelayMs ? { entranceDelayMs: next.entranceDelayMs } : {}),
        }
      : {}),
    ...(idle ? { idle } : {}),
  };
}

export function HotspotAnimationsPanel({
  selected,
  inputClass,
  motionPreviewEnabled = false,
  onMotionPreviewChange,
  onPatchAnimation,
}: Props) {
  if (!selected) {
    return (
      <section className="rounded-xl border border-stone-200 bg-stone-50/80 p-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
          Animations
        </h2>
        <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
          Select a sprite, shape, text, or hotspot on the canvas. This tab stays open while
          you switch objects.
        </p>
        {onMotionPreviewChange ? (
          <label className="mt-3 flex items-center gap-2 text-sm text-stone-800">
            <input
              type="checkbox"
              className="rounded border-stone-300"
              checked={motionPreviewEnabled}
              onChange={(event) => onMotionPreviewChange(event.target.checked)}
            />
            Preview motion on canvas
          </label>
        ) : null}
      </section>
    );
  }

  const current = normalizeAnimation(selected.animation);
  const entranceActive = current.entrance !== "none";

  const commit = (patch: Partial<NonNullable<HotspotElement["animation"]>>) => {
    onPatchAnimation(selected.id, compactAnimation({ ...current, ...patch }));
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-stone-200 bg-stone-50/80 p-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
          Animations
        </h2>
        <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
          Editing{" "}
          <span className="font-medium text-stone-700">
            {selected.name?.trim() || selected.labelText?.trim() || selected.id}
          </span>
          . Entrance plays when the scene opens; idle loops while the object is visible.
        </p>

        {onMotionPreviewChange ? (
          <label className="mt-3 flex items-center gap-2 text-sm text-stone-800">
            <input
              type="checkbox"
              className="rounded border-stone-300"
              checked={motionPreviewEnabled}
              onChange={(event) => onMotionPreviewChange(event.target.checked)}
            />
            Preview motion on canvas
          </label>
        ) : null}

        <label className="mt-3 block text-xs text-stone-600">
          Entrance
          <select
            className={inputClass}
            value={current.entrance ?? "none"}
            onChange={(event) =>
              commit({ entrance: event.target.value as ObjectEntrancePreset })
            }
          >
            {OBJECT_ENTRANCE_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {OBJECT_ENTRANCE_LABELS[preset]}
              </option>
            ))}
          </select>
        </label>

        {entranceActive ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="block text-xs text-stone-600">
              Duration (ms)
              <input
                type="number"
                min={0}
                max={12000}
                step={50}
                className={inputClass}
                value={current.entranceDurationMs ?? 500}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (!Number.isFinite(value)) return;
                  commit({
                    entranceDurationMs: Math.max(0, Math.min(12_000, value)),
                  });
                }}
              />
            </label>
            <label className="block text-xs text-stone-600">
              Delay (ms)
              <input
                type="number"
                min={0}
                max={12000}
                step={50}
                className={inputClass}
                value={current.entranceDelayMs ?? 0}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (!Number.isFinite(value)) return;
                  commit({
                    entranceDelayMs: Math.max(0, Math.min(12_000, value)),
                  });
                }}
              />
            </label>
          </div>
        ) : null}

        <label className="mt-3 block text-xs text-stone-600">
          Idle loop
          <select
            className={inputClass}
            value={current.idle ?? "none"}
            onChange={(event) =>
              commit({ idle: event.target.value as ObjectIdlePreset })
            }
          >
            {OBJECT_IDLE_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {OBJECT_IDLE_LABELS[preset]}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="mt-3 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 hover:bg-stone-100"
          onClick={() => onPatchAnimation(selected.id, undefined)}
        >
          Clear animations
        </button>
      </section>
    </div>
  );
}
