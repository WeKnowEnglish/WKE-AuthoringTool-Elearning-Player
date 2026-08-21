"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GardenEarnSeedsButton } from "@/components/garden/GardenEarnSeedsButton";
import { GardenEarnSeedsOverlay } from "@/components/garden/GardenEarnSeedsOverlay";
import { GardenFarmGrid } from "@/components/garden/GardenFarmGrid";
import { GardenHud } from "@/components/garden/GardenHud";
import { GardenSideTools } from "@/components/garden/GardenSideTools";
import { GardenSpellOverlay } from "@/components/garden/GardenSpellOverlay";
import { GardenWeedBattleOverlay } from "@/components/garden/GardenWeedBattleOverlay";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import {
  applyFertilizerAt,
  applyWateringCanAt,
  getGardenSnapshot,
  harvestAt,
  plantSeedAt,
  purchaseGrassPlotAt,
  recycleLetters,
  resolveGrowthStage,
  useGardenGrowthTicker,
  isEarnSeedsUnlocked,
  startWeedMonsterBattle,
  type FarmPlot,
  type GardenSnapshotV1,
  type LetterInventory,
  type RecycleLettersResult,
} from "@/lib/garden";
import { totalLetterCount } from "@/lib/garden/spelling";
import { awardPrimaryReward } from "@/lib/primary-player/client";
import { isGrassCell, isPlotUnlocked, nextGrassPlotCost } from "@/lib/garden/plot-unlock";
import { getRewards } from "@/lib/progress/rewards";
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
import {
  formatWeedMonsterCooldown,
  isWeedMonsterOnCooldown,
  weedMonsterCooldownRemainingMs,
} from "@/lib/garden/weed-battle";
import { useClientHydrated } from "@/lib/react/use-client-hydrated";

type Props = {
  muted: boolean;
  gardenUiKey: number;
  onEconomyChange?: () => void;
};

type GardenToolMode = "none" | "water" | "fertilize";

function seedEarnedMessage(gained: number): string {
  if (gained === 1) {
    return "You earned a new seed! Tap an empty plot to plant it.";
  }
  return `You earned ${gained} new seeds! Tap an empty plot to plant one.`;
}

