import { Suspense } from "react";
import { GamesLineMatchPilot } from "@/components/pilots/GamesLineMatchPilot";

export const metadata = {
  title: "Quizzes Line Match — Pilot",
  description: "Studio Quiz line-match packs playing as Lesson Player line_match screens",
};

export default function GamesLineMatchPilotPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl p-6 text-lg font-extrabold text-kid-ink">
          Loading line match pilot…
        </div>
      }
    >
      <GamesLineMatchPilot />
    </Suspense>
  );
}
