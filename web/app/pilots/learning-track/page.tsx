import { Suspense } from "react";
import { LearningTrackPilot } from "@/components/pilots/LearningTrackPilot";

export const metadata = {
  title: "Learning Track — Pilot",
  description: "Studio-compiled self-study tracks playing as Lesson Player screen sequences",
};

export default function LearningTrackPilotPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl p-6 text-lg font-extrabold text-kid-ink">
          Loading learning track pilot…
        </div>
      }
    >
      <LearningTrackPilot />
    </Suspense>
  );
}
