import { CharacterKitEditor } from "@/components/character-kit-editor/CharacterKitEditor";
import { safeAppReturnHref } from "@/lib/world/play-avatar";

export const metadata = {
  title: "Character kit — Pilot",
  description: "Level 1 head kit authoring. Recipe JSON and sliders; locked toy-head hero.",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function CharacterKitPilotPage({ searchParams }: Props) {
  const { next } = await searchParams;
  return <CharacterKitEditor returnHref={safeAppReturnHref(next, "") || null} />;
}
