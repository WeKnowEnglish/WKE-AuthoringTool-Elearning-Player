"use client";

import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";
import { storyAnimationPresetSchema } from "@/lib/lesson-schemas";
import { migrateStoryItemKind } from "@/lib/story-item-kind-migrate";
import {
  resolveStoryItemImageUrl,
  type StoryCastEntry,
  type StoryItem,
  type StoryPage,
} from "@/lib/lesson-schemas";

const ANIM_PRESETS = storyAnimationPresetSchema.options;
const STORY_STAGE_ASPECT_RATIO = 16 / 10;

function labelClass() {
  return "mt-2 block text-sm font-medium text-neutral-800";
}

function fitItemBoundsToImageAspect(
  item: StoryItem,
  imageWidth: number,
  imageHeight: number,
): StoryItem {
  if (imageWidth <= 0 || imageHeight <= 0) return item;
  const stageAdjustedAspect = imageWidth / imageHeight / STORY_STAGE_ASPECT_RATIO;
  if (!Number.isFinite(stageAdjustedAspect) || stageAdjustedAspect <= 0) return item;

  const area = Math.max(4, item.w_percent * item.h_percent);
  let nextW = Math.sqrt(area * stageAdjustedAspect);
  let nextH = Math.sqrt(area / stageAdjustedAspect);

  const maxW = Math.max(2, 100 - item.x_percent);
  const maxH = Math.max(2, 100 - item.y_percent);
  const scale = Math.min(1, maxW / nextW, maxH / nextH);
  nextW = Math.max(2, Math.min(maxW, nextW * scale));
  nextH = Math.max(2, Math.min(maxH, nextH * scale));

  return { ...item, w_percent: nextW, h_percent: nextH };
}

function safeHex(value: string | undefined, fallback: string): string {
  const v = value?.trim() || fallback;
  return v.startsWith("#") ? v : fallback;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  return {
    r: Number.parseInt(raw.slice(0, 2), 16),
    g: Number.parseInt(raw.slice(2, 4), 16),
    b: Number.parseInt(raw.slice(4, 6), 16),
  };
}

function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

