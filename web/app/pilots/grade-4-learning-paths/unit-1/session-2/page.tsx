import type { Metadata } from "next";

import { Grade4Session2Pilot } from "@/components/curriculum/Grade4Session2Pilot";

export const metadata: Metadata = {
  title: "Find a Fair Friend — Grade 4 Pilot",
  description: "Playable Session 2 pilot for the Grade 4 WKE Learning Path.",
  robots: { index: false, follow: false },
};

export default function Grade4Session2PilotPage() {
  return <Grade4Session2Pilot pilotMode />;
}
