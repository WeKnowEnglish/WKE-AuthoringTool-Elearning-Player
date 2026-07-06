"use client";

import { clsx } from "clsx";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BoardConnectionsLayer } from "@/components/board-game/BoardConnectionsLayer";
import { BoardSpriteGrid } from "@/components/board-game/BoardSpriteGrid";
import { TravelPawnLayer } from "@/components/board-game/TravelPawnLayer";
import { useBoardLayout } from "@/components/board-game/BoardLayoutContext";
import { TilePawnSlot } from "@/components/board-game/TilePawnSlot";
import { defaultIconForSpaceType } from "@/lib/board-game/map/library/builder-defaults";
import { pathIndexFromSpaceId } from "@/lib/board-game/map/generate-map";
import { pathTileAtSpace } from "@/lib/board-game/map/path-tile-at-cell";
import { terrainTileAtSpace } from "@/lib/board-game/map/terrain-tile-at-cell";
import type { BoardMap } from "@/lib/board-game/map/types";
import { buildBoardTilemap } from "@/lib/board-game/render/build-board-tilemap";
import { boardTilemapLayoutForTheme } from "@/lib/board-game/render/board-tilemap-layout";
import { resolveTilemapSprites } from "@/lib/board-game/render/board-tilemap-sprites";
import type { PawnOnTile } from "@/lib/board-game/pawn-utils";
import { pawnsByPathIndex } from "@/lib/board-game/pawn-utils";
import type { TravelHop } from "@/lib/board-game/travel-state";
import type { GameRuntime, Player } from "@/lib/board-game/types";
import { pathTileLabel } from "@/lib/topdown/wke-path-tile-labels";
import { terrainTileLabel } from "@/lib/topdown/wke-terrain-tile-labels";

export type GameBoardMode = "play" | "builder" | "preview";

type PlayProps = {
  mode?: "play";
  map: BoardMap;
  /** @deprecated Sprites are always enabled. Kept for call-site compatibility. */
  useSpriteTiles?: boolean;
  runtime: GameRuntime;
  highlightedSpace: number | null;
  players: Player[];
  displayPositions: number[];
  currentPlayerIndex: number;
  landingBounce?: boolean;
  fitViewport?: boolean;
  movingPlayerIndex?: number | null;
  travelHop?: TravelHop | null;
};

type BuilderProps = {
  mode: "builder" | "preview";
  map: BoardMap;
  /** @deprecated Sprites are always enabled. Kept for call-site compatibility. */
  useSpriteTiles?: boolean;
  selectedSpaceId?: number | null;
  onSpaceClick?: (spaceId: number, pathIndex: number) => void;
  runtime?: GameRuntime;
};

type Props = PlayProps | BuilderProps;

function isPlayProps(props: Props): props is PlayProps {
  return (props.mode ?? "play") === "play";
}

function displayLabel(spaceType: string, label: string, pathIndex: number, boardLength: number): string {
  if (pathIndex === 0) return "START";
  if (pathIndex === boardLength) return "FINISH";
  if (label && label !== String(pathIndex)) return label.toUpperCase();
  return String(pathIndex);
}

