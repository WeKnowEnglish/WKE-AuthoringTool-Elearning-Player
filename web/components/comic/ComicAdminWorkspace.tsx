"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ExternalLink, GripVertical, Trash2, Upload } from "lucide-react";
import {
  deleteComicPage,
  reorderComicPages,
  uploadComicPages,
  type ComicActionResult,
} from "@/lib/actions/comic";
import type { ComicChapterWithPages, ComicPage } from "@/lib/comic/types";

type Props = {
  initialChapter: ComicChapterWithPages;
};

export function ComicAdminWorkspace({ initialChapter }: Props) {
  const [chapter, setChapter] = useState(initialChapter);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);

  const applyResult = (result: ComicActionResult, successMessage: string) => {
    if (!result.ok) {
      setError(result.error);
      setNotice(null);
      return;
    }
    setChapter(result.chapter);
    setError(null);
    setNotice(successMessage);
  };

  const persistOrder = (pages: ComicPage[], successMessage: string) => {
    const previous = chapter;
    setChapter({ ...chapter, pages });
    startTransition(async () => {
      const result = await reorderComicPages({
        slug: chapter.slug,
        orderedPageIds: pages.map((page) => page.id),
      });
      if (!result.ok) {
        setChapter(previous);
      }
      applyResult(result, successMessage);
    });
  };

  const movePage = (pageId: string, direction: "up" | "down") => {
    const index = chapter.pages.findIndex((page) => page.id === pageId);
    if (index < 0) return;
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= chapter.pages.length) return;
    const next = [...chapter.pages];
    const current = next[index]!;
    next[index] = next[swapWith]!;
    next[swapWith] = current;
    persistOrder(
      next.map((page, pageIndex) => ({ ...page, pageIndex: pageIndex + 1 })),
      "Page order saved.",
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
            Media · Comic
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-stone-900">
            {chapter.title}
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Upload page images, then drag or use arrows to set reading order. Students open{" "}
            <Link href="/wke/comic" className="font-semibold text-sky-800 underline">
              /wke/comic
            </Link>
            .
          </p>
        </div>
        <Link
          href="/wke/comic"
          target="_blank"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-stone-300 bg-white px-3 text-sm font-bold text-stone-800 hover:bg-stone-50"
        >
          Open reader
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      <form
        className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          data.set("slug", chapter.slug);
          startTransition(async () => {
            const result = await uploadComicPages(data);
            applyResult(
              result,
              result.ok
                ? `Uploaded. Chapter now has ${result.chapter.pages.length} page${
                    result.chapter.pages.length === 1 ? "" : "s"
                  }.`
                : "",
            );
            if (result.ok) form.reset();
          });
        }}
      >
        <label className="block text-sm font-bold text-stone-800">
          Add pages
          <input
            name="pages"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            required
            className="mt-2 block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-900 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white"
          />
        </label>
        <p className="mt-2 text-xs text-stone-500">
          JPEG / PNG / WebP / GIF · up to 15 MB each · multi-select keeps file order
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-stone-900 px-4 text-sm font-bold text-white disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {isPending ? "Uploading…" : "Upload pages"}
        </button>
      </form>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-900">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
          {notice}
        </p>
      ) : null}

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-sm font-extrabold text-stone-900">
            Pages ({chapter.pages.length})
          </h2>
          {chapter.pages.length > 1 ? (
            <p className="text-xs font-semibold text-stone-500">
              Drag cards or use ↑ ↓ to reorder
            </p>
          ) : null}
        </div>
        {chapter.pages.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">No pages yet. Upload Chapter 1 above.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {chapter.pages.map((page, index) => (
              <li
                key={page.id}
                draggable={!isPending}
                onDragStart={() => setDragId(page.id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (!dragId || dragId === page.id) return;
                  const from = chapter.pages.findIndex((row) => row.id === dragId);
                  const to = chapter.pages.findIndex((row) => row.id === page.id);
                  setDragId(null);
                  if (from < 0 || to < 0) return;
                  const next = [...chapter.pages];
                  const [moved] = next.splice(from, 1);
                  if (!moved) return;
                  next.splice(to, 0, moved);
                  persistOrder(
                    next.map((row, pageIndex) => ({ ...row, pageIndex: pageIndex + 1 })),
                    "Page order saved.",
                  );
                }}
                className={`overflow-hidden rounded-xl border bg-stone-50 transition ${
                  dragId === page.id
                    ? "border-sky-400 opacity-60"
                    : "border-stone-200"
                }`}
              >
                <div className="relative aspect-[3/4] cursor-grab bg-stone-200 active:cursor-grabbing">
                  <Image
                    src={page.publicUrl}
                    alt={`Page ${page.pageIndex}`}
                    fill
                    unoptimized
                    className="pointer-events-none object-contain"
                  />
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                    <GripVertical className="h-3 w-3" />
                    Drag
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-wide text-stone-500">
                      Page {index + 1}
                    </p>
                    <p className="truncate text-xs text-stone-600">
                      {page.originalFilename}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      disabled={isPending || index === 0}
                      aria-label={`Move page ${index + 1} earlier`}
                      onClick={() => movePage(page.id, "up")}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 disabled:opacity-35"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={isPending || index === chapter.pages.length - 1}
                      aria-label={`Move page ${index + 1} later`}
                      onClick={() => movePage(page.id, "down")}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 disabled:opacity-35"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      aria-label={`Delete page ${index + 1}`}
                      onClick={() => {
                        startTransition(async () => {
                          const result = await deleteComicPage({
                            pageId: page.id,
                            slug: chapter.slug,
                          });
                          applyResult(result, "Page deleted.");
                        });
                      }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 hover:border-red-300 hover:text-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
