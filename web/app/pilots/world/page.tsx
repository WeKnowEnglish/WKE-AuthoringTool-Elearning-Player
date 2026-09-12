import type { Metadata } from "next";

import { WkeWorldGlobePilot } from "@/components/pilots/WkeWorldGlobePilot";

export const metadata: Metadata = {
  title: "WKE World — Globe foundation",
  description: "Interactive 3D globe foundation pilot.",
  robots: { index: false, follow: false },
};

export default function WkeWorldGlobePage() {
  return <WkeWorldGlobePilot />;
}
