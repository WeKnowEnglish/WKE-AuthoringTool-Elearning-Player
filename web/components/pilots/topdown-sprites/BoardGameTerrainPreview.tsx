"use client";



import { useMemo, useState } from "react";

import { BoardTilemapCanvas } from "@/components/board-game/render/BoardTilemapCanvas";

import { SeamlessMapGrid } from "@/components/pilots/topdown-sprites/SeamlessMapGrid";

import { KidPanel } from "@/components/kid-ui/KidPanel";

import { buildBoardTilemap } from "@/lib/board-game/render/build-board-tilemap";

import type { MapLayoutTemplate, MapThemeId } from "@/lib/board-game/map/types";

import {

  BOARD_GAME_PREVIEW_LAYOUTS,

  BOARD_GAME_PREVIEW_LENGTHS,

  BOARD_GAME_PREVIEW_THEMES,

  buildBoardGamePreviewBoardMap,

  buildBoardGamePreviewMap,

} from "@/lib/topdown/preview-board-game-terrain";



type PreviewMode = "legacy" | "layered";



export function BoardGameTerrainPreview() {

  const [theme, setTheme] = useState<MapThemeId>("jungle");

  const [boardLength, setBoardLength] = useState<(typeof BOARD_GAME_PREVIEW_LENGTHS)[number]>(12);

  const [layout, setLayout] = useState<MapLayoutTemplate>("snake");

  const [previewMode, setPreviewMode] = useState<PreviewMode>("layered");



  const previewOptions = useMemo(

    () => ({ theme, boardLength, layout }),

    [theme, boardLength, layout],

  );



  const legacyPreviewMap = useMemo(

    () => buildBoardGamePreviewMap(previewOptions),

    [previewOptions],

  );



  const layeredTilemap = useMemo(() => {

    const map = buildBoardGamePreviewBoardMap(previewOptions);

    return buildBoardTilemap(map);

  }, [previewOptions]);



  return (

    <section id="board-preview" className="scroll-mt-6 space-y-4">

      <header>

        <h2 className="text-xl font-extrabold text-kid-ink sm:text-2xl">Board path preview</h2>

        <p className="mt-1 text-sm font-semibold text-kid-ink/75">

          {previewMode === "legacy" ?

            "Gapless terrain on a real board-game path shape. Path cells use theme family variants; off-path cells use filler."

          : "Layered production model: theme filler on every cell, dirt path autotiles composited on top."}

        </p>

      </header>



      <KidPanel className="flex flex-wrap items-end gap-4 p-4">

        <label className="flex flex-col gap-1 text-sm font-bold text-kid-ink">

          Preview

          <select

            className="rounded-lg border-2 border-kid-ink bg-white px-3 py-2 font-semibold"

            value={previewMode}

            onChange={(event) => setPreviewMode(event.target.value as PreviewMode)}

          >

            <option value="layered">Layered (terrain + path)</option>

            <option value="legacy">Legacy (terrain on path)</option>

          </select>

        </label>



        <label className="flex flex-col gap-1 text-sm font-bold text-kid-ink">

          Theme

          <select

            className="rounded-lg border-2 border-kid-ink bg-white px-3 py-2 font-semibold"

            value={theme}

            onChange={(event) => setTheme(event.target.value as MapThemeId)}

          >

            {BOARD_GAME_PREVIEW_THEMES.map((option) => (

              <option key={option.value} value={option.value}>

                {option.label}

              </option>

            ))}

          </select>

        </label>



        <label className="flex flex-col gap-1 text-sm font-bold text-kid-ink">

          Spaces

          <select

            className="rounded-lg border-2 border-kid-ink bg-white px-3 py-2 font-semibold"

            value={boardLength}

            onChange={(event) =>

              setBoardLength(Number(event.target.value) as (typeof BOARD_GAME_PREVIEW_LENGTHS)[number])

            }

          >

            {BOARD_GAME_PREVIEW_LENGTHS.map((length) => (

              <option key={length} value={length}>

                {length}

              </option>

            ))}

          </select>

        </label>



        <label className="flex flex-col gap-1 text-sm font-bold text-kid-ink">

          Layout

          <select

            className="rounded-lg border-2 border-kid-ink bg-white px-3 py-2 font-semibold"

            value={layout}

            onChange={(event) => setLayout(event.target.value as MapLayoutTemplate)}

          >

            {BOARD_GAME_PREVIEW_LAYOUTS.map((option) => (

              <option key={option.value} value={option.value}>

                {option.label}

              </option>

            ))}

          </select>

        </label>

      </KidPanel>



      {previewMode === "legacy" ?

        <SeamlessMapGrid map={legacyPreviewMap} />

      : <KidPanel className="overflow-x-auto p-3 sm:p-4">

          <div className="mx-auto w-fit">

            <BoardTilemapCanvas tilemap={layeredTilemap} theme={theme} />

          </div>

          <p className="mt-2 text-center font-mono text-[0.65rem] text-kid-ink/60">

            Layered tilemap · buildBoardTilemap + resolveSpriteBounds · lib/board-game/render

          </p>

        </KidPanel>

      }

    </section>

  );

}


