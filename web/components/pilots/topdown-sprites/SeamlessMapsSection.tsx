"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { SeamlessMapGrid } from "@/components/pilots/topdown-sprites/SeamlessMapGrid";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { SEAMLESS_MAP_PREVIEWS } from "@/lib/topdown/preview-seamless-maps";

function findMap(id: string) {
  return SEAMLESS_MAP_PREVIEWS.find((m) => m.id === id);
}

type MapBlockProps = {
  id: string;
  showSource?: boolean;
};

function MapBlock({ id, showSource = true }: MapBlockProps) {
  const map = findMap(id);
  if (!map) return null;

  return (
    <div id={`map-${id}`} className="scroll-mt-6 space-y-3">
      <h3 className="text-lg font-extrabold text-kid-ink">{map.title}</h3>
      <p className="text-sm font-semibold text-kid-ink/70">{map.description}</p>
      {showSource ?
        <details>
          <summary className="cursor-pointer text-sm font-bold text-kid-ink/70">
            View source sheet
          </summary>
          <Image
            src={map.atlas.imageSrc}
            alt={`${map.title} sprite sheet`}
            width={map.atlas.width}
            height={map.atlas.height}
            className="mt-2 h-auto w-full rounded-lg border-4 border-kid-ink/30"
          />
        </details>
      : null}
      <SeamlessMapGrid map={map} />
    </div>
  );
}

export function SeamlessMapsSection({ variant = "all" }: { variant?: "all" | "wke-only" }) {
  const gardenMap = variant === "all" ? findMap("garden") : null;
  const wkePathMap = findMap("wke-path");
  const wkeTerrainMap = findMap("wke-terrain");

  return (
    <section id="maps" className="scroll-mt-6 space-y-8">
      <header>
        <h2 className="text-xl font-extrabold text-kid-ink sm:text-2xl">
          Seamless map previews
        </h2>
        <p className="mt-1 text-sm font-semibold text-kid-ink/75">
          {variant === "wke-only" ?
            "WKE terrain mosaic and path autotile grids. Tiles use fillCell mode for edge-to-edge rendering."
          : "Two tile sets — custom garden sheet vs WKE Tile Set V2. Tiles use fillCell mode for edge-to-edge rendering."}
        </p>
      </header>

      <div className={clsx("grid gap-8", variant === "all" && "xl:grid-cols-2")}>
        {gardenMap ?
          <KidPanel className="space-y-3 p-4">
            <p className="text-xs font-extrabold uppercase tracking-wide text-emerald-700">
              Custom garden sheet
            </p>
            <MapBlock id="garden" />
          </KidPanel>
        : null}

        {wkePathMap ?
          <KidPanel className="space-y-4 p-4">
            <p className="text-xs font-extrabold uppercase tracking-wide text-sky-700">
              WKE Tile Set V2
            </p>
            <p className="text-sm font-semibold text-kid-ink/70">
              Vector source:{" "}
              <code className="text-xs">/assets/wke/wke-tile-set-v2.svg</code>
            </p>
            <details>
              <summary className="cursor-pointer text-sm font-bold text-kid-ink/70">
                View WKE vector sheet
              </summary>
              <Image
                src="/assets/wke/wke-tile-set-v2.svg"
                alt="WKE Tile Set V2 vector source"
                width={800}
                height={600}
                className="mt-2 h-auto w-full rounded-lg border-4 border-kid-ink/30"
              />
            </details>
            <MapBlock id="wke-path" showSource={false} />
            <details>
              <summary className="cursor-pointer text-sm font-bold text-kid-ink/70">
                View path raster sheet
              </summary>
              <Image
                src={wkePathMap.atlas.imageSrc}
                alt="WKE dirt on grass path autotile sheet"
                width={wkePathMap.atlas.width}
                height={wkePathMap.atlas.height}
                className="mt-2 h-auto w-full rounded-lg border-4 border-kid-ink/30"
              />
            </details>
            {wkeTerrainMap ?
              <div className="space-y-3 border-t-2 border-kid-ink/10 pt-4">
                <MapBlock id="wke-terrain" showSource={false} />
                <details>
                  <summary className="cursor-pointer text-sm font-bold text-kid-ink/70">
                    View terrain raster sheet
                  </summary>
                  <Image
                    src={wkeTerrainMap.atlas.imageSrc}
                    alt="WKE example terrain sprite sheet"
                    width={wkeTerrainMap.atlas.width}
                    height={wkeTerrainMap.atlas.height}
                    className="mt-2 h-auto w-full rounded-lg border-4 border-kid-ink/30"
                  />
                </details>
              </div>
            : null}
          </KidPanel>
        : null}
      </div>
    </section>
  );
}
