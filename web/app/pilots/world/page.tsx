import { WkeWorldPilot } from "@/components/world/WkeWorldPilot";
import { WorldPlacementProvider } from "@/components/world/WorldPlacementContext";
import { isHomeSpotId } from "@/components/world/world-landmasses";

export const metadata = {
  title: "WKE World — Pilot",
  description: "3D student map plus an edit mode for placing buildings.",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ at?: string }>;
};

export default async function WkeWorldGlobePilotPage({ searchParams }: Props) {
  const { at } = await searchParams;
  return (
    <WorldPlacementProvider persist>
      <WkeWorldPilot spawnSpot={isHomeSpotId(at) ? at : null} />
    </WorldPlacementProvider>
  );
}