export function GardenRoom({ muted, gardenUiKey, onEconomyChange }: Props) {
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
  const [earnSeedsOpen, setEarnSeedsOpen] = useState(false);
  const [weedBattle, setWeedBattle] = useState<{ row: number; col: number } | null>(null);
  const [toolMode, setToolMode] = useState<GardenToolMode>("none");
  const [gold, setGold] = useState(0);
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
    setGold(getRewards().gold);
  }, [hydrated, gardenUiKey, applySnapshot]);

  const refreshGarden = useCallback(() => {
    applySnapshot(getGardenSnapshot());
    setGold(getRewards().gold);
  }, [applySnapshot]);

  useGardenGrowthTicker(hydrated && !spellOpen && !earnSeedsOpen && !weedBattle, refreshGarden);

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

    if (!isPlotUnlocked(snapshot, plot.row, plot.col)) {
      setStatusLine("This plot is locked. Tap the grass tile to buy it first.");
      playSfx("wrong", muted);
      return;
    }

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
            plot_locked: "This plot is locked. Buy the grass tile first.",
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
            plot_locked: "This plot is locked. Buy the grass tile first.",
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
      if (plot.weedMonster) {
        setToolMode("none");

        if (isWeedMonsterOnCooldown(plot, displayNow)) {
          const remaining = weedMonsterCooldownRemainingMs(plot, displayNow);
          setStatusLine(
            `The weed monster is catching its breath. Try again in ${formatWeedMonsterCooldown(remaining)}.`,
          );
          playSfx("wrong", muted);
          return;
        }

        const started = startWeedMonsterBattle(snapshot, plot.row, plot.col, displayNow);
        if (!started.ok) {
          const messages = {
            plot_missing: "Could not find that plot.",
            plot_locked: "This plot is locked. Buy the grass tile first.",
            plot_occupied: "This plot is not empty.",
            no_monster: "There is no weed monster here.",
            on_cooldown: `The weed monster is catching its breath. Try again in ${formatWeedMonsterCooldown(weedMonsterCooldownRemainingMs(plot, displayNow))}.`,
          };
          setStatusLine(messages[started.reason]);
          playSfx("wrong", muted);
          return;
        }

        applySnapshot(started.snapshot);
        setWeedBattle({ row: plot.row, col: plot.col });
        setStatusLine("Sort the letters into 3 words before time runs out!");
        return;
      }

      const result = plantSeedAt(snapshot, plot.row, plot.col);
      if (!result.ok) {
        if (result.reason === "no_seed") {
          setStatusLine(
            "No seeds left! Go to Learn and answer questions to earn more.",
          );
          playSfx("wrong", muted);
        } else if (result.reason === "plot_locked") {
          setStatusLine("This plot is locked. Buy the grass tile first.");
          playSfx("wrong", muted);
        } else if (result.reason === "weed_monster_blocking") {
          setStatusLine("Defeat the weed monster before you can plant here.");
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
      const result = harvestAt(snapshot, plot.row, plot.col);
      if (!result.ok) {
        const messages = {
          plot_empty: "This plot is empty.",
          not_ready: "This crop is not ready yet.",
          plot_missing: "Could not find that plot.",
          plot_locked: "This plot is locked. Buy the grass tile first.",
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

  const onPurchasePlot = (row: number, col: number) => {
    if (!snapshot) return;
    playSfx("tap", muted);
    setSelectedPlot({ row, col });

    if (!isGrassCell(row, col) || isPlotUnlocked(snapshot, row, col)) {
      onSelectPlot(snapshot.plots.find((p) => p.row === row && p.col === col)!);
      return;
    }

    const result = purchaseGrassPlotAt(snapshot, row, col);
    if (!result.ok) {
      const messages = {
        plot_missing: "Could not find that plot.",
        not_grass: "Only grass plots can be purchased.",
        already_unlocked: "This plot is already unlocked.",
        all_purchased: "All grass plots are unlocked!",
        insufficient_gold: `Need ${result.cost ?? nextGrassPlotCost(snapshot) ?? 0}g. Earn gold in Learn.`,
      };
      setStatusLine(messages[result.reason]);
      playSfx("wrong", muted);
      return;
    }

    playSfx("correct", muted);
    applySnapshot(result.snapshot);
    setGold(result.goldRemaining);
    onEconomyChange?.();
    setToolMode("none");
    setStatusLine(`Plot unlocked for ${result.cost}g! Tap again to plant a seed.`);
  };

  const letterCount = snapshot ? totalLetterCount(snapshot.letters) : 0;
  const earnSeedsUnlocked = snapshot ? isEarnSeedsUnlocked(snapshot) : false;

  const openSpell = () => {
    playSfx("tap", muted);
    setToolMode("none");
    setSpellOpen(true);
  };

  const handleRecycle = (selection: LetterInventory): RecycleLettersResult => {
    if (!snapshot) return { ok: false, reason: "nothing_to_recycle" };

    const result = recycleLetters(snapshot, selection);
    if (!result.ok) {
      const messages = {
        not_enough_letters: "Pick at least 3 letters to recycle.",
        invalid_selection: "You do not have those letters selected.",
        nothing_to_recycle: "Pick letters to recycle first.",
      };
      setStatusLine(messages[result.reason]);
      playSfx("wrong", muted);
      return result;
    }

    playSfx("correct", muted);
    applySnapshot(result.snapshot, { announceNewSeeds: true });
    setStatusLine(
      result.seedsGranted === 1 ?
        `Recycled ${result.lettersConsumed} letters into 1 seed!`
      : `Recycled ${result.lettersConsumed} letters into ${result.seedsGranted} seeds!`,
    );
    return result;
  };

  const closeSpell = () => {
    playSfx("tap", muted);
    setSpellOpen(false);
  };

  const openEarnSeeds = () => {
    playSfx("tap", muted);
    setToolMode("none");
    setEarnSeedsOpen(true);
  };

  const closeEarnSeeds = () => {
    playSfx("tap", muted);
    setEarnSeedsOpen(false);
  };

  const closeWeedBattle = () => {
    setWeedBattle(null);
  };

  const weedBattlePlot =
    weedBattle && snapshot ?
      snapshot.plots.find((p) => p.row === weedBattle.row && p.col === weedBattle.col)
    : undefined;
  const weedBattlePuzzle = weedBattlePlot?.weedMonster ?? null;

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
      <div className="flex h-full w-full items-center justify-center">
        <KidPanel className="p-6 text-center text-sm font-bold text-kid-ink/70">
          Loading your garden…
        </KidPanel>
      </div>
    );
  }

  const waterMode = toolMode === "water";
  const fertilizeMode = toolMode === "fertilize";

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-row items-stretch gap-2 md:gap-3">
      <h1 className="sr-only">Language Garden</h1>

      <aside
        className="flex h-full min-h-0 w-[8.5rem] shrink-0 flex-col gap-2 sm:w-44 md:w-48 lg:w-52"
        aria-label="Garden inventory"
      >
        <GardenHud
          className="min-h-0 flex-1"
          snapshot={snapshot}
          spellEnabled={letterCount >= 2}
          onOpenSpell={openSpell}
        />
        <GardenEarnSeedsButton unlocked={earnSeedsUnlocked} onOpen={openEarnSeeds} />
        <GardenSideTools
          wateringCanUnlocked={wateringCanUnlocked}
          fertilizerUnlocked={fertilizerUnlocked}
          wateringCanReady={wateringCanReady}
          fertilizerReady={fertilizerReady}
          wateringCanCooldownMs={wateringCanCooldownMs}
          fertilizerCooldownMs={fertilizerCooldownMs}
          waterMode={waterMode}
          fertilizeMode={fertilizeMode}
          onToggleWater={toggleWaterMode}
          onToggleFertilize={toggleFertilizeMode}
        />
      </aside>

      <div className="flex h-full min-h-0 min-w-0 flex-1">
        <GardenFarmGrid
          className="h-full min-h-0 flex-1"
          snapshot={snapshot}
          now={displayNow}
          gold={gold}
          selectedPlot={selectedPlot}
          waterMode={waterMode}
          fertilizeMode={fertilizeMode}
          onSelectPlot={onSelectPlot}
          onPurchasePlot={onPurchasePlot}
        />
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {statusLine}
      </p>

      <GardenSpellOverlay
        open={spellOpen}
        muted={muted}
        snapshot={snapshot}
        onSnapshotChange={(snap) => applySnapshot(snap)}
        onSuccess={setStatusLine}
        onWordSpelled={(word) => {
          void awardPrimaryReward({
            eventId: `primary:garden:spell:${word.toLowerCase()}:${new Date().toISOString().slice(0, 10)}`,
            rewardKind: "game_learning",
            activityId: "language-garden-spelling",
            source: "garden_learning_game",
            metadata: { word },
          }).then(() => onEconomyChange?.()).catch(() => undefined);
        }}
        onClose={closeSpell}
        onConfirmRecycle={handleRecycle}
      />

      <GardenEarnSeedsOverlay
        open={earnSeedsOpen}
        muted={muted}
        snapshot={snapshot}
        onSnapshotChange={(snap) => applySnapshot(snap, { announceNewSeeds: true })}
        onSuccess={setStatusLine}
        onClose={closeEarnSeeds}
      />

      {weedBattle && weedBattlePuzzle ?
        <GardenWeedBattleOverlay
          open
          muted={muted}
          row={weedBattle.row}
          col={weedBattle.col}
          puzzle={weedBattlePuzzle}
          snapshot={snapshot}
          onSnapshotChange={(snap, opts) => applySnapshot(snap, opts)}
          onSuccess={setStatusLine}
          onFail={setStatusLine}
          onVictory={() => {
            setGold(getRewards().gold);
            onEconomyChange?.();
          }}
          onClose={closeWeedBattle}
        />
      : null}
    </div>
  );
}
