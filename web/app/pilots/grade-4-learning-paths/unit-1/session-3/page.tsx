import type { Metadata } from "next";

import { Grade4Session3Pilot } from "@/components/curriculum/Grade4Session3Pilot";

export const metadata: Metadata = {
  title: "Find Something in Common — Grade 4 Pilot",
  description: "Playable Session 3 pilot for the Grade 4 WKE Learning Path.",
  robots: { index: false, follow: false },
};

export default function Grade4Session3PilotPage() {
  return <Grade4Session3Pilot pilotMode />;
}