function BoardSpaceTile({
  pathIndex,
  boardLength,
  spaceType,
  label,
  icon,
  highlighted,
  selected,
  mode,
  compact,
  pawns,
  currentPlayerIndex,
  landingBounce,
  onClick,
  pathTileManual,
  pathTileManualLabel,
  terrainTileManual,
  terrainTileManualLabel,
}: {
  pathIndex: number;
  boardLength: number;
  spaceType: string;
  label: string;
  icon?: string;
  highlighted: boolean;
  selected?: boolean;
  mode: GameBoardMode;
  compact?: boolean;
  pawns?: PawnOnTile[];
  currentPlayerIndex?: number;
  landingBounce?: boolean;
  onClick?: () => void;
  pathTileManual?: boolean;
  pathTileManualLabel?: string;
  terrainTileManual?: boolean;
  terrainTileManualLabel?: string;
}) {
  const { registerSpace } = useBoardLayout();
  const ref = useRef<HTMLDivElement>(null);
  const interactive = mode === "builder" && Boolean(onClick);
  const emoji = icon ?? defaultIconForSpaceType(spaceType as BoardMap["spaces"][number]["type"]);

  useEffect(() => {
    registerSpace(pathIndex, ref.current);
    return () => registerSpace(pathIndex, null);
  }, [registerSpace, pathIndex]);

  return (
    <motion.div
      ref={ref}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={
        interactive ?
          (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onClick?.();
            }
          }
        : undefined
      }
      animate={
        highlighted ?
          { boxShadow: "0 0 0 4px rgba(245,166,35,0.8)", scale: 1.05 }
        : selected ?
          { scale: 1.02, boxShadow: "0 0 0 0 rgba(245,166,35,0)" }
        : { boxShadow: "0 0 0 0 rgba(245,166,35,0)", scale: 1 }
      }
      className={clsx(
        "relative flex h-full w-full flex-col items-center justify-between border-4 border-kid-ink bg-transparent p-2",
        interactive && "cursor-pointer hover:brightness-105",
        selected && "ring-4 ring-kid-accent ring-offset-2 ring-offset-transparent",
      )}
    >
      {mode === "builder" ? (
        <span className="absolute left-1 top-1 rounded bg-kid-ink/80 px-1.5 py-0.5 text-[0.6rem] font-bold text-white">
          {pathIndex}
        </span>
      ) : null}
      {mode !== "play" && pathTileManual ?
        <span
          className="absolute right-1 top-1 rounded bg-amber-500 px-1 py-0.5 text-[0.55rem] font-bold text-white"
          title={pathTileManualLabel ?? "Manual path tile"}
        >
          ✎
        </span>
      : null}
      {mode !== "play" && terrainTileManual ?
        <span
          className="absolute bottom-1 right-1 rounded bg-emerald-600 px-1 py-0.5 text-[0.55rem] font-bold text-white"
          title={terrainTileManualLabel ?? "Manual terrain tile"}
        >
          T
        </span>
      : null}
      {emoji ?
        <span className="absolute -right-1 -top-1 text-lg" title={label}>
          {emoji}
        </span>
      : null}
      <span
        className={clsx(
          "rounded bg-white/90 px-1.5 py-0.5 text-center font-bold uppercase leading-tight tracking-wide text-kid-ink shadow-[0_1px_3px_rgba(0,0,0,0.35)] ring-1 ring-kid-ink/15",
          compact ? "text-[0.55rem]" : "text-[0.65rem] md:text-xs",
        )}
      >
        {displayLabel(spaceType, label, pathIndex, boardLength)}
      </span>
      {mode === "play" && pawns !== undefined && currentPlayerIndex !== undefined ?
        <TilePawnSlot
          pawns={pawns}
          pathIndex={pathIndex}
          currentPlayerIndex={currentPlayerIndex}
          landingBounce={landingBounce}
          compact={compact}
        />
      : <div className={compact ? "min-h-6" : "min-h-8"} aria-hidden />}
    </motion.div>
  );
}

function BoardGrid({
  props,
  compact,
  tilemap,
  layout,
  spriteCache,
}: {
  props: Props;
  compact?: boolean;
  tilemap: ReturnType<typeof buildBoardTilemap>;
  layout: ReturnType<typeof boardTilemapLayoutForTheme>;
  spriteCache: ReturnType<typeof resolveTilemapSprites>;
}) {
  const mode = props.mode ?? "play";
  const map = props.map;
  const boardLength = map.pathOrder.length - 1;
  const tilePawns =
    isPlayProps(props) ? pawnsByPathIndex(props.players, props.displayPositions) : null;
  const movingPlayerIndex = isPlayProps(props) ? props.movingPlayerIndex ?? null : null;
  const fitViewport = isPlayProps(props) && props.fitViewport;

  function pawnsForTile(pathIndex: number): PawnOnTile[] {
    const pawns = tilePawns?.get(pathIndex) ?? [];
    if (movingPlayerIndex === null) return pawns;
    return pawns.filter((pawn) => pawn.playerIndex !== movingPlayerIndex);
  }

  function manualTileBadgeProps(space: BoardMap["spaces"][number]) {
    if (mode === "play") return {};

    const pathState = pathTileAtSpace(map, space);
    const terrainState = terrainTileAtSpace(map, space);
    const badges: {
      pathTileManual?: boolean;
      pathTileManualLabel?: string;
      terrainTileManual?: boolean;
      terrainTileManualLabel?: string;
    } = {};

    if (pathState?.isManual) {
      const meta = pathTileLabel(pathState.effective);
      badges.pathTileManual = true;
      badges.pathTileManualLabel = `Manual path tile: ${meta.title} (${pathState.effective})`;
    }
    if (terrainState?.isManual) {
      const meta = terrainTileLabel(terrainState.effective);
      badges.terrainTileManual = true;
      badges.terrainTileManualLabel = `Manual terrain tile: ${meta.title} (${terrainState.effective})`;
    }

    return badges;
  }

  function renderSpaceTile(space: BoardMap["spaces"][number], pathIndex: number) {
    const selected =
      mode !== "play" && "selectedSpaceId" in props && props.selectedSpaceId === space.id;
    const highlighted =
      mode === "play" && "highlightedSpace" in props && props.highlightedSpace === pathIndex;

    return (
      <BoardSpaceTile
        pathIndex={pathIndex}
        boardLength={boardLength}
        spaceType={space.type}
        label={space.label}
        icon={space.icon}
        highlighted={Boolean(highlighted)}
        selected={selected}
        mode={mode}
        compact={compact}
        pawns={pawnsForTile(pathIndex)}
        currentPlayerIndex={isPlayProps(props) ? props.currentPlayerIndex : undefined}
        landingBounce={isPlayProps(props) ? props.landingBounce : undefined}
        onClick={
          mode === "builder" && "onSpaceClick" in props && props.onSpaceClick ?
            () => props.onSpaceClick?.(space.id, pathIndex)
          : undefined
        }
        {...manualTileBadgeProps(space)}
      />
    );
  }

  return (
    <BoardSpriteGrid
      map={map}
      tilemap={tilemap}
      layout={layout}
      spriteCache={spriteCache}
      fitViewport={fitViewport}
      renderSpaceOverlay={renderSpaceTile}
    />
  );
}

