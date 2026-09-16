import { WkeWorldPilot } from "@/components/world/WkeWorldPilot";
import { WorldPlacementProvider } from "@/components/world/WorldPlacementContext";

export const metadata = {
  title: "WKE World — Pilot",
  description: "3D student map plus an edit mode for placing buildings.",
  robots: { index: false, follow: false },
};

export default function WkeWorldGlobePilotPage() {
  return (
    <WorldPlacementProvider persist>
      <WkeWorldPilot />
    </WorldPlacementProvider>
  );
}
