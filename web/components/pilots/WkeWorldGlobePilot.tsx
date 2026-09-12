"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const WorldGlobe = dynamic(
  () =>
    import("@/components/world/WorldGlobe").then((module) => ({
      default: module.WorldGlobe,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-white/80">
        <p className="text-sm font-semibold">Loading globe…</p>
      </div>
    ),
  },
);

export function WkeWorldGlobePilot() {
  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#0b1220]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-4 p-4">
        <div>
          <p className="text-sm font-semibold text-white/90">WKE World · foundation</p>
          <p className="text-xs text-white/55">Interactive globe prototype</p>
        </div>
        <Link
          href="/pilots"
          className="pointer-events-auto rounded-md bg-white/12 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20"
        >
          Back to pilots
        </Link>
      </div>
      <WorldGlobe />
    </div>
  );
}
