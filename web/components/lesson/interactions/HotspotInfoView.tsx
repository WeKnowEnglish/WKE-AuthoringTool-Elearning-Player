"use client";

import Image from "next/image";
import { clsx } from "clsx";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { playSfx } from "@/lib/audio/sfx";
import { speakText, speakTextAndWait } from "@/lib/audio/tts";
import { countKeywordMatchesInText } from "@/lib/essay-keyword-feedback";
import type { ScreenPayload } from "@/lib/lesson-schemas";
import { GuideBlock, interactionImageFitClass, NavProps, unopt } from "./shared";

export function HotspotInfoView({
  parsed,
  muted,
  passed: _passed,
  onNext,
  onBack,
  showBack,
}: {
  parsed: Extract<ScreenPayload, { type: "interaction"; subtype: "hotspot_info" }>;
} & NavProps) {
  const [viewed, setViewed] = useState<Set<string>>(() => new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const req = parsed.require_all_viewed ?? false;
  const allViewed =
    !req || parsed.hotspots.every((h: { id: string }) => viewed.has(h.id));

  function tapHotspot(id: string) {
    playSfx("tap", muted);
    setViewed((s) => new Set(s).add(id));
    setOpenId(id);
  }

  const open = openId
    ? parsed.hotspots.find((h: (typeof parsed.hotspots)[number]) => h.id === openId)
    : null;

  return (
    <div>
      <KidPanel>
        {parsed.body_text ? (
          <p className="mb-4 text-xl font-semibold">{parsed.body_text}</p>
        ) : null}
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border-4 border-kid-ink">
          <Image
            src={parsed.image_url}
            alt="Scene"
            fill
            className={interactionImageFitClass(parsed.image_fit)}
            unoptimized={unopt(parsed.image_url)}
          />
          {parsed.hotspots.map((h: (typeof parsed.hotspots)[number]) => (
            <button
              key={h.id}
              type="button"
              className="absolute border-4 border-dashed border-sky-600 bg-sky-200/40 hover:bg-sky-300/50 active:bg-sky-400/60"
              style={{
                left: `${h.x_percent}%`,
                top: `${h.y_percent}%`,
                width: `${h.w_percent}%`,
                height: `${h.h_percent}%`,
              }}
              onClick={() => tapHotspot(h.id)}
              aria-label={h.label ?? h.title ?? "Hotspot"}
            />
          ))}
        </div>
        {open ? (
          <KidPanel className="mt-4 border-blue-900 bg-blue-50">
            {open.title ? <p className="font-bold">{open.title}</p> : null}
            {open.body ? <p className="mt-2 leading-relaxed">{open.body}</p> : null}
            <KidButton
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={() => setOpenId(null)}
            >
              Close
            </KidButton>
          </KidPanel>
        ) : null}
      </KidPanel>
      <GuideBlock guide={parsed.guide} />
      <div className="mt-6 flex flex-wrap gap-3">
        {showBack ? (
          <KidButton type="button" variant="secondary" onClick={onBack}>
            Back
          </KidButton>
        ) : null}
        <KidButton type="button" disabled={req && !allViewed} onClick={() => onNext()}>
          Next
        </KidButton>
      </div>
    </div>
  );
}
