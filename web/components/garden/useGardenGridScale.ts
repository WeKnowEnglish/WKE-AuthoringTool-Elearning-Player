"use client";

import { useEffect, useMemo, useState, type RefObject } from "react";
import {
  GARDEN_DESKTOP_BREAKPOINT_PX,
  GARDEN_GRID_SCALE_BOOST,
  GARDEN_GRID_SCALE_INSET_PX,
  gardenGridNaturalSize,
} from "@/lib/garden/garden-map-layout";

export function useGardenGridScale(
  containerRef: RefObject<HTMLElement | null>,
  rows: number,
  cols: number,
) {
  const natural = useMemo(() => gardenGridNaturalSize(rows, cols), [rows, cols]);
  const [scale, setScale] = useState(1);
  const [squareSide, setSquareSide] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      if (window.innerWidth < GARDEN_DESKTOP_BREAKPOINT_PX) {
        setScale(1);
        setSquareSide(0);
        return;
      }

      const inset = GARDEN_GRID_SCALE_INSET_PX * 2;
      const width = el.clientWidth - inset;
      const height = el.clientHeight - inset;
      if (width <= 0 || height <= 0) return;

      const side = Math.min(width, height);
      const fit = Math.min(side / natural.width, side / natural.height);
      const next = fit * GARDEN_GRID_SCALE_BOOST;
      setSquareSide(side);
      setScale(Math.max(1, next));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [containerRef, natural.height, natural.width]);

  return { scale, natural, squareSide };
}
