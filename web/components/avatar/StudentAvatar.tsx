"use client";

import { useEffect, useId, useRef, useState } from "react";
import { clsx } from "clsx";
import {
  applyLoadoutToSvgRoot,
  avatarAriaLabel,
  normalizeLoadout,
  STUDENT_AVATAR_SVG_PATH,
} from "@/lib/avatar/apply-loadout";
import { presetIdForLoadout } from "@/lib/avatar/progress";
import type { AvatarLoadout } from "@/lib/avatar/types";

const svgMarkupCache: { promise?: Promise<string> } = {};

function fetchAvatarSvgMarkup(): Promise<string> {
  if (!svgMarkupCache.promise) {
    svgMarkupCache.promise = fetch(STUDENT_AVATAR_SVG_PATH)
      .then((res) => {
        if (!res.ok) throw new Error(`Avatar SVG failed: ${res.status}`);
        return res.text();
      })
      .catch((err) => {
        svgMarkupCache.promise = undefined;
        throw err;
      });
  }
  return svgMarkupCache.promise;
}

const SIZE_CLASS = {
  sm: "h-12 w-12",
  md: "h-24 w-24",
  lg: "h-40 w-40",
  xl: "h-48 w-48",
} as const;

export type StudentAvatarSize = keyof typeof SIZE_CLASS;

type Props = {
  loadout: AvatarLoadout | null | undefined;
  /** Used for robot growth stages (defaults to 1). */
  playerLevel?: number;
  size?: StudentAvatarSize;
  className?: string;
  /** When false, render an empty placeholder box (hydration-safe). */
  show?: boolean;
};

export function StudentAvatar({
  loadout,
  playerLevel = 1,
  size = "lg",
  className,
  show = true,
}: Props) {
  const titleId = useId();
  const hostRef = useRef<HTMLDivElement>(null);
  const [markup, setMarkup] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const normalized = normalizeLoadout(loadout);
  const presetId = loadout ? presetIdForLoadout(normalized) : null;
  const applyOptions = { presetId, playerLevel };
  const loadoutKey = JSON.stringify({ normalized, presetId, playerLevel });

  useEffect(() => {
    let cancelled = false;
    fetchAvatarSvgMarkup()
      .then((text) => {
        if (!cancelled) setMarkup(text);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!show || !markup || !hostRef.current) return;
    const svg = hostRef.current.querySelector("svg");
    if (svg) applyLoadoutToSvgRoot(svg, normalized, applyOptions);
  }, [show, markup, loadoutKey, normalized, presetId, playerLevel]);

  const shellClass = clsx("relative shrink-0", SIZE_CLASS[size], className);

  if (!show) {
    return (
      <div className={shellClass} role="img" aria-label={avatarAriaLabel(normalized, applyOptions)} />
    );
  }

  if (loadError) {
    return (
      <div
        className={clsx(
          shellClass,
          "flex items-center justify-center rounded-xl border-2 border-dashed border-kid-ink/30 bg-kid-surface-muted text-3xl",
        )}
        role="img"
        aria-label={avatarAriaLabel(normalized, applyOptions)}
      >
        <span aria-hidden>⭐</span>
      </div>
    );
  }

  if (!markup) {
    return (
      <div
        className={clsx(shellClass, "animate-pulse rounded-xl bg-kid-surface-muted")}
        role="img"
        aria-label="Loading avatar"
      />
    );
  }

  return (
    <div className={shellClass} role="img" aria-label={avatarAriaLabel(normalized, applyOptions)}>
      <div
        ref={hostRef}
        className="h-full w-full [&_svg]:h-full [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: markup }}
        aria-labelledby={titleId}
      />
      <span id={titleId} className="sr-only">
        {avatarAriaLabel(normalized, applyOptions)}
      </span>
    </div>
  );
}
