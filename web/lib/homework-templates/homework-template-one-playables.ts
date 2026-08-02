import type {
  PictureClozeSection,
  PictureWritingSection,
  QuestionWritingSection,
  SentenceColumnsSection,
  VerbTableSection,
  WordAnnotationSection,
} from "@/lib/homework-templates/homework-template-one";
import type { PictureClozePlayable } from "@/lib/picture-cloze";
import type { PictureWritingPlayable } from "@/lib/picture-writing";
import type { QuestionWritingPlayable } from "@/lib/question-writing";
import type { SentenceColumnsPlayable } from "@/lib/sentence-columns";
import type { VerbTablePlayable } from "@/lib/verb-table";
import type { WordAnnotationPlayable } from "@/lib/word-annotation";

/** Map HT1 Part 1 onto the shared picture cloze player. */
export function pictureClozePlayableFromHt1(
  section: PictureClozeSection,
): PictureClozePlayable {
  return {
    title: section.title,
    instructions: section.instructions,
    wordBank: [...section.wordBank],
    items: section.items.map((item) => ({
      ...item,
      acceptedAnswers: [...item.acceptedAnswers],
    })),
  };
}

/** Map HT1 Part 2 onto the shared word annotation player. */
export function wordAnnotationPlayableFromHt1(
  section: WordAnnotationSection,
): WordAnnotationPlayable {
  return {
    title: section.title,
    instructions: section.instructions,
    rememberText: section.rememberText,
    sentences: section.sentences.map((sentence) => ({
      id: sentence.id,
      tokens: sentence.tokens.map((token) => ({ ...token })),
    })),
  };
}

/** Map HT1 Part 3 onto the shared sentence columns player. */
export function sentenceColumnsPlayableFromHt1(
  section: SentenceColumnsSection,
): SentenceColumnsPlayable {
  return {
    title: section.title,
    instructions: section.instructions,
    columns: section.columns.map((column) => ({ ...column })),
    challenges: section.challenges.map((challenge) => ({
      id: challenge.id,
      pieces: challenge.pieces.map((piece) => ({ ...piece })),
    })),
  };
}

/** Map HT1 Part 4 onto the shared verb table player. */
export function verbTablePlayableFromHt1(
  section: VerbTableSection,
): VerbTablePlayable {
  return {
    title: section.title,
    instructions: section.instructions,
    columns: section.columns.map((column) => ({ ...column })),
    rows: section.rows.map((row) => ({
      id: row.id,
      forms: { ...row.forms },
      missing: [...row.missing],
    })),
  };
}

/** Map HT1 Part 5 onto the shared picture writing player. */
export function pictureWritingPlayableFromHt1(
  section: PictureWritingSection,
): PictureWritingPlayable {
  return {
    title: section.title,
    instructions: section.instructions,
    prompts: section.prompts.map((prompt) => ({
      ...prompt,
      promptWords: [...prompt.promptWords],
      requiredWords: [...prompt.requiredWords],
    })),
  };
}

/** Map HT1 Part 6 onto the shared question writing player. */
export function questionWritingPlayableFromHt1(
  section: QuestionWritingSection,
): QuestionWritingPlayable {
  return {
    title: section.title,
    instructions: section.instructions,
    workedExample: { ...section.workedExample },
    prompts: section.prompts.map((prompt) => ({
      ...prompt,
      promptWords: [...prompt.promptWords],
      requiredWords: [...prompt.requiredWords],
      helpingVerbs: [...prompt.helpingVerbs],
    })),
  };
}
