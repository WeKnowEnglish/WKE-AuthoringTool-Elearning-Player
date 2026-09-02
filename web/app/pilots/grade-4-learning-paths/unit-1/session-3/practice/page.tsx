import type { Metadata } from "next";

import { Grade4Session3PracticePack } from "@/components/curriculum/Grade4Session3PracticePack";

export const metadata: Metadata = {
  title: "Session 3 Practice — Grade 4 Pilot",
  description: "Supporting activities for Find Something in Common.",
  robots: { index: false, follow: false },
};

export default function Grade4Session3PracticePilotPage() {
  return <Grade4Session3PracticePack pilotMode />;
}
