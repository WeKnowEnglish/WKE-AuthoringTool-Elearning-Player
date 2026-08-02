import { Suspense } from "react";
import { GamesFillBlanksPilot } from "@/components/pilots/GamesFillBlanksPilot";

export const metadata = {
  title: "Quizzes Fill in the Blanks — Pilot",
  description:
    "Studio Quiz cloze packs playing as Lesson Player fill_blanks screens",
};

export default function GamesFillBlanksPilotPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl p-6 text-lg font-extrabold text-kid-ink">
          Loading fill-blanks pilot…
        </div>
      }
    >
      <GamesFillBlanksPilot />
    </Suspense>
  );
}
