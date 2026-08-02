import { Suspense } from "react";
import { VerbTablePilot } from "@/components/pilots/VerbTablePilot";

export const metadata = {
  title: "Verb table — Pilot",
  description:
    "Standalone verb table from Activity Bank or the Homework Template One Part 4 sample.",
};

export default function VerbTablePilotPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl p-6 text-lg font-extrabold text-kid-ink">
          Opening verb table…
        </div>
      }
    >
      <VerbTablePilot />
    </Suspense>
  );
}
