import { Suspense } from "react";
import { GamesWordGamePilot } from "@/components/pilots/GamesWordGamePilot";

export const metadata = { title: "Quiz Memory — Preview" };

export default function Page() {
  return <Suspense fallback={<p className="p-6">Loading memory game…</p>}><GamesWordGamePilot format="memory" /></Suspense>;
}