function BoardTravelLayer({ props, compact }: { props: Props; compact?: boolean }) {
  if (!isPlayProps(props)) return null;
  const movingPlayerIndex = props.movingPlayerIndex ?? null;
  const travelHop = props.travelHop ?? null;
  if (!travelHop || movingPlayerIndex === null) return null;
  const player = props.players[travelHop.playerIndex];
  if (!player) return null;

  return (
    <TravelPawnLayer
      player={player}
      isCurrent={travelHop.playerIndex === props.currentPlayerIndex}
      travelHop={travelHop}
      compact={compact}
    />
  );
}

export function GameBoard(props: Props) {
  const map = props.map;
  const { boardRef } = useBoardLayout();
  const fitViewport = isPlayProps(props) && props.fitViewport;

  const tilemap = useMemo(() => buildBoardTilemap(map), [map]);
  const layout = useMemo(() => boardTilemapLayoutForTheme(map.theme), [map.theme]);
  const spriteCache = useMemo(() => resolveTilemapSprites(tilemap), [tilemap]);

  const gridProps = {
    props,
    tilemap,
    layout,
    spriteCache,
  };

  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const updateScale = useCallback(() => {
    const stage = stageRef.current;
    const content = contentRef.current;
    if (!stage || !content) return;

    const padding = 16;
    const availableWidth = stage.clientWidth - padding * 2;
    const availableHeight = stage.clientHeight - padding * 2;
    const contentWidth = content.offsetWidth;
    const contentHeight = content.offsetHeight;

    if (contentWidth === 0 || contentHeight === 0 || availableWidth <= 0 || availableHeight <= 0) {
      return;
    }

    const nextScale = Math.min(availableWidth / contentWidth, availableHeight / contentHeight);
    setScale(nextScale);
  }, []);

  useEffect(() => {
    if (!fitViewport) return;

    updateScale();
    const stage = stageRef.current;
    if (!stage) return;

    const observer = new ResizeObserver(() => {
      updateScale();
    });
    observer.observe(stage);

    return () => observer.disconnect();
  }, [fitViewport, map, updateScale]);

  useEffect(() => {
    if (!fitViewport) return;
    const frame = window.requestAnimationFrame(updateScale);
    return () => window.cancelAnimationFrame(frame);
  }, [fitViewport, map, updateScale]);

  if (fitViewport) {
    return (
      <div ref={stageRef} className="relative h-full w-full overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            ref={(node) => {
              contentRef.current = node;
              boardRef.current = node;
            }}
            className="relative rounded-2xl border-4 border-kid-ink bg-[#3a3a3a] p-3 md:p-4"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "center center",
            }}
          >
            <BoardGrid {...gridProps} compact />
            <BoardConnectionsLayer map={map} />
            <BoardTravelLayer props={props} compact />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={boardRef}
      className="relative w-full overflow-x-auto rounded-2xl border-4 border-kid-ink bg-[#3a3a3a] p-3 md:p-4"
    >
      <BoardGrid {...gridProps} />
      <BoardConnectionsLayer map={map} />
      <BoardTravelLayer props={props} />
    </div>
  );
}
