"use client";

import { useState, useTransition } from "react";
import { ConfirmSubmitButton } from "@/components/teacher/ConfirmSubmitButton";
import type { MediaAssetRow } from "@/lib/actions/media";

function toCsv(items: string[] | null | undefined): string {
  return (items ?? []).join(", ");
}

type Props = {
  assets: MediaAssetRow[];
  view: string;
  saveMetadataAction: (formData: FormData) => Promise<void>;
  deleteSingleAction: (formData: FormData) => Promise<void>;
  bulkDeleteAction: (ids: string[]) => Promise<void>;
};

export function MediaAssetGrid({
  assets,
  view,
  saveMetadataAction,
  deleteSingleAction,
  bulkDeleteAction,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [pending, startTransition] = useTransition();

  const selectedCount = selected.size;
  const allOnPageSelected = assets.length > 0 && assets.every((a) => selected.has(a.id));

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAllOnPage(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const asset of assets) {
        if (checked) next.add(asset.id);
        else next.delete(asset.id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function handleBulkDelete() {
    if (selectedCount === 0) return;
    const ids = [...selected];
    const noun = ids.length === 1 ? "asset" : "assets";
    if (!window.confirm(`Delete ${ids.length} media ${noun} permanently?`)) return;
    startTransition(async () => {
      await bulkDeleteAction(ids);
    });
  }

  return (
    <>
      {assets.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded border border-neutral-200 bg-neutral-50 px-3 py-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-neutral-800">
            <input
              type="checkbox"
              className="rounded border-neutral-400"
              checked={allOnPageSelected}
              onChange={(e) => toggleAllOnPage(e.target.checked)}
              disabled={pending}
            />
            Select all on page
          </label>
          {selectedCount > 0 ? (
            <>
              <span className="text-sm text-neutral-600">{selectedCount} selected</span>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={pending}
                className="rounded border border-red-400 bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {pending ? "Deleting…" : `Delete selected (${selectedCount})`}
              </button>
              <button
                type="button"
                onClick={clearSelection}
                disabled={pending}
                className="rounded border border-neutral-300 px-2 py-1.5 text-sm font-semibold text-neutral-700 hover:bg-white"
              >
                Clear selection
              </button>
            </>
          ) : (
            <span className="text-sm text-neutral-500">Check items below to bulk delete</span>
          )}
        </div>
      ) : null}

      <ul
        className={`grid gap-4 ${
          view === "list" ?
            "grid-cols-1"
          : view === "icons_small" ?
            "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {assets.map((asset) => {
          const isChecked = selected.has(asset.id);
          return (
            <li
              key={asset.id}
              className={`rounded-lg border bg-white p-4 ${
                isChecked ? "border-red-300 ring-2 ring-red-200" : "border-neutral-200"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1 shrink-0 rounded border-neutral-400"
                    checked={isChecked}
                    onChange={(e) => toggleOne(asset.id, e.target.checked)}
                    disabled={pending}
                    aria-label={`Select ${asset.meta_item_name || asset.original_filename}`}
                  />
                  <div className="min-w-0">
                    <p className="font-semibold">{asset.meta_item_name || asset.original_filename}</p>
                    {asset.meta_item_name ? (
                      <p className="text-xs text-neutral-500">File: {asset.original_filename}</p>
                    ) : null}
                    <p className="text-xs text-neutral-600">{asset.content_type}</p>
                  </div>
                </label>
                <div className="flex shrink-0 items-center gap-1">
                  <a
                    href={asset.public_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded border border-neutral-300 px-2 py-1 text-xs font-semibold"
                  >
                    Open
                  </a>
                  <form action={deleteSingleAction}>
                    <input type="hidden" name="id" value={asset.id} />
                    <ConfirmSubmitButton
                      type="submit"
                      confirmMessage="Delete this media asset permanently?"
                      disabled={pending}
                      className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-800 hover:bg-red-50 active:bg-red-100 disabled:opacity-60"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </div>
              </div>
              {asset.content_type.startsWith("image/") ? (
                <div
                  className={`relative mt-3 w-full overflow-hidden rounded border border-neutral-300 bg-neutral-100 ${
                    view === "list" ? "h-40" : view === "icons_small" ? "h-28" : "h-36"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.public_url}
                    alt=""
                    className="h-full w-full object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ) : (
                <audio className="mt-3 w-full" controls preload="none" src={asset.public_url} />
              )}

              <details className="mt-3 rounded border border-neutral-200">
                <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">
                  Edit information box
                </summary>
                <form action={saveMetadataAction} className="grid gap-3 border-t border-neutral-200 p-3">
                  <input type="hidden" name="id" value={asset.id} />
                  <label className="text-sm">
                    Item name
                    <input
                      name="item_name"
                      defaultValue={asset.meta_item_name ?? ""}
                      placeholder="Display name for this item"
                      className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="text-sm">
                    Categories (csv)
                    <input
                      name="categories"
                      defaultValue={toCsv(asset.meta_categories)}
                      className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="text-sm">
                    Tags (csv)
                    <input
                      name="tags"
                      defaultValue={toCsv(asset.meta_tags)}
                      className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="text-sm">
                    Alternative names (csv)
                    <input
                      name="alternative_names"
                      defaultValue={toCsv(asset.meta_alternative_names)}
                      className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="text-sm">
                    Plural
                    <input
                      name="plural"
                      defaultValue={asset.meta_plural ?? ""}
                      className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="text-sm">
                    Countable vs uncountable
                    <select
                      name="countability"
                      defaultValue={asset.meta_countability ?? "na"}
                      className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                    >
                      <option value="na">N/A</option>
                      <option value="countable">Countable</option>
                      <option value="uncountable">Uncountable</option>
                      <option value="both">Both</option>
                    </select>
                  </label>
                  <label className="text-sm">
                    Level
                    <input
                      name="level"
                      defaultValue={asset.meta_level ?? ""}
                      className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="text-sm">
                    Grammar point (word type)
                    <input
                      name="word_type"
                      defaultValue={asset.meta_word_type ?? ""}
                      className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="text-sm">
                    Skills (csv)
                    <input
                      name="skills"
                      defaultValue={toCsv(asset.meta_skills)}
                      className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="text-sm">
                    Past tense
                    <input
                      name="past_tense"
                      defaultValue={asset.meta_past_tense ?? ""}
                      className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="text-sm">
                    Notes
                    <textarea
                      name="notes"
                      rows={2}
                      defaultValue={asset.meta_notes ?? ""}
                      className="mt-1 block w-full rounded border px-2 py-1 text-sm"
                    />
                  </label>
                  <button
                    type="submit"
                    className="w-fit rounded bg-neutral-900 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Save info
                  </button>
                </form>
              </details>
            </li>
          );
        })}
      </ul>
    </>
  );
}
