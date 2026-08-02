import { Suspense } from "react";
import { QuestionWritingPilot } from "@/components/pilots/QuestionWritingPilot";

export const metadata = {
  title: "Question writing — Pilot",
  description:
    "Standalone question writing from Activity Bank or the Homework Template One Part 6 sample.",
};

export default function QuestionWritingPilotPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl p-6 text-lg font-extrabold text-kid-ink">
          Opening question writing…
        </div>
      }
    >
      <QuestionWritingPilot />
    </Suspense>
  );
}
