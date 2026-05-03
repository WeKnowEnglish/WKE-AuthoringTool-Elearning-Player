"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { MediaMetadataCsvImportResult } from "@/lib/actions/media";

const initialState: MediaMetadataCsvImportResult = {
  ok: true,
  message: "",
  updated: 0,
  skipped: 0,
  failed: 0,
};

function ImportSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
    >
      {pending ? "Working…" : "Run import"}
    </button>
  );
}

type Props = {
  importAction: (
    prev: MediaMetadataCsvImportResult,
    formData: FormData,
  ) => Promise<MediaMetadataCsvImportResult>;
};

export function MediaMetadataCsvImport({ importAction }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(importAction, initialState);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = panelRef.current;
      if (el && !el.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 shadow-sm hover:bg-neutral-50"
      >
        Import metadata
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[min(calc(100vw-2rem),22rem)] rounded-lg border border-neutral-200 bg-white p-4 shadow-lg">
          <p className="text-xs text-neutral-600">
            Upload a CSV export of <code className="rounded bg-neutral-100 px-0.5">media_assets</code> (same
            columns as Supabase). Only rows where <code className="rounded bg-neutral-100 px-0.5">uploaded_by</code>{" "}
            is your account are updated.
          </p>
          <form action={formAction} className="mt-3 space-y-3">
            <label className="block text-xs font-medium text-neutral-800">
              CSV file
              <input
                type="file"
                name="csv"
                accept=".csv,text/csv"
                required
                className="mt-1 block w-full text-sm"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-800">
              <input type="checkbox" name="dry_run" value="on" className="rounded border-neutral-300" />
              Dry run (count only, no database writes)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <ImportSubmitButton />
              <button
                type="button"
                className="text-sm text-neutral-600 underline"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
          </form>
          {state.message ? (
            <p
              className={`mt-3 rounded border px-2 py-1.5 text-xs ${
                state.ok ?
                  "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900"
              }`}
              role="status"
            >
              {state.message}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
