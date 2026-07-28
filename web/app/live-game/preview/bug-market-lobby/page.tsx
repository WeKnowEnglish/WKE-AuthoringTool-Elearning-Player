import type { Metadata } from "next";
import { BugMarketLobbyPreview } from "@/components/live-game/bug-market/BugMarketLobbyPreview";

export const metadata: Metadata = {
  title: "Bug Market Lobby Preview — We Know English",
  robots: { index: false, follow: false },
};

export default function BugMarketLobbyPreviewPage() {
  return <BugMarketLobbyPreview />;
}
