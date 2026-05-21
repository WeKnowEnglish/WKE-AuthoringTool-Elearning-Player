import type { LessonScreenRow } from "@/lib/data/catalog";
import { buildDefaultOpeningStartPayload } from "@/lib/lesson-bookends";
import { shuffleWithSeed } from "@/lib/vocabulary-templates/shuffle";
import type {
  BuildReadingSetOptions,
  ReadingItem,
  ReadingSetDefinition,
  ReadingTfItem,
} from "./types";

export const GROUP_TF_CATEGORY = "reading-tf-category";
export const GROUP_TF_CATEGORY_TITLE = "Is this sentence true?";
export const GROUP_PICTURE_SQUARE = "reading-picture-square";
export const GROUP_PICTURE_SQUARE_TITLE = "Does the sentence match the picture?";
export const GROUP_CLOZE_PARK = "reading-cloze-park";
export const GROUP_CLOZE_PARK_TITLE = "A day at the park";
export const GROUP_STORY_SA = "reading-story-sa";
export const GROUP_STORY_SA_TITLE = "Finish the sentence";

const AUTO_ADVANCE = { auto_advance_on_pass: true as const };

function syntheticScreenId(setId: string, orderIndex: number): string {
  return `reading-${setId}-${orderIndex}`;
}

function toLessonScreenRow(
  setId: string,
  orderIndex: number,
  screenType: string,
  payload: unknown,
): LessonScreenRow {
  return {
    id: syntheticScreenId(setId, orderIndex),
    lesson_id: `reading-${setId}`,
    order_index: orderIndex,
    screen_type: screenType,
    payload,
  };
}

function itemById(def: ReadingSetDefinition): Map<string, ReadingItem> {
  return new Map(def.items.map((i) => [i.id, i]));
}

function buildTrueFalsePayload(
  item: ReadingItem,
  row: ReadingTfItem,
  groupId: string,
  groupTitle: string,
  groupOrder: number,
): Record<string, unknown> {
  return {
    ...AUTO_ADVANCE,
    type: "interaction",
    subtype: "true_false",
    reading_item_id: item.id,
    image_url: item.imageUrl,
    image_fit: "contain",
    statement: row.statement,
    correct: row.correct,
    quiz_group_id: groupId,
    quiz_group_title: groupTitle,
    quiz_group_order: groupOrder,
  };
}

function buildTfScreens(
  setId: string,
  def: ReadingSetDefinition,
  rows: ReadingTfItem[],
  groupId: string,
  groupTitle: string,
  startOrder: number,
): LessonScreenRow[] {
  const items = itemById(def);
  return rows.map((row, i) => {
    const item = items.get(row.itemId);
    if (!item) throw new Error(`reading build: missing item ${row.itemId}`);
    return toLessonScreenRow(
      setId,
      startOrder + i,
      "interaction",
      buildTrueFalsePayload(item, row, groupId, groupTitle, i),
    );
  });
}

/**
 * Materialize a reading set into lesson player screens for test-start.
 */
export function buildReadingSetScreens(
  def: ReadingSetDefinition,
  options?: BuildReadingSetOptions,
): LessonScreenRow[] {
  const seed = options?.seed?.trim() || def.id;
  const rows: LessonScreenRow[] = [];
  let order = 0;

  const opening = buildDefaultOpeningStartPayload(def.title);
  opening.image_url = def.coverImageUrl;
  opening.image_fit = "contain";
  rows.push(toLessonScreenRow(def.id, order++, "start", opening));

  rows.push(
    ...buildTfScreens(
      def.id,
      def,
      def.generalTrueFalse,
      GROUP_TF_CATEGORY,
      GROUP_TF_CATEGORY_TITLE,
      order,
    ),
  );
  order += def.generalTrueFalse.length;

  rows.push(
    ...buildTfScreens(
      def.id,
      def,
      def.pictureTrueFalse,
      GROUP_PICTURE_SQUARE,
      GROUP_PICTURE_SQUARE_TITLE,
      order,
    ),
  );
  order += def.pictureTrueFalse.length;

  const wordBank = shuffleWithSeed(def.cloze.wordBank, `${seed}:cloze-bank`);
  rows.push(
    toLessonScreenRow(def.id, order++, "interaction", {
      ...AUTO_ADVANCE,
      type: "interaction",
      subtype: "fill_blanks",
      image_url: def.cloze.heroImageUrl ?? def.coverImageUrl,
      image_fit: "contain",
      image_size: "small",
      body_text: "",
      template: def.cloze.template,
      blanks: def.cloze.blanks,
      word_bank: wordBank,
      quiz_group_id: GROUP_CLOZE_PARK,
      quiz_group_title: GROUP_CLOZE_PARK_TITLE,
      quiz_group_order: 0,
    }),
  );

  const items = itemById(def);
  def.shortAnswers.forEach((sa, i) => {
    const item = items.get(sa.itemId);
    if (!item) throw new Error(`reading build: missing item ${sa.itemId}`);
    rows.push(
      toLessonScreenRow(def.id, order++, "interaction", {
        ...AUTO_ADVANCE,
        type: "interaction",
        subtype: "short_answer",
        reading_item_id: item.id,
        image_url: item.imageUrl,
        image_fit: "contain",
        prompt: sa.prompt,
        acceptable_answers: sa.acceptable_answers,
        case_insensitive: true,
        normalize_whitespace: true,
        quiz_group_id: GROUP_STORY_SA,
        quiz_group_title: GROUP_STORY_SA_TITLE,
        quiz_group_order: i,
      }),
    );
  });

  return rows;
}
