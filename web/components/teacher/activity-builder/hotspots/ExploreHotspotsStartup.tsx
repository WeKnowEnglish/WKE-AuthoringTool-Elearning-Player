"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { EXPLORE_HOTSPOTS_WKE_LIBRARY } from "@/lib/hotspots/wke-library";
import type { StudioExploreHotspotsRef } from "@/lib/hotspots";

type Props = {
  bankEntries: StudioExploreHotspotsRef[];
  bankBusy: boolean;
  bankListBusy: boolean;
  onRefreshBank: () => Promise<void>;
  onOpenFromBank: (activityId: string) => void;
  onOpenFile: (file: File) => void;
  onOpenLibraryExample: (exampleId: string) => void;
  onStartNew: () => void;
};

export function ExploreHotspotsStartup({
  bankEntries,
  bankBusy,
  bankListBusy,
  onRefreshBank,
  onOpenFromBank,
  onOpenFile,
  onOpenLibraryExample,
  onStartNew,
}: Props) {
  const [view, setView] = useState<"chooser" | "bank">("chooser");
  const fileRef = useRef<HTMLInputElement>(null);
  const hasPrefetched = bankEntries.length > 0 || bankListBusy;

  useEffect(() => {
    if (view !== "bank") return;
    if (!hasPrefetched) void onRefreshBank();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-stone-100">
      <header className="flex shrink-0 items-center gap-3 border-b border-stone-200 bg-white px-4 py-3">
        <Link
          href="/teacher/activity-builder"
          className="text-sm text-stone-500 hover:text-stone-800"
        >
          ← Activity Builder
        </Link>
        <h1 className="text-base font-semibold text-stone-900">Explore hotspots</h1>
      </header>

      <div className="flex flex-1 flex-col items-center overflow-y-auto p-4 sm:p-8">
        <div className="relative w-full max-w-2xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          {bankBusy ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80">
              <p className="text-sm font-medium text-stone-600">
                Opening activity…
              </p>
            </div>
          ) : null}

          {view === "chooser" ? (
            <>
              <h2 className="text-xl font-semibold text-stone-900">Open an activity</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                Load a saved activity from your bank, upload a JSON file, or start a new
                blank scene.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-5 text-left transition hover:border-sky-300 hover:bg-sky-50"
                  onClick={() => setView("bank")}
                >
                  <p className="font-semibold text-stone-900">Load from bank</p>
                  <p className="mt-1 text-xs leading-relaxed text-stone-500">
                    Open an activity you saved to the Activity Bank.
                  </p>
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-5 text-left transition hover:border-sky-300 hover:bg-sky-50"
                  onClick={() => fileRef.current?.click()}
                >
                  <p className="font-semibold text-stone-900">Upload file</p>
                  <p className="mt-1 text-xs leading-relaxed text-stone-500">
                    Import a `.json` explore-hotspots document from your computer.
                  </p>
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-5 text-left transition hover:border-sky-300 hover:bg-sky-50"
                  onClick={onStartNew}
                >
                  <p className="font-semibold text-stone-900">Start new</p>
                  <p className="mt-1 text-xs leading-relaxed text-stone-500">
                    Begin with a blank scene, one object, and a placeholder image.
                  </p>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-stone-900">Activity Bank</h2>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="text-sm text-stone-500 hover:text-stone-800 disabled:opacity-40"
                    disabled={bankListBusy || bankBusy}
                    onClick={() => void onRefreshBank()}
                  >
                    {bankListBusy ? "Refreshing…" : "Refresh"}
                  </button>
                  <button
                    type="button"
                    className="text-sm text-stone-500 hover:text-stone-800"
                    onClick={() => setView("chooser")}
                  >
                    ← Back
                  </button>
                </div>
              </div>
              {bankListBusy && bankEntries.length === 0 ? (
                <p className="mt-4 text-sm text-stone-500">Loading activities…</p>
              ) : bankEntries.length === 0 ? (
                <p className="mt-4 text-sm text-stone-500">
                  No explore-hotspots activities saved yet. Start new or upload a file.
                </p>
              ) : (
                <ul className="mt-4 max-h-[min(24rem,50vh)] space-y-2 overflow-y-auto">
                  {bankEntries.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-stone-900">{entry.name}</p>
                        <p className="text-xs text-stone-500">
                          Updated {new Date(entry.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                        disabled={bankBusy}
                        onClick={() => onOpenFromBank(entry.id)}
                      >
                        Open
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {view === "chooser" ? (
          <section className="mt-6 w-full max-w-2xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
              WKE Library
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-stone-600">
              Curated example activities you can open here, or copy into My Activity Bank from
              the full{" "}
              <Link
                href="/teacher/activity-builder/library"
                className="font-semibold text-sky-900 underline underline-offset-2"
              >
                WKE Library
              </Link>
              .
            </p>
            <ul className="mt-4 space-y-3">
              {EXPLORE_HOTSPOTS_WKE_LIBRARY.map((example) => (
                <li
                  key={example.id}
                  className="flex flex-wrap items-start gap-3 rounded-xl border border-stone-200 bg-stone-50/80 px-4 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-stone-900">{example.title}</p>
                      {example.cefr ? (
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800">
                          {example.cefr}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-stone-600">
                      {example.description}
                    </p>
                    {example.tags.length ? (
                      <p className="mt-2 text-xs text-stone-500">
                        {example.tags.join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                    disabled={bankBusy}
                    onClick={() => onOpenLibraryExample(example.id)}
                  >
                    Open example
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <input
        ref={fileRef}
        hidden
        type="file"
        accept=".json,.wkeactivity.json,application/json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onOpenFile(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
