import { Suspense } from "react";
import { WordAnnotationPilot } from "@/components/pilots/WordAnnotationPilot";

export const metadata = {
  title: "Word annotation — Pilot",
  description:
    "Standalone word annotation from Activity Bank or the Homework Template One Part 2 sample.",
};

export default function WordAnnotationPilotPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl p-6 text-lg font-extrabold text-kid-ink">
          Opening word annotation…
        </div>
      }
    >
      <WordAnnotationPilot />
    </Suspense>
  );
}
