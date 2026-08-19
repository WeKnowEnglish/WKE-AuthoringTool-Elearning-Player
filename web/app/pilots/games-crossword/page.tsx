import { Suspense } from "react";
import { GamesWordGamePilot } from "@/components/pilots/GamesWordGamePilot";

export const metadata = { title: "Quiz Crossword — Preview" };

export default function Page() {
  return <Suspense fallback={<p className="p-6">Loading crossword…</p>}><GamesWordGamePilot format="crossword" /></Suspense>;
}
