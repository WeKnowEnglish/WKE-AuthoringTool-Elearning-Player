import { fillBlanksPayloadSchema } from "@/lib/lesson-schemas";
import type { ExploreSceneDefinition } from "@/lib/explore/scenes/types";
import { getWordDisplayInfo } from "@/lib/word-collection";
import { seededRandom } from "@/lib/curated-sentences/quiz-compiler-builders";

function shuffleInPlace<T>(arr: T[], rand: () => number) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

/** Build one fill_blanks payload from scene cloze sentences and words collected this run. */
export function buildExploreSceneClozePayload(
  scene: ExploreSceneDefinition,
  collectedWordIds: string[],
  seed: string,
) {
  const parts: string[] = [];
  const blanks: { id: string; acceptable: string[] }[] = [];

  scene.cloze.sentences.forEach((sentence, index) => {
    const blankKey = String(index + 1);
    const placeholder = `__${sentence.blankId}__`;
    const replacement = `__${blankKey}__`;
    if (!sentence.template.includes(placeholder)) {
      throw new Error(
        `Scene cloze sentence ${sentence.id} missing placeholder ${placeholder}`,
      );
    }
    parts.push(sentence.template.replace(placeholder, replacement));

    const acceptable = sentence.wordIds
      .map((wordId) => getWordDisplayInfo(wordId)?.lemma?.trim())
      .filter((lemma): lemma is string => Boolean(lemma));
    if (acceptable.length === 0) {
      throw new Error(`Scene cloze sentence ${sentence.id} has no valid lemmas`);
    }
    blanks.push({ id: blankKey, acceptable });
  });

  const bankSet = new Set<string>();
  for (const wordId of collectedWordIds) {
    const lemma = getWordDisplayInfo(wordId)?.lemma?.trim();
    if (lemma) bankSet.add(lemma);
  }
  for (const b of blanks) {
    for (const a of b.acceptable) bankSet.add(a);
  }
  const bank = [...bankSet];
  const rand = seededRandom(`${seed}:cloze-bank`);
  shuffleInPlace(bank, rand);

  return fillBlanksPayloadSchema.parse({
    type: "interaction",
    subtype: "fill_blanks",
    body_text: scene.cloze.body_text ?? "Put the words into brother's sentences.",
    image_url: scene.cloze.image_url,
    image_fit: "contain",
    template: parts.join(" "),
    blanks,
    word_bank: bank,
  });
}
