"use client";

import { useEffect, useState } from "react";
import { LetterFruitStackedPlotCell } from "@/components/topdown/LetterFruitStackedPlotCell";
import { useResolvedSpriteBounds } from "@/components/pilots/topdown-sprites/BoundsOverrideContext";
import { LetterFruitLetterSelect } from "@/components/pilots/topdown-sprites/LetterFruitLetterSelect";
import { useLetterFruitSelector } from "@/components/pilots/topdown-sprites/LetterFruitSelectorContext";
import { usePlotLayerEditor } from "@/components/pilots/topdown-sprites/PlotLayerEditorContext";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { GARDEN_GRID_BG } from "@/lib/garden/garden-map-layout";
import {
  getLetterFruitAtlas,
  letterFruitAssetKey,
  letterFruitFrameByStage,
  LETTER_FRUIT_STAGE_IDS,
  letterFruitStagePlotHint,
  type LetterFruitAssetKey,
  type LetterFruitStageId,
} from "@/lib/topdown/letter-fruit-atlas";
import { getLetterFruitVariant } from "@/lib/topdown/letter-fruit-variants";

const STAGE_MS = 1400;

function GrowthStagePlot({
  stage,
  large = false,
  readyGlow = false,
  onOpenEditor,
}: {
  stage: LetterFruitStageId;
  large?: boolean;
  readyGlow?: boolean;
  onOpenEditor?: () => void;
}) {
  const { slug, atlasId } = useLetterFruitSelector();
  const atlas = getLetterFruitAtlas(slug);
  const assetId = letterFruitAssetKey(slug, stage);
  const fallback = atlas.assets[assetId];
  const bounds = useResolvedSpriteBounds(atlasId, assetId, fallback);
  const frame = letterFruitFrameByStage(slug)[stage];

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={large ? "scale-[2] sm:scale-[2.5]" : undefined}
        style={large ? { transformOrigin: "center bottom" } : undefined}
      >
        <div
          className="cursor-pointer rounded-md outline-none ring-kid-cta/0 transition-shadow hover:ring-4 hover:ring-kid-cta/35 focus-visible:ring-4 focus-visible:ring-kid-cta/50"
          title="Double-click to edit plot layer"
          onDoubleClick={() => onOpenEditor?.()}
        >
          <LetterFruitStackedPlotCell
            stage={stage}
            bounds={bounds}
            readyGlow={readyGlow}
          />
        </div>
      </div>
      <p className="text-center text-[0.65rem] font-bold text-kid-ink/70">
        {frame.label.split(" — ").slice(-1)[0]}
      </p>
    </div>
  );
}

export function LetterFruitGrowthPreview() {
  const { slug } = useLetterFruitSelector();
  const variant = getLetterFruitVariant(slug);
  const { openEditor } = usePlotLayerEditor();
  const [stageIndex, setStageIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  const stage = LETTER_FRUIT_STAGE_IDS[stageIndex] ?? "seed";

  function openPlotEditor(stageId: LetterFruitStageId) {
    setPlaying(false);
    const assetKey = letterFruitAssetKey(slug, stageId) as LetterFruitAssetKey;
    openEditor({
      assetKey,
      label: `${letterFruitFrameByStage(slug)[stageId].label} on plot`,
    });
  }

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setStageIndex((current) => (current + 1) % LETTER_FRUIT_STAGE_IDS.length);
    }, STAGE_MS);
    return () => window.clearInterval(id);
  }, [playing]);

  return (
    <section id="letter-fruit-growth" className="scroll-mt-6 space-y-4">
      <header>
        <h2 className="text-xl font-extrabold text-kid-ink sm:text-2xl">
          Letter fruit on tilled plot
        </h2>
        <p className="mt-1 text-sm font-semibold text-kid-ink/75">
          {variant.label} stages composited on{" "}
          <code className="rounded bg-kid-ink/10 px-1">dirt_tilled</code>
          — double-click any plot to tune fruit placement on the soil tile.
        </p>
      </header>

      <KidPanel className="space-y-4 p-4 sm:p-5">
        <div
          className="mx-auto flex w-fit flex-col items-center rounded-2xl px-8 pb-6 pt-8 sm:px-12 sm:pb-8 sm:pt-10"
          style={{ backgroundColor: GARDEN_GRID_BG }}
        >
          <GrowthStagePlot
            stage={stage}
            large
            readyGlow={stage === "ripe"}
            onOpenEditor={() => openPlotEditor(stage)}
          />
          <p className="mt-4 max-w-xs text-center text-sm font-semibold text-white drop-shadow-sm">
            {letterFruitStagePlotHint(stage)}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <KidButton
            type="button"
            variant="secondary"
            className="!min-h-9 !px-3 !py-1.5 !text-sm"
            onClick={() => setPlaying((current) => !current)}
          >
            {playing ? "Pause" : "Play"}
          </KidButton>
          <KidButton
            type="button"
            variant="secondary"
            className="!min-h-9 !px-3 !py-1.5 !text-sm"
            disabled={stageIndex <= 0}
            onClick={() => {
              setPlaying(false);
              setStageIndex((current) => Math.max(0, current - 1));
            }}
          >
            Prev
          </KidButton>
          <KidButton
            type="button"
            variant="secondary"
            className="!min-h-9 !px-3 !py-1.5 !text-sm"
            disabled={stageIndex >= LETTER_FRUIT_STAGE_IDS.length - 1}
            onClick={() => {
              setPlaying(false);
              setStageIndex((current) =>
                Math.min(LETTER_FRUIT_STAGE_IDS.length - 1, current + 1),
              );
            }}
          >
            Next
          </KidButton>
        </div>

        <div className="flex flex-col items-center gap-3 border-t-2 border-kid-ink/15 pt-4 sm:flex-row sm:flex-wrap sm:justify-center">
          <LetterFruitLetterSelect compact className="shrink-0" />
          <div className="flex flex-wrap justify-center gap-1.5">
            {LETTER_FRUIT_STAGE_IDS.map((stageId, index) => (
              <button
                key={stageId}
                type="button"
                className={`rounded-lg border-2 px-2.5 py-1 text-xs font-bold transition-colors ${
                  index === stageIndex
                    ? "border-kid-ink bg-[#f7bf4d] text-kid-ink"
                    : "border-kid-ink/25 bg-kid-panel text-kid-ink/70 hover:bg-kid-surface-muted"
                }`}
                onClick={() => {
                  setPlaying(false);
                  setStageIndex(index);
                }}
              >
                {index + 1}. {stageId}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t-2 border-kid-ink/15 pt-4">
          <p className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-kid-ink/60">
            All stages on tilled plots
          </p>
          <div
            className="mx-auto flex w-fit flex-wrap justify-center gap-3 rounded-2xl p-4"
            style={{ backgroundColor: GARDEN_GRID_BG }}
          >
            {LETTER_FRUIT_STAGE_IDS.map((stageId) => (
              <GrowthStagePlot
                key={stageId}
                stage={stageId}
                readyGlow={stageId === "ripe"}
                onOpenEditor={() => openPlotEditor(stageId)}
              />
            ))}
          </div>
        </div>
      </KidPanel>
    </section>
  );
}
