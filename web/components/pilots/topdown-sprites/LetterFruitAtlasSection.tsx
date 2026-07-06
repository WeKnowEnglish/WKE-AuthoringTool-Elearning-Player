"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { TopDownSprite } from "@/components/topdown/TopDownSprite";
import {
  useBoundsOverride,
  useResolvedSpriteBounds,
} from "@/components/pilots/topdown-sprites/BoundsOverrideContext";
import { LetterFruitLetterSelect } from "@/components/pilots/topdown-sprites/LetterFruitLetterSelect";
import { useLetterFruitSelector } from "@/components/pilots/topdown-sprites/LetterFruitSelectorContext";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import {
  getLetterFruitAtlas,
  letterFruitAssetKey,
  letterFruitFrames,
  LETTER_FRUIT_STAGE_IDS,
  letterFruitStagePlotHint,
  type LetterFruitStageId,
} from "@/lib/topdown/letter-fruit-atlas";
import { getLetterFruitVariant } from "@/lib/topdown/letter-fruit-variants";
import { spriteScaleToFit } from "@/lib/topdown/sprite-utils";
import type { SpriteCategory } from "@/lib/topdown/types";

const CARD_PX = 88;
const STRIP_PX = 56;

const CATEGORY_BORDER: Record<SpriteCategory, string> = {
  grass: "border-emerald-600/50",
  soil: "border-amber-800/50",
  plant: "border-lime-600/50",
  item: "border-sky-600/50",
  weed: "border-purple-600/50",
  fence: "border-orange-600/50",
};

function LetterFruitStageCard({ stage }: { stage: LetterFruitStageId }) {
  const { slug, atlasId } = useLetterFruitSelector();
  const atlas = getLetterFruitAtlas(slug);
  const { openEditor } = useBoundsOverride();
  const assetId = letterFruitAssetKey(slug, stage);
  const frame = letterFruitFrames(slug).find((entry) => entry.id === assetId);
  const fallback = atlas.assets[assetId];
  const bounds = useResolvedSpriteBounds(atlasId, assetId, fallback);

  if (!frame || !fallback) return null;

  return (
    <KidPanel
      className={clsx(
        "flex cursor-pointer flex-col items-center gap-2 p-3 text-center transition-colors hover:bg-kid-surface-muted/60",
        CATEGORY_BORDER[frame.category],
      )}
      onDoubleClick={() =>
        openEditor({
          atlasId,
          assetId,
          label: frame.label,
        })
      }
      title="Double-click to edit sprite bounds"
    >
      <div
        className="flex items-center justify-center overflow-hidden rounded-lg"
        style={{ width: CARD_PX, height: CARD_PX }}
      >
        <TopDownSprite
          atlas={atlas}
          bounds={bounds}
          scale={spriteScaleToFit(bounds, CARD_PX)}
          knockOutGutter
          alt={frame.label}
        />
      </div>
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-extrabold text-kid-ink">{frame.label}</p>
        <p className="text-[0.65rem] font-semibold text-kid-ink/65">
          {letterFruitStagePlotHint(stage)}
        </p>
        <p className="font-mono text-[0.65rem] text-kid-ink/70">{assetId}</p>
        <p className="text-[0.65rem] font-semibold text-kid-ink/60">
          {bounds.sx}, {bounds.sy} · {bounds.sw}×{bounds.sh}
        </p>
        <p className="text-[0.6rem] font-bold text-kid-ink/50">Double-click to edit</p>
      </div>
    </KidPanel>
  );
}

export function LetterFruitAtlasSection() {
  const { slug } = useLetterFruitSelector();
  const variant = getLetterFruitVariant(slug);
  const atlas = getLetterFruitAtlas(slug);

  return (
    <section id="letter-fruit" className="scroll-mt-6 space-y-4">
      <header>
        <h2 className="text-xl font-extrabold text-kid-ink sm:text-2xl">
          Letter fruit stages
        </h2>
        <p className="mt-1 text-sm font-semibold text-kid-ink/75">
          Five growth stages per letter from{" "}
          <code className="rounded bg-kid-ink/10 px-1">Letter Fruit Stages/</code>
          . Double-click a card to tune crop bounds and stacked plot preview.
        </p>
      </header>

      <LetterFruitLetterSelect />

      <details className="rounded-xl border-2 border-kid-ink/20 bg-kid-panel p-4">
        <summary className="cursor-pointer text-sm font-bold text-kid-ink/80">
          View {variant.label} source sheet
        </summary>
        <Image
          src={atlas.imageSrc}
          alt={`${variant.label} growth stages sheet`}
          width={atlas.width}
          height={atlas.height}
          className="mt-3 h-auto w-full rounded-lg border-4 border-kid-ink/30"
        />
        <p className="mt-2 text-center font-mono text-xs text-kid-ink/60">
          {decodeURIComponent(atlas.imageSrc)} · {atlas.width}×{atlas.height}
        </p>
      </details>

      <KidPanel tone="discovery" className="p-4">
        <p className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-kid-ink/60">
          Growth sequence
        </p>
        <div className="flex items-end justify-center gap-1 sm:gap-2">
          {LETTER_FRUIT_STAGE_IDS.map((stage) => {
            const assetId = letterFruitAssetKey(slug, stage);
            const fallback = atlas.assets[assetId];
            return (
              <LetterFruitStripThumb key={stage} stage={stage} assetId={assetId} fallback={fallback} />
            );
          })}
        </div>
      </KidPanel>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {LETTER_FRUIT_STAGE_IDS.map((stage) => (
          <LetterFruitStageCard key={stage} stage={stage} />
        ))}
      </div>
    </section>
  );
}

function LetterFruitStripThumb({
  stage,
  assetId,
  fallback,
}: {
  stage: LetterFruitStageId;
  assetId: string;
  fallback: { sx: number; sy: number; sw: number; sh: number };
}) {
  const { slug, atlasId } = useLetterFruitSelector();
  const atlas = getLetterFruitAtlas(slug);
  const bounds = useResolvedSpriteBounds(atlasId, assetId, fallback);
  const frame = letterFruitFrames(slug).find((entry) => entry.id === assetId);

  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <div
        className="flex items-end justify-center overflow-hidden"
        style={{ width: STRIP_PX, height: STRIP_PX }}
      >
        <TopDownSprite
          atlas={atlas}
          bounds={bounds}
          scale={spriteScaleToFit(bounds, STRIP_PX)}
          knockOutGutter
          alt={frame?.label ?? stage}
        />
      </div>
      <p className="text-[0.6rem] font-bold uppercase tracking-wide text-kid-ink/55">
        {stage}
      </p>
    </div>
  );
}
