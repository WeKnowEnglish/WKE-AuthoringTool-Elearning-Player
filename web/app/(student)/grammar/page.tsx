import { GrammarHubClient } from "@/components/grammar/hub/GrammarHubClient";
import { getPublishedGrammarModules } from "@/lib/grammar-builder/load-catalog";

export const metadata = {
  title: "Grammar — Learn",
  description: "Browse grammar poster topics for elementary ESL learners.",
};

export default function GrammarHubRoutePage() {
  const modules = getPublishedGrammarModules();
  return <GrammarHubClient modules={modules} />;
}
