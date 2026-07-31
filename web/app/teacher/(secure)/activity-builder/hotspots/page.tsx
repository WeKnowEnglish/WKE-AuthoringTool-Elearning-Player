import { Suspense } from "react";
import { ExploreHotspotsWorkspaceLazy } from "@/components/teacher/activity-builder/hotspots/ExploreHotspotsWorkspaceLazy";

/**
 * Auth already force-dynamics the teacher secure layout. Avoid statically
 * importing the large client workspace here — that inflated TTFB/RSC payload.
 */
export default function TeacherExploreHotspotsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Suspense
        fallback={
          <div className="flex min-h-0 flex-1 items-center justify-center bg-stone-50 p-8 text-sm text-stone-500">
            Opening explore hotspots…
          </div>
        }
      >
        <ExploreHotspotsWorkspaceLazy />
      </Suspense>
    </div>
  );
}
