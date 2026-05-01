"use client";

import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";
import { storyAnimationPresetSchema } from "@/lib/lesson-schemas";
import { migrateStoryItemKind } from "@/lib/story-item-kind-migrate";
import type { StoryItem, StoryPage } from "@/lib/lesson-schemas";

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

type P = {
  selectedItem: StoryItem;
  selectedPage: StoryPage;
  /** Current pages; patch via callback */
  pages: StoryPage[];
  pushEmit: (next: StoryPage[]) => void;
  busy: boolean;
};

export function StoryItemEditorPanel({
  selectedItem,
  selectedPage,
  pages,
  pushEmit,
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
        </select>
      </label>

      {k === "image" ? (
        <MediaUrlControls
          label="Item image URL"
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

      <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-800">
        <input
          type="checkbox"
          className="mb-0.5"
          checked={selectedItem.show_card !== false}
          disabled={busy}
          onChange={(e) => {
            const show_card = e.target.checked;
            patchSelectedItem((it) => ({ ...it, show_card }));
          }}
        />
        Card frame (border + shadow)
      </label>

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
