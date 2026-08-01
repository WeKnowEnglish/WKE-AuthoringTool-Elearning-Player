import { Suspense } from "react";
import { ClozeOpenPilot } from "@/components/pilots/ClozeOpenPilot";

export const metadata = {
  title: "Open cloze — Pilot",
  description:
    "Standalone open cloze from Activity Bank or the Primary sample passage.",
};

export default function ClozeOpenPilotPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl p-6 text-lg font-extrabold text-kid-ink">
          Opening open cloze…
        </div>
      }
    >
      <ClozeOpenPilot />
    </Suspense>
  );
}
