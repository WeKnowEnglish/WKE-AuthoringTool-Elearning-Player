import { Suspense } from "react";
import { VocabPlayerPilot } from "@/components/pilots/VocabPlayerPilot";

export default function VocabPlayerPilotPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-10 text-center text-sm text-stone-500">
          Loading vocabulary player…
        </div>
      }
    >
      <VocabPlayerPilot />
    </Suspense>
  );
}
