import { Suspense } from "react";
import { GamesTrueFalsePilot } from "@/components/pilots/GamesTrueFalsePilot";

export const metadata = {
  title: "Quizzes True / False — Pilot",
  description: "Studio Quiz true/false packs playing as Lesson Player true_false screens",
};

export default function GamesTrueFalsePilotPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl p-6 text-lg font-extrabold text-kid-ink">
          Loading true/false pilot…
        </div>
      }
    >
      <GamesTrueFalsePilot />
    </Suspense>
  );
}
