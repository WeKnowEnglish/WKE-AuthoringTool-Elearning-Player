"use client";

import { useRef, type ReactNode } from "react";
import { clsx } from "clsx";
import { GardenLockedGrassTile } from "@/components/garden/GardenLockedGrassTile";
import { GardenPlotLabel } from "@/components/garden/GardenPlotLabel";
import { GardenStackedPlotCell } from "@/components/garden/GardenStackedPlotCell";
import { useGardenGridScale } from "@/components/garden/useGardenGridScale";
import type { FarmPlot, GardenSnapshotV1 } from "@/lib/garden";
import {
  GARDEN_GRID_BG,
  GARDEN_GRID_OUTER_TOP_PAD_PX,
  GARDEN_GRID_PAD_BOTTOM_PX,
  GARDEN_GRID_PAD_TOP_PX,
  GARDEN_GRID_PAD_X_PX,
  GARDEN_GRID_VERTICAL_OFFSET_PX,
  GARDEN_LABEL_OFFSET_Y_PX,
  gardenGridStyle,
  gardenPlotOverlayText,
  gardenPlotOverlayVariant,
  resolveGardenCellVisual,
} from "@/lib/garden/garden-map-layout";

type Props = {
  snapshot: GardenSnapshotV1;
  now: number;
  gold: number;
  selectedPlot: { row: number; col: number } | null;
  waterMode?: boolean;
  fertilizeMode?: boolean;
  onSelectPlot: (plot: FarmPlot) => void;
  onPurchasePlot: (row: number, col: number) => void;
  className?: string;
};

export function GardenFarmGrid({
  snapshot,
  now,
  gold,
  selectedPlot,
  waterMode,
  fertilizeMode,
  onSelectPlot,
  onPurchasePlot,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scale, natural, squareSide } = useGardenGridScale(
    containerRef,
    snapshot.gridRows,
    snapshot.gridCols,
  );

  const gridStyle = gardenGridStyle(snapshot.gridRows, snapshot.gridCols);
  const cells = snapshot.plots
    .map((plot) =>
      resolveGardenCellVisual(snapshot, plot.row, plot.col, now, { gold }),
    )
    .filter((cell): cell is NonNullable<typeof cell> => cell != null);

  const scaledWidth = natural.width * scale;
  const scaledHeight = natural.height * scale;
  const useSquareViewport = squareSide > 0;

  const gridPanel = (
    <div className="flex flex-col">
      <div aria-hidden style={{ height: GARDEN_GRID_OUTER_TOP_PAD_PX, flexShrink: 0 }} />
      <div
        className="relative overflow-visible rounded-2xl"
        style={{
          backgroundColor: GARDEN_GRID_BG,
          paddingTop: GARDEN_GRID_PAD_TOP_PX,
          paddingLeft: GARDEN_GRID_PAD_X_PX,
          paddingRight: GARDEN_GRID_PAD_X_PX,
          paddingBottom: GARDEN_GRID_PAD_BOTTOM_PX,
        }}
      >
      <div style={gridStyle} aria-label="Language Garden farm plots">
        {cells.map((cell) => {
          const isSelected =
            selectedPlot?.row === cell.row && selectedPlot?.col === cell.col;

          let cellContent: ReactNode = null;
          if (cell.kind === "locked_grass") {
            cellContent = (
              <GardenLockedGrassTile
                cost={cell.purchaseCost ?? 0}
                canAfford={cell.canAfford ?? gold >= (cell.purchaseCost ?? 0)}
                selected={isSelected}
                onPurchase={() => onPurchasePlot(cell.row, cell.col)}
              />
            );
          } else {
            cellContent = (
              <GardenStackedPlotCell
                cell={cell}
                now={now}
                selected={isSelected}
                waterMode={waterMode}
                fertilizeMode={fertilizeMode}
                onSelect={onSelectPlot}
              />
            );
          }

          return (
            <div
              key={`${cell.row}-${cell.col}`}
              style={{
                gridColumn: cell.col + 1,
                gridRow: cell.row + 1,
                zIndex: cell.row,
              }}
            >
              {cellContent}
            </div>
          );
        })}
      </div>

      <div
        className="pointer-events-none absolute"
        style={{
          ...gridStyle,
          zIndex: 100,
          top: GARDEN_GRID_PAD_TOP_PX,
          left: GARDEN_GRID_PAD_X_PX,
          right: GARDEN_GRID_PAD_X_PX,
        }}
        aria-hidden
      >
        {cells.map((cell) => {
          if (cell.kind !== "plot") return null;

          const overlayText = gardenPlotOverlayText(cell.plot, now, {
            waterMode,
            fertilizeMode,
          });
          if (!overlayText) return null;

          return (
            <div
              key={`label-${cell.row}-${cell.col}`}
              className="flex items-start justify-center"
              style={{
                gridColumn: cell.col + 1,
                gridRow: cell.row + 2,
                marginTop: GARDEN_LABEL_OFFSET_Y_PX,
              }}
            >
              <GardenPlotLabel
                text={overlayText}
                variant={gardenPlotOverlayVariant(cell.plot, now)}
              />
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={clsx(
        "flex h-full min-h-0 min-w-0 flex-1 items-center justify-center",
        className,
      )}
    >
      {useSquareViewport ?
        <div
          className="relative flex shrink-0 items-center justify-center overflow-visible"
          style={{ width: squareSide, height: squareSide }}
        >
          <div
            className="absolute left-1/2 top-1/2 origin-center"
            style={{
              width: natural.width,
              height: natural.height,
              transform: `translate(-50%, calc(-50% + ${GARDEN_GRID_VERTICAL_OFFSET_PX}px)) scale(${scale})`,
            }}
          >
            {gridPanel}
          </div>
        </div>
      : <div
          className="relative shrink-0"
          style={{ width: scaledWidth, height: scaledHeight }}
        >
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: natural.width,
              height: natural.height,
              transform: scale === 1 ? undefined : `scale(${scale})`,
            }}
          >
            {gridPanel}
          </div>
        </div>
      }
    </div>
  );
}
