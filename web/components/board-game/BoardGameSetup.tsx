"use client";

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { MapPreviewCard } from "@/components/board-game/MapPreviewCard";
import { QuestionEditor } from "@/components/board-game/QuestionEditor";
import { downloadMapExport, parseMapImport, prepareImportedMap } from "@/lib/board-game/map/library/export-map";
import { saveCustomMap } from "@/lib/board-game/map/library/storage";
import { MAX_PLAYERS, MIN_PLAYERS, PAWN_COLORS } from "@/lib/board-game/constants";
import { MAP_PRESET_CATALOG, defaultMapIdForPathStyle } from "@/lib/board-game/map/default-maps";
import { formatMapMeta, resolveMapForSetup } from "@/lib/board-game/map/resolve-map";
import { listCustomMaps } from "@/lib/board-game/map/library/storage";
import type { CustomMapRecord } from "@/lib/board-game/map/library/types";
import { createDefaultPlayers } from "@/lib/board-game/question-utils";
import type { GameSetup } from "@/lib/board-game/types";

type Props = {
  setup: GameSetup;
  onChange: (setup: GameSetup) => void;
  onStart: () => void;
  onClear: () => void;
  onOpenBuilder: () => void;
  onEditMap?: (mapId: string) => void;
  mapLibraryKey?: number;
  onMapLibraryChange?: () => void;
};

