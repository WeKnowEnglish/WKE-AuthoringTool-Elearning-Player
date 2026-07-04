"use client";

import { clsx } from "clsx";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { BoardConnectionsLayer } from "@/components/board-game/BoardConnectionsLayer";
import { TravelPawnLayer } from "@/components/board-game/TravelPawnLayer";
import { useBoardLayout } from "@/components/board-game/BoardLayoutContext";
import { TilePawnSlot } from "@/components/board-game/TilePawnSlot";
import { getBoardTheme } from "@/lib/board-game/board-theme";
import { getSpaceAt } from "@/lib/board-game/board-spaces";
import { gridBoundsForMap, pathIndexFromSpaceId } from "@/lib/board-game/map/generate-map";
import type { BoardMap } from "@/lib/board-game/map/types";
import type { PawnOnTile } from "@/lib/board-game/pawn-utils";
import { pawnsByPathIndex } from "@/lib/board-game/pawn-utils";
import type { TravelHop } from "@/lib/board-game/travel-state";
import type { GameRuntime, Player } from "@/lib/board-game/types";

export type GameBoardMode = "play" | "builder" | "preview";

type PlayProps = {
  mode?: "play";
  map: BoardMap;
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
  specialSpace,
  highlighted,
  selected,
  themeId,
  style,
  mode,
  compact,
  pawns,
  currentPlayerIndex,
  landingBounce,
  onClick,
}: {
  pathIndex: number;
  boardLength: number;
  spaceType: string;
  label: string;
  icon?: string;
  specialSpace: ReturnType<typeof getSpaceAt>;
  highlighted: boolean;
  selected?: boolean;
  themeId: BoardMap["theme"];
  style: CSSProperties;
  mode: GameBoardMode;
  compact?: boolean;
  pawns?: PawnOnTile[];
  currentPlayerIndex?: number;
  landingBounce?: boolean;
  onClick?: () => void;
}) {
  const { registerSpace } = useBoardLayout();
  const ref = useRef<HTMLDivElement>(null);
  const theme = getBoardTheme(themeId);
  const isFinish = pathIndex === boardLength;
  const isStart = pathIndex === 0;
  const isGrass = pathIndex % 2 === 1 && !isStart && !isFinish;
  const interactive = mode === "builder" && Boolean(onClick);

  useEffect(() => {
    registerSpace(pathIndex, ref.current);
    return () => registerSpace(pathIndex, null);
  }, [registerSpace, pathIndex]);

  const emoji = specialSpace?.emoji ?? icon;

  return (
    <motion.div
      ref={ref}
      style={style}
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
        "relative flex flex-col items-center justify-between border-4 border-kid-ink p-2",
        compact ? "min-h-[3.75rem]" : "min-h-[4.5rem] md:min-h-[5.5rem]",
        theme.tileRadius,
        theme.tileShadow,
        isFinish ? theme.finishTile
        : isStart ? theme.startTile
        : isGrass ? theme.grassTile
        : theme.pathTile,
        interactive && "cursor-pointer hover:brightness-105",
        selected && "ring-4 ring-kid-accent ring-offset-2",
      )}
    >
      {mode === "builder" ? (
        <span className="absolute left-1 top-1 rounded bg-kid-ink/80 px-1.5 py-0.5 text-[0.6rem] font-bold text-white">
          {pathIndex}
        </span>
      ) : null}
      {emoji ? (
        <span className="absolute -right-1 -top-1 text-lg" title={specialSpace?.label ?? label}>
          {emoji}
        </span>
      ) : null}
      {isFinish ? (
        <motion.span
          animate={{ rotate: [0, 8, -8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute -right-2 -top-3 text-2xl"
        >
          🚩
        </motion.span>
      ) : null}
      <span
        className={clsx(
          "text-center font-bold uppercase leading-tight tracking-wide text-kid-ink/70",
          compact ? "text-[0.55rem]" : "text-[0.65rem] md:text-xs",
        )}
      >
        {displayLabel(spaceType, label, pathIndex, boardLength)}
      </span>
      {mode === "play" && pawns !== undefined && currentPlayerIndex !== undefined ? (
        <TilePawnSlot
          pawns={pawns}
          pathIndex={pathIndex}
          currentPlayerIndex={currentPlayerIndex}
          landingBounce={landingBounce}
          compact={compact}
        />
      ) : (
        <div className={compact ? "min-h-6" : "min-h-8"} aria-hidden />
      )}
    </motion.div>
  );
}

function BoardGrid({
  props,
  compact,
}: {
  props: Props;
  compact?: boolean;
}) {
  const mode = props.mode ?? "play";
  const map = props.map;
  const boardLength = map.pathOrder.length - 1;
  const { cols, rows } = gridBoundsForMap(map);
  const runtime =
    isPlayProps(props) ? props.runtime : (props.runtime ?? EMPTY_RUNTIME);
  const tilePawns =
    isPlayProps(props) ? pawnsByPathIndex(props.players, props.displayPositions) : null;
  const movingPlayerIndex = isPlayProps(props) ? props.movingPlayerIndex ?? null : null;
  const travelHop = isPlayProps(props) ? props.travelHop ?? null : null;

  function pawnsForTile(pathIndex: number): PawnOnTile[] {
    const pawns = tilePawns?.get(pathIndex) ?? [];
    if (movingPlayerIndex === null) return pawns;
    return pawns.filter((pawn) => pawn.playerIndex !== movingPlayerIndex);
  }

  function travelLayer(compact?: boolean) {
    if (!isPlayProps(props) || !travelHop || movingPlayerIndex === null) return null;
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

  return (
    <div
      className={clsx(
        "grid gap-2 md:gap-3",
        mode === "play" && "fitViewport" in props && props.fitViewport ? "w-max" : "mx-auto w-full min-w-[min(100%,720px)] max-w-6xl",
      )}
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(${compact ? "3.75rem" : "4.5rem"}, 1fr))`,
        minHeight: mode === "play" && !("fitViewport" in props && props.fitViewport) ? "min(72vh, 780px)" : undefined,
      }}
    >
      {map.spaces.map((space) => {
        const pathIndex = pathIndexFromSpaceId(map, space.id);
        if (pathIndex < 0) return null;

        const selected =
          mode !== "play" && "selectedSpaceId" in props && props.selectedSpaceId === space.id;
        const highlighted =
          mode === "play" && "highlightedSpace" in props && props.highlightedSpace === pathIndex;

        return (
          <BoardSpaceTile
            key={space.id}
            pathIndex={pathIndex}
            boardLength={boardLength}
            spaceType={space.type}
            label={space.label}
            icon={space.icon}
            specialSpace={getSpaceAt(runtime.boardSpaces, pathIndex)}
            highlighted={Boolean(highlighted)}
            selected={selected}
            themeId={map.theme}
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
            style={{
              gridColumn: space.grid.col + 1,
              gridRow: space.grid.row + 1,
            }}
          />
        );
      })}
    </div>
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
  const mode = props.mode ?? "play";
  const map = props.map;
  const { boardRef } = useBoardLayout();
  const theme = getBoardTheme(map.theme);
  const fitViewport = isPlayProps(props) && props.fitViewport;

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
            className="relative rounded-2xl border-4 border-kid-ink p-3 md:p-4"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "center center",
              background: theme.boardBg,
            }}
          >
            <BoardGrid props={props} compact />
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
      className="relative w-full overflow-x-auto rounded-2xl border-4 border-kid-ink p-3 md:p-4"
      style={{ background: theme.boardBg }}
    >
      <BoardGrid props={props} />
      <BoardConnectionsLayer map={map} />
      <BoardTravelLayer props={props} />
    </div>
  );
}

const EMPTY_RUNTIME: GameRuntime = {
  currentPlayerIndex: 0,
  playerPositions: [0],
  scores: [0],
  usedQuestionIds: [],
  currentQuestion: null,
  lastDiceRoll: null,
  turnPhase: "roll",
  winnerIndex: null,
  boardSpaces: [],
  checkpoints: [0],
  pendingMissTurn: [false],
  pendingRollAgain: false,
};
