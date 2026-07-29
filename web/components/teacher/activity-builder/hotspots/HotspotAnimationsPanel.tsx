"use client";

import { useState } from "react";
import {
  OBJECT_ENTRANCE_LABELS,
  OBJECT_ENTRANCE_PRESETS,
  OBJECT_IDLE_LABELS,
  OBJECT_IDLE_PRESETS,
  type ObjectEntrancePreset,
  type ObjectIdlePreset,
} from "@wke/explore-hotspots-play";
import type { HotspotElement } from "@/lib/hotspots/types";
import { HotspotCollapsibleCard } from "./HotspotCollapsibleCard";

type RequirementObject = {
  id: string;
  label: string;
  sceneLabel?: string;
};

type Props = {
  selected: HotspotElement | null;
  inputClass: string;
  motionPreviewEnabled?: boolean;
  onMotionPreviewChange?: (enabled: boolean) => void;
  sceneRequirementObjects: RequirementObject[];
  activityRequirementObjects: RequirementObject[];
  onPatchAnimation: (
    hotspotId: string,
    animation: HotspotElement["animation"] | undefined,
  ) => void;
  onPatchHotspot?: (
    hotspotId: string,
    patch: Pick<HotspotElement, "initialState" | "animation">,
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
    entranceRequirements: animation?.entranceRequirements ?? [],
  };
}

function compactAnimation(
  next: NonNullable<HotspotElement["animation"]>,
): HotspotElement["animation"] | undefined {
  const entrance = next.entrance && next.entrance !== "none" ? next.entrance : undefined;
  const idle = next.idle && next.idle !== "none" ? next.idle : undefined;
  const requirements = next.entranceRequirements?.length
    ? next.entranceRequirements
    : undefined;
  if (!entrance && !idle && !requirements) return undefined;
  return {
    ...(entrance ? { entrance } : {}),
    ...(entrance
      ? {
          entranceDurationMs: next.entranceDurationMs ?? 500,
          ...(next.entranceDelayMs ? { entranceDelayMs: next.entranceDelayMs } : {}),
        }
      : {}),
    ...(idle ? { idle } : {}),
    ...(requirements ? { entranceRequirements: requirements } : {}),
  };
}

function RequirementPicker({
  tab,
  onTabChange,
  sceneObjects,
  activityObjects,
  selectedIds,
  excludeId,
  onToggle,
}: {
  tab: "scene" | "activity";
  onTabChange: (tab: "scene" | "activity") => void;
  sceneObjects: RequirementObject[];
  activityObjects: RequirementObject[];
  selectedIds: string[];
  excludeId: string;
  onToggle: (objectId: string, checked: boolean) => void;
}) {
  const list = tab === "scene" ? sceneObjects : activityObjects;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex rounded-lg border border-stone-200 bg-stone-50 p-0.5">
        <button
          type="button"
          className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium ${
            tab === "scene"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-600 hover:text-stone-800"
          }`}
          onClick={() => onTabChange("scene")}
        >
          This scene
        </button>
        <button
          type="button"
          className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium ${
            tab === "activity"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-stone-600 hover:text-stone-800"
          }`}
          onClick={() => onTabChange("activity")}
        >
          Whole activity
        </button>
      </div>
      {list.length === 0 ? (
        <p className="text-[11px] text-stone-500">
          No other objects {tab === "scene" ? "on this scene" : "in this activity"}.
        </p>
      ) : (
        <ul className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-stone-200 bg-white p-2">
          {list
            .filter((item) => item.id !== excludeId)
            .map((item) => {
              const checked = selectedIds.includes(item.id);
              return (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 hover:bg-stone-50">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded border-stone-300"
                      checked={checked}
                      onChange={(event) => onToggle(item.id, event.target.checked)}
                    />
                    <span className="min-w-0 text-xs text-stone-800">
                      <span className="block truncate font-medium">{item.label}</span>
                      {item.sceneLabel ? (
                        <span className="block truncate text-[10px] text-stone-500">
                          {item.sceneLabel}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}

export function HotspotAnimationsPanel({
  selected,
  inputClass,
  motionPreviewEnabled = false,
  onMotionPreviewChange,
  sceneRequirementObjects,
  activityRequirementObjects,
  onPatchAnimation,
  onPatchHotspot,
}: Props) {
  const [openId, setOpenId] = useState<string | null>("motion");
  const [requirementsTab, setRequirementsTab] = useState<"scene" | "activity">("scene");

  if (!selected) {
    return (
      <div className="space-y-3">
        <HotspotCollapsibleCard
          id="motion"
          title="Animations"
          openId={openId}
          onOpenChange={setOpenId}
        >
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
        </HotspotCollapsibleCard>
      </div>
    );
  }

  const current = normalizeAnimation(selected.animation);
  const entranceActive = current.entrance !== "none";
  const requirements = current.entranceRequirements ?? [];

  const commit = (patch: Partial<NonNullable<HotspotElement["animation"]>>) => {
    const next = compactAnimation({ ...current, ...patch });
    const hasRequirements = (next?.entranceRequirements?.length ?? 0) > 0;
    if (onPatchHotspot && hasRequirements && selected.initialState !== "hidden") {
      onPatchHotspot(selected.id, { animation: next, initialState: "hidden" });
      return;
    }
    onPatchAnimation(selected.id, next);
  };

  const toggleRequirement = (objectId: string, checked: boolean) => {
    const nextIds = checked
      ? [...requirements, objectId]
      : requirements.filter((id) => id !== objectId);
    commit({ entranceRequirements: nextIds });
  };

  return (
    <div className="space-y-3">
      <HotspotCollapsibleCard
        id="motion"
        title="Motion"
        openId={openId}
        onOpenChange={setOpenId}
      >
        <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
          Editing{" "}
          <span className="font-medium text-stone-700">
            {selected.name?.trim() || selected.labelText?.trim() || selected.id}
          </span>
          .
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
      </HotspotCollapsibleCard>

      <HotspotCollapsibleCard
        id="entrance"
        title="Entrance"
        openId={openId}
        onOpenChange={setOpenId}
      >
        <label className="mt-2 block text-xs text-stone-600">
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

        <div className="mt-4 border-t border-stone-200 pt-3">
          <p className="text-xs font-semibold text-stone-700">Show when tapped</p>
          <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
            Object stays hidden until every checked object has been tapped by the student.
          </p>
          <RequirementPicker
            tab={requirementsTab}
            onTabChange={setRequirementsTab}
            sceneObjects={sceneRequirementObjects}
            activityObjects={activityRequirementObjects}
            selectedIds={requirements}
            excludeId={selected.id}
            onToggle={toggleRequirement}
          />
          {requirements.length > 0 ? (
            <p className="mt-2 text-[10px] text-stone-500">
              {requirements.length} requirement{requirements.length === 1 ? "" : "s"} selected.
              Initial visibility set to hidden.
            </p>
          ) : null}
        </div>
      </HotspotCollapsibleCard>

      <HotspotCollapsibleCard
        id="idle"
        title="Idle loop"
        openId={openId}
        onOpenChange={setOpenId}
      >
        <label className="mt-2 block text-xs text-stone-600">
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
      </HotspotCollapsibleCard>
    </div>
  );
}
