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
