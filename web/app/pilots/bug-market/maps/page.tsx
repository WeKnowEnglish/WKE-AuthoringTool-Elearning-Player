import { notFound } from "next/navigation";
import { BugMarketMapViewer } from "@/components/pilots/BugMarketMapViewer";
import { BUG_MARKET_MAP_DOCUMENTS } from "@/lib/live-game/modes/bug-market/maps";

export default function BugMarketMapsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <BugMarketMapViewer maps={BUG_MARKET_MAP_DOCUMENTS} />;
}
