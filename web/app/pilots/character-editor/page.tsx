import { CharacterEditor } from "@/components/character-editor/CharacterEditor";
import { safeAppReturnHref } from "@/lib/world/play-avatar";

export const metadata = {
  title: "Character editor — Pilot",
  description: "Single-base WKE girl editor with safe fused-texture recoloring.",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function CharacterEditorPilotPage({ searchParams }: Props) {
  const { next } = await searchParams;
  return <CharacterEditor returnHref={safeAppReturnHref(next, "") || null} />;
}
