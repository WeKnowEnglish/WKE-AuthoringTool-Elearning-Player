"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { GardenEarnSeedsButton } from "@/components/garden/GardenEarnSeedsButton";
import { GardenSideTools } from "@/components/garden/GardenSideTools";
import { LetterFruitLetterSelect } from "@/components/pilots/topdown-sprites/LetterFruitLetterSelect";
import { MockGardenFarmGrid } from "@/components/pilots/topdown-sprites/MockGardenFarmGrid";
import { MockGardenHud } from "@/components/pilots/topdown-sprites/MockGardenHud";
import { PilotMapGrid } from "@/components/pilots/topdown-sprites/PilotMapGrid";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { GARDEN_GRID_BG } from "@/lib/garden/garden-map-layout";
import { PILOT_GARDEN_MAPS } from "@/lib/topdown/preview-individual-map";

type GardenDesignTabId = "mock-garden" | (typeof PILOT_GARDEN_MAPS)[number]["id"];

type GardenDesignTab = {
  id: GardenDesignTabId;
  label: string;
  description: string;
};

const GARDEN_DESIGN_TABS: GardenDesignTab[] = [
  {
    id: "mock-garden",
    label: "Mock garden",
    description:
      "Live garden layout with HUD, tools, and letter fruit layered on growth plots.",
  },
  ...PILOT_GARDEN_MAPS.map((map) => ({
    id: map.id as GardenDesignTabId,
    label: map.title,
    description: map.description,
  })),
];

function MockGardenViewport({
  waterMode,
  fertilizeMode,
  onToggleWater,
  onToggleFertilize,
}: {
  waterMode: boolean;
  fertilizeMode: boolean;
  onToggleWater: () => void;
  onToggleFertilize: () => void;
}) {
  return (
    <div className="flex min-h-[24rem] flex-row items-stretch gap-2 md:min-h-[28rem] md:gap-3">
      <aside
        className="flex w-[8.5rem] shrink-0 flex-col gap-2 sm:w-44 md:w-48"
        aria-label="Garden inventory preview"
      >
        <MockGardenHud className="min-h-0 flex-1" />
        <GardenEarnSeedsButton unlocked onOpen={() => {}} />
        <GardenSideTools
          wateringCanUnlocked
          fertilizerUnlocked
          wateringCanReady={!waterMode}
          fertilizerReady
          wateringCanCooldownMs={0}
          fertilizerCooldownMs={0}
          waterMode={waterMode}
          fertilizeMode={fertilizeMode}
          onToggleWater={onToggleWater}
          onToggleFertilize={onToggleFertilize}
        />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <MockGardenFarmGrid waterMode={waterMode} fertilizeMode={fertilizeMode} />
      </div>
    </div>
  );
}

export function GardenDesignPreview() {
  const [activeTab, setActiveTab] = useState<GardenDesignTabId>("mock-garden");
  const [waterMode, setWaterMode] = useState(false);
  const [fertilizeMode, setFertilizeMode] = useState(false);

  const tabMeta = GARDEN_DESIGN_TABS.find((tab) => tab.id === activeTab) ?? GARDEN_DESIGN_TABS[0];
  const activeMap = PILOT_GARDEN_MAPS.find((map) => map.id === activeTab);

  const toggleWater = () => {
    setWaterMode((current) => !current);
    setFertilizeMode(false);
  };

  const toggleFertilize = () => {
    setFertilizeMode((current) => !current);
    setWaterMode(false);
  };

  return (
    <section id="garden" className="scroll-mt-6 space-y-4">
      <header>
        <h2 className="text-xl font-extrabold text-kid-ink sm:text-2xl">Garden designs</h2>
        <p className="mt-1 text-sm font-semibold text-kid-ink/75">
          Mock garden and sample maps in one viewport — letter fruit composited on soil tiles
          using plot-layer presets.
        </p>
        <div className="mt-3">
          <LetterFruitLetterSelect compact />
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Garden design layouts"
        className="flex flex-wrap gap-2"
      >
        {GARDEN_DESIGN_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={clsx(
              "rounded-lg border-2 px-3 py-1.5 text-sm font-bold transition-colors [touch-action:manipulation]",
              activeTab === tab.id
                ? "border-kid-ink bg-[#f7bf4d] text-kid-ink"
                : "border-kid-ink/25 bg-kid-panel text-kid-ink/70 hover:bg-kid-surface-muted",
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <KidPanel className="overflow-hidden p-0">
        <div className="border-b-2 border-kid-ink/15 px-4 py-3">
          <h3 className="text-lg font-extrabold text-kid-ink">{tabMeta.label}</h3>
          <p className="mt-0.5 text-sm font-semibold text-kid-ink/70">{tabMeta.description}</p>
        </div>

        <div
          className="min-h-[28rem] overflow-x-auto p-3 sm:p-4"
          style={activeTab === "mock-garden" ? undefined : { backgroundColor: GARDEN_GRID_BG }}
        >
          {activeTab === "mock-garden" ?
            <MockGardenViewport
              waterMode={waterMode}
              fertilizeMode={fertilizeMode}
              onToggleWater={toggleWater}
              onToggleFertilize={toggleFertilize}
            />
          : activeMap ?
            <PilotMapGrid map={activeMap} />
          : null}
        </div>

        {activeTab === "mock-garden" ?
          <p className="border-t-2 border-kid-ink/15 px-4 py-3 text-center text-xs font-semibold text-kid-ink/65">
            Preview only — plot taps, spelling, and Earn Seeds do nothing here.
          </p>
        : null}
      </KidPanel>

      <p className="text-center text-xs font-semibold text-kid-ink/55">
        Maps: lib/topdown/preview-individual-map.ts · fruit placement:
        lib/topdown/letter-fruit-plot-presets.ts
      </p>
    </section>
  );
}
