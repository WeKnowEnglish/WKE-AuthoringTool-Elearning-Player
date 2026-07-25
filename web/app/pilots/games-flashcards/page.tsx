import { Suspense } from "react";
import { GamesFlashcardsPilot } from "@/components/pilots/GamesFlashcardsPilot";

export const metadata = {
  title: "Quizzes Flashcards — Pilot",
  description: "Studio Quiz flashcard decks playing as Lesson Player flashcards screens",
};

export default function GamesFlashcardsPilotPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl p-6 text-lg font-extrabold text-kid-ink">
          Loading flashcards pilot…
        </div>
      }
    >
      <GamesFlashcardsPilot />
    </Suspense>
  );
}
