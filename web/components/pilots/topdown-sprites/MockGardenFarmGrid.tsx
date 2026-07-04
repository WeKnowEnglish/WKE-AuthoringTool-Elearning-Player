"use client";

import { MockGardenPlotTile } from "@/components/pilots/topdown-sprites/MockGardenPlotTile";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  GRASS_TILE_FRAMES,
  GARDEN_SPRITE_ATLAS,
  spriteBackgroundPosition,
} from "@/lib/topdown";
import {
  MOCK_GARDEN_GRID_COLS,
  MOCK_GARDEN_PLOTS,
} from "@/lib/topdown/preview-mock-data";

type Props = {
  waterMode?: boolean;
  fertilizeMode?: boolean;
};

export function MockGardenFarmGrid({ waterMode, fertilizeMode }: Props) {
  const grass = GRASS_TILE_FRAMES.plain;

  return (
    <KidPanel className="p-2 sm:p-3">
      <div
        className="rounded-lg p-2 sm:p-3"
        style={{
          backgroundImage: `url("${GARDEN_SPRITE_ATLAS.imageSrc}")`,
          backgroundSize: `${grass.sw}px ${grass.sh}px`,
          backgroundPosition: spriteBackgroundPosition(grass),
          backgroundRepeat: "repeat",
        }}
      >
        <div
          className="mx-auto grid w-full max-w-[min(100%,22rem)] gap-1.5 sm:gap-2"
          style={{
            gridTemplateColumns: `repeat(${MOCK_GARDEN_GRID_COLS}, minmax(0, 1fr))`,
          }}
          aria-label="Language Garden farm plots preview"
        >
          {MOCK_GARDEN_PLOTS.map((plot) => (
            <MockGardenPlotTile
              key={`${plot.row}-${plot.col}`}
              state={plot.state}
              waterMode={waterMode}
              fertilizeMode={fertilizeMode}
            />
          ))}
        </div>
      </div>
    </KidPanel>
  );
}
