import { Suspense } from "react";
import { ClozeChoicePilot } from "@/components/pilots/ClozeChoicePilot";

export const metadata = {
  title: "Cloze with choices — Pilot",
  description:
    "Standalone cloze-with-choices from Activity Bank or the Primary sample passage.",
};

export default function ClozeChoicePilotPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl p-6 text-lg font-extrabold text-kid-ink">
          Opening cloze with choices…
        </div>
      }
    >
      <ClozeChoicePilot />
    </Suspense>
  );
}
