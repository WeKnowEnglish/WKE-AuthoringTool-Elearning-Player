"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import type { HomeworkCollectionCreativePresentationPart } from "@/lib/homework-collections";

export function CreativePresentationViewer({
  part,
  answers,
  studentName,
  allowFullscreen = true,
}: {
  part: HomeworkCollectionCreativePresentationPart;
  answers: Record<string, string>;
  studentName?: string;
  allowFullscreen?: boolean;
}) {
  const [slide, setSlide] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const titles = ["My VLOG idea", "My video plan", "First, next, last", "My VLOG beginning"];

  return (
    <div ref={rootRef} className="overflow-hidden rounded-2xl border border-slate-300 bg-slate-950 text-white shadow-lg">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 px-4 py-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-teal-300">{studentName ? `${studentName}'s VLOG` : "My VLOG"}</p>
          <h3 className="mt-0.5 text-lg font-black">{part.title}</h3>
        </div>
        {allowFullscreen ? (
          <button type="button" onClick={() => void rootRef.current?.requestFullscreen?.()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 text-xs font-bold"><Maximize2 className="h-4 w-4" />Display</button>
        ) : null}
      </header>

      <div className="min-h-[25rem] bg-[radial-gradient(circle_at_top_right,_#164e63,_#0f172a_55%)] p-5 sm:p-8">
        <p className="text-xs font-bold text-teal-200">{slide + 1} of 4</p>
        <h4 className="mt-2 text-2xl font-black sm:text-3xl">{titles[slide]}</h4>

        {slide === 0 ? (
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <p className="whitespace-pre-wrap rounded-2xl bg-white/10 p-5 text-lg font-semibold leading-8">{answers[part.idea.textId] || "No answer yet."}</p>
            <PresentationImage src={answers[part.idea.mediaId]} label="VLOG cover" />
          </div>
        ) : null}

        {slide === 1 ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {part.plan.fields.map((field) => (
              <div key={field.id} className="rounded-2xl bg-white/10 p-5">
                <p className="text-xs font-bold text-teal-200">{field.label}</p>
                <p className="mt-3 whitespace-pre-wrap text-lg font-semibold leading-7">{answers[field.id] || "No answer yet."}</p>
              </div>
            ))}
          </div>
        ) : null}

        {slide === 2 ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {part.story.frames.map((frame) => (
              <div key={frame.id}>
                <p className="mb-2 text-center text-sm font-extrabold text-teal-200">{frame.label}</p>
                <PresentationImage src={answers[frame.id]} label={frame.label} />
              </div>
            ))}
          </div>
        ) : null}

        {slide === 3 ? (
          <blockquote className="mx-auto mt-8 max-w-3xl whitespace-pre-wrap rounded-2xl bg-white/10 p-6 text-xl font-semibold leading-9 sm:text-2xl">
            “{answers[part.opening.textId] || "No answer yet."}”
          </blockquote>
        ) : null}
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-white/15 px-4 py-3">
        <button type="button" disabled={slide === 0} onClick={() => setSlide((current) => Math.max(0, current - 1))} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-white/20 px-3 text-sm font-bold disabled:opacity-30"><ChevronLeft className="h-4 w-4" />Back</button>
        <div className="flex gap-1.5" aria-label={`Slide ${slide + 1} of 4`}>
          {titles.map((title, index) => <button key={title} type="button" onClick={() => setSlide(index)} aria-label={`Show ${title}`} className={`h-2.5 w-2.5 rounded-full ${index === slide ? "bg-teal-300" : "bg-white/30"}`} />)}
        </div>
        <button type="button" disabled={slide === 3} onClick={() => setSlide((current) => Math.min(3, current + 1))} className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-teal-500 px-3 text-sm font-extrabold text-slate-950 disabled:opacity-30">Next<ChevronRight className="h-4 w-4" /></button>
      </footer>
    </div>
  );
}

function PresentationImage({ src, label }: { src?: string; label: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- authenticated homework media route
    <img src={src} alt={label} className="aspect-video w-full rounded-2xl bg-white object-contain" />
  ) : (
    <div className="grid aspect-video place-items-center rounded-2xl border border-dashed border-white/30 bg-white/5 text-sm font-semibold text-white/60">No picture yet</div>
  );
}
