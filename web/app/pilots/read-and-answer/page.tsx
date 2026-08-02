import { Suspense } from "react";
import { ReadAndAnswerPilot } from "@/components/pilots/ReadAndAnswerPilot";

export const metadata = {
  title: "Read and answer — Pilot",
  description:
    "Standalone read-and-answer from Activity Bank or the Primary sample passage.",
};

export default function ReadAndAnswerPilotPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl p-6 text-lg font-extrabold text-kid-ink">
          Opening read and answer…
        </div>
      }
    >
      <ReadAndAnswerPilot />
    </Suspense>
  );
}
