"use client";

import { useEffect, useId, useState } from "react";
import { Expand, X } from "lucide-react";
import { KidButton } from "@/components/kid-ui/KidButton";

type Props = {
  src: string;
  alt: string;
  className?: string;
};

export function PictureStoryFrameImage({ src, alt, className }: Props) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!src.trim()) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-2xl bg-stone-100 text-sm font-bold text-stone-500">
        Picture coming soon
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full overflow-hidden rounded-2xl text-left focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-kid-ink"
        aria-label={`See the whole picture: ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className={className ?? "max-h-80 w-full object-cover object-top"}
        />
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-teal-900 shadow-sm">
          <Expand className="h-3.5 w-3.5" aria-hidden />
          Tap to see the whole picture
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[90] flex flex-col bg-slate-950/88 p-3 sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="flex shrink-0 flex-col items-center gap-2 pb-3">
            <KidButton autoFocus onClick={() => setOpen(false)}>
              <span className="inline-flex items-center gap-2">
                <X className="h-6 w-6" aria-hidden />
                Close picture
              </span>
            </KidButton>
            <p id={titleId} className="text-center text-sm font-bold text-white">
              {alt || "Story picture"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex min-h-0 flex-1 cursor-zoom-out items-center justify-center overflow-auto rounded-2xl"
            aria-label="Close picture"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          </button>
        </div>
      ) : null}
    </>
  );
}
