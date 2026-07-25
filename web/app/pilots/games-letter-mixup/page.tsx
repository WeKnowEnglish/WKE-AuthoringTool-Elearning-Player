import { Suspense } from "react";
import { GamesLetterMixupPilot } from "@/components/pilots/GamesLetterMixupPilot";

export const metadata = {
  title: "Quizzes Letter Scramble — Pilot",
  description:
    "Studio Quiz letter scramble packs playing as Lesson Player letter_mixup screens",
};

export default function GamesLetterMixupPilotPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl p-6 text-lg font-extrabold text-kid-ink">
          Loading letter scramble pilot…
        </div>
      }
    >
      <GamesLetterMixupPilot />
    </Suspense>
  );
}
