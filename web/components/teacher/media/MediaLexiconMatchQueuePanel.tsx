"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { MediaLexiconMatchQueueRow } from "@/lib/actions/media-lexicon-match";
import {
  confirmMediaLexiconMatch,
  dismissMediaLexiconMatch,
  requestDictionaryWordFromMediaMatch,
} from "@/lib/actions/media-lexicon-match";

type Props = {
  rows: MediaLexiconMatchQueueRow[];
  total: number;
};

export function MediaLexiconMatchQueuePanel({ rows, total }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (total === 0) return null;

  function run(label: string, fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(label);
      router.refresh();
    });
  }

  return (
    <section className="rounded-lg border border-amber-300 bg-amber-50/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-amber-950">Dictionary match review</h2>
          <p className="mt-1 text-sm text-amber-900/80">
            {total} upload{total === 1 ? "" : "s"} need a decision — ambiguous match or no dictionary
            word yet.
          </p>
        </div>
        <Link
          href="/teacher/dictionary/review"
          className="text-sm font-semibold text-blue-800 underline"
        >
          Open Lexicon review
        </Link>
      </div>

      {error ? (
        <p className="mt-2 rounded border border-red-300 bg-red-50 px-2 py-1 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-2 rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}

      <ul className="mt-3 space-y-3">
        {rows.map((row) => {
          const isImage = String(row.media?.content_type || "").startsWith("image/");
          const candidates = row.candidate_lexicon_ids;
          const noMatch = row.match_kind === "none" || candidates.length === 0;
          return (
            <li
              key={row.id}
              className="flex flex-wrap gap-3 rounded-md border border-amber-200 bg-white p-3"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded border border-neutral-200 bg-neutral-100">
                {isImage && row.media?.public_url ?
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={row.media.public_url}
                    alt={row.queried_surface}
                    className="h-full w-full object-contain"
                  />
                : <span className="flex h-full items-center justify-center text-xs text-neutral-500">
                    media
                  </span>
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-neutral-900">
                  “{row.queried_surface}”
                  <span className="ml-2 text-xs font-normal text-neutral-500">
                    {row.match_kind} · {row.confidence}
                  </span>
                </p>
                <p className="truncate text-xs text-neutral-500">
                  {row.media?.original_filename || row.media_asset_id}
                </p>
                {row.note ? <p className="mt-1 text-xs text-neutral-600">{row.note}</p> : null}

                <div className="mt-2 flex flex-wrap gap-2">
                  {candidates.map((lexId) => (
                    <button
                      key={lexId}
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(`Linked to ${lexId}`, () =>
                          confirmMediaLexiconMatch({ queueId: row.id, lexiconId: lexId }),
                        )
                      }
                      className="rounded border border-neutral-900 bg-neutral-900 px-2 py-1 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
                    >
                      Link {lexId.replace(/^pv_/, "").replace(/_/g, " ")}
                    </button>
                  ))}
                  {noMatch ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run("Submitted to Lexicon review", async () => {
                          const r = await requestDictionaryWordFromMediaMatch(row.id);
                          return r.ok ? { ok: true as const } : r;
                        })
                      }
                      className="rounded border border-blue-700 bg-blue-700 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
                    >
                      Request word (Lexicon review)
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run("Dismissed", () => dismissMediaLexiconMatch(row.id))
                    }
                    className="rounded border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
