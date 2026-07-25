import { Suspense } from "react";
import { GamesMcQuizPilot } from "@/components/pilots/GamesMcQuizPilot";

export const metadata = {
  title: "Quizzes MCQ — Pilot",
  description: "Studio Quiz multiple-choice pack playing as Lesson Player mc_quiz screens",
};

export default function GamesMcQuizPilotPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl p-6 text-lg font-extrabold text-kid-ink">
          Loading quiz pilot…
        </div>
      }
    >
      <GamesMcQuizPilot />
    </Suspense>
  );
}
