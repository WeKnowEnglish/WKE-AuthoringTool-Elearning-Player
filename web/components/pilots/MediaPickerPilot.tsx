"use client";

import Link from "next/link";
import { useState } from "react";
import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";
import type { MediaUrlChangeDetail } from "@/components/teacher/media/teacherMediaLibraryShared";

const DEMO_LEXICON_ID = "pv_apple_noun";

export function MediaPickerPilot() {
  const [url, setUrl] = useState("");
  const [detail, setDetail] = useState<MediaUrlChangeDetail | null>(null);
  const [withLexicon, setWithLexicon] = useState(true);
  const [queryHint, setQueryHint] = useState("apple");

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <p className="text-sm text-neutral-500">
          <Link href="/pilots" className="underline hover:text-neutral-800">
            Pilots
          </Link>
          {" · "}
          <Link href="/teacher/media" className="underline hover:text-neutral-800">
            Media library
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-bold text-neutral-900">Media picker preview</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Canva-style picker: browse folder rows (School images, My uploads, School audio), then open
          a 3-column mini library. Not wired into every builder yet — judge UX here. Sign in as a
          teacher so library search works.
        </p>
      </div>

      <section className="rounded-lg border border-neutral-200 bg-white p-4 space-y-3">
        <h2 className="text-sm font-bold text-neutral-900">Demo controls</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={withLexicon}
            onChange={(e) => setWithLexicon(e.target.checked)}
          />
          Pass lexiconId (<code className="text-xs">{DEMO_LEXICON_ID}</code>) so{" "}
          <strong>Linked to this word</strong> appears
        </label>
        <label className="block text-sm">
          Library query hint
          <input
            type="text"
            value={queryHint}
            onChange={(e) => setQueryHint(e.target.value)}
            className="mt-1 block w-full rounded border px-2 py-1 text-sm"
          />
        </label>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <MediaUrlControls
          label="Picture"
          value={url}
          libraryQueryHint={queryHint}
          uploadItemName={queryHint || "pilot"}
          lexiconId={withLexicon ? DEMO_LEXICON_ID : undefined}
          onChange={(next, d) => {
            setUrl(next);
            setDetail(d ?? null);
          }}
        />
      </section>

      <section className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm">
        <h2 className="font-bold text-neutral-900">Selection</h2>
        <dl className="mt-2 space-y-1 font-mono text-xs text-neutral-700">
          <div>
            <dt className="inline text-neutral-500">url: </dt>
            <dd className="inline break-all">{url || "(none)"}</dd>
          </div>
          <div>
            <dt className="inline text-neutral-500">mediaAssetId: </dt>
            <dd className="inline">{detail?.mediaAssetId || "(none)"}</dd>
          </div>
        </dl>
        <p className="mt-3 text-neutral-600">
          Open <strong>Media library</strong> — scroll the folder rows, click <strong>See all</strong>{" "}
          for the 3-column view, or pick a thumbnail directly from a row.
        </p>
      </section>
    </div>
  );
}
