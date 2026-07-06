"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { KidButton } from "@/components/kid-ui/KidButton";
import { useBoundsOverride } from "@/components/pilots/topdown-sprites/BoundsOverrideContext";
import { listWkePathTileIds } from "@/lib/topdown/wke-path-tile-presets";
import type { WkePathPicksPayload } from "@/lib/topdown/wke-path-picks-sync";
import { WKE_PATH_SPRITE_ATLAS, type WkePathTileId } from "@/lib/topdown/wke-sprite-atlas";

export function WkePathApplyPicksButton() {
  const searchParams = useSearchParams();
  const autoAppliedRef = useRef(false);
  const { getBounds, getStackPreset } = useBoundsOverride();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const collectPayload = useCallback((): WkePathPicksPayload => {
    const tiles = listWkePathTileIds().map((assetId) => {
      const fallback = WKE_PATH_SPRITE_ATLAS.assets[assetId as WkePathTileId];
      const bounds = getBounds("wke-path", assetId, fallback);
      const stack = getStackPreset("wke-path", assetId, bounds);
      return { assetId: assetId as WkePathTileId, bounds, stack };
    });
    return { tiles };
  }, [getBounds, getStackPreset]);

  const applyToCodebase = useCallback(async () => {
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/dev/apply-wke-path-picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(collectPayload()),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; updated?: string[] };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Apply failed");
      }
      setStatus(`Updated ${data.updated?.join(" and ")} (${data.updated?.length ?? 0} files). Hard-refresh maps to see changes.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Apply failed");
    } finally {
      setBusy(false);
    }
  }, [collectPayload]);

  useEffect(() => {
    if (autoAppliedRef.current) return;
    if (searchParams.get("applyPathPicks") !== "1") return;
    autoAppliedRef.current = true;
    void applyToCodebase();
  }, [applyToCodebase, searchParams]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <KidButton type="button" variant="primary" disabled={busy} onClick={() => void applyToCodebase()}>
        {busy ? "Applying…" : "Apply path picks to maps"}
      </KidButton>
      <p className="text-xs font-semibold text-kid-ink/65">
        Writes current atlas crops + stack presets into{" "}
        <span className="font-mono">wke-sprite-atlas.ts</span> and{" "}
        <span className="font-mono">wke-path-tile-presets.ts</span> for the live board.
      </p>
      {status ?
        <p className="w-full text-xs font-semibold text-emerald-800">{status}</p>
      : null}
    </div>
  );
}
