import { Suspense } from "react";
import { PictureClozePilot } from "@/components/pilots/PictureClozePilot";

export const metadata = {
  title: "Picture cloze — Pilot",
  description:
    "Standalone picture cloze from Activity Bank or the tools sample (Homework Template One Part 1).",
};

export default function PictureClozePilotPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl p-6 text-lg font-extrabold text-kid-ink">
          Opening picture cloze…
        </div>
      }
    >
      <PictureClozePilot />
    </Suspense>
  );
}
