import { CharacterKitEditor } from "@/components/character-kit-editor/CharacterKitEditor";

export const metadata = {
  title: "Character kit — Pilot",
  description: "Level 1 head kit authoring. Recipe JSON and sliders; locked toy-head hero.",
  robots: { index: false, follow: false },
};

export default function CharacterKitPilotPage() {
  return <CharacterKitEditor />;
}
