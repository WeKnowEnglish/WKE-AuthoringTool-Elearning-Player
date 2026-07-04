"use client";

import { useState } from "react";
import { MockGardenFarmGrid } from "@/components/pilots/topdown-sprites/MockGardenFarmGrid";
import { MockGardenHud } from "@/components/pilots/topdown-sprites/MockGardenHud";
import { MockGardenToolBar } from "@/components/pilots/topdown-sprites/MockGardenToolBar";
import { KidPanel } from "@/components/kid-ui/KidPanel";

export function MockGardenPreview() {
  const [waterMode, setWaterMode] = useState(false);
  const [fertilizeMode, setFertilizeMode] = useState(false);

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
        <h2 className="text-xl font-extrabold text-kid-ink sm:text-2xl">
          Mock Language Garden
        </h2>
        <p className="mt-1 text-sm font-semibold text-kid-ink/75">
          Visual target for the live garden — tool toggles work for preview only.
        </p>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-col gap-3 sm:gap-4">
        <header className="text-center">
          <h3 className="text-2xl font-extrabold text-kid-ink sm:text-3xl">
            Language Garden{" "}
            <span className="rounded-md bg-kid-ink/10 px-2 py-0.5 text-base font-bold text-kid-ink/70 sm:text-lg">
              Preview
            </span>
          </h3>
          <p className="mt-1 text-sm font-semibold text-kid-ink/80">
            Grow letters. Build words. Keep learning!
          </p>
        </header>

        <MockGardenHud />

        <MockGardenFarmGrid waterMode={waterMode} fertilizeMode={fertilizeMode} />

        <MockGardenToolBar
          waterMode={waterMode}
          fertilizeMode={fertilizeMode}
          onToggleWater={toggleWater}
          onToggleFertilize={toggleFertilize}
        />

        <KidPanel tone="discovery" className="p-3 text-center">
          <p className="text-sm font-bold text-kid-ink">
            Preview only — plot taps and spelling do nothing here.
          </p>
        </KidPanel>
      </div>
    </section>
  );
}
