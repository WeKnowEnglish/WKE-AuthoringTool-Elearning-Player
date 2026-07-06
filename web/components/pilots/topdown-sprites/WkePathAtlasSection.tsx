"use client";



import { clsx } from "clsx";

import { TopDownSprite } from "@/components/topdown/TopDownSprite";

import { useBoundsOverride, useResolvedSpriteBounds } from "@/components/pilots/topdown-sprites/BoundsOverrideContext";

import { KidPanel } from "@/components/kid-ui/KidPanel";

import { Suspense } from "react";
import { WkePathApplyPicksButton } from "@/components/pilots/topdown-sprites/WkePathApplyPicksButton";
import { WKE_PATH_ASSET_GROUPS } from "@/lib/topdown/preview-board-game-path";

import { pathTileLabel, pathTileLiveShapes } from "@/lib/topdown/wke-path-tile-labels";

import { WKE_PATH_SPRITE_ATLAS, type WkePathTileId } from "@/lib/topdown/wke-sprite-atlas";



const ATLAS_CARD_PX = 96;



function PathAssetCard({ assetId }: { assetId: WkePathTileId }) {

  const { openEditor } = useBoundsOverride();

  const meta = pathTileLabel(assetId);
  const liveShapes = pathTileLiveShapes(assetId);

  const fallback =

    WKE_PATH_SPRITE_ATLAS.assets[assetId as keyof typeof WKE_PATH_SPRITE_ATLAS.assets];

  const bounds = useResolvedSpriteBounds("wke-path", assetId, fallback);

  if (!fallback) return null;



  return (

    <KidPanel

      className={clsx(

        "flex cursor-pointer flex-col items-center gap-2 p-3 text-center transition-colors hover:bg-kid-surface-muted/60",

        "border-amber-700/45",

      )}

      onDoubleClick={() =>

        openEditor({

          atlasId: "wke-path",

          assetId,

          label: `${meta.title} (${assetId})`,

        })

      }

      title={`${meta.title}\n${meta.subtitle}\n${assetId}${meta.liveAutotile ? `\nLive autotile: ${liveShapes.join(", ")}` : ""}`}

    >

      <div

        className="overflow-hidden rounded-lg bg-[#3a3a3a]"

        style={{ width: ATLAS_CARD_PX, height: ATLAS_CARD_PX }}

      >

        <TopDownSprite

          atlas={WKE_PATH_SPRITE_ATLAS}

          bounds={bounds}

          fillCell

          fillScale={ATLAS_CARD_PX / bounds.sw}

          alt={meta.title}

        />

      </div>

      <div className="space-y-0.5">

        <p className="text-xs font-extrabold leading-tight text-kid-ink">{meta.title}</p>

        <p className="text-[0.6rem] font-semibold leading-snug text-kid-ink/65">{meta.subtitle}</p>

        <p className="font-mono text-[0.55rem] text-kid-ink/45">{assetId}</p>

        <p className="text-[0.55rem] font-bold uppercase tracking-wide text-kid-ink/40">{meta.sheet}</p>

        {meta.liveAutotile ?

          <span className="inline-block rounded bg-emerald-600/15 px-1.5 py-0.5 text-[0.5rem] font-bold uppercase tracking-wide text-emerald-800">

            Live autotile

          </span>

        : <span className="inline-block rounded bg-kid-ink/10 px-1.5 py-0.5 text-[0.5rem] font-bold uppercase tracking-wide text-kid-ink/50">

            Sheet variant

          </span>

        }

      </div>

    </KidPanel>

  );

}



export function WkePathAtlasSection() {

  return (

    <section id="wke-path-atlas" className="scroll-mt-6 space-y-6">

      <header>

        <h2 className="text-xl font-extrabold text-kid-ink sm:text-2xl">Path atlas</h2>

        <p className="mt-1 text-sm font-semibold text-kid-ink/75">
          WKE dirt-on-grass path sheet — 4×4 omnidirectional autotile set. Cards show topology
          (Corner, Cross, T-cross, etc.). <strong>Live autotile</strong> badges mark tiles wired
          into the board game path layer. <strong>Double-click</strong> a card to tune crop bounds.
        </p>
        <div className="mt-3">
          <Suspense fallback={null}>
            <WkePathApplyPicksButton />
          </Suspense>
        </div>

      </header>



      {WKE_PATH_ASSET_GROUPS.map((group) => (

        <div key={group.label} className="space-y-3">

          <div>

            <h3 className="text-sm font-bold uppercase tracking-wide text-kid-ink/70">{group.label}</h3>

            {group.description ?

              <p className="text-xs font-semibold text-kid-ink/55">{group.description}</p>

            : null}

          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

            {group.assetIds.map((assetId) => (

              <PathAssetCard key={assetId} assetId={assetId} />

            ))}

          </div>

        </div>

      ))}

    </section>

  );

}

