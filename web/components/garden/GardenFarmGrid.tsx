"use client";

import { GardenPlotTile } from "@/components/garden/GardenPlotTile";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import type { FarmPlot, GardenSnapshotV1 } from "@/lib/garden";

type Props = {
  snapshot: GardenSnapshotV1;
  now: number;
  selectedPlot: { row: number; col: number } | null;
  waterMode?: boolean;
  fertilizeMode?: boolean;
  onSelectPlot: (plot: FarmPlot) => void;
};

export function GardenFarmGrid({
  snapshot,
  now,
  selectedPlot,
  waterMode,
  fertilizeMode,
  onSelectPlot,
}: Props) {
  return (
    <KidPanel className="p-2 sm:p-3">
      <div
        className="mx-auto grid w-full max-w-[min(100%,22rem)] gap-1.5 sm:gap-2"
        style={{
          gridTemplateColumns: `repeat(${snapshot.gridCols}, minmax(0, 1fr))`,
        }}
        aria-label="Language Garden farm plots"
      >
        {snapshot.plots.map((plot) => (
          <GardenPlotTile
            key={`${plot.row}-${plot.col}`}
            plot={plot}
            now={now}
            selected={
              selectedPlot?.row === plot.row && selectedPlot?.col === plot.col
            }
            waterMode={waterMode}
            fertilizeMode={fertilizeMode}
            onSelect={() => onSelectPlot(plot)}
          />
        ))}
      </div>
    </KidPanel>
  );
}
