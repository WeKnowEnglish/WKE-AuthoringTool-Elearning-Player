import type { Metadata } from "next";
import { Grade4Session1PracticePack } from "@/components/curriculum/Grade4Session1PracticePack";

export const metadata: Metadata = {
  title: "Welcome Fair Practice Pack — Grade 4 Pilot",
  description: "Vocabulary, spelling, grammar, sentence repair, and writing practice for Session 1.",
  robots: { index: false, follow: false },
};

export default function Grade4Session1PracticePilotPage() {
  return <Grade4Session1PracticePack pilotMode />;
}
