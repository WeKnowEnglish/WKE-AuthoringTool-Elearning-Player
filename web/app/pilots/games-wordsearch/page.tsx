import { Suspense } from "react";
import { GamesWordGamePilot } from "@/components/pilots/GamesWordGamePilot";

export const metadata = { title: "Quiz Word Search — Preview" };

export default function Page() {
  return <Suspense fallback={<p className="p-6">Loading word search…</p>}><GamesWordGamePilot format="wordsearch" /></Suspense>;
}
