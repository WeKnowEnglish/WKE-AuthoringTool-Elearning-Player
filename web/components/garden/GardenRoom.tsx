"use client";

import { clsx } from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { GardenFarmGrid } from "@/components/garden/GardenFarmGrid";
import { GardenHud } from "@/components/garden/GardenHud";
import { GardenSpellOverlay } from "@/components/garden/GardenSpellOverlay";
import { GardenWeedOverlay } from "@/components/garden/GardenWeedOverlay";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import {
  applyFertilizerAt,
  applyWateringCanAt,
  getGardenSnapshot,
  harvestAt,
  plantSeedAt,
  resolveGrowthStage,
  useGardenGrowthTicker,
  plotHasWeed,
  type FarmPlot,
  type GardenSnapshotV1,
} from "@/lib/garden";
import { totalLetterCount } from "@/lib/garden/spelling";
import {
  canUseFertilizer,
  formatFertilizerCooldown,
  hasFertilizerUnlocked,
  fertilizerCooldownRemainingMs,
} from "@/lib/garden/fertilizer";
import {
  canUseWateringCan,
  formatWateringCanCooldown,
  hasWateringCanUnlocked,
  wateringCanCooldownRemainingMs,
} from "@/lib/garden/watering-can";
import { useClientHydrated } from "@/lib/react/use-client-hydrated";

type Props = {
  muted: boolean;
  gardenUiKey: number;
};

type GardenToolMode = "none" | "water" | "fertilize";

function seedEarnedMessage(gained: number): string {
  if (gained === 1) {
    return "You earned a new seed! Tap an empty plot to plant it.";
  }
  return `You earned ${gained} new seeds! Tap an empty plot to plant one.`;
}

