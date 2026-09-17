"use client";

import Link from "next/link";
import { faceEditorHref, outfitEditorHref } from "@/lib/world/play-avatar";

type Props = {
  returnTo: string;
  surface?: "student" | "pilot";
  onClose: () => void;
};

export function WardrobePanel({ returnTo, surface = "student", onClose }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-end justify-center bg-black/35 p-4 pb-28 sm:items-center sm:pb-4">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl bg-[#fff7ed] p-4 text-slate-900 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-extrabold">Wardrobe</p>
            <p className="mt-1 text-sm text-slate-700">Change your clothes, or make a cool face for your avatar.</p>
          </div>
          <button
            type="button"
            className="rounded-md bg-white px-2.5 py-1 text-sm font-semibold text-slate-800 hover:bg-slate-100"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Link
            href={outfitEditorHref(returnTo, surface)}
            className="rounded-xl bg-sky-400 px-4 py-3 text-center text-sm font-bold text-slate-900 hover:bg-sky-300"
          >
            Change outfit
          </Link>
          <Link
            href={faceEditorHref(returnTo, surface)}
            className="rounded-xl bg-amber-300 px-4 py-3 text-center text-sm font-bold text-slate-900 hover:bg-amber-200"
          >
            Make my face
          </Link>
        </div>
      </div>
    </div>
  );
}
