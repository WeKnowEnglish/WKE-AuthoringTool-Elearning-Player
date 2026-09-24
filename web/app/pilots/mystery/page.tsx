import { MysteryPlayer } from "@/components/mystery/MysteryPlayer";
import { missingAcRemoteMystery } from "@/content/mysteries/missing-ac-remote";

export const metadata = {
  title: "The Missing A/C Remote — Mystery Pilot",
  description:
    "Phase 1 of the reusable We Know English click-and-solve mystery engine.",
};

export default function MysteryPilotPage() {
  return <MysteryPlayer definition={missingAcRemoteMystery} />;
}
