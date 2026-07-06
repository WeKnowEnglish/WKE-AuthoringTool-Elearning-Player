"use client";

import { GardenLockedGrassTile } from "@/components/garden/GardenLockedGrassTile";
import { GardenPlotLabel } from "@/components/garden/GardenPlotLabel";
import {
  MockGardenPlotTile,
  mockPlotOverlayText,
} from "@/components/pilots/topdown-sprites/MockGardenPlotTile";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  GARDEN_GRID_BG,
  GARDEN_LABEL_OFFSET_Y_PX,
  GARDEN_MAP_LAYOUT,
  gardenGridStyle,
} from "@/lib/garden/garden-map-layout";
import {
  MOCK_GARDEN_GRID_COLS,
  MOCK_GARDEN_GRID_ROWS,
  MOCK_GARDEN_PLOTS,
} from "@/lib/topdown/preview-mock-data";
import {
  columnStridePx,
  rowStridePx,
} from "@/lib/topdown/stacked-individual-layout";

type Props = {
  waterMode?: boolean;
  fertilizeMode?: boolean;
};

function plotAt(row: number, col: number) {
  return MOCK_GARDEN_PLOTS.find((p) => p.row === row && p.col === col);
}

export function MockGardenFarmGrid({ waterMode, fertilizeMode }: Props) {
  const gridStyle = gardenGridStyle(MOCK_GARDEN_GRID_ROWS, MOCK_GARDEN_GRID_COLS);
  const rowStride = rowStridePx(GARDEN_MAP_LAYOUT);
  const colStride = columnStridePx(GARDEN_MAP_LAYOUT);
  const mockGold = 100;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <KidPanel className="h-full min-h-0 flex-1 overflow-x-auto p-2 sm:p-3">
      <div
        className="relative mx-auto w-fit overflow-visible rounded-2xl p-3"
        style={{ backgroundColor: GARDEN_GRID_BG }}
      >
        <div style={gridStyle} aria-label="Language Garden farm plots preview">
          {Array.from({ length: MOCK_GARDEN_GRID_ROWS }, (_, row) =>
            Array.from({ length: MOCK_GARDEN_GRID_COLS }, (_, col) => {
              const plot = plotAt(row, col);
              if (!plot) return null;

              return (
                <div
                  key={`${row}-${col}`}
                  style={{
                    gridColumn: col + 1,
                    gridRow: row + 1,
                    zIndex: row,
                  }}
                >
                  {plot.state === "locked_grass" ?
                    <GardenLockedGrassTile
                      cost={plot.mockPurchaseCost ?? 25}
                      canAfford={mockGold >= (plot.mockPurchaseCost ?? 25)}
                      disabled
                      onPurchase={() => {}}
                    />
                  : <MockGardenPlotTile
                      state={plot.state}
                      label={plot.label}
                      waterMode={waterMode}
                      fertilizeMode={fertilizeMode}
                    />
                  }
                </div>
              );
            }),
          )}
        </div>

        <div
          className="pointer-events-none absolute inset-3"
          style={{ ...gridStyle, zIndex: 100 }}
          aria-hidden
        >
          {MOCK_GARDEN_PLOTS.map((plot) => {
            if (plot.state === "locked_grass") return null;
            if (!mockPlotOverlayText(plot.state)) return null;

            return (
              <div
                key={`label-${plot.row}-${plot.col}`}
                className="flex items-start justify-center"
                style={{
                  gridColumn: plot.col + 1,
                  gridRow: plot.row + 2,
                  marginTop: GARDEN_LABEL_OFFSET_Y_PX,
                }}
              >
                <GardenPlotLabel
                  text={mockPlotOverlayText(plot.state)!}
                  variant={
                    plot.state === "empty_weed_monster" ? "weed"
                    : plot.state === "ready" || plot.state === "ready_fertilized" ?
                      "ready"
                    : "timer"
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-center font-mono text-[0.65rem] text-kid-ink/60">
        4×4 · row 0 free dirt · purchasable grass below · labels on tile below · row
        stride {rowStride}px · column stride {colStride}px
      </p>
      </KidPanel>
    </div>
  );
}