export function GardenRoom({ muted, gardenUiKey }: Props) {
  const hydrated = useClientHydrated();
  const [snapshot, setSnapshot] = useState<GardenSnapshotV1 | null>(null);
  const [now, setNow] = useState(0);
  const [selectedPlot, setSelectedPlot] = useState<{ row: number; col: number } | null>(
    null,
  );
  const [statusLine, setStatusLine] = useState(
    "Tap an empty plot to plant a seed. Crops keep growing when you leave!",
  );
  const [spellOpen, setSpellOpen] = useState(false);
  const [weedOverlay, setWeedOverlay] = useState<{ row: number; col: number; weedWord: string } | null>(
    null,
  );
  const [toolMode, setToolMode] = useState<GardenToolMode>("none");
  const lastSeedCountRef = useRef<number | null>(null);

  const applySnapshot = useCallback(
    (snap: GardenSnapshotV1, opts?: { announceNewSeeds?: boolean }) => {
      const ts = Date.now();
      setNow(ts);

      if (opts?.announceNewSeeds) {
        const prev = lastSeedCountRef.current;
        if (prev !== null && snap.seedPouch.length > prev) {
          const gained = snap.seedPouch.length - prev;
          setStatusLine(seedEarnedMessage(gained));
          playSfx("correct", muted);
        }
      }

      lastSeedCountRef.current = snap.seedPouch.length;
      setSnapshot(snap);
    },
    [muted],
  );

  useEffect(() => {
    if (!hydrated) return;
    applySnapshot(getGardenSnapshot(), { announceNewSeeds: true });
  }, [hydrated, gardenUiKey, applySnapshot]);

  const refreshGarden = useCallback(() => {
    applySnapshot(getGardenSnapshot());
  }, [applySnapshot]);

  useGardenGrowthTicker(hydrated && !spellOpen && !weedOverlay, refreshGarden);

  const displayNow = now || Date.now();
  const wateringCanUnlocked = snapshot ? hasWateringCanUnlocked(snapshot) : false;
  const fertilizerUnlocked = snapshot ? hasFertilizerUnlocked(snapshot) : false;
  const wateringCanReady = snapshot ? canUseWateringCan(snapshot, displayNow) : false;
  const fertilizerReady = snapshot ? canUseFertilizer(snapshot, displayNow) : false;
  const wateringCanCooldownMs = snapshot ?
    wateringCanCooldownRemainingMs(snapshot, displayNow)
  : 0;
  const fertilizerCooldownMs = snapshot ?
    fertilizerCooldownRemainingMs(snapshot, displayNow)
  : 0;

  useEffect(() => {
    const needsTicker =
      (wateringCanUnlocked && wateringCanCooldownMs > 0) ||
      (fertilizerUnlocked && fertilizerCooldownMs > 0);
    if (!needsTicker) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [
    wateringCanUnlocked,
    fertilizerUnlocked,
    wateringCanCooldownMs,
    fertilizerCooldownMs,
    snapshot?.lastWateringCanUsedAt,
    snapshot?.lastFertilizerUsedAt,
  ]);

  useEffect(() => {
    if (!wateringCanUnlocked && toolMode === "water") {
      setToolMode("none");
    }
    if (!fertilizerUnlocked && toolMode === "fertilize") {
      setToolMode("none");
    }
  }, [wateringCanUnlocked, fertilizerUnlocked, toolMode]);

  const onSelectPlot = (plot: FarmPlot) => {
    if (!snapshot) return;
    playSfx("tap", muted);
    setSelectedPlot({ row: plot.row, col: plot.col });

    const tier = plot.seedTier ?? "common";
    const stage = resolveGrowthStage(plot, Date.now(), tier);

    if (toolMode === "water") {
      if (stage === "sprout" || stage === "growing") {
        const result = applyWateringCanAt(snapshot, plot.row, plot.col);
        if (!result.ok) {
          const messages = {
            no_item: "Complete Sprout spelling to unlock the watering can.",
            on_cooldown: `Watering can recharges in ${formatWateringCanCooldown(wateringCanCooldownRemainingMs(snapshot, Date.now()))}.`,
            plot_empty: "There is nothing growing here.",
            plot_ready: "This crop is already ready to harvest!",
            already_treated: "This crop was already treated.",
            plot_missing: "Could not find that plot.",
          };
          setStatusLine(messages[result.reason]);
          playSfx("wrong", muted);
          return;
        }
        playSfx("correct", muted);
        applySnapshot(result.snapshot);
        setToolMode("none");
        setStatusLine("Watered! This crop will grow 2× faster now.");
        return;
      }
      setStatusLine("Tap a growing crop (not empty or ready) to water it.");
      playSfx("wrong", muted);
      return;
    }

    if (toolMode === "fertilize") {
      if (stage === "sprout" || stage === "growing") {
        const result = applyFertilizerAt(snapshot, plot.row, plot.col);
        if (!result.ok) {
          const messages = {
            no_item: "Complete Bud spelling to unlock fertilizer.",
            on_cooldown: `Fertilizer recharges in ${formatFertilizerCooldown(fertilizerCooldownRemainingMs(snapshot, Date.now()))}.`,
            plot_empty: "There is nothing growing here.",
            plot_ready: "This crop is already ready to harvest!",
            already_treated: "This crop was already treated.",
            plot_missing: "Could not find that plot.",
          };
          setStatusLine(messages[result.reason]);
          playSfx("wrong", muted);
          return;
        }
        playSfx("correct", muted);
        applySnapshot(result.snapshot);
        setToolMode("none");
        setStatusLine("Fertilized! This crop is ready to harvest.");
        return;
      }
      setStatusLine("Tap a growing crop (not empty or ready) to fertilize it.");
      playSfx("wrong", muted);
      return;
    }

    if (stage === "empty") {
      const result = plantSeedAt(snapshot, plot.row, plot.col);
      if (!result.ok) {
        if (result.reason === "no_seed") {
          setStatusLine(
            "No seeds left! Go to Learn and answer questions to earn more.",
          );
          playSfx("wrong", muted);
        } else {
          setStatusLine("This plot is not empty.");
        }
        return;
      }
      playSfx("correct", muted);
      applySnapshot(result.snapshot);
      setStatusLine("Seed planted! Come back when it is ready to harvest.");
      return;
    }

    if (stage === "ready") {
      if (plot.weedWord) {
        setToolMode("none");
        setWeedOverlay({ row: plot.row, col: plot.col, weedWord: plot.weedWord });
        setStatusLine("A weed appeared! Spell the word to clear it.");
        return;
      }

      const result = harvestAt(snapshot, plot.row, plot.col);
      if (!result.ok) {
        const messages = {
          plot_empty: "This plot is empty.",
          not_ready: "This crop is not ready yet.",
          plot_missing: "Could not find that plot.",
          weed_blocking: "Clear the weed before you harvest!",
        };
        setStatusLine(messages[result.reason]);
        playSfx("wrong", muted);
        return;
      }
      playSfx("complete", muted);
      applySnapshot(result.snapshot);
      setStatusLine(`You harvested the letter ${result.letter}!`);
      setSelectedPlot(null);
      return;
    }

    setStatusLine("Still growing… check back in a little while!");
  };

  const letterCount = snapshot ? totalLetterCount(snapshot.letters) : 0;

  const openSpell = () => {
    playSfx("tap", muted);
    setToolMode("none");
    setSpellOpen(true);
  };

  const closeSpell = () => {
    playSfx("tap", muted);
    setSpellOpen(false);
  };

  const closeWeed = () => {
    playSfx("tap", muted);
    setWeedOverlay(null);
  };

  const toggleWaterMode = () => {
    if (!wateringCanReady && toolMode !== "water") {
      playSfx("wrong", muted);
      setStatusLine(
        wateringCanUnlocked ?
          `Watering can recharges in ${formatWateringCanCooldown(wateringCanCooldownMs)}.`
        : "Complete Sprout spelling to unlock the watering can.",
      );
      return;
    }
    playSfx("tap", muted);
    setToolMode((current) => {
      const next = current === "water" ? "none" : "water";
      setStatusLine(
        next === "water" ?
          "Water mode on! Tap a growing crop to speed it up 2×."
        : "Tap an empty plot to plant a seed. Crops keep growing when you leave!",
      );
      return next;
    });
  };

  const toggleFertilizeMode = () => {
    if (!fertilizerReady && toolMode !== "fertilize") {
      playSfx("wrong", muted);
      setStatusLine(
        fertilizerUnlocked ?
          `Fertilizer recharges in ${formatFertilizerCooldown(fertilizerCooldownMs)}.`
        : "Complete Bud spelling to unlock fertilizer.",
      );
      return;
    }
    playSfx("tap", muted);
    setToolMode((current) => {
      const next = current === "fertilize" ? "none" : "fertilize";
      setStatusLine(
        next === "fertilize" ?
          "Fertilize mode on! Tap a growing crop to ripen it instantly."
        : "Tap an empty plot to plant a seed. Crops keep growing when you leave!",
      );
      return next;
    });
  };

  if (!hydrated || !snapshot) {
    return (
      <div className="mx-auto w-full max-w-lg">
        <KidPanel className="p-6 text-center text-sm font-bold text-kid-ink/70">
          Loading your garden…
        </KidPanel>
      </div>
    );
  }

  const waterMode = toolMode === "water";
  const fertilizeMode = toolMode === "fertilize";

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-3 sm:gap-4">
      <header className="text-center">
        <h1 className="text-2xl font-extrabold text-kid-ink sm:text-3xl">
          Language Garden
        </h1>
        <p className="mt-1 text-sm font-semibold text-kid-ink/80">
          Grow letters. Build words. Keep learning!
        </p>
      </header>

      <GardenHud snapshot={snapshot} now={displayNow} />

      <GardenFarmGrid
        snapshot={snapshot}
        now={displayNow}
        selectedPlot={selectedPlot}
        waterMode={waterMode}
        fertilizeMode={fertilizeMode}
        onSelectPlot={onSelectPlot}
      />

      <div className="flex flex-col items-center gap-2">
        <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:justify-center">
          {wateringCanUnlocked ?
            <KidButton
              variant={waterMode ? "primary" : "secondary"}
              className={clsx("!min-h-12 w-full sm:max-w-xs", waterMode && "!bg-sky-500")}
              onClick={toggleWaterMode}
              disabled={!wateringCanReady && !waterMode}
            >
              {waterMode ?
                "🪣 Watering…"
              : wateringCanReady ?
                "🪣 Water"
              : `🪣 ${formatWateringCanCooldown(wateringCanCooldownMs)}`}
            </KidButton>
          : null}
          {fertilizerUnlocked ?
            <KidButton
              variant={fertilizeMode ? "primary" : "secondary"}
              className={clsx("!min-h-12 w-full sm:max-w-xs", fertilizeMode && "!bg-amber-500")}
              onClick={toggleFertilizeMode}
              disabled={!fertilizerReady && !fertilizeMode}
            >
              {fertilizeMode ?
                "🧪 Fertilizing…"
              : fertilizerReady ?
                "🧪 Fertilize"
              : `🧪 ${formatFertilizerCooldown(fertilizerCooldownMs)}`}
            </KidButton>
          : null}
        </div>
        <KidButton
          className="!min-h-12 w-full max-w-xs"
          variant="secondary"
          onClick={openSpell}
          disabled={letterCount < 2}
        >
          Spell a Word
        </KidButton>
      </div>

      <KidPanel tone="discovery" className="p-3 text-center">
        <p className="text-sm font-bold text-kid-ink" role="status" aria-live="polite">
          {statusLine}
        </p>
      </KidPanel>

      <GardenSpellOverlay
        open={spellOpen}
        muted={muted}
        snapshot={snapshot}
        onSnapshotChange={(snap) => applySnapshot(snap)}
        onSuccess={setStatusLine}
        onClose={closeSpell}
      />

      {weedOverlay ?
        <GardenWeedOverlay
          open
          muted={muted}
          weedWord={weedOverlay.weedWord}
          row={weedOverlay.row}
          col={weedOverlay.col}
          snapshot={snapshot}
          onSnapshotChange={(snap) => {
            applySnapshot(snap);
            setWeedOverlay(null);
          }}
          onSuccess={setStatusLine}
          onClose={closeWeed}
        />
      : null}
    </div>
  );
}
