"use client";

import { useEffect, useId, useRef, useState } from "react";
import { clsx } from "clsx";
import type { PlayerAppearanceId } from "@/lib/progress/types";

export const PLAYER_CHARACTER_SVG_PATH = "/avatar/player-character.svg";
/** MVP student avatar on the home screen stage. */
export const HOME_PLAYER_AVATAR_SVG_PATH = "/avatar/avatar-mvp-1.svg";

const svgMarkupCache = new Map<string, Promise<string>>();

function fetchPlayerSvgMarkup(path: string): Promise<string> {
  let promise = svgMarkupCache.get(path);
  if (!promise) {
    promise = fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error(`Player SVG failed: ${res.status}`);
        return res.text();
      })
      .catch((err) => {
        svgMarkupCache.delete(path);
        throw err;
      });
    svgMarkupCache.set(path, promise);
  }
  return promise;
}

const SIZE_CLASS = {
  sm: "h-12 w-12",
  md: "h-24 w-24",
  lg: "h-40 w-40",
  xl: "h-48 w-48",
} as const;

export type PlayerCharacterSize = keyof typeof SIZE_CLASS;

type Props = {
  appearanceId?: PlayerAppearanceId | null;
  size?: PlayerCharacterSize;
  className?: string;
  show?: boolean;
  /** Defaults to {@link PLAYER_CHARACTER_SVG_PATH}. Home uses {@link HOME_PLAYER_AVATAR_SVG_PATH}. */
  svgPath?: string;
};

export function playerCharacterAriaLabel(appearanceId: PlayerAppearanceId | null | undefined): string {
  if (!appearanceId) return "Player character";
  return "Player character, default look";
}

export function PlayerCharacter({
  appearanceId = "default",
  size = "lg",
  className,
  show = true,
  svgPath = PLAYER_CHARACTER_SVG_PATH,
}: Props) {
  const titleId = useId();
  const hostRef = useRef<HTMLDivElement>(null);
  const [markup, setMarkup] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const resolvedAppearance = appearanceId ?? "default";

  useEffect(() => {
    let cancelled = false;
    setMarkup(null);
    setLoadError(false);
    fetchPlayerSvgMarkup(svgPath)
      .then((text) => {
        if (!cancelled) setMarkup(text);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [svgPath]);

  useEffect(() => {
    if (!show || !markup || !hostRef.current) return;
    hostRef.current.querySelector("svg")?.setAttribute("data-appearance", resolvedAppearance);
  }, [show, markup, resolvedAppearance]);

  const shellClass = clsx("relative shrink-0", SIZE_CLASS[size], className);
  const label = playerCharacterAriaLabel(resolvedAppearance);

  if (!show) {
    return <div className={shellClass} role="img" aria-label={label} />;
  }

  if (loadError) {
    return (
      <div
        className={clsx(
          shellClass,
          "flex items-center justify-center rounded-xl border-2 border-dashed border-kid-ink/30 bg-kid-surface-muted text-3xl",
        )}
        role="img"
        aria-label={label}
      >
        <span aria-hidden>🧑</span>
      </div>
    );
  }

  if (!markup) {
    return (
      <div
        className={clsx(shellClass, "animate-pulse rounded-xl bg-kid-surface-muted")}
        role="img"
        aria-label="Loading player"
      />
    );
  }

  return (
    <div className={shellClass} role="img" aria-label={label}>
      <div
        ref={hostRef}
        className="h-full w-full [&_svg]:h-full [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: markup }}
        aria-labelledby={titleId}
      />
      <span id={titleId} className="sr-only">
        {label}
      </span>
    </div>
  );
}
