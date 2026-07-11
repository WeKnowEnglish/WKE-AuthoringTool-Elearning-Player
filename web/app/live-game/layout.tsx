import type { Metadata } from "next";
import { LiveGameProvider } from "@/components/live-game/LiveGameProvider";

export const metadata: Metadata = {
  title: "Live Game — We Know English",
  description: "Cooperative classroom live games.",
};

export default function LiveGameLayout({ children }: { children: React.ReactNode }) {
  return (
    <LiveGameProvider>
      <div className="min-h-dvh bg-[var(--background)] text-neutral-900">{children}</div>
    </LiveGameProvider>
  );
}
