"use client";

import { useState, useTransition } from "react";
import { submitStudioActivityToWkeLibrary } from "@/lib/actions/wke-library";

type Props = {
  studioActivityId: string;
  activityTitle: string;
  disabled?: boolean;
  onSubmitted?: (result: { libraryItemId: string; title: string }) => void;
};

export function SubmitToWkeLibraryButton({
  studioActivityId,
  activityTitle,
  disabled,
  onSubmitted,
}: Props) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [creditName, setCreditName] = useState("");
  const [submitterNote, setSubmitterNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await submitStudioActivityToWkeLibrary({
          studioActivityId,
          description,
          creditName,
          submitterNote,
        });
        setOpen(false);
        setDescription("");
        setCreditName("");
        setSubmitterNote("");
        onSubmitted?.(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Submit failed.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled || pending}
        onClick={() => setOpen(true)}
        className="rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-950 hover:bg-teal-100 disabled:opacity-40"
        title="Submit a snapshot for WKE Library review"
      >
        Submit to library
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Submit to WKE Library"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-stone-900">
              Submit to WKE Library
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-stone-600">
              Sends a snapshot of{" "}
              <span className="font-medium text-stone-800">{activityTitle}</span> for
              review. Your private Activity Bank copy stays private until (and unless) it
              is approved.
            </p>

            <label className="mt-3 block text-xs text-stone-600">
              Short description (shown in the catalog)
              <textarea
                rows={3}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What teachers get from this activity…"
                maxLength={800}
              />
            </label>
            <label className="mt-2 block text-xs text-stone-600">
              Credit name (optional)
              <input
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                value={creditName}
                onChange={(event) => setCreditName(event.target.value)}
                placeholder="Your name or school"
                maxLength={80}
              />
            </label>
            <label className="mt-2 block text-xs text-stone-600">
              Note for reviewers (optional)
              <textarea
                rows={2}
                className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                value={submitterNote}
                onChange={(event) => setSubmitterNote(event.target.value)}
                placeholder="Anything admins should know…"
                maxLength={500}
              />
            </label>

            {error ? <p className="mt-2 text-xs text-rose-700">{error}</p> : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={pending}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                className="rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-900 disabled:opacity-50"
                onClick={onSubmit}
              >
                {pending ? "Submitting…" : "Submit for review"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
