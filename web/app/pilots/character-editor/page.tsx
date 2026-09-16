import { CharacterEditor } from "@/components/character-editor/CharacterEditor";

export const metadata = {
  title: "Character editor — Pilot",
  description: "Modular 3D student avatar editor. Placeholder parts now; Shape Builder GLBs later.",
  robots: { index: false, follow: false },
};

export default function CharacterEditorPilotPage() {
  return <CharacterEditor />;
}
