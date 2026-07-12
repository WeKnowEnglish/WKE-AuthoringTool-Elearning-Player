"use client";

import Image from "next/image";
import { resolveCarryArt } from "@/lib/live-game/modes/english-craft/english-craft-art";
import type { EnglishCraftResourceType } from "@/lib/live-game/modes/english-craft/english-craft-art";

type Props = {
  resourceType: EnglishCraftResourceType;
  sizePx?: number;
};

export function LiveGameCarryOverlay({ resourceType, sizePx = 32 }: Props) {
  return (
    <div
      className="pointer-events-none absolute left-1/2 -translate-x-1/2"
      style={{ top: -sizePx - 4, width: sizePx, height: sizePx }}
      aria-hidden
    >
      <Image
        src={resolveCarryArt(resourceType)}
        alt=""
        fill
        className="object-contain drop-shadow-md"
        sizes={`${sizePx}px`}
        draggable={false}
      />
    </div>
  );
}
