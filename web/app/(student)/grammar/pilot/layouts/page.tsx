import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GrammarPosterLayoutsPage } from "@/components/grammar/poster/GrammarPosterLayoutsPage";

export const metadata: Metadata = {
  title: "Grammar Layout Lab (Author)",
  description: "Layout demonstrations for grammar module authors.",
  robots: { index: false, follow: false },
};

export default function GrammarPilotLayoutsRoutePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <GrammarPosterLayoutsPage />;
}