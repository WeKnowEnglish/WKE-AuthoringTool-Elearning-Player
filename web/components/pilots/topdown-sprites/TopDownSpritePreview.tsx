"use client";

import { MockGardenPreview } from "@/components/pilots/topdown-sprites/MockGardenPreview";
import { BoundsOverrideProvider } from "@/components/pilots/topdown-sprites/BoundsOverrideContext";
import { SeamlessMapsSection } from "@/components/pilots/topdown-sprites/SeamlessMapsSection";
import { SpriteAtlasSection } from "@/components/pilots/topdown-sprites/SpriteAtlasSection";
import { SpriteBoundsEditorModal } from "@/components/pilots/topdown-sprites/SpriteBoundsEditorModal";

const SECTION_LINKS = [
  { href: "#atlas", label: "Garden atlas" },
  { href: "#garden", label: "Mock garden" },
  { href: "#maps", label: "Seamless maps" },
] as const;

function TopDownSpritePreviewContent() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-10">
      <header className="space-y-3 text-center">
        <h1 className="text-2xl font-extrabold text-kid-ink sm:text-3xl">
          Top-Down Sprite Preview
        </h1>
        <p className="text-sm font-semibold text-kid-ink/80 sm:text-base">
          Double-click any atlas card or map tile to edit sx/sy/sw/sh. Garden sheet + WKE tile set V2.
        </p>
        <nav
          className="flex flex-wrap justify-center gap-2"
          aria-label="Preview sections"
        >
          {SECTION_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg border-2 border-kid-ink bg-kid-panel px-3 py-1.5 text-sm font-bold text-kid-ink transition-colors hover:bg-kid-surface-muted"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </header>

      <SpriteAtlasSection />
      <MockGardenPreview />
      <SeamlessMapsSection />

      <footer className="border-t-2 border-kid-ink/15 pt-4 text-center text-xs font-semibold text-kid-ink/60">
        Session edits persist until you close the tab. Copy TS lines into garden-sprite-atlas.ts or
        wke-sprite-atlas.ts to save.
      </footer>

      <SpriteBoundsEditorModal />
    </main>
  );
}

export function TopDownSpritePreview() {
  return (
    <BoundsOverrideProvider>
      <TopDownSpritePreviewContent />
    </BoundsOverrideProvider>
  );
}
