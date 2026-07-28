"use client";

import { AudioClipControls } from "@/components/teacher/activity-builder/AudioClipControls";
import type { HotspotElement } from "@/lib/hotspots/types";
import { SCENE_ENTER_AUDIO_ID } from "@/lib/hotspots/scene-enter";
import type { WkeObjectAction } from "@/lib/wke-activity/types";

type Props = {
  actions: WkeObjectAction[];
  phaseHotspots: HotspotElement[];
  inputClass: string;
  disabled?: boolean;
  onChange: (actions: WkeObjectAction[]) => void;
  onPreviewSceneOpen?: () => void;
};

type SceneEnterActionType =
  | "play_audio"
  | "wait"
  | "enter_object"
  | "pulse_object"
  | "set_object_state";

function defaultRect(hotspots: HotspotElement[]) {
  const rectTarget = hotspots.find((hotspot) => hotspot.geometry.shape === "rectangle");
  if (rectTarget?.geometry.shape === "rectangle") {
    return {
      x: rectTarget.geometry.x,
      y: rectTarget.geometry.y,
      width: rectTarget.geometry.width,
      height: rectTarget.geometry.height,
    };
  }
  return { x: 0.35, y: 0.35, width: 0.3, height: 0.3 };
}

function actionLabel(action: WkeObjectAction) {
  if (action.type === "play_audio" && action.id === SCENE_ENTER_AUDIO_ID) {
    return "Scene open audio";
  }
  return action.type.replaceAll("_", " ");
}

