import { HouseDesigner } from "@/components/house-designer/HouseDesigner";

export const metadata = {
  title: "House designer — WKE World Pilot",
  robots: { index: false, follow: false },
};

export default function HouseDesignerPilotPage() {
  return (
    <HouseDesigner
      backHref="/pilots/world"
      playHref="/pilots/world/play/cottage?inside=1"
      canExportStarter
    />
  );
}
