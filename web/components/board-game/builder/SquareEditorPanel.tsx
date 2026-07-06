"use client";

import { useEffect, useState } from "react";
import { PathTileEditorSection } from "@/components/board-game/builder/PathTileEditorSection";
import { TerrainTileEditorSection } from "@/components/board-game/builder/TerrainTileEditorSection";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  BUILDER_CONNECTION_TYPES,
  BUILDER_CORRECT_PRESETS,
  BUILDER_EFFECTS,
  BUILDER_ICONS,
  BUILDER_WRONG_PRESETS,
  BUILDER_SPACE_TYPES,
} from "@/lib/board-game/map/library/builder-defaults";
import {
  addConnectionByPathIndex,
  listConnectionOptions,
  removeConnection,
  updateSpace,
} from "@/lib/board-game/map/library/map-mutations";
import { pathIndexFromSpaceId, spaceById } from "@/lib/board-game/map/generate-map";
import type { BoardMap, BoardMapSpace, MapSpaceEffectType } from "@/lib/board-game/map/types";

type Props = {
  map: BoardMap;
  selectedSpaceId: number | null;
  onChange: (map: BoardMap) => void;
};

function correctSelectValue(space: BoardMapSpace): string {
  if (space.effects?.onCorrect) return space.effects.onCorrect;
  if (space.effects?.correctPoints !== undefined) return `points:${space.effects.correctPoints}`;
  if (space.effects?.points !== undefined && space.effects.points > 0) {
    return `points:${space.effects.points}`;
  }
  return "";
}

function wrongSelectValue(space: BoardMapSpace): string {
  if (space.effects?.onWrong) return space.effects.onWrong;
  if (space.effects?.wrongPoints !== undefined) return `points:${space.effects.wrongPoints}`;
  if (space.effects?.points !== undefined && space.effects.points < 0) {
    return `points:${space.effects.points}`;
  }
  return "random";
}

