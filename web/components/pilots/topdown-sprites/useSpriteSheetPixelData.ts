"use client";

import { useEffect, useState } from "react";
import type { SpriteAtlasConfig } from "@/lib/topdown/types";

type PixelData = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
};

export function useSpriteSheetPixelData(atlas: Pick<SpriteAtlasConfig, "imageSrc" | "width" | "height">) {
  const [pixelData, setPixelData] = useState<PixelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = `${atlas.imageSrc}:${atlas.width}x${atlas.height}`;

    setLoading(true);
    setError(null);

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";

    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = atlas.width;
        canvas.height = atlas.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          setError("Canvas unavailable");
          setLoading(false);
          return;
        }
        ctx.drawImage(img, 0, 0, atlas.width, atlas.height);
        const imageData = ctx.getImageData(0, 0, atlas.width, atlas.height);
        setPixelData({
          data: imageData.data,
          width: atlas.width,
          height: atlas.height,
        });
        setLoading(false);
      } catch {
        setError("Could not read sprite sheet pixels");
        setLoading(false);
      }
    };

    img.onerror = () => {
      if (cancelled) return;
      setError("Failed to load sprite sheet");
      setLoading(false);
    };

    img.src = atlas.imageSrc;

    return () => {
      cancelled = true;
    };
  }, [atlas.height, atlas.imageSrc, atlas.width]);

  return { pixelData, loading, error };
}
