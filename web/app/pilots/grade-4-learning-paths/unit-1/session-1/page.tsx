import type { Metadata } from "next";
import { Grade4Session1PilotV2 } from "@/components/curriculum/Grade4Session1PilotV2";

export const metadata: Metadata = {
  title: "Enter the Welcome Fair — Grade 4 Pilot",
  description: "Character-guided Session 1 pilot for the Grade 4 WKE Learning Path.",
  robots: { index: false, follow: false },
};

export default function Grade4Session1PilotPage() {
  return <Grade4Session1PilotV2 pilotMode />;
}
