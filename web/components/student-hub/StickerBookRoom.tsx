"use client";

import Link from "next/link";
import { clsx } from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { StickerBackgroundRail } from "@/components/student-hub/StickerBackgroundRail";
import { StickerBookScrollCard } from "@/components/student-hub/StickerBookScrollCard";
import { StickerSceneCanvas } from "@/components/student-hub/StickerSceneCanvas";
import { StickerTray } from "@/components/student-hub/StickerTray";
import { playSfx } from "@/lib/audio/sfx";
import type { StickerDef } from "@/lib/progress/sticker-library";
import { getRewards } from "@/lib/progress/rewards";
import {
  downloadStickerSceneBlob,
  exportStickerSceneToPng,
} from "@/lib/student-hub/export-sticker-scene";
import { loadStickerBookBackgrounds } from "@/lib/student-hub/load-sticker-book-backgrounds";
import { uniqueOwnedStickers } from "@/lib/student-hub/owned-stickers";
import type {
  PlacedSticker,
  StickerBookBackground,
} from "@/lib/student-hub/sticker-book-types";
import { useClientHydrated } from "@/lib/react/use-client-hydrated";

type Props = {
  muted: boolean;
  dailyQuestUiKey: number;
  className?: string;
};

function newPlacement(stickerId: string, xPercent: number, yPercent: number): PlacedSticker {
  return {
    instanceId: crypto.randomUUID(),
    stickerId,
    xPercent,
    yPercent,
    scale: 1,
  };
}

/** Grid fills parent height only — side columns scroll internally, never stretch the page. */
const WORKSPACE_GRID =
  "grid h-0 min-h-0 w-full flex-1 grid-cols-[minmax(4.5rem,5.25rem)_minmax(0,1fr)_minmax(4.5rem,5.25rem)] grid-rows-[minmax(0,1fr)] gap-1 overflow-hidden sm:grid-cols-[5.75rem_minmax(0,1fr)_5.75rem] sm:gap-1.5 md:grid-cols-[6.5rem_minmax(0,1fr)_6.5rem] lg:mx-auto lg:max-w-6xl [&>*]:h-full [&>*]:max-h-full [&>*]:min-h-0 [&>*]:overflow-hidden";

const TOOLBAR_BTN =
  "!min-h-8 shrink-0 !px-2.5 text-xs sm:!min-h-9 sm:!px-3 sm:text-sm";

