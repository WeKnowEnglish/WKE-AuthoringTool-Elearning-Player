import fs from "node:fs";
import path from "node:path";

const webRoot = path.resolve(import.meta.dirname, "..");
const pilotDir = path.join(webRoot, "components/grammar/pilot");
const posterDir = path.join(webRoot, "components/grammar/poster");

const fileRenames = {
  "pilot-there-is-data.ts": "poster-view-model.ts",
  "pilot-types.ts": "poster-variant.ts",
  "GrammarPilotPage.tsx": "GrammarPosterPage.tsx",
  "GrammarPilotLayoutsPage.tsx": "GrammarPosterLayoutsPage.tsx",
  "PilotHero.tsx": "PosterHero.tsx",
  "PilotSectionCard.tsx": "PosterSectionCard.tsx",
  "PilotSectionBody.tsx": "PosterSectionBody.tsx",
  "PilotExampleRow.tsx": "PosterExampleRow.tsx",
  "PilotCategoryPill.tsx": "PosterCategoryPill.tsx",
  "PilotGlanceRule.tsx": "PosterGlanceRule.tsx",
  "PilotNoteBox.tsx": "PosterNoteBox.tsx",
  "PilotPatternRow.tsx": "PosterPatternRow.tsx",
  "PilotLayoutShowcase.tsx": "PosterLayoutShowcase.tsx",
};

const replacements = [
  [/PilotSection/g, "PosterSection"],
  [/PilotHeroData/g, "PosterHeroData"],
  [/PilotExample/g, "PosterExample"],
  [/PilotPattern/g, "PosterPattern"],
  [/PilotGlanceRuleData/g, "PosterGlanceRuleData"],
  [/PilotGlanceRule/g, "PosterGlanceRule"],
  [/PilotSectionColor/g, "PosterSectionColor"],
  [/GrammarPilotVariant/g, "GrammarPosterVariant"],
  [/PilotCategoryPill/g, "PosterCategoryPill"],
  [/PilotExampleRow/g, "PosterExampleRow"],
  [/PilotNoteBox/g, "PosterNoteBox"],
  [/PilotPatternRow/g, "PosterPatternRow"],
  [/PilotSectionCard/g, "PosterSectionCard"],
  [/PilotSectionBody/g, "PosterSectionBody"],
  [/PilotLayoutShowcase/g, "PosterLayoutShowcase"],
  [/PilotHero/g, "PosterHero"],
  [/GrammarPilotPage/g, "GrammarPosterPage"],
  [/GrammarPilotLayoutsPage/g, "GrammarPosterLayoutsPage"],
  [/PILOT_HERO/g, "POSTER_HERO_FALLBACK"],
  [/LAYOUT_SHOWCASE_DEMOS/g, "POSTER_LAYOUT_SHOWCASE_DEMOS"],
  [/\.\/pilot-there-is-data/g, "./poster-view-model"],
  [/\.\/pilot-types/g, "./poster-variant"],
  [/@\/components\/grammar\/pilot\/pilot-there-is-data/g, "@/components/grammar/poster/poster-view-model"],
  [/@\/components\/grammar\/pilot\//g, "@/components/grammar/poster/"],
];

fs.mkdirSync(posterDir, { recursive: true });

for (const [oldName, newName] of Object.entries(fileRenames)) {
  const src = path.join(pilotDir, oldName);
  let content = fs.readFileSync(src, "utf8");
  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
  }
  fs.writeFileSync(path.join(posterDir, newName), content);
}

console.log("Created poster components:", Object.values(fileRenames).join(", "));
