import { Suspense } from "react";
import { GamesListenAndChoosePilot } from "@/components/pilots/GamesListenAndChoosePilot";

export const metadata = {
  title: "Quizzes Listen & Choose — Pilot",
  description:
    "Studio Quiz listen-and-choose pack: short dialog, replay, three picture choices",
};

export default function GamesListenAndChoosePilotPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl p-6 text-lg font-extrabold text-kid-ink">
          Loading listen & choose pilot…
        </div>
      }
    >
      <GamesListenAndChoosePilot />
    </Suspense>
  );
}
