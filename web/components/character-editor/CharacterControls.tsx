"use client";

import { KidButton } from "@/components/kid-ui/KidButton";
import {
  CLOTHING_SWATCHES,
  HAIR_SWATCHES,
  SKIN_SWATCHES,
  partsForCategory,
} from "@/lib/character/character-assets";
import type { CharacterCategory, CharacterConfig } from "@/lib/character/character-types";
import { CharacterCategoryTabs } from "./CharacterCategoryTabs";
import { CharacterOptionGrid } from "./CharacterOptionGrid";
import { ColorSwatches } from "./ColorSwatches";

type Props = {
  config: CharacterConfig;
  category: CharacterCategory;
  saved: boolean;
  showTabs?: boolean;
  onCategoryChange: (category: CharacterCategory) => void;
  onConfigChange: (next: CharacterConfig) => void;
  onSave: () => void;
  onReset: () => void;
  onRandomize: () => void;
};

function selectedId(config: CharacterConfig, category: CharacterCategory): string | null {
  if (category === "accessory") return config.accessory;
  return config[category];
}

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
  const options = partsForCategory(category);
  const showSkin = category === "body" || category === "face";
  const showHair = category === "hair";
  const showTop = category === "top" || category === "accessory";
  const showBottom = category === "bottom";
  const showShoes = category === "shoes";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {showTabs ? <CharacterCategoryTabs value={category} onChange={onCategoryChange} /> : null}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        <CharacterOptionGrid
          category={category}
          options={options}
          selectedId={selectedId(config, category)}
          onSelect={(id) => {
            if (category === "accessory") {
              onConfigChange({ ...config, accessory: id });
              return;
            }
            onConfigChange({ ...config, [category]: id ?? config[category] });
          }}
        />
        <div className="flex flex-col gap-4">
          {showSkin ? (
            <ColorSwatches
              label="Skin"
              swatches={SKIN_SWATCHES}
              value={config.skinColor}
              onChange={(skinColor) => onConfigChange({ ...config, skinColor })}
            />
          ) : null}
          {showHair ? (
            <ColorSwatches
              label="Hair color"
              swatches={HAIR_SWATCHES}
              value={config.hairColor}
              onChange={(hairColor) => onConfigChange({ ...config, hairColor })}
            />
          ) : null}
          {showTop ? (
            <ColorSwatches
              label={category === "accessory" ? "Extra color" : "Top color"}
              swatches={CLOTHING_SWATCHES}
              value={config.topColor}
              onChange={(topColor) => onConfigChange({ ...config, topColor })}
            />
          ) : null}
          {showBottom ? (
            <ColorSwatches
              label="Bottom color"
              swatches={CLOTHING_SWATCHES}
              value={config.bottomColor ?? config.topColor}
              onChange={(bottomColor) => onConfigChange({ ...config, bottomColor })}
            />
          ) : null}
          {showShoes ? (
            <ColorSwatches
              label="Shoe color"
              swatches={CLOTHING_SWATCHES}
              value={config.shoeColor ?? config.topColor}
              onChange={(shoeColor) => onConfigChange({ ...config, shoeColor })}
            />
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <KidButton onClick={onSave} className="min-w-0 flex-1 px-4 text-base">
          {saved ? "Saved!" : "Save character"}
        </KidButton>
        <KidButton variant="secondary" onClick={onReset} className="min-w-0 flex-1 px-4 text-base">
          Reset
        </KidButton>
        <KidButton variant="accent" onClick={onRandomize} className="min-w-0 flex-1 px-4 text-base">
          Randomize
        </KidButton>
      </div>
    </div>
  );
}