function contrastRatio(aHex: string, bHex: string): number | null {
  const a = hexToRgb(aHex);
  const b = hexToRgb(bHex);
  if (!a || !b) return null;
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

function newLocalEntityId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`;
}

type P = {
  selectedItem: StoryItem;
  selectedPage: StoryPage;
  /** Current pages; patch via callback */
  pages: StoryPage[];
  pushEmit: (next: StoryPage[], overrides?: { cast?: StoryCastEntry[] }) => void;
  cast: StoryCastEntry[];
  busy: boolean;
};

export function StoryItemEditorPanel({
  selectedItem,
  selectedPage,
  pages,
  pushEmit,
  cast,
  busy,
}: P) {
  const patchSelectedItem = (patcher: (it: StoryItem) => StoryItem) => {
    const next = pages.map((p) =>
      p.id === selectedPage.id ?
        {
          ...p,
          items: p.items.map((it) => (it.id === selectedItem.id ? patcher(it) : it)),
        }
      : p,
    );
    pushEmit(next);
  };

  const k = selectedItem.kind ?? "image";
  const regId = selectedItem.registry_id?.trim();
  const linkedCast = regId ? cast.find((c) => c.id === regId) : undefined;
  const resolvedImageUrl =
    resolveStoryItemImageUrl(selectedItem, cast) ?? selectedItem.image_url?.trim() ?? "";
  const buttonContrast =
    k === "button" ?
      contrastRatio(
        safeHex(selectedItem.text_color, "#ffffff"),
        safeHex(selectedItem.color_hex, "#0ea5e9"),
      )
    : null;
  const cardSupported = k !== "line" && k !== "variable";

  return (
    <div className="grid max-w-full gap-2 rounded border border-neutral-200 bg-neutral-50 p-3 sm:grid-cols-1">
      <p className="text-sm font-semibold text-neutral-900">
        Object: {selectedItem.id}
      </p>
      <p className="text-xs text-neutral-600">
        Tap triggers: use the <strong>menu on the canvas</strong> over this picture to add or
        edit click actions and move paths. Speech library is in <strong>Animations</strong>. Below:
        placement and look.
      </p>
      <label className={`${labelClass()} w-full`}>
        Display name (for you &amp; accessibility)
        <input
          type="text"
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          placeholder="e.g. ball"
          value={selectedItem.name ?? ""}
          disabled={busy}
          onChange={(e) => {
            const rawName = e.target.value;
            const name = rawName.length > 0 ? rawName : undefined;
            patchSelectedItem((it) => ({ ...it, name }));
          }}
        />
      </label>
      <label className={labelClass()}>
        Item type
        <select
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={k}
          disabled={busy}
          onChange={(e) => {
            const kind = e.target.value as NonNullable<StoryItem["kind"]>;
            patchSelectedItem((it) => migrateStoryItemKind(it, kind));
          }}
        >
          <option value="image">Image</option>
          <option value="text">Text</option>
          <option value="shape">Shape</option>
          <option value="line">Line</option>
          <option value="button">Button</option>
          <option value="variable">Variable host</option>
        </select>
      </label>
      {k !== "variable" ? (
        <label className={labelClass()}>
          Item role
          <select
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            value={selectedItem.item_role ?? ""}
            disabled={busy}
            onChange={(e) => {
              const v = e.target.value.trim();
              const item_role =
                v === "" ? undefined : (v as NonNullable<StoryItem["item_role"]>);
              patchSelectedItem((it) => ({ ...it, item_role }));
            }}
          >
            <option value="">Default</option>
            <option value="decor">Decor</option>
            <option value="interactive">Interactive</option>
            <option value="informational">Informational</option>
            <option value="narration">Narration</option>
          </select>
        </label>
      ) : null}
      {k === "variable" ? (
        <div className="space-y-2 rounded border border-violet-200 bg-violet-50/70 p-2">
          <p className="text-xs font-semibold text-violet-950">Variable outcomes</p>
          <p className="text-[11px] text-violet-900/90">
            Enter outcome item IDs (one per line). At runtime, selecting one outcome hides its
            siblings for this variable host.
          </p>
          <label className="block text-xs font-medium text-violet-950">
            Outcome item IDs
            <textarea
              className="mt-1 w-full rounded border border-violet-200 bg-white px-2 py-1 text-xs"
              rows={4}
              value={(selectedItem.variable_config?.outcome_item_ids ?? []).join("\n")}
              disabled={busy}
              onChange={(e) => {
                const outcome_item_ids = e.target.value
                  .split(/[\n,]+/)
                  .map((s) => s.trim())
                  .filter((s) => s.length > 0);
                patchSelectedItem((it) => ({
                  ...it,
                  variable_config: {
                    outcome_item_ids,
                    initial_outcome_item_id: it.variable_config?.initial_outcome_item_id,
                    lock_choice: it.variable_config?.lock_choice ?? true,
                  },
                }));
              }}
            />
          </label>
          <label className="block text-xs font-medium text-violet-950">
            Initial outcome (optional)
            <select
              className="mt-1 w-full rounded border border-violet-200 bg-white px-2 py-1 text-sm"
              value={selectedItem.variable_config?.initial_outcome_item_id ?? ""}
              disabled={busy}
              onChange={(e) => {
                const next = e.target.value.trim() || undefined;
                patchSelectedItem((it) => ({
                  ...it,
                  variable_config: {
                    outcome_item_ids: it.variable_config?.outcome_item_ids ?? [],
                    initial_outcome_item_id: next,
                    lock_choice: it.variable_config?.lock_choice ?? true,
                  },
                }));
              }}
            >
              <option value="">No pre-selection</option>
              {(selectedItem.variable_config?.outcome_item_ids ?? []).map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-violet-950">
            <input
              type="checkbox"
              checked={selectedItem.variable_config?.lock_choice ?? true}
              disabled={busy}
              onChange={(e) => {
                const lock_choice = e.target.checked;
                patchSelectedItem((it) => ({
                  ...it,
                  variable_config: {
                    outcome_item_ids: it.variable_config?.outcome_item_ids ?? [],
                    initial_outcome_item_id: it.variable_config?.initial_outcome_item_id,
                    lock_choice,
                  },
                }));
              }}
            />
            Lock choice after first selection
          </label>
        </div>
      ) : null}

      {k === "image" && regId ? (
        <div className="rounded border border-emerald-200 bg-emerald-50/60 p-2 text-xs text-emerald-950">
          <p className="font-semibold">Cast link</p>
          <p className="mt-1 text-[11px] text-emerald-900/90">
            Linked to <span className="font-mono">{regId}</span>
            {linkedCast?.name ? ` (${linkedCast.name})` : ""}. Default art comes from the cast entry
            unless you set an override below.
          </p>
          <label className={`${labelClass()} mt-2`}>
            Use cast entry
            <select
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              value={regId}
              disabled={busy}
              onChange={(e) => {
                const nextReg = e.target.value.trim() || undefined;
                patchSelectedItem((it) => ({ ...it, registry_id: nextReg }));
              }}
            >
              {regId && !cast.some((c) => c.id === regId) ? (
                <option value={regId}>Missing entry: {regId}</option>
              ) : null}
              {cast.map((c) => (
                <option key={c.id} value={c.id}>
                  {(c.name?.trim() || c.id) + ` · ${c.role}`}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-2 flex flex-wrap gap-1">
            <button
              type="button"
              disabled={busy}
              className="rounded border border-emerald-500 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100"
              onClick={() => {
                patchSelectedItem((it) => {
                  const u =
                    it.image_url?.trim() ||
                    resolveStoryItemImageUrl(it, cast) ||
                    "https://placehold.co/120x80/f1f5f9/334155?text=Item";
                  return { ...it, registry_id: undefined, image_url: u };
                });
              }}
            >
              Unlink (keep art on this object)
            </button>
          </div>
        </div>
      ) : null}

      {k === "image" && !regId && cast.length > 0 ? (
        <div className="rounded border border-emerald-200 bg-white/80 p-2 text-xs">
          <p className="font-semibold text-emerald-900">Link to cast</p>
          <label className={`${labelClass()} mt-1`}>
            Choose entry
            <select
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              value=""
              disabled={busy}
              onChange={(e) => {
                const v = e.target.value.trim();
                if (!v) return;
                patchSelectedItem((it) => ({ ...it, registry_id: v, image_url: undefined }));
              }}
            >
              <option value="">Select…</option>
              {cast.map((c) => (
                <option key={c.id} value={c.id}>
                  {(c.name?.trim() || c.id) + ` · ${c.role}`}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {k === "image" && !regId ? (
        <button
          type="button"
          disabled={
            busy ||
            !(selectedItem.image_url?.trim() || resolveStoryItemImageUrl(selectedItem, cast))
          }
          className="w-full rounded border border-emerald-400 bg-emerald-50 px-2 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => {
            const url =
              selectedItem.image_url?.trim() ||
              resolveStoryItemImageUrl(selectedItem, cast) ||
              "";
            if (!url) return;
            const cid = newLocalEntityId("cast");
            const row: StoryCastEntry = {
              id: cid,
              role: "character",
              name: selectedItem.name?.trim() || undefined,
              image_url: url,
            };
            const next = pages.map((p) =>
              p.id === selectedPage.id ?
                {
                  ...p,
                  items: p.items.map((it) =>
                    it.id === selectedItem.id ?
                      { ...it, registry_id: cid, image_url: undefined }
                    : it,
                  ),
                }
              : p,
            );
            pushEmit(next, { cast: [...cast, row] });
          }}
        >
          Promote art to new cast entry &amp; link
        </button>
      ) : null}

      {k === "image" ? (
        <>
          <MediaUrlControls
            label={regId ? "Override image URL (optional)" : "Item image URL"}
            value={selectedItem.image_url ?? ""}
            onChange={async (v) => {
              const next = pages.map((p) =>
                p.id === selectedPage.id ?
                  {
                    ...p,
                    items: p.items.map((it) =>
                      it.id === selectedItem.id ? { ...it, image_url: v } : it,
                    ),
                  }
                : p,
              );
              pushEmit(next);
              const img = new window.Image();
              img.onload = () => {
                const sw = img.naturalWidth || 0;
                const sh = img.naturalHeight || 0;
                if (sw <= 0 || sh <= 0) return;
                const resized = next.map((p) =>
                  p.id === selectedPage.id ?
                    {
                      ...p,
                      items: p.items.map((it) =>
                        it.id === selectedItem.id ?
                          fitItemBoundsToImageAspect({ ...it, image_url: v }, sw, sh)
                        : it,
                      ),
                    }
                  : p,
                );
                pushEmit(resized);
              };
              img.src = v;
            }}
            disabled={busy}
            compact
          />
          {regId && !selectedItem.image_url?.trim() && resolvedImageUrl ? (
            <p className="mt-1 text-[10px] text-neutral-600">
              No override: students see the cast default ({resolvedImageUrl.slice(0, 56)}
              {resolvedImageUrl.length > 56 ? "…" : ""}).
            </p>
          ) : null}
        </>
      ) : null}

      {k === "text" || k === "button" ? (
        <label className={labelClass()}>
          Label text
          <textarea
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            rows={2}
            value={selectedItem.text ?? ""}
            disabled={busy}
            onChange={(e) => {
              const text = e.target.value || undefined;
              patchSelectedItem((it) => ({ ...it, text }));
            }}
          />
        </label>
      ) : null}

      {k === "shape" || k === "line" || k === "button" ? (
        <label className={labelClass()}>
          Fill / stroke color
          <input
            type="color"
            className="mt-1 h-9 w-full cursor-pointer rounded border bg-white px-1 py-1"
            value={safeHex(selectedItem.color_hex, "#3b82f6")}
            disabled={busy}
            onChange={(e) => {
              const color_hex = e.target.value;
              patchSelectedItem((it) => ({ ...it, color_hex }));
            }}
          />
        </label>
      ) : null}

      {k === "line" ? (
        <label className={labelClass()}>
          Line width (px)
          <input
            type="number"
            min={1}
            max={24}
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            value={selectedItem.line_width_px ?? 3}
            disabled={busy}
            onChange={(e) => {
              const line_width_px = Math.min(24, Math.max(1, Number(e.target.value) || 3));
              patchSelectedItem((it) => ({ ...it, line_width_px }));
            }}
          />
        </label>
      ) : null}

      {k === "text" || k === "button" ? (
        <div className="grid gap-2 rounded border border-neutral-200 bg-white/80 p-2 sm:grid-cols-2">
          <label className="text-xs font-medium text-neutral-800">
            Text color
            <input
              type="color"
              className="mt-1 h-9 w-full rounded border px-1 py-1"
              value={safeHex(selectedItem.text_color, k === "button" ? "#ffffff" : "#0f172a")}
              disabled={busy}
              onChange={(e) => {
                const text_color = e.target.value;
                patchSelectedItem((it) => ({ ...it, text_color }));
              }}
            />
          </label>
          <label className="text-xs font-medium text-neutral-800">
            Text size (px)
            <input
              type="number"
              min={10}
              max={128}
              step={1}
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              value={selectedItem.text_size_px ?? (k === "button" ? 18 : 24)}
              disabled={busy}
              onChange={(e) => {
                const fallback = k === "button" ? 18 : 24;
                const text_size_px = Math.min(
                  128,
                  Math.max(10, Number(e.target.value) || fallback),
                );
                patchSelectedItem((it) => ({ ...it, text_size_px }));
              }}
            />
          </label>
        </div>
      ) : null}
      {k === "button" && buttonContrast != null ? (
        <p
          className={`text-[11px] ${buttonContrast < 4.5 ? "text-amber-700" : "text-emerald-700"}`}
        >
          Button text contrast: <strong>{buttonContrast.toFixed(2)}:1</strong>
          {buttonContrast < 4.5 ?
            " (consider darker text or lighter button color for readability)."
          : " (good for most learners)."}
        </p>
      ) : null}

      <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-800">
        <input
          type="checkbox"
          className="mb-0.5"
          checked={cardSupported ? selectedItem.show_card !== false : false}
          disabled={busy || !cardSupported}
          onChange={(e) => {
            if (!cardSupported) return;
            const show_card = e.target.checked;
            patchSelectedItem((it) => ({ ...it, show_card }));
          }}
        />
        Card frame (border + shadow)
      </label>
      {!cardSupported ? (
        <p className="text-[11px] text-neutral-600">
          Card frame is fixed off for {k === "line" ? "line" : "variable host"} items.
        </p>
      ) : null}

      {k === "image" ? (
        <div className="rounded border border-neutral-200 bg-white/70 p-2">
          <p className="text-xs font-semibold text-neutral-800">Item image scale</p>
          <p className="mb-1 text-[10px] text-neutral-500">
            Simple stable scaling only. Use pre-cropped images for exact framing.
          </p>
          <label className="text-xs font-medium text-neutral-800">
            Scale
            <input
              type="number"
              min={0.25}
              max={8}
              step={0.05}
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              value={selectedItem.image_scale ?? 1}
              disabled={busy}
              onChange={(e) => {
                const image_scale = Math.min(8, Math.max(0.25, Number(e.target.value) || 1));
                patchSelectedItem((it) => ({ ...it, image_scale }));
              }}
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-1">
            <button
              type="button"
              disabled={busy}
              aria-pressed={selectedItem.image_flip_horizontal === true}
              title="Mirror image left ↔ right"
              className={`rounded border px-2 py-1 text-[11px] font-semibold transition-colors ${
                selectedItem.image_flip_horizontal ?
                  "border-sky-600 bg-sky-100 text-sky-950"
                : "border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
              }`}
              onClick={() =>
                patchSelectedItem((it) => {
                  const next = !(it.image_flip_horizontal ?? false);
                  return { ...it, image_flip_horizontal: next ? true : undefined };
                })
              }
            >
              Mirror ↔
            </button>
            <button
              type="button"
              disabled={busy}
              aria-pressed={selectedItem.image_flip_vertical === true}
              title="Mirror image top ↔ bottom"
              className={`rounded border px-2 py-1 text-[11px] font-semibold transition-colors ${
                selectedItem.image_flip_vertical ?
                  "border-sky-600 bg-sky-100 text-sky-950"
                : "border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
              }`}
              onClick={() =>
                patchSelectedItem((it) => {
                  const next = !(it.image_flip_vertical ?? false);
                  return { ...it, image_flip_vertical: next ? true : undefined };
                })
              }
            >
              Mirror ↕
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <label className={labelClass()}>
          z-index
          <input
            type="number"
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            value={selectedItem.z_index ?? 0}
            disabled={busy}
            onChange={(e) => {
              const z = Number(e.target.value) || 0;
              patchSelectedItem((it) => ({ ...it, z_index: z }));
            }}
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={selectedItem.show_on_start ?? true}
          disabled={busy}
          onChange={(e) => {
            const show_on_start = e.target.checked;
            patchSelectedItem((it) => ({ ...it, show_on_start }));
          }}
        />
        Show on page start
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className={labelClass()}>
          Enter animation
          <select
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            value={selectedItem.enter?.preset ?? "fade_in"}
            disabled={busy}
            onChange={(e) => {
              const preset = e.target.value as (typeof ANIM_PRESETS)[number];
              patchSelectedItem((it) => ({
                ...it,
                enter: {
                  preset,
                  duration_ms: it.enter?.duration_ms ?? 500,
                },
              }));
            }}
          >
            {ANIM_PRESETS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass()}>
          Emphasis (palette)
          <select
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            value={selectedItem.emphasis?.preset ?? "grow"}
            disabled={busy}
            onChange={(e) => {
              const preset = e.target.value as (typeof ANIM_PRESETS)[number];
              patchSelectedItem((it) => ({
                ...it,
                emphasis: {
                  preset,
                  duration_ms: it.emphasis?.duration_ms ?? 500,
                },
              }));
            }}
          >
            {ANIM_PRESETS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