export function HotspotSceneEnterTimeline({
  actions,
  phaseHotspots,
  inputClass,
  disabled = false,
  onChange,
  onPreviewSceneOpen,
}: Props) {
  const targetOptions = phaseHotspots.map((hotspot) => ({
    id: hotspot.id,
    label: hotspot.name?.trim() || hotspot.labelText?.trim() || hotspot.id,
  }));

  const patchAction = (actionId: string, patch: Partial<WkeObjectAction>) => {
    onChange(
      actions.map((action) =>
        action.id === actionId ? ({ ...action, ...patch } as WkeObjectAction) : action,
      ),
    );
  };

  const removeAction = (actionId: string) => {
    onChange(actions.filter((action) => action.id !== actionId));
  };

  const moveAction = (actionId: string, direction: -1 | 1) => {
    const index = actions.findIndex((action) => action.id === actionId);
    if (index < 0) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= actions.length) return;
    const next = [...actions];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(nextIndex, 0, item);
    onChange(next);
  };

  const addAction = (type: SceneEnterActionType) => {
    const idBase = `scene-enter-${type}-${actions.length + 1}`;
    const fallbackTarget = targetOptions[0]?.id ?? "";
    const rect = defaultRect(phaseHotspots);
    let action: WkeObjectAction;
    switch (type) {
      case "play_audio": {
        const hasSceneAudio = actions.some(
          (entry) => entry.type === "play_audio" && entry.id === SCENE_ENTER_AUDIO_ID,
        );
        action = {
          id: hasSceneAudio ? idBase : SCENE_ENTER_AUDIO_ID,
          type: "play_audio",
          audioUrl: "",
          label: "Scene audio",
          wait: true,
        };
        break;
      }
      case "wait":
        action = { id: idBase, type: "wait", ms: 400 };
        break;
      case "enter_object":
        action = {
          id: idBase,
          type: "enter_object",
          targetId: fallbackTarget,
          to: rect,
          durationMs: 700,
          from: { y: Math.max(-0.2, rect.y - 0.2) },
          wait: true,
        };
        break;
      case "pulse_object":
        action = {
          id: idBase,
          type: "pulse_object",
          targetId: fallbackTarget,
          enabled: true,
        };
        break;
      case "set_object_state":
        action = {
          id: idBase,
          type: "set_object_state",
          targetId: fallbackTarget,
          state: "visible",
        };
        break;
    }
    onChange([...actions, action]);
  };

  return (
    <div className={disabled ? "pointer-events-none opacity-50" : undefined}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
          Scene open timeline
        </h3>
        {onPreviewSceneOpen ? (
          <button
            type="button"
            className="rounded border border-sky-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-sky-800 hover:border-sky-400"
            onClick={onPreviewSceneOpen}
          >
            Preview scene open
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
        Runs when students enter this scene. Use audio, waits, entrances, and pulses.
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {(
          [
            ["play_audio", "Audio"],
            ["wait", "Wait"],
            ["enter_object", "Enter"],
            ["pulse_object", "Pulse"],
            ["set_object_state", "Show/hide"],
          ] as const
        ).map(([type, label]) => (
          <button
            key={type}
            type="button"
            className="rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] text-sky-900 hover:border-sky-400"
            onClick={() => addAction(type)}
          >
            + {label}
          </button>
        ))}
      </div>

      {actions.length === 0 ? (
        <p className="mt-2 rounded-lg border border-dashed border-stone-200 px-2.5 py-2 text-[11px] text-stone-500">
          No scene-open steps yet. Add audio or an entrance above.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {actions.map((action, index) => (
            <div
              key={action.id}
              className="rounded-lg border border-stone-200 bg-white p-2.5"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                  {index + 1}. {actionLabel(action)}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded border border-stone-200 px-1.5 py-0.5 text-[10px] text-stone-600 disabled:opacity-30"
                    disabled={index === 0}
                    onClick={() => moveAction(action.id, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="rounded border border-stone-200 px-1.5 py-0.5 text-[10px] text-stone-600 disabled:opacity-30"
                    disabled={index === actions.length - 1}
                    onClick={() => moveAction(action.id, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="text-xs text-rose-700 hover:underline"
                    onClick={() => removeAction(action.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>

              {action.type === "play_audio" ? (
                <AudioClipControls
                  label="Clip"
                  hint="Plays at this step when the scene opens."
                  value={action.audioUrl}
                  onChange={(url) =>
                    patchAction(action.id, { audioUrl: url.trim() })
                  }
                />
              ) : null}

              {action.type === "wait" ? (
                <label className="block text-xs text-stone-600">
                  Wait (ms)
                  <input
                    type="number"
                    min={0}
                    max={12000}
                    step={50}
                    className={inputClass}
                    value={action.ms}
                    onChange={(event) =>
                      patchAction(action.id, {
                        ms: Math.max(0, Number(event.target.value) || 0),
                      })
                    }
                  />
                </label>
              ) : null}

              {action.type === "enter_object" ? (
                <div className="space-y-2">
                  <label className="block text-xs text-stone-600">
                    Object
                    <select
                      className={inputClass}
                      value={action.targetId}
                      onChange={(event) => {
                        const target = phaseHotspots.find(
                          (hotspot) => hotspot.id === event.target.value,
                        );
                        const nextRect =
                          target?.geometry.shape === "rectangle"
                            ? {
                                x: target.geometry.x,
                                y: target.geometry.y,
                                width: target.geometry.width,
                                height: target.geometry.height,
                              }
                            : action.to;
                        patchAction(action.id, {
                          targetId: event.target.value,
                          to: nextRect,
                        });
                      }}
                    >
                      {targetOptions.length === 0 ? (
                        <option value="">No objects in scene</option>
                      ) : (
                        targetOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                  <label className="block text-xs text-stone-600">
                    Duration (ms)
                    <input
                      type="number"
                      min={0}
                      max={12000}
                      step={50}
                      className={inputClass}
                      value={action.durationMs}
                      onChange={(event) =>
                        patchAction(action.id, {
                          durationMs: Math.max(0, Number(event.target.value) || 0),
                        })
                      }
                    />
                  </label>
                  <label className="block text-xs text-stone-600">
                    Enter from
                    <select
                      className={inputClass}
                      value={
                        action.from?.y != null && action.from.y < action.to.y
                          ? "above"
                          : action.from?.y != null && action.from.y > action.to.y
                            ? "below"
                            : "none"
                      }
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value === "none") {
                          patchAction(action.id, { from: undefined });
                          return;
                        }
                        const offset = Math.max(0.12, action.to.height);
                        patchAction(action.id, {
                          from: {
                            y:
                              value === "above"
                                ? action.to.y - offset
                                : action.to.y + offset,
                          },
                        });
                      }}
                    >
                      <option value="none">In place (fade/scale only)</option>
                      <option value="above">From above</option>
                      <option value="below">From below</option>
                    </select>
                  </label>
                </div>
              ) : null}

              {action.type === "pulse_object" ? (
                <div className="space-y-2">
                  <label className="block text-xs text-stone-600">
                    Object
                    <select
                      className={inputClass}
                      value={action.targetId}
                      onChange={(event) =>
                        patchAction(action.id, { targetId: event.target.value })
                      }
                    >
                      {targetOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-stone-800">
                    <input
                      type="checkbox"
                      className="rounded border-stone-300"
                      checked={action.enabled !== false}
                      onChange={(event) =>
                        patchAction(action.id, { enabled: event.target.checked })
                      }
                    />
                    Pulse on
                  </label>
                </div>
              ) : null}

              {action.type === "set_object_state" ? (
                <div className="space-y-2">
                  <label className="block text-xs text-stone-600">
                    Object
                    <select
                      className={inputClass}
                      value={action.targetId}
                      onChange={(event) =>
                        patchAction(action.id, { targetId: event.target.value })
                      }
                    >
                      {targetOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs text-stone-600">
                    State
                    <select
                      className={inputClass}
                      value={action.state}
                      onChange={(event) =>
                        patchAction(action.id, {
                          state: event.target.value as
                            | "hidden"
                            | "visible"
                            | "locked"
                            | "available",
                        })
                      }
                    >
                      <option value="visible">Visible</option>
                      <option value="hidden">Hidden</option>
                      <option value="available">Available</option>
                      <option value="locked">Locked</option>
                    </select>
                  </label>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
