import { Suspense } from "react";
import { DefinitionMatchPilot } from "@/components/pilots/DefinitionMatchPilot";

export const metadata = {
  title: "Definition match — Pilot",
  description:
    "Standalone definition match from Activity Bank or the Primary sample set.",
};

export default function DefinitionMatchPilotPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl p-6 text-lg font-extrabold text-kid-ink">
          Opening definition match…
        </div>
      }
    >
      <DefinitionMatchPilot />
    </Suspense>
  );
}
