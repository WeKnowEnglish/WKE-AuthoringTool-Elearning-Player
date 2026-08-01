import { Suspense } from "react";
import { PictureStoryPilot } from "@/components/pilots/PictureStoryPilot";

export const metadata = {
  title: "Picture story — Pilot",
  description:
    "Standalone picture story from Activity Bank or the Primary sample frames.",
};

export default function PictureStoryPilotPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl p-6 text-lg font-extrabold text-kid-ink">
          Opening picture story…
        </div>
      }
    >
      <PictureStoryPilot />
    </Suspense>
  );
}
