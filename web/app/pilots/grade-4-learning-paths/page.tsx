import type { Metadata } from "next";
import { Grade4LearningPathsCatalog } from "@/components/curriculum/Grade4LearningPathsCatalog";

export const metadata: Metadata = {
  title: "Grade 4 WKE Learning Paths — Pilot",
  description: "Grade 4 Cambridge Movers curriculum course-management pilot.",
  robots: { index: false, follow: false },
};

export default function Grade4LearningPathsPilotPage() {
  return <Grade4LearningPathsCatalog pilotMode />;
}

