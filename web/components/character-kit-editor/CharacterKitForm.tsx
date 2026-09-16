"use client";

import type { ReactNode } from "react";
import { ColorSwatches } from "@/components/character-editor/ColorSwatches";
import { HAIR_SWATCHES, SKIN_SWATCHES, partsForCategory } from "@/lib/character/character-assets";
import { HERO_ASSETS } from "@/lib/character/kit/hero-assets";
import { cloneHair } from "@/lib/character/kit/hair-shell";
import { createHairTuft } from "@/lib/character/kit/kit-normalize";
import { HAIR_KIT_PRESETS } from "@/lib/character/kit/kit-presets";
import { HEAD_PLATE_LABEL } from "@/lib/character/kit/head-plates";
import { HEAD_PLATE_VIEWS, type CharacterKitDocument, type HeadPlateView, type KitHairTuft, type KitMouthExpression } from "@/lib/character/kit/kit-types";
import {
  HIGHLIGHT_HEX,
  NO_REGION_HIGHLIGHTS,
  type HighlightRegion,
  type RegionHighlightFlags,
} from "@/lib/character/kit/highlight-regions";

type Props = {
  kit: CharacterKitDocument;
  onChange: (next: CharacterKitDocument) => void;
  showHair?: boolean;
  onShowHairChange?: (showHair: boolean) => void;
  showPolygons?: boolean;
  onShowPolygonsChange?: (showPolygons: boolean) => void;
  highlights?: RegionHighlightFlags;
  onHighlightsChange?: (highlights: RegionHighlightFlags) => void;
  plateView?: HeadPlateView;
  onPlateViewChange?: (view: HeadPlateView) => void;
  showGhost?: boolean;
  onShowGhostChange?: (showGhost: boolean) => void;
  ghostWireframe?: boolean;
  onGhostWireframeChange?: (wireframe: boolean) => void;
};

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-sm">
      <span className="font-semibold text-[var(--pl-ink)]">{label}</span>
      <span className="tabular-nums text-xs text-[var(--pl-muted)]">{value.toFixed(2)}</span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="col-span-2 w-full"
      />
    </label>
  );
}

function Fieldset({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-xl border-2 border-[var(--pl-border)] bg-white p-3">
      <legend className="px-1 text-sm font-extrabold">{title}</legend>
      {children}
    </fieldset>
  );
}

