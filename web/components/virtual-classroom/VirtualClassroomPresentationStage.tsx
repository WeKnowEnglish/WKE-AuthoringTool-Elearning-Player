"use client";

import { useState } from "react";
import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";
import type { VirtualClassroomPresentation } from "@/lib/virtual-classroom/presentation";

type Props = {
  role: "host" | "member";
  presentation: VirtualClassroomPresentation | null;
  busy: boolean;
  onPresent: (presentation: VirtualClassroomPresentation | null) => void;
  onAnnotateImage: () => void;
};

export function VirtualClassroomPresentationStage({
  role,
  presentation,
  busy,
  onPresent,
  onAnnotateImage,
}: Props) {
  const [kind, setKind] = useState<"image" | "pdf">(presentation?.kind ?? "image");
  const [url, setUrl] = useState(presentation?.url ?? "");
  const [title, setTitle] = useState(presentation?.title ?? "");
  const [mediaAssetId, setMediaAssetId] = useState<string | null>(
    presentation?.mediaAssetId ?? null,
  );

  const isHost = role === "host";
  const submit = () => {
    onPresent({
      kind,
      url,
      title: title.trim() || (kind === "pdf" ? "Class PDF" : "Class image"),
      mediaAssetId,
    });
  };

  return (
    <div className="flex h-full min-h-[18rem] flex-col gap-3">
      {isHost ? (
        <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-44 flex-1 text-xs font-semibold text-slate-700">
              Display title
              <input
                value={title}
                disabled={busy}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={kind === "pdf" ? "Unit 1 slides" : "Discussion picture"}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <div className="inline-flex rounded-lg border border-slate-300 bg-slate-50 p-1">
              {(["image", "pdf"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setKind(option);
                    setUrl("");
                    setMediaAssetId(null);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                    kind === option ? "bg-slate-900 text-white" : "text-slate-700"
                  }`}
                >
                  {option === "image" ? "Image" : "PDF"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3">
            {kind === "image" ? (
              <MediaUrlControls
                label="Picture to show"
                value={url}
                disabled={busy}
                compact
                hidePreview
                onChange={(nextUrl, detail) => {
                  setUrl(nextUrl);
                  setMediaAssetId(detail?.mediaAssetId ?? null);
                }}
              />
            ) : (
              <label className="block text-xs font-semibold text-slate-700">
                PDF URL
                <input
                  type="url"
                  value={url}
                  disabled={busy}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    setMediaAssetId(null);
                  }}
                  placeholder="Paste a public PDF link"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !url.trim()}
              onClick={submit}
              className="rounded-lg bg-violet-800 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              Show to class
            </button>
            {presentation ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onPresent(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Clear
              </button>
            ) : null}
            {presentation?.kind === "image" ? (
              <button
                type="button"
                disabled={busy}
                onClick={onAnnotateImage}
                className="rounded-lg border border-teal-300 bg-teal-50 px-4 py-2 text-sm font-bold text-teal-900 hover:bg-teal-100 disabled:opacity-50"
              >
                Open on whiteboard
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {!presentation ? (
          <div className="flex h-full min-h-[18rem] items-center justify-center px-5 text-center text-sm text-slate-500">
            {isHost
              ? "Choose an image from the media library or paste a PDF link."
              : "Waiting for the teacher to share a presentation."}
          </div>
        ) : presentation.kind === "pdf" ? (
          <div className="flex h-full min-h-[24rem] flex-col">
            <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-2 text-center text-sm font-bold text-slate-800">
              {presentation.title}
            </div>
            <iframe
              title={presentation.title}
              src={`${presentation.url}#view=FitH`}
              className="min-h-0 w-full flex-1 border-0"
            />
          </div>
        ) : (
          <div className="flex h-full min-h-[18rem] flex-col bg-slate-100">
            <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-2 text-center text-sm font-bold text-slate-800">
              {presentation.title}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- teacher library URLs are dynamic */}
            <img
              src={presentation.url}
              alt={presentation.title}
              className="min-h-0 w-full flex-1 object-contain"
            />
          </div>
        )}
      </div>
    </div>
  );
}
