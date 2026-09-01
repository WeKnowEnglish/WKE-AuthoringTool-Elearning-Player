import type { Metadata } from "next";

import { Grade4Session2PracticePack } from "@/components/curriculum/Grade4Session2PracticePack";

export const metadata: Metadata = {
  title: "Session 2 Practice — Grade 4 Pilot",
  description: "Supporting activities for Find a Fair Friend.",
  robots: { index: false, follow: false },
};

export default function Grade4Session2PracticePilotPage() {
  return <Grade4Session2PracticePack pilotMode />;
}
