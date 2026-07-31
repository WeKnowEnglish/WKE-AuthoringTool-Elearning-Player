"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  approveWkeLibrarySubmission,
  getWkeLibraryItemForAdmin,
  listPendingWkeLibrarySubmissions,
  previewWkeLibraryItemInBank,
  rejectWkeLibrarySubmission,
} from "@/lib/actions/wke-library";
import type { WkeLibraryItemDetail, WkeLibraryItemSummary } from "@/lib/wke-library/types";

export function WkeLibraryReviewQueue() {
  const router = useRouter();
  const [items, setItems] = useState<WkeLibraryItemSummary[]>([]);
  const [selected, setSelected] = useState<WkeLibraryItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listPendingWkeLibrarySubmissions());
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "Could not load queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openItem = (id: string) => {
    setError(null);
    startTransition(async () => {
      try {
        setSelected(await getWkeLibraryItemForAdmin(id));
        setReviewNote("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load item.");
      }
    });
  };

  const onApprove = () => {
    if (!selected) return;
    setNotice(null);
    setError(null);
    startTransition(async () => {
      try {
        const result = await approveWkeLibrarySubmission({
          libraryItemId: selected.id,
          reviewNote,
        });
        setNotice(`Published “${result.title}”.`);
        setSelected(null);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Approve failed.");
      }
    });
  };

  const onReject = () => {
    if (!selected) return;
    setNotice(null);
    setError(null);
    startTransition(async () => {
      try {
        const result = await rejectWkeLibrarySubmission({
          libraryItemId: selected.id,
          reviewNote,
        });
        setNotice(`Rejected “${result.title}”.`);
        setSelected(null);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Reject failed.");
      }
    });
  };

  const onPreview = () => {
    if (!selected) return;
    setNotice(null);
    setError(null);
    startTransition(async () => {
      try {
        const result = await previewWkeLibraryItemInBank({
          libraryItemId: selected.id,
        });
        setNotice(`Opened preview copy “${result.title}” in your Activity Bank.`);
        router.push(result.editPath);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Preview failed.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {notice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-neutral-500">Loading queue…</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-sm text-neutral-600">
          No pending submissions.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-neutral-900">{item.title}</p>
                <p className="text-xs text-neutral-500">
                  {item.format} · {item.creditName || "No credit"} ·{" "}
                  {new Date(item.updatedAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                onClick={() => openItem(item.id)}
              >
                Review
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">{selected.title}</h2>
              <p className="mt-1 text-sm text-neutral-600">{selected.description}</p>
              {selected.submitterNote ? (
                <p className="mt-2 text-xs text-amber-900">
                  Submitter note: {selected.submitterNote}
                </p>
              ) : null}
              {selected.creditName ? (
                <p className="mt-1 text-xs text-neutral-500">Credit: {selected.creditName}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="text-xs text-neutral-500 underline"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
          <label className="mt-3 block text-xs text-neutral-600">
            Review note (optional)
            <textarea
              rows={2}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              maxLength={500}
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={onPreview}
              className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-950 hover:bg-sky-100 disabled:opacity-50"
            >
              Open preview copy
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={onApprove}
              className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              Approve & publish
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={onReject}
              className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-900 hover:bg-rose-100 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
          <p className="mt-2 text-[11px] text-neutral-500">
            Preview copies a private “[Preview] …” activity into your bank so you can play it
            before publishing. Catalog status is unchanged.
          </p>
        </div>
      ) : null}
    </div>
  );
}
