import { Suspense } from "react";
import { ExploreHotspotsWorkspace } from "@/components/teacher/activity-builder/hotspots/ExploreHotspotsWorkspace";

export const dynamic = "force-dynamic";

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
        <ExploreHotspotsWorkspace />
      </Suspense>
    </div>
  );
}
