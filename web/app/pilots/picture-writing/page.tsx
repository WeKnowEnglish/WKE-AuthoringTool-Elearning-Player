import { Suspense } from "react";
import { PictureWritingPilot } from "@/components/pilots/PictureWritingPilot";

export const metadata = {
  title: "Picture writing — Pilot",
  description:
    "Standalone picture writing from Activity Bank or the Homework Template One Part 5 sample.",
};

export default function PictureWritingPilotPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl p-6 text-lg font-extrabold text-kid-ink">
          Opening picture writing…
        </div>
      }
    >
      <PictureWritingPilot />
    </Suspense>
  );
}
