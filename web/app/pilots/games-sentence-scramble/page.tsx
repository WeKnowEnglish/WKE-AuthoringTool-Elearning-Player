import { Suspense } from "react";
import { GamesSentenceScramblePilot } from "@/components/pilots/GamesSentenceScramblePilot";

export const metadata = {
  title: "Quizzes Sentence Scramble — Pilot",
  description:
    "Studio Quiz sentence scramble packs playing as Lesson Player drag_sentence screens",
};

export default function GamesSentenceScramblePilotPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl p-6 text-lg font-extrabold text-kid-ink">
          Loading sentence scramble pilot…
        </div>
      }
    >
      <GamesSentenceScramblePilot />
    </Suspense>
  );
}
