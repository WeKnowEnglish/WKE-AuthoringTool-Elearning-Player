"use client";

import { KidButton } from "@/components/kid-ui/KidButton";
import type { CharacterConfig } from "@/lib/character/character-types";
import {
  WKE_GIRL_BASE,
  WKE_GIRL_HAIR,
  WKE_GIRL_HAIR_SWATCHES,
  WKE_GIRL_OUTFITS,
  WKE_GIRL_OUTFIT_SWATCHES,
  WKE_GIRL_SKIN_SWATCHES,
  type WkeGirlCustomizationCategory,
} from "@/lib/character/wke-girl-assets";
import { CharacterCategoryTabs } from "./CharacterCategoryTabs";
import { CharacterOptionGrid } from "./CharacterOptionGrid";
import { ColorSwatches } from "./ColorSwatches";

type Props = {
  config: CharacterConfig;
  category: WkeGirlCustomizationCategory;
  saved: boolean;
  showTabs?: boolean;
  onCategoryChange: (category: WkeGirlCustomizationCategory) => void;
  onConfigChange: (next: CharacterConfig) => void;
  onSave: () => void;
  onReset: () => void;
  onRandomize: () => void;
};

export function CharacterControls({
  config,
  category,
  saved,
  showTabs = true,
  onCategoryChange,
  onConfigChange,
  onSave,
  onReset,
  onRandomize,
}: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {showTabs ? <CharacterCategoryTabs value={category} onChange={onCategoryChange} /> : null}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        <div className="rounded-xl border-2 border-[var(--pl-border)] bg-white p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--pl-purple)]">
            Base avatar
          </p>
          <p className="mt-1 font-extrabold text-[var(--pl-ink)]">{WKE_GIRL_BASE.name}</p>
          <p className="mt-1 text-xs text-[var(--pl-muted)]">
            This is the only active character base while we finish modular hair and outfits.
          </p>
        </div>

        {category === "hair" ? (
          <>
            <CharacterOptionGrid
              options={WKE_GIRL_HAIR}
              selectedId={config.hair}
              onSelect={(hair) => onConfigChange({ ...config, hair })}
            />
            <ColorSwatches
              label="Hair color"
              swatches={WKE_GIRL_HAIR_SWATCHES}
              value={config.hairColor}
              onChange={(hairColor) => onConfigChange({ ...config, hairColor })}
            />
          </>
        ) : null}

        {category === "outfit" ? (
          <>
            <CharacterOptionGrid
              options={WKE_GIRL_OUTFITS}
              selectedId={config.outfit}
              onSelect={(outfit) => onConfigChange({ ...config, outfit })}
            />
            <ColorSwatches
              label="Outfit color"
              swatches={WKE_GIRL_OUTFIT_SWATCHES}
              value={config.outfitColor}
              onChange={(outfitColor) => onConfigChange({ ...config, outfitColor })}
            />
          </>
        ) : null}

        {category === "skin" ? (
          <ColorSwatches
            label="Skin tone"
            swatches={WKE_GIRL_SKIN_SWATCHES}
            value={config.skinColor}
            onChange={(skinColor) => onConfigChange({ ...config, skinColor })}
          />
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <KidButton onClick={onSave} className="min-w-0 flex-1 px-4 text-base">
          {saved ? "Saved!" : "Save character"}
        </KidButton>
        <KidButton variant="secondary" onClick={onReset} className="min-w-0 flex-1 px-4 text-base">
          Reset
        </KidButton>
        <KidButton variant="accent" onClick={onRandomize} className="min-w-0 flex-1 px-4 text-base">
          Surprise colors
        </KidButton>
      </div>
    </div>
  );
}
