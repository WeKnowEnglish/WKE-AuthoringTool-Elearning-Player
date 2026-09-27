import { CharacterProduction1Viewer } from "@/components/character/production/CharacterProduction1Viewer";

export const metadata = {
  title: "Character Production 1 — Pilot",
  description: "Locked vinyl full-body kid built with the current kit lathe and rounded body parts.",
  robots: { index: false, follow: false },
};

export default function CharacterProduction1Page() {
  return <CharacterProduction1Viewer />;
}