export function BoardGameSetup({
  setup,
  onChange,
  onStart,
  onClear,
  onOpenBuilder,
  onEditMap,
  mapLibraryKey = 0,
  onMapLibraryChange,
}: Props) {
  const router = useRouter();
  const [customMaps, setCustomMaps] = useState<CustomMapRecord[]>([]);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const namedPlayers = setup.players.filter((player) => player.name.trim().length > 0);
  const canStart = namedPlayers.length >= MIN_PLAYERS && setup.questions.length > 0;
  const activeMapId = setup.mapId ?? defaultMapIdForPathStyle(setup.boardPathStyle);
  const activeMap = resolveMapForSetup(setup);
  const isCustomMap = activeMap.id.startsWith("custom-");

  useEffect(() => {
    setCustomMaps(listCustomMaps());
  }, [mapLibraryKey]);

  function showImportMessage(message: string) {
    setImportMessage(message);
    window.setTimeout(() => setImportMessage(null), 2500);
  }

  function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const raw = typeof reader.result === "string" ? reader.result : "";
      const result = parseMapImport(raw);
      if (!result.ok) {
        showImportMessage(result.error);
        return;
      }
      const prepared = prepareImportedMap(result.map, result.title);
      const saved = saveCustomMap({
        id: prepared.id,
        title: prepared.title,
        map: prepared,
      });
      onChange({
        ...setup,
        mapId: saved.id,
        map: undefined,
        boardPathStyle: setup.boardPathStyle,
      });
      onMapLibraryChange?.();
      showImportMessage(`Imported "${saved.title}".`);
    };
    reader.readAsText(file);
  }

  function updatePlayerCount(count: number) {
    const playerCount = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, count));
    const nextPlayers =
      playerCount > setup.players.length ?
        [...setup.players, ...createDefaultPlayers(playerCount - setup.players.length)]
      : setup.players.slice(0, playerCount);

    onChange({
      ...setup,
      playerCount,
      players: nextPlayers.map((player, index) => ({
        ...player,
        color: player.color || PAWN_COLORS[index % PAWN_COLORS.length]!.hex,
      })),
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col items-center gap-2">
        <KidButton disabled={!canStart} onClick={onStart} className="min-w-[12rem] text-lg">
          Start Game
        </KidButton>
        <KidButton
          variant="secondary"
          disabled={setup.questions.length === 0}
          onClick={() => router.push("/board-game/multiplayer/host")}
          className="min-w-[12rem] text-lg"
        >
          Play with class
        </KidButton>
        {!canStart ?
          <p className="text-center text-sm font-semibold text-kid-ink/70">
            Need at least {MIN_PLAYERS} named players and 1 question to start solo.
          </p>
        : (
          <p className="text-center text-sm font-semibold text-kid-ink/70">
            Play with class uses your current map and questions. Students join with a code.
          </p>
        )}
      </div>

      <header className="text-center">
        <h1 className="text-4xl font-extrabold text-kid-ink">ESL Board Game Setup</h1>
        <p className="mt-2 text-lg text-kid-ink/70">
          Configure players, board, and questions. Then start the game for your class.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <KidPanel>
          <h2 className="text-xl font-bold text-kid-ink">Players</h2>
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-kid-ink">Number of players ({MIN_PLAYERS}–{MAX_PLAYERS})</span>
            <input
              type="range"
              min={MIN_PLAYERS}
              max={MAX_PLAYERS}
              value={setup.playerCount}
              onChange={(event) => updatePlayerCount(Number(event.target.value))}
              className="mt-2 w-full"
            />
            <span className="text-lg font-bold text-kid-ink">{setup.playerCount} players</span>
          </label>

          <div className="mt-4 space-y-3">
            {setup.players.map((player, index) => (
              <div
                key={player.id}
                className="grid gap-3 rounded-lg border-4 border-kid-ink bg-kid-surface-muted p-3 md:grid-cols-[1fr_auto]"
              >
                <label className="block">
                  <span className="text-sm font-semibold text-kid-ink">Player {index + 1} name</span>
                  <input
                    className="mt-1 w-full rounded-lg border-4 border-kid-ink px-3 py-2 text-lg"
                    value={player.name}
                    onChange={(event) => {
                      const nextPlayers = [...setup.players];
                      nextPlayers[index] = { ...player, name: event.target.value };
                      onChange({ ...setup, players: nextPlayers });
                    }}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-kid-ink">Pawn color</span>
                  <select
                    className="mt-1 w-full rounded-lg border-4 border-kid-ink px-3 py-2 text-lg"
                    value={player.color}
                    onChange={(event) => {
                      const nextPlayers = [...setup.players];
                      nextPlayers[index] = { ...player, color: event.target.value };
                      onChange({ ...setup, players: nextPlayers });
                    }}
                  >
                    {PAWN_COLORS.map((color) => (
                      <option key={color.id} value={color.hex}>
                        {color.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </div>
        </KidPanel>

        <KidPanel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-kid-ink">Board Map</h2>
              <p className="mt-1 text-sm font-semibold text-kid-ink/60">
                Built-in presets or your saved custom maps.
              </p>
            </div>
            <KidButton variant="secondary" onClick={onOpenBuilder}>
              Map Builder
            </KidButton>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFile}
            />
            <KidButton variant="secondary" onClick={() => importInputRef.current?.click()}>
              Import map
            </KidButton>
          </div>
          {importMessage ?
            <p className="mt-2 text-sm font-bold text-kid-accent">{importMessage}</p>
          : null}

          <div className="mt-4 space-y-2">
            <p className="text-sm font-bold uppercase tracking-wide text-kid-ink/50">Built-in maps</p>
            {MAP_PRESET_CATALOG.map((preset) => (
              <MapPickerRow
                key={preset.id}
                label={preset.label}
                description={preset.description}
                selected={activeMapId === preset.id}
                onSelect={() =>
                  onChange({
                    ...setup,
                    mapId: preset.id,
                    map: undefined,
                    boardPathStyle: preset.boardPathStyle,
                  })
                }
              />
            ))}
          </div>

          <div className="mt-5 space-y-2">
            <p className="text-sm font-bold uppercase tracking-wide text-kid-ink/50">My maps</p>
            {customMaps.length === 0 ? (
              <p className="text-sm font-semibold text-kid-ink/60">
                No custom maps yet. Open Map Builder to create one.
              </p>
            ) : (
              customMaps.map((entry) => (
                <MapPickerRow
                  key={entry.id}
                  label={entry.title}
                  description={`${entry.map.pathOrder.length - 1} spaces · ${entry.map.layoutTemplate} · ${entry.map.theme}`}
                  selected={activeMapId === entry.id}
                  onSelect={() =>
                    onChange({
                      ...setup,
                      mapId: entry.id,
                      map: undefined,
                      boardPathStyle: setup.boardPathStyle,
                    })
                  }
                  secondaryAction={
                    <>
                      {onEditMap ?
                        <KidButton
                          variant="secondary"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEditMap(entry.id);
                          }}
                        >
                          Edit
                        </KidButton>
                      : null}
                      <KidButton
                        variant="secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          downloadMapExport(entry.map, entry.title);
                        }}
                      >
                        Export
                      </KidButton>
                    </>
                  }
                />
              ))
            )}
          </div>
        </KidPanel>
      </div>

      <MapPreviewCard map={activeMap} />

      <QuestionEditor
        questions={setup.questions}
        onChange={(questions) => onChange({ ...setup, questions })}
      />

      <div className="rounded-2xl border-4 border-kid-ink bg-kid-surface-muted px-5 py-4">
        <p className="text-sm font-bold uppercase tracking-wide text-kid-ink/50">Ready to play</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-lg font-extrabold text-kid-ink">{activeMap.title}</span>
          {isCustomMap ? (
            <span className="rounded-full border-2 border-kid-ink bg-kid-accent/20 px-2 py-0.5 text-xs font-bold uppercase text-kid-ink">
              Custom
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm font-semibold text-kid-ink/60">
          {formatMapMeta(activeMap)} · {setup.playerCount} players · {setup.questions.length}{" "}
          {setup.questions.length === 1 ? "question" : "questions"}
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <KidButton variant="secondary" onClick={onClear}>
          Clear All
        </KidButton>
      </div>
    </div>
  );
}

function MapPickerRow({
  label,
  description,
  selected,
  onSelect,
  secondaryAction,
}: {
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  secondaryAction?: ReactNode;
}) {
  return (
    <div
      role="radio"
      aria-checked={selected}
      aria-label={`Select map: ${label}`}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border-4 px-4 py-3 transition-colors ${
        selected ? "border-kid-accent bg-kid-accent/15" : "border-kid-ink bg-kid-surface-muted hover:bg-kid-surface"
      }`}
    >
      <div className="flex flex-1 items-center justify-between gap-3">
        <span>
          <span className="block text-lg font-bold text-kid-ink">{label}</span>
          <span className="text-sm font-semibold text-kid-ink/60">{description}</span>
        </span>
        <input
          type="radio"
          name="boardMap"
          checked={selected}
          readOnly
          className="pointer-events-none"
          aria-hidden
        />
      </div>
      {secondaryAction ?
        <div
          className="flex flex-wrap gap-2"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {secondaryAction}
        </div>
      : null}
    </div>
  );
}
