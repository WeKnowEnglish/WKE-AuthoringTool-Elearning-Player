"use client";

import { useEffect, useState } from "react";
import {
  listLexiconMediaLinks,
  unlinkLexiconMedia,
} from "@/lib/actions/lexicon-media";
import type { LexiconMediaLinkRow } from "@/lib/vocabulary/lexicon-media";

type Props = {
  lexiconId: string | undefined;
  /** Refresh when the entry gains new media from this editor. */
  refreshKey?: string | number;
};

/** Compact strip of media already linked to a dictionary id. */
export function LexiconLinkedMediaStrip({ lexiconId, refreshKey }: Props) {
  const [links, setLinks] = useState<LexiconMediaLinkRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lexiconId) {
      setLinks([]);
      return;
    }
    let cancelled = false;
    void listLexiconMediaLinks(lexiconId)
      .then((rows) => {
        if (!cancelled) {
          setLinks(rows);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLinks([]);
          setError(err instanceof Error ? err.message : "Could not load linked media.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lexiconId, refreshKey]);

  if (!lexiconId) return null;

  return (
    <div className="rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
        Linked library media
      </p>
      {error ? <p className="mt-1 text-xs text-rose-700">{error}</p> : null}
      {links.length === 0 && !error ? (
        <p className="mt-1 text-xs text-stone-600">
          No shared media linked yet. Pick or upload from the media library below to
          attach pictures/audio to this dictionary word (reusable, not 1:1).
        </p>
      ) : null}
      {links.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {links.map((link) => {
            const isImage = link.contentType.startsWith("image/");
            return (
              <li
                key={link.id}
                className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white p-1.5"
              >
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element -- teacher media URLs
                  <img
                    src={link.publicUrl}
                    alt=""
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded bg-stone-100 text-[10px] font-semibold uppercase text-stone-600">
                    {link.role === "pronunciation" ? "Audio" : "File"}
                  </span>
                )}
                <div className="min-w-0 max-w-[7rem]">
                  <p className="truncate text-[10px] font-medium text-stone-800">
                    {link.itemName || link.originalFilename}
                  </p>
                  <p className="truncate text-[10px] text-stone-500">{link.role}</p>
                </div>
                <button
                  type="button"
                  className="rounded px-1 text-[10px] text-rose-700 hover:underline disabled:opacity-40"
                  disabled={busyId === link.id}
                  onClick={() => {
                    setBusyId(link.id);
                    void unlinkLexiconMedia(link.id).then((result) => {
                      setBusyId(null);
                      if (result.ok) {
                        setLinks((current) =>
                          current.filter((row) => row.id !== link.id),
                        );
                      } else {
                        setError(result.error);
                      }
                    });
                  }}
                >
                  Unlink
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
