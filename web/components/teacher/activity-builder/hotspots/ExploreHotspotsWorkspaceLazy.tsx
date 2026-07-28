"use client";

import dynamic from "next/dynamic";
import { recordAppDiagnostic } from "@/lib/app-diagnostics/client";

/**
 * Client-only lazy shell so the hotspots route can paint before the large
 * authoring workspace + SAM-related graph downloads.
 */
export const ExploreHotspotsWorkspaceLazy = dynamic(
  () => {
    const startedAt = performance.now();
    recordAppDiagnostic("teacher", "chunk", "hotspots_workspace_start");
    return import("./ExploreHotspotsWorkspace")
      .then((module) => {
        recordAppDiagnostic(
          "teacher",
          "chunk",
          "hotspots_workspace",
          { success: true },
          {
            kind: "span",
            durationMs: Math.max(0, performance.now() - startedAt),
          },
        );
        return { default: module.ExploreHotspotsWorkspace };
      })
      .catch((error) => {
        recordAppDiagnostic(
          "teacher",
          "chunk",
          "hotspots_workspace",
          { error: error instanceof Error ? error.message : String(error) },
          {
            kind: "error",
            durationMs: Math.max(0, performance.now() - startedAt),
          },
        );
        throw error;
      });
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-stone-50 p-8 text-sm text-stone-500">
        Opening explore hotspots…
      </div>
    ),
  },
);