export function CharacterKitForm({
  kit,
  onChange,
  showHair,
  onShowHairChange,
  showPolygons,
  onShowPolygonsChange,
  highlights,
  onHighlightsChange,
  plateView,
  onPlateViewChange,
  showGhost,
  onShowGhostChange,
  ghostWireframe,
  onGhostWireframeChange,
}: Props) {
  const hairs = partsForCategory("hair");

  const patch = (partial: Partial<CharacterKitDocument>) => onChange({ ...kit, ...partial });

  const updateTuft = (index: number, next: KitHairTuft) => {
    const tufts = kit.hair.tufts.map((tuft, tuftIndex) => (tuftIndex === index ? next : tuft));
    onChange({ ...kit, hair: { ...kit.hair, tufts } });
  };

  return (
    <div className="space-y-3">
      <Fieldset title="Kit">
        <label className="block text-sm font-semibold">
          Name
          <input
            className="mt-1 w-full rounded-lg border-2 border-[var(--pl-border)] px-2 py-1 font-medium"
            value={kit.name}
            onChange={(event) => patch({ name: event.target.value })}
          />
        </label>
        <label className="block text-sm font-semibold">
          Id
          <input
            className="mt-1 w-full rounded-lg border-2 border-[var(--pl-border)] px-2 py-1 font-medium"
            value={kit.id}
            onChange={(event) => patch({ id: event.target.value })}
          />
        </label>
        <label className="block text-sm font-semibold">
          Hero
          <select
            className="mt-1 w-full rounded-lg border-2 border-[var(--pl-border)] px-2 py-1"
            value={kit.hero}
            onChange={(event) => patch({ hero: event.target.value })}
          >
            {HERO_ASSETS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-[var(--pl-muted)]">
          Cursor matches the dense skull to the seed GLB (blue ghost) and an optional photo plate, then writes{" "}
          <code>profile</code> rings and <code>sculpts</code> in JSON. Run{" "}
          <code>npm run character:build-hero</code> to emit{" "}
          <code>public/characters/heroes/hero_kid_v1.glb</code>.
        </p>
        <ColorSwatches
          label="Skin"
          swatches={SKIN_SWATCHES}
          value={kit.skinColor}
          onChange={(skinColor) => patch({ skinColor })}
        />
        <ColorSwatches
          label="Hair color"
          swatches={HAIR_SWATCHES}
          value={kit.hairColor}
          onChange={(hairColor) => patch({ hairColor })}
        />
        {onShowPolygonsChange ? (
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={showPolygons ?? false}
              onChange={(event) => onShowPolygonsChange(event.target.checked)}
            />
            Polygon mask
          </label>
        ) : null}
        <p className="text-xs text-[var(--pl-muted)]">
          Polygon mask hides the paint and draws every triangle on this mesh.
        </p>
        {onShowHairChange ? (
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={showHair ?? true}
              onChange={(event) => onShowHairChange(event.target.checked)}
            />
            Show hair
          </label>
        ) : null}
      </Fieldset>

      {onHighlightsChange ? (
        <Fieldset title="Highlights">
          <p className="text-xs text-[var(--pl-muted)]">
            Color the polygons that look like face skin, face parts, or hair.
          </p>
          {(
            [
              ["face", "Face"],
              ["parts", "Face parts"],
              ["hair", "Hair"],
            ] as Array<[HighlightRegion, string]>
          ).map(([region, label]) => (
            <label key={region} className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={(highlights ?? NO_REGION_HIGHLIGHTS)[region]}
                onChange={(event) =>
                  onHighlightsChange({ ...(highlights ?? NO_REGION_HIGHLIGHTS), [region]: event.target.checked })
                }
              />
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: HIGHLIGHT_HEX[region] }} />
              {label}
            </label>
          ))}
        </Fieldset>
      ) : null}

      {onPlateViewChange ? (
        <Fieldset title="Shape match">
          <p className="text-xs text-[var(--pl-muted)]">
            Front / side / 3/4 lock the camera. The blue ghost is the seed GLB scaled so its skull (hair dropped)
            matches the cage — hair on the ghost is extra, not the target. Put a reference PNG in{" "}
            <code>/characters/reference/</code> and paste its URL to sit the models on that image.
          </p>
          <div className="flex flex-wrap gap-2">
            {HEAD_PLATE_VIEWS.map((view) => (
              <button
                key={view}
                type="button"
                className={`rounded-lg border-2 px-3 py-1 text-sm font-bold ${
                  plateView === view
                    ? "border-[var(--pl-ink)] bg-[var(--pl-yellow)]"
                    : "border-[var(--pl-border)] bg-white"
                }`}
                onClick={() => onPlateViewChange(view)}
              >
                {HEAD_PLATE_LABEL[view]}
              </button>
            ))}
          </div>
          {onShowGhostChange ? (
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={showGhost ?? true}
                onChange={(event) => onShowGhostChange(event.target.checked)}
              />
              Ghost seed GLB
            </label>
          ) : null}
          {onGhostWireframeChange ? (
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={ghostWireframe ?? false}
                onChange={(event) => onGhostWireframeChange(event.target.checked)}
              />
              Ghost wireframe
            </label>
          ) : null}
          <label className="block text-sm font-semibold">
            Reference image URL
            <input
              className="mt-1 w-full rounded-lg border-2 border-[var(--pl-border)] px-2 py-1 font-medium"
              placeholder="/characters/reference/kid-front.png"
              value={kit.plateSrc ?? ""}
              onChange={(event) => patch({ plateSrc: event.target.value.trim() || undefined })}
            />
          </label>
          <p className="text-xs text-[var(--pl-muted)]">
            Precise local form goes in <code>sculpts</code>: origin, radius, and a delta. Mirror is on by default.
          </p>
        </Fieldset>
      ) : null}

      <Fieldset title="Ears">
        <Slider
          label="Ears"
          value={kit.ears.size}
          min={0.5}
          max={1.8}
          step={0.05}
          onChange={(size) => patch({ ears: { size } })}
        />
      </Fieldset>

      <Fieldset title="Eyes">
        <Slider
          label="Spacing"
          value={kit.eyes.spacing}
          min={0.2}
          max={0.7}
          step={0.01}
          onChange={(spacing) => patch({ eyes: { ...kit.eyes, spacing } })}
        />
        <Slider
          label="Size"
          value={kit.eyes.size}
          min={0.6}
          max={1.6}
          step={0.02}
          onChange={(size) => patch({ eyes: { ...kit.eyes, size } })}
        />
        <Slider
          label="Height"
          value={kit.eyes.height}
          min={-0.2}
          max={0.25}
          step={0.01}
          onChange={(height) => patch({ eyes: { ...kit.eyes, height } })}
        />
        <Slider
          label="Forward"
          value={kit.eyes.forward}
          min={0.4}
          max={0.9}
          step={0.01}
          onChange={(forward) => patch({ eyes: { ...kit.eyes, forward } })}
        />
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={kit.eyes.open}
            onChange={(event) => patch({ eyes: { ...kit.eyes, open: event.target.checked } })}
          />
          Wide eyes
        </label>
      </Fieldset>

      <Fieldset title="Nose and mouth">
        <Slider
          label="Nose size"
          value={kit.nose.size}
          min={0.4}
          max={2}
          step={0.05}
          onChange={(size) => patch({ nose: { ...kit.nose, size } })}
        />
        <Slider
          label="Nose height"
          value={kit.nose.height}
          min={-0.3}
          max={0.1}
          step={0.01}
          onChange={(height) => patch({ nose: { ...kit.nose, height } })}
        />
        <Slider
          label="Mouth width"
          value={kit.mouth.width}
          min={0.6}
          max={1.8}
          step={0.02}
          onChange={(width) => patch({ mouth: { ...kit.mouth, width } })}
        />
        <Slider
          label="Mouth height"
          value={kit.mouth.height}
          min={-0.45}
          max={-0.1}
          step={0.01}
          onChange={(height) => patch({ mouth: { ...kit.mouth, height } })}
        />
        <label className="block text-sm font-semibold">
          Expression
          <select
            className="mt-1 w-full rounded-lg border-2 border-[var(--pl-border)] px-2 py-1"
            value={kit.mouth.expression}
            onChange={(event) =>
              patch({ mouth: { ...kit.mouth, expression: event.target.value as KitMouthExpression } })
            }
          >
            <option value="smile">Smile</option>
            <option value="cheer">Cheer</option>
            <option value="wow">Wow</option>
          </select>
        </label>
      </Fieldset>

      <Fieldset title="Hair">
        <label className="block text-sm font-semibold">
          Load hair preset
          <select
            className="mt-1 w-full rounded-lg border-2 border-[var(--pl-border)] px-2 py-1"
            value=""
            onChange={(event) => {
              const next = HAIR_KIT_PRESETS[event.target.value];
              if (next) onChange({ ...kit, hair: cloneHair(next) });
            }}
          >
            <option value="">Choose a student hair…</option>
            {hairs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-[var(--pl-muted)]">
          Hair is a shell from the skull above the hairline. Shell rings stay in the kit JSON.
        </p>
        <Slider
          label="Hairline"
          value={kit.hair.hairlineY}
          min={-0.05}
          max={0.55}
          step={0.01}
          onChange={(hairlineY) => onChange({ ...kit, hair: { ...kit.hair, hairlineY } })}
        />
        <Slider
          label="Overshoot"
          value={kit.hair.overshoot}
          min={0}
          max={0.2}
          step={0.01}
          onChange={(overshoot) => onChange({ ...kit, hair: { ...kit.hair, overshoot } })}
        />
        <Slider
          label="Back bias"
          value={kit.hair.backBias}
          min={-0.35}
          max={0.1}
          step={0.01}
          onChange={(backBias) => onChange({ ...kit, hair: { ...kit.hair, backBias } })}
        />
        <div className="space-y-2">
          {kit.hair.tufts.map((tuft, index) => (
            <div key={tuft.id} className="space-y-2 rounded-lg bg-[var(--pl-bg)] p-2">
              <div className="flex items-center justify-between gap-2">
                <input
                  className="min-w-0 flex-1 rounded border border-[var(--pl-border)] px-2 py-1 text-xs font-semibold"
                  value={tuft.id}
                  onChange={(event) => updateTuft(index, { ...tuft, id: event.target.value })}
                />
                <button
                  type="button"
                  className="text-xs font-bold text-red-700"
                  onClick={() =>
                    onChange({
                      ...kit,
                      hair: { ...kit.hair, tufts: kit.hair.tufts.filter((_, item) => item !== index) },
                    })
                  }
                >
                  Remove
                </button>
              </div>
              <Slider
                label="X"
                value={tuft.position[0]}
                min={-0.8}
                max={0.8}
                step={0.01}
                onChange={(x) => updateTuft(index, { ...tuft, position: [x, tuft.position[1], tuft.position[2]] })}
              />
              <Slider
                label="Y"
                value={tuft.position[1]}
                min={-0.2}
                max={0.95}
                step={0.01}
                onChange={(y) => updateTuft(index, { ...tuft, position: [tuft.position[0], y, tuft.position[2]] })}
              />
              <Slider
                label="Z"
                value={tuft.position[2]}
                min={-0.6}
                max={0.5}
                step={0.01}
                onChange={(z) => updateTuft(index, { ...tuft, position: [tuft.position[0], tuft.position[1], z] })}
              />
              <Slider
                label="Radius"
                value={tuft.radius}
                min={0.03}
                max={0.4}
                step={0.01}
                onChange={(radius) => updateTuft(index, { ...tuft, radius })}
              />
              <Slider
                label="Length"
                value={tuft.length}
                min={0.04}
                max={0.6}
                step={0.01}
                onChange={(length) => updateTuft(index, { ...tuft, length })}
              />
              <Slider
                label="Tilt X"
                value={tuft.tilt[0]}
                min={-1.4}
                max={1.4}
                step={0.02}
                onChange={(x) => updateTuft(index, { ...tuft, tilt: [x, tuft.tilt[1], tuft.tilt[2]] })}
              />
            </div>
          ))}
          <button
            type="button"
            className="w-full rounded-lg border-2 border-dashed border-[var(--pl-border)] py-2 text-sm font-bold"
            onClick={() =>
              onChange({
                ...kit,
                hair: { ...kit.hair, tufts: [...kit.hair.tufts, createHairTuft(kit.hair.tufts.length)] },
              })
            }
          >
            Add tuft
          </button>
        </div>
      </Fieldset>
    </div>
  );
}
