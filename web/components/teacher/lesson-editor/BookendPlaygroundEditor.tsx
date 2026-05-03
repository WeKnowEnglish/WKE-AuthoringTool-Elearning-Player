"use client";

import { clsx } from "clsx";
import { useCallback, useMemo, useState } from "react";
import { StoryItemLayerContent } from "@/components/story/StoryItemLayerContent";
import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";
import {
  startPlaygroundSchema,
  type StartPlayground,
  type StartPlaygroundTapReward,
  type StoryItem,
} from "@/lib/lesson-schemas";
import { BookendItemPanel } from "@/components/teacher/lesson-editor/BookendItemPanel";
import { RectRegionEditor, type RectPercent } from "@/components/teacher/lesson-editor/RectRegionEditor";

const PLACEHOLDER_BG =
  "https://placehold.co/1600x1000/f8fafc/94a3b8?text=Set+background+URL+above";

function newEntityId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`;
}

function emptyPlayground(): StartPlayground {
  return {
    page: {
      id: newEntityId("pg"),
      image_fit: "contain",
      items: [],
    },
  };
}

function sanitizeBookendItem(it: StoryItem): StoryItem {
  return {
    ...it,
    draggable_mode: "none",
    tap_interaction_group: undefined,
    drop_target_id: undefined,
  };
}

function tapRewardHasEffect(tr: StartPlaygroundTapReward): boolean {
  return (
    (tr.gold != null && tr.gold > 0) ||
    (tr.experience != null && tr.experience > 0) ||
    tr.sticker === true ||
    !!(tr.play_sound_url?.trim())
  );
}

function itemsToRegions(items: StoryItem[]): RectPercent[] {
  return items.map((it) => ({
    id: it.id,
    x_percent: it.x_percent,
    y_percent: it.y_percent,
    w_percent: it.w_percent,
    h_percent: it.h_percent,
    label: it.name,
  }));
}

function mergeRegionsIntoItems(items: StoryItem[], regions: RectPercent[]): StoryItem[] {
  return items.map((it) => {
    const r = regions.find((x) => x.id === it.id);
    if (!r) return it;
    return {
      ...it,
      x_percent: r.x_percent,
      y_percent: r.y_percent,
      w_percent: r.w_percent,
      h_percent: r.h_percent,
    };
  });
}

export type BookendPlaygroundEditorProps = {
  value: StartPlayground | undefined;
  onChange: (next: StartPlayground | undefined) => void;
  busy?: boolean;
  /** Inline parse message from parent (optional). */
  parseMessage?: string | null;
};

export function BookendPlaygroundEditor({
  value,
  onChange,
  busy = false,
  parseMessage,
}: BookendPlaygroundEditorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const page = value?.page;
  const items = page?.items ?? [];
  const tapList = value?.tap_rewards ?? [];

  const tapByItemId = useMemo(() => {
    const m = new Map<string, StartPlaygroundTapReward>();
    for (const tr of tapList) {
      m.set(tr.item_id, tr);
    }
    return m;
  }, [tapList]);

  const regions = useMemo(() => itemsToRegions(items), [items]);

  const bgUrl = page?.background_image_url?.trim() || PLACEHOLDER_BG;

  const commit = useCallback(
    (next: StartPlayground | undefined) => {
      if (!next) {
        onChange(undefined);
        setSelectedId(null);
        return;
      }
      const rewards = (next.tap_rewards ?? []).filter(tapRewardHasEffect);
      const cleaned: StartPlayground = {
        ...next,
        tap_rewards: rewards.length > 0 ? rewards : undefined,
        page: {
          ...next.page,
          items: next.page.items.map((it) => sanitizeBookendItem(it)),
          phases: undefined,
        },
      };
      const parsed = startPlaygroundSchema.safeParse(cleaned);
      if (parsed.success) {
        onChange(parsed.data);
      } else {
        onChange(cleaned);
      }
    },
    [onChange],
  );

  const selectedItem = selectedId ? items.find((i) => i.id === selectedId) : undefined;

  const patchPageItems = useCallback(
    (patcher: (list: StoryItem[]) => StoryItem[]) => {
      if (!value) return;
      const nextItems = patcher(value.page.items);
      commit({ ...value, page: { ...value.page, items: nextItems } });
    },
    [value, commit],
  );

  const setTapRewardForItem = useCallback(
    (itemId: string, tr: StartPlaygroundTapReward | undefined) => {
      if (!value) return;
      const rest = (value.tap_rewards ?? []).filter((t) => t.item_id !== itemId);
      const nextRewards =
        tr && tapRewardHasEffect(tr) ? [...rest, { ...tr, item_id: itemId }] : rest;
      commit({
        ...value,
        tap_rewards: nextRewards.length > 0 ? nextRewards : undefined,
      });
    },
    [value, commit],
  );

  const addItem = useCallback(
    (kind: "image" | "text" | "button") => {
      const base = value ?? emptyPlayground();
      const z = base.page.items.length;
      const id = newEntityId("item");
      let item: StoryItem;
      if (kind === "image") {
        item = sanitizeBookendItem({
          id,
          kind: "image",
          name: "Picture",
          image_url: "https://placehold.co/240x240/e2e8f0/334155?text=Tap",
          x_percent: 36,
          y_percent: 32,
          w_percent: 28,
          h_percent: 36,
          z_index: z,
          show_card: true,
          show_on_start: true,
          image_scale: 1,
        });
      } else if (kind === "text") {
        item = sanitizeBookendItem({
          id,
          kind: "text",
          name: "Label",
          text: "Hello!",
          text_size_px: 28,
          x_percent: 30,
          y_percent: 40,
          w_percent: 40,
          h_percent: 18,
          z_index: z,
          show_card: false,
          show_on_start: true,
          image_scale: 1,
        });
      } else {
        item = sanitizeBookendItem({
          id,
          kind: "button",
          name: "Tap button",
          text: "Tap me",
          text_size_px: 18,
          x_percent: 38,
          y_percent: 42,
          w_percent: 24,
          h_percent: 14,
          z_index: z,
          show_card: true,
          show_on_start: true,
          image_scale: 1,
        });
      }
      commit({
        ...base,
        page: { ...base.page, items: [...base.page.items, item] },
      });
      setSelectedId(id);
    },
    [value, commit],
  );

  if (!value) {
    return (
      <div className="rounded-xl border-2 border-dashed border-sky-300 bg-sky-50/60 p-6 text-center">
        <p className="text-sm font-semibold text-sky-950">Interactive playground</p>
        <p className="mt-2 text-xs text-neutral-600">
          Add stickers, labels, and tap sounds students can explore before they press Start.
        </p>
        <button
          type="button"
          disabled={busy}
          className="mt-4 rounded-lg bg-sky-700 px-4 py-2 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-50"
          onClick={() => commit(emptyPlayground())}
        >
          Add playground
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      <div className="flex shrink-0 flex-col gap-2 lg:w-14">
        <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500 lg:hidden">
          Add
        </p>
        <div className="flex flex-row gap-2 lg:flex-col">
          <button
            type="button"
            title="Add picture"
            disabled={busy}
            className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-kid-ink bg-white text-xl shadow hover:bg-sky-50 disabled:opacity-50"
            onClick={() => addItem("image")}
          >
            <span aria-hidden>🖼</span>
            <span className="sr-only">Add picture</span>
          </button>
          <button
            type="button"
            title="Add text label"
            disabled={busy}
            className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-kid-ink bg-white text-xl font-bold shadow hover:bg-sky-50 disabled:opacity-50"
            onClick={() => addItem("text")}
          >
            <span aria-hidden>T</span>
            <span className="sr-only">Add text</span>
          </button>
          <button
            type="button"
            title="Add tap button"
            disabled={busy}
            className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-kid-ink bg-amber-100 text-sm font-bold shadow hover:bg-amber-200 disabled:opacity-50"
            onClick={() => addItem("button")}
          >
            <span aria-hidden>Btn</span>
            <span className="sr-only">Add button</span>
          </button>
        </div>
        <button
          type="button"
          className="mt-2 rounded border border-red-300 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-900 hover:bg-red-100 disabled:opacity-50 lg:mt-auto"
          disabled={busy}
          onClick={() => commit(undefined)}
        >
          Remove playground
        </button>
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <MediaUrlControls
          label="Stage background image"
          value={page?.background_image_url ?? ""}
          onChange={(v) => {
            commit({
              ...value,
              page: {
                ...value.page,
                background_image_url: v.trim() || undefined,
              },
            });
          }}
          disabled={busy}
        />
        {parseMessage ? (
          <p className="rounded border border-amber-400 bg-amber-50 px-2 py-1 text-xs text-amber-950">
            {parseMessage}
          </p>
        ) : null}
        <div
          className={clsx(
            "overflow-hidden rounded-lg border-2 border-neutral-400 bg-neutral-100",
            busy && "pointer-events-none opacity-60",
          )}
        >
          <RectRegionEditor
            imageUrl={bgUrl}
            imageFit={page?.image_fit ?? "contain"}
            regions={regions}
            onRegionsChange={(nextRects) => {
              commit({
                ...value,
                page: {
                  ...value.page,
                  items: mergeRegionsIntoItems(value.page.items, nextRects),
                },
              });
            }}
            selectedId={selectedId}
            onSelect={setSelectedId}
            disabled={busy}
            clipToStage
            showHorizontalResizeHandle={(r) => {
              const it = value.page.items.find((i) => i.id === r.id);
              return (it?.kind ?? "image") === "text";
            }}
            renderRegion={(r) => {
              const it = value.page.items.find((i) => i.id === r.id);
              if (!it) return null;
              const prize = tapByItemId.has(it.id);
              return (
                <span className="relative block h-full w-full">
                  {prize ? (
                    <span
                      className="absolute right-0.5 top-0.5 z-10 rounded-full bg-amber-400 px-1 text-[10px] font-bold leading-none text-amber-950 shadow"
                      title="Has a prize"
                      aria-hidden
                    >
                      ★
                    </span>
                  ) : null}
                  <StoryItemLayerContent item={it} />
                </span>
              );
            }}
          />
        </div>
        <p className="text-xs text-neutral-500">
          Drag objects to move them. Drag the corner to resize. Tap an object to select it.
        </p>
      </div>

      <div className="w-full shrink-0 lg:w-80">
        {selectedItem ? (
          <BookendItemPanel
            item={selectedItem}
            page={value.page}
            tapReward={tapByItemId.get(selectedItem.id)}
            busy={busy}
            onPatchItem={(patcher) => {
              patchPageItems((list) =>
                list.map((it) => (it.id === selectedItem.id ? sanitizeBookendItem(patcher(it)) : it)),
              );
            }}
            onSetTapReward={(tr) => setTapRewardForItem(selectedItem.id, tr)}
            onRemoveItem={() => {
              if (!value) return;
              const nextItems = value.page.items.filter((it) => it.id !== selectedItem.id);
              const rest = (value.tap_rewards ?? []).filter((t) => t.item_id !== selectedItem.id);
              commit({
                ...value,
                page: { ...value.page, items: nextItems },
                tap_rewards: rest.length > 0 ? rest : undefined,
              });
              setSelectedId(null);
            }}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-600">
            Select an object on the stage to edit sounds, motion, and optional prizes.
          </div>
        )}
      </div>
    </div>
  );
}
