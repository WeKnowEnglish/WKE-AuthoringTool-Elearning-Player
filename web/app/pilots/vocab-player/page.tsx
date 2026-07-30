import { Suspense } from "react";
import { VocabPlayerPilot } from "@/components/pilots/VocabPlayerPilot";

export default function VocabPlayerPilotPage() {
  return (
    <div className="h-[100dvh] overflow-hidden">
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center text-sm text-stone-500">
            Loading vocabulary player…
          </div>
        }
      >
        <VocabPlayerPilot />
      </Suspense>
    </div>
  );
}