export function StickerBookRoom({ muted, dailyQuestUiKey, className }: Props) {
  const hydrated = useClientHydrated();
  const [backgrounds, setBackgrounds] = useState<StickerBookBackground[]>([]);
  const [backgroundsLoading, setBackgroundsLoading] = useState(true);
  const [backgroundsErr, setBackgroundsErr] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [ownedStickers, setOwnedStickers] = useState<StickerDef[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [placements, setPlacements] = useState<PlacedSticker[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState<string | null>(null);
  const [pickHintFlash, setPickHintFlash] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBackgroundsLoading(true);
    setBackgroundsErr(null);
    void loadStickerBookBackgrounds()
      .then((rows) => {
        if (cancelled) return;
        setBackgrounds(rows);
        setBackgroundUrl((prev) => prev ?? rows[0]?.url ?? null);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setBackgroundsErr(e instanceof Error ? e.message : "Could not load scenes");
        }
      })
      .finally(() => {
        if (!cancelled) setBackgroundsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setOwnedStickers(uniqueOwnedStickers(getRewards().ownedStickerIds ?? []));
  }, [hydrated, dailyQuestUiKey]);

  const activeBackground = useMemo(
    () => backgrounds.find((b) => b.url === backgroundUrl) ?? backgrounds[0] ?? null,
    [backgrounds, backgroundUrl],
  );

  const selectBackground = useCallback(
    (bg: StickerBookBackground) => {
      playSfx("tap", muted);
      setBackgroundUrl(bg.url);
    },
    [muted],
  );

  const selectTraySticker = useCallback(
    (def: StickerDef) => {
      playSfx("tap", muted);
      setSelectedStickerId(def.id);
      setSelectedInstanceId(null);
    },
    [muted],
  );

  const placeStickerAt = useCallback(
    (xPercent: number, yPercent: number) => {
      if (!selectedStickerId) {
        playSfx("wrong", muted);
        setPickHintFlash(true);
        window.setTimeout(() => setPickHintFlash(false), 2000);
        return;
      }
      playSfx("tap", muted);
      const placement = newPlacement(selectedStickerId, xPercent, yPercent);
      setPlacements((prev) => [...prev, placement]);
      setSelectedInstanceId(placement.instanceId);
    },
    [muted, selectedStickerId],
  );

  const removeSelected = useCallback(() => {
    if (!selectedInstanceId) return;
    playSfx("tap", muted);
    setPlacements((prev) => prev.filter((p) => p.instanceId !== selectedInstanceId));
    setSelectedInstanceId(null);
  }, [muted, selectedInstanceId]);

  const clearScene = useCallback(() => {
    playSfx("tap", muted);
    setPlacements([]);
    setSelectedInstanceId(null);
  }, [muted]);

  const downloadScene = useCallback(async () => {
    if (!backgroundUrl || placements.length === 0) return;
    setExporting(true);
    setExportErr(null);
    playSfx("tap", muted);
    try {
      const blob = await exportStickerSceneToPng(backgroundUrl, placements);
      downloadStickerSceneBlob(blob);
    } catch (e: unknown) {
      setExportErr(e instanceof Error ? e.message : "Download failed");
      playSfx("wrong", muted);
    } finally {
      setExporting(false);
    }
  }, [backgroundUrl, placements, muted]);

  const canDownload = Boolean(backgroundUrl && placements.length > 0 && !exporting);

  return (
    <div className={clsx("flex min-h-0 w-full flex-1 flex-col overflow-hidden", className)}>
      <div className="flex shrink-0 flex-nowrap items-center justify-center gap-1 overflow-x-auto px-0.5">
        <KidButton
          type="button"
          variant="primary"
          className={TOOLBAR_BTN}
          disabled={!canDownload}
          title={
            canDownload ? undefined
            : exporting ? "Saving your picture…"
            : !backgroundUrl ? "Choose a scene first"
            : "Place at least one sticker first"
          }
          onClick={() => void downloadScene()}
        >
          {exporting ? "Saving…" : "Download"}
        </KidButton>
        <KidButton
          type="button"
          variant="secondary"
          className={TOOLBAR_BTN}
          disabled={!selectedInstanceId}
          title={selectedInstanceId ? undefined : "Tap a sticker on the scene first"}
          onClick={removeSelected}
        >
          Remove
        </KidButton>
        <KidButton
          type="button"
          variant="secondary"
          className={TOOLBAR_BTN}
          disabled={placements.length === 0}
          title={placements.length > 0 ? undefined : "Nothing to clear"}
          onClick={clearScene}
        >
          Clear
        </KidButton>
      </div>
      {exportErr ? (
        <p className="shrink-0 text-center text-xs font-semibold text-red-800">{exportErr}</p>
      ) : null}

      <div className={WORKSPACE_GRID}>
        <StickerBackgroundRail
          backgrounds={backgrounds}
          activeId={activeBackground?.id ?? null}
          loading={backgroundsLoading}
          error={backgroundsErr}
          onSelect={selectBackground}
        />

        <div className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
          {backgroundUrl ? (
            <StickerSceneCanvas
              fill
              backgroundUrl={backgroundUrl}
              placements={placements}
              selectedInstanceId={selectedInstanceId}
              onPlacementsChange={setPlacements}
              onSelectInstance={setSelectedInstanceId}
              onTapStage={placeStickerAt}
              className="min-h-0 flex-1 shadow-[6px_6px_0_#1a1a1a]"
            />
          ) : (
            <div
              className={clsx(
                "flex min-h-0 flex-1 items-center justify-center rounded-2xl border-4 border-dashed border-kid-ink/50 bg-kid-panel/60 px-4 text-center text-sm font-semibold text-kid-ink/75",
              )}
            >
              {backgroundsLoading ? "Loading scene…" : "Pick a scene on the left"}
            </div>
          )}
          <p
            className={clsx(
              "pointer-events-none absolute bottom-1 left-1 right-1 z-10 shrink-0 text-center text-[0.6rem] font-semibold leading-tight drop-shadow-[0_1px_0_rgba(255,255,255,0.9)] sm:text-[0.65rem]",
              pickHintFlash ? "text-red-800" : "text-kid-ink/70",
            )}
          >
            {pickHintFlash ?
              "Pick a sticker first!"
            : selectedStickerId ?
              "Tap to place · drag to move"
            : "Pick a sticker, then tap the picture"}
          </p>
        </div>

        <StickerBookScrollCard title="Stickers" ariaLabel="Your stickers">
          <StickerTray
            layout="vertical"
            stickers={ownedStickers}
            selectedStickerId={selectedStickerId}
            onSelectSticker={selectTraySticker}
            emptyMessage={
              hydrated ?
                <>
                  No stickers yet.{" "}
                  <Link
                    href="/profile"
                    className="text-[#0a2f86] underline decoration-1 underline-offset-2"
                  >
                    Get some
                  </Link>
                </>
              : "…"
            }
          />
        </StickerBookScrollCard>
      </div>
    </div>
  );
}
