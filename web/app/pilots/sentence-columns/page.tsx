import { Suspense } from "react";
import { SentenceColumnsPilot } from "@/components/pilots/SentenceColumnsPilot";

export const metadata = {
  title: "Sentence columns — Pilot",
  description:
    "Standalone sentence columns from Activity Bank or the Homework Template One Part 3 sample.",
};

export default function SentenceColumnsPilotPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl p-6 text-lg font-extrabold text-kid-ink">
          Opening sentence columns…
        </div>
      }
    >
      <SentenceColumnsPilot />
    </Suspense>
  );
}
