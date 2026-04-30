"use client";

import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";
import { AudioUrlControls } from "@/components/teacher/media/AudioUrlControls";
import { StoryPathDrawer } from "@/components/teacher/lesson-editor/StoryPathDrawer";
import { storyAnimationPresetSchema } from "@/lib/lesson-schemas";
import type { StoryItem, StoryPage, StoryTapSpeechEntry } from "@/lib/lesson-schemas";

const ANIM_PRESETS = storyAnimationPresetSchema.options;
const STORY_STAGE_ASPECT_RATIO = 16 / 10;

function labelClass() {
  return "mt-2 block text-sm font-medium text-neutral-800";
}

function newTapSpeechEntry(): StoryTapSpeechEntry {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto ?
      crypto.randomUUID()
    : `tap-${Math.random().toString(36).slice(2, 10)}`;
  return { id, priority: 100 };
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

type P = {
  selectedItem: StoryItem;
  selectedPage: StoryPage;
  /** Current pages; patch via callback */
  pages: StoryPage[];
  pushEmit: (next: StoryPage[]) => void;
  busy: boolean;
  image_url: string;
};

export function StoryItemEditorPanel({
  selectedItem,
  selectedPage,
  pages,
  pushEmit,
  busy,
  image_url,
}: P) {
  const pagePhases = selectedPage.phases ?? [];
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
  return (
    <div className="grid max-w-full gap-2 rounded border border-neutral-200 bg-neutral-50 p-3 sm:grid-cols-1">
      <p className="text-sm font-semibold text-neutral-900">
        Object: {selectedItem.id}
      </p>
      <p className="text-xs text-neutral-600">
        Tap triggers: use the <strong>menu on the canvas</strong> over this picture to add or
        edit click actions. Below: placement, look, and movement path.
      </p>
      <label className={`${labelClass()} w-full`}>
        Display name (for you &amp; accessibility)
        <input
          type="text"
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          placeholder="e.g. ball"
          value={selectedItem.name ?? ""}
          onChange={(e) => {
            const rawName = e.target.value;
            const name = rawName.length > 0 ? rawName : undefined;
            const next = pages.map((p) =>
              p.id === selectedPage.id ?
                {
                  ...p,
                  items: p.items.map((it) =>
                    it.id === selectedItem.id ? { ...it, name } : it,
                  ),
                }
              : p,
            );
            pushEmit(next);
          }}
        />
      </label>
      <label className={labelClass()}>
        Item type
        <select
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={selectedItem.kind ?? "image"}
          onChange={(e) => {
            const kind = e.target.value as "image" | "text";
            patchSelectedItem((it) => ({
              ...it,
              kind,
              image_url:
                kind === "image" ?
                  (it.image_url || "https://placehold.co/120x80/f1f5f9/334155?text=Item")
                : (it.image_url || "https://placehold.co/2x2/ffffff/ffffff"),
              text: kind === "text" ? (it.text ?? "Text") : it.text,
              show_card: kind === "text" ? false : (it.show_card ?? true),
            }));
          }}
        >
          <option value="image">Image</option>
          <option value="text">Text</option>
        </select>
      </label>
      {(selectedItem.kind ?? "image") === "text" ? (
        <div className="grid gap-2 rounded border border-neutral-200 bg-white/80 p-2 sm:grid-cols-2">
          <label className="sm:col-span-2 text-xs font-medium text-neutral-800">
            Text
            <textarea
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              rows={2}
              value={selectedItem.text ?? ""}
              onChange={(e) => {
                const text = e.target.value || undefined;
                patchSelectedItem((it) => ({ ...it, text }));
              }}
            />
          </label>
          <label className="text-xs font-medium text-neutral-800">
            Text color
            <input
              type="color"
              className="mt-1 h-9 w-full rounded border px-1 py-1"
              value={selectedItem.text_color ?? "#0f172a"}
              onChange={(e) => {
                const text_color = e.target.value || undefined;
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
              value={selectedItem.text_size_px ?? 24}
              onChange={(e) => {
                const text_size_px = Math.min(128, Math.max(10, Number(e.target.value) || 24));
                patchSelectedItem((it) => ({ ...it, text_size_px }));
              }}
            />
          </label>
        </div>
      ) : null}
      <div className="rounded border border-neutral-200 bg-white/80 p-2">
        <p className="text-sm font-semibold text-neutral-900">Tap speech list (phase-aware)</p>
        <p className="mb-2 text-[11px] text-neutral-600">
          Lower priority plays first. If a line reaches its max plays, playback falls to the next
          priority; once the final priority is reached, it repeats.
        </p>
        <div className="space-y-2">
          {(selectedItem.tap_speeches ?? []).map((entry, idx, arr) => (
            <div key={entry.id} className="rounded border border-neutral-200 bg-neutral-50 p-2">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <label className="text-xs font-medium text-neutral-800">
                  Priority
                  <input
                    type="number"
                    className="ml-1 w-20 rounded border px-1 py-0.5 text-xs"
                    value={entry.priority}
                    onChange={(e) => {
                      const priority = Number(e.target.value) || 0;
                      patchSelectedItem((it) => ({
                        ...it,
                        tap_speeches: (it.tap_speeches ?? []).map((x, i) =>
                          i === idx ? { ...x, priority } : x,
                        ),
                      }));
                    }}
                  />
                </label>
                <label className="text-xs font-medium text-neutral-800">
                  Max plays
                  <input
                    type="number"
                    min={1}
                    className="ml-1 w-20 rounded border px-1 py-0.5 text-xs"
                    value={entry.max_plays ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      const max_plays = raw ? Math.max(1, Number(raw) || 1) : undefined;
                      patchSelectedItem((it) => ({
                        ...it,
                        tap_speeches: (it.tap_speeches ?? []).map((x, i) =>
                          i === idx ? { ...x, max_plays } : x,
                        ),
                      }));
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="rounded border border-neutral-300 px-1.5 py-0.5 text-[10px]"
                  disabled={idx === 0}
                  onClick={() => {
                    patchSelectedItem((it) => {
                      const list = [...(it.tap_speeches ?? [])];
                      if (idx <= 0) return it;
                      [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
                      return { ...it, tap_speeches: list };
                    });
                  }}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="rounded border border-neutral-300 px-1.5 py-0.5 text-[10px]"
                  disabled={idx >= arr.length - 1}
                  onClick={() => {
                    patchSelectedItem((it) => {
                      const list = [...(it.tap_speeches ?? [])];
                      if (idx >= list.length - 1) return it;
                      [list[idx], list[idx + 1]] = [list[idx + 1], list[idx]];
                      return { ...it, tap_speeches: list };
                    });
                  }}
                >
                  Down
                </button>
                <button
                  type="button"
                  className="rounded border border-red-300 px-1.5 py-0.5 text-[10px] text-red-700"
                  onClick={() => {
                    patchSelectedItem((it) => {
                      const list = (it.tap_speeches ?? []).filter((x) => x.id !== entry.id);
                      return { ...it, tap_speeches: list.length > 0 ? list : undefined };
                    });
                  }}
                >
                  Remove
                </button>
              </div>
              <label className="block text-xs font-medium text-neutral-800">
                Phase targets (multi-select; leave empty for all/default)
                <select
                  multiple
                  className="mt-1 h-20 w-full rounded border px-1 py-1 text-xs"
                  value={entry.phase_ids ?? []}
                  onChange={(e) => {
                    const phase_ids = Array.from(e.target.selectedOptions).map((o) => o.value);
                    patchSelectedItem((it) => ({
                      ...it,
                      tap_speeches: (it.tap_speeches ?? []).map((x, i) =>
                        i === idx ? { ...x, phase_ids: phase_ids.length > 0 ? phase_ids : undefined } : x,
                      ),
                    }));
                  }}
                >
                  {pagePhases.map((ph) => (
                    <option key={ph.id} value={ph.id}>
                      {ph.name?.trim() || ph.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-2 block text-xs font-medium text-neutral-800">
                Tap text (optional)
                <textarea
                  className="mt-1 w-full rounded border px-2 py-1 text-xs"
                  rows={2}
                  value={entry.text ?? ""}
                  onChange={(e) => {
                    const text = e.target.value.trim() ? e.target.value : undefined;
                    patchSelectedItem((it) => ({
                      ...it,
                      tap_speeches: (it.tap_speeches ?? []).map((x, i) =>
                        i === idx ? { ...x, text } : x,
                      ),
                    }));
                  }}
                />
              </label>
              <AudioUrlControls
                label="Tap audio (optional)"
                value={entry.sound_url ?? ""}
                onChange={(v) => {
                  const sound_url = v.trim() || undefined;
                  patchSelectedItem((it) => ({
                    ...it,
                    tap_speeches: (it.tap_speeches ?? []).map((x, i) =>
                      i === idx ? { ...x, sound_url } : x,
                    ),
                  }));
                }}
                disabled={busy}
                compact
              />
            </div>
          ))}
          <button
            type="button"
            className="rounded border border-sky-300 bg-white px-2 py-1 text-xs font-semibold text-sky-900"
            onClick={() => {
              patchSelectedItem((it) => ({
                ...it,
                tap_speeches: [...(it.tap_speeches ?? []), newTapSpeechEntry()],
              }));
            }}
          >
            + Add tap speech entry
          </button>
        </div>
      </div>
      {(selectedItem.kind ?? "image") === "image" ? (
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
            onChange={(e) => {
              const image_scale = Math.min(8, Math.max(0.25, Number(e.target.value) || 1));
              const next = pages.map((p) =>
                p.id === selectedPage.id ?
                  {
                    ...p,
                    items: p.items.map((it) =>
                      it.id === selectedItem.id ? { ...it, image_scale } : it,
                    ),
                  }
                : p,
              );
              pushEmit(next);
            }}
          />
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className={labelClass()}>
          z-index
          <input
            type="number"
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            value={selectedItem.z_index}
            onChange={(e) => {
              const z = Number(e.target.value) || 0;
              const next = pages.map((p) =>
                p.id === selectedPage.id ?
                  {
                    ...p,
                    items: p.items.map((it) =>
                      it.id === selectedItem.id ? { ...it, z_index: z } : it,
                    ),
                  }
                : p,
              );
              pushEmit(next);
            }}
          />
        </label>
        <label className="flex items-end gap-2 text-sm text-neutral-800">
          <input
            type="checkbox"
            className="mb-0.5"
            checked={selectedItem.show_card !== false}
            onChange={(e) => {
              const show_card = e.target.checked;
              const next = pages.map((p) =>
                p.id === selectedPage.id ?
                  {
                    ...p,
                    items: p.items.map((it) =>
                      it.id === selectedItem.id ? { ...it, show_card } : it,
                    ),
                  }
                : p,
              );
              pushEmit(next);
            }}
          />
          Show card
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={selectedItem.show_on_start ?? true}
          onChange={(e) => {
            const show_on_start = e.target.checked;
            const next = pages.map((p) =>
              p.id === selectedPage.id ?
                {
                  ...p,
                  items: p.items.map((it) =>
                    it.id === selectedItem.id ? { ...it, show_on_start } : it,
                  ),
                }
              : p,
            );
            pushEmit(next);
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
            onChange={(e) => {
              const preset = e.target.value as (typeof ANIM_PRESETS)[number];
              const next = pages.map((p) =>
                p.id === selectedPage.id ?
                  {
                    ...p,
                    items: p.items.map((it) =>
                      it.id === selectedItem.id ?
                        {
                          ...it,
                          enter: {
                            preset,
                            duration_ms: it.enter?.duration_ms ?? 500,
                          },
                        }
                      : it,
                    ),
                  }
                : p,
              );
              pushEmit(next);
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
            onChange={(e) => {
              const preset = e.target.value as (typeof ANIM_PRESETS)[number];
              const next = pages.map((p) =>
                p.id === selectedPage.id ?
                  {
                    ...p,
                    items: p.items.map((it) =>
                      it.id === selectedItem.id ?
                        {
                          ...it,
                          emphasis: {
                            preset,
                            duration_ms: it.emphasis?.duration_ms ?? 500,
                          },
                        }
                      : it,
                    ),
                  }
                : p,
              );
              pushEmit(next);
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
      <div className="space-y-2 rounded border border-neutral-200 p-2">
        <p className="text-xs font-medium text-neutral-700">Movement path (optional)</p>
        {(selectedPage.background_image_url ?? image_url) ? (
          <StoryPathDrawer
            imageUrl={(selectedPage.background_image_url ?? image_url)!}
            itemXPercent={selectedItem.x_percent}
            itemYPercent={selectedItem.y_percent}
            durationMs={selectedItem.path?.duration_ms ?? 2000}
            onDurationChange={(d) => {
              const w = selectedItem.path?.waypoints;
              if (!w || w.length < 2) return;
              const next = pages.map((p) =>
                p.id === selectedPage.id ?
                  {
                    ...p,
                    items: p.items.map((it) =>
                      it.id === selectedItem.id ?
                        { ...it, path: { ...it.path!, duration_ms: d } }
                      : it,
                    ),
                  }
                : p,
              );
              pushEmit(next);
            }}
            waypoints={selectedItem.path?.waypoints}
            onCommit={(path) => {
              const next = pages.map((p) =>
                p.id === selectedPage.id ?
                  {
                    ...p,
                    items: p.items.map((it) =>
                      it.id === selectedItem.id ?
                        { ...it, path: path ?? undefined }
                      : it,
                    ),
                  }
                : p,
              );
              pushEmit(next);
            }}
            disabled={busy}
          />
        ) : (
          <p className="text-xs text-amber-800">Add a page background to draw a path.</p>
        )}
      </div>
    </div>
  );
}