export function SquareEditorPanel({ map, selectedSpaceId, onChange }: Props) {
  const [shortcutDest, setShortcutDest] = useState<number | "">("");
  const [shortcutType, setShortcutType] = useState<BoardMap["connections"][number]["type"]>("bridge");

  useEffect(() => {
    if (selectedSpaceId === null) return;
    const options = listConnectionOptions(map, selectedSpaceId);
    setShortcutDest(options[0]?.pathIndex ?? "");
    setShortcutType("bridge");
  }, [map, selectedSpaceId]);

  if (selectedSpaceId === null) {
    return (
      <KidPanel className="h-full">
        <h2 className="text-xl font-bold text-kid-ink">Square Editor</h2>
        <p className="mt-3 text-sm font-semibold text-kid-ink/60">
          Click a square on the board to edit its label, type, icons, and effects.
        </p>
      </KidPanel>
    );
  }

  const selectedId = selectedSpaceId;
  const space = spaceById(map, selectedId);
  if (!space) return null;
  const selectedSpace = space;

  const pathIndex = pathIndexFromSpaceId(map, selectedId);
  const boardLength = map.pathOrder.length - 1;
  const locked = pathIndex === 0 || pathIndex === boardLength;
  const connection = map.connections.find((entry) => entry.from === selectedId);
  const destinationOptions = listConnectionOptions(map, selectedId);

  function patchSpace(patch: Parameters<typeof updateSpace>[2]) {
    onChange(updateSpace(map, selectedId, patch));
  }

  function patchEffects(patch: NonNullable<BoardMapSpace["effects"]>) {
    patchSpace({ effects: { ...selectedSpace.effects, ...patch } });
  }

  return (
    <KidPanel className="flex h-full flex-col gap-4 overflow-y-auto">
      <div>
        <h2 className="text-xl font-bold text-kid-ink">Square Editor</h2>
        <p className="mt-1 text-sm font-semibold text-kid-ink/60">
          Path index {pathIndex}
          {locked ? " · Start/Finish locked" : ""}
        </p>
      </div>

      <PathTileEditorSection map={map} space={selectedSpace} onChange={onChange} />
      <TerrainTileEditorSection map={map} space={selectedSpace} onChange={onChange} />

      <label className="block">
        <span className="text-sm font-semibold text-kid-ink">Label</span>
        <input
          className="mt-1 w-full rounded-lg border-4 border-kid-ink px-3 py-2"
          value={space.label}
          disabled={locked}
          onChange={(event) => patchSpace({ label: event.target.value })}
        />
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-kid-ink">Type</span>
        <select
          className="mt-1 w-full rounded-lg border-4 border-kid-ink px-3 py-2"
          value={space.type}
          disabled={locked}
          onChange={(event) => patchSpace({ type: event.target.value as BoardMapSpace["type"] })}
        >
          {BUILDER_SPACE_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div>
        <span className="text-sm font-semibold text-kid-ink">Icon</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {BUILDER_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              disabled={locked}
              className={`rounded-lg border-4 px-3 py-2 text-xl ${
                space.icon === icon ? "border-kid-accent bg-kid-accent/20" : "border-kid-ink bg-kid-surface-muted"
              }`}
              onClick={() => patchSpace({ icon })}
            >
              {icon}
            </button>
          ))}
          <KidButton variant="secondary" disabled={locked} onClick={() => patchSpace({ icon: undefined })}>
            Clear
          </KidButton>
        </div>
      </div>

      {!locked ? (
        <>
          <label className="block">
            <span className="text-sm font-semibold text-kid-ink">On land</span>
            <select
              className="mt-1 w-full rounded-lg border-4 border-kid-ink px-3 py-2"
              value={space.effects?.onLand ?? ""}
              onChange={(event) =>
                patchEffects({
                  onLand: (event.target.value || undefined) as MapSpaceEffectType | undefined,
                })
              }
            >
              {BUILDER_EFFECTS.map((option) => (
                <option key={`land-${option.label}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-kid-ink">On correct</span>
            <select
              className="mt-1 w-full rounded-lg border-4 border-kid-ink px-3 py-2"
              value={correctSelectValue(space)}
              onChange={(event) => {
                const value = event.target.value;
                if (value.startsWith("points:")) {
                  patchEffects({
                    onCorrect: undefined,
                    correctPoints: Number(value.slice(7)),
                  });
                  return;
                }
                patchEffects({
                  onCorrect: (value || undefined) as MapSpaceEffectType | undefined,
                  correctPoints: undefined,
                });
              }}
            >
              {BUILDER_CORRECT_PRESETS.map((option) => (
                <option
                  key={`correct-${option.label}`}
                  value={option.points ? `points:${option.points}` : option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-kid-ink">On wrong</span>
            <select
              className="mt-1 w-full rounded-lg border-4 border-kid-ink px-3 py-2"
              value={wrongSelectValue(space)}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "random") {
                  patchEffects({ onWrong: undefined, wrongPoints: undefined });
                  return;
                }
                if (value.startsWith("points:")) {
                  patchEffects({
                    onWrong: undefined,
                    wrongPoints: Number(value.slice(7)),
                  });
                  return;
                }
                patchEffects({
                  onWrong: (value || undefined) as MapSpaceEffectType | undefined,
                  wrongPoints: undefined,
                });
              }}
            >
              {BUILDER_WRONG_PRESETS.map((option) => (
                <option
                  key={`wrong-${option.label}`}
                  value={
                    option.value === "random" ? "random"
                    : option.points ? `points:${option.points}`
                    : option.value
                  }
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-lg border-4 border-kid-ink bg-kid-surface-muted p-3">
            <h3 className="font-bold text-kid-ink">Shortcut from this square</h3>
            {connection ? (
              <div className="mt-2 space-y-2">
                <p className="text-sm font-semibold text-kid-ink/70">
                  Jumps to space {pathIndexFromSpaceId(map, connection.to)} ({connection.type})
                </p>
                <KidButton variant="secondary" onClick={() => onChange(removeConnection(map, selectedId))}>
                  Remove shortcut
                </KidButton>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <label className="block">
                  <span className="text-sm font-semibold text-kid-ink">Destination</span>
                  <select
                    className="mt-1 w-full rounded-lg border-4 border-kid-ink px-3 py-2"
                    value={shortcutDest}
                    onChange={(event) => {
                      const value = event.target.value;
                      setShortcutDest(value === "" ? "" : Number(value));
                    }}
                  >
                    {destinationOptions.map((option) => (
                      <option key={option.spaceId} value={option.pathIndex}>
                        {option.label} (index {option.pathIndex})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-kid-ink">Connection type</span>
                  <select
                    className="mt-1 w-full rounded-lg border-4 border-kid-ink px-3 py-2"
                    value={shortcutType}
                    onChange={(event) =>
                      setShortcutType(event.target.value as BoardMap["connections"][number]["type"])
                    }
                  >
                    {BUILDER_CONNECTION_TYPES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <KidButton
                  variant="secondary"
                  disabled={destinationOptions.length === 0 || shortcutDest === ""}
                  onClick={() => {
                    if (shortcutDest === "") return;
                    onChange(addConnectionByPathIndex(map, pathIndex, shortcutDest, shortcutType));
                  }}
                >
                  Add shortcut
                </KidButton>
              </div>
            )}
          </div>
        </>
      ) : null}
    </KidPanel>
  );
}
