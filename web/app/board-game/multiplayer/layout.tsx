import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Multiplayer Board Game — We Know English",
  description: "Join a classroom board game lobby.",
};

export default function BoardGameMultiplayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-dvh bg-[var(--background)] text-neutral-900">{children}</div>;
}
