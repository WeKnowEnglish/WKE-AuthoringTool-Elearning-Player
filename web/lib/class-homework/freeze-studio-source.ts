import { ASSIGNABLE_DOCUMENT_HOMEWORK_ERROR, isAssignableStudioHomeworkFormat } from "@/lib/class-homework/assignable-studio-formats";
import { freezeClozeChoiceHomeworkPayload } from "@/lib/class-homework/freeze-cloze-choice";
import { freezeClozeOpenHomeworkPayload } from "@/lib/class-homework/freeze-cloze-open";
import { freezeDefinitionMatchHomeworkPayload } from "@/lib/class-homework/freeze-definition-match";
import { freezePictureClozeHomeworkPayload } from "@/lib/class-homework/freeze-picture-cloze";
import { freezePictureStoryHomeworkPayload } from "@/lib/class-homework/freeze-picture-story";
import { freezePictureWritingHomeworkPayload } from "@/lib/class-homework/freeze-picture-writing";
import { freezeQuestionWritingHomeworkPayload } from "@/lib/class-homework/freeze-question-writing";
import { freezeReadAndAnswerHomeworkPayload } from "@/lib/class-homework/freeze-read-and-answer";
import { freezeSentenceColumnsHomeworkPayload } from "@/lib/class-homework/freeze-sentence-columns";
import { freezeStudioActivityHomeworkPayload } from "@/lib/class-homework/freeze-studio-activity";
import { freezeVerbTableHomeworkPayload } from "@/lib/class-homework/freeze-verb-table";
import { freezeWordAnnotationHomeworkPayload } from "@/lib/class-homework/freeze-word-annotation";
import type { ClassHomeworkPayload } from "@/lib/class-homework/types";
import type { StudioActivityFormat } from "@/lib/studio-activities/types";

export type StudioHomeworkSource = {
  activityId: string;
  format: StudioActivityFormat | string;
  pack: unknown;
  authoring: unknown;
  titleHint?: string | null;
};

/**
 * Freeze any assignable Activity Bank row through one shared resolver.
 * Both Track Builder and the class Homework page use this contract so an
 * activity cannot be assignable from one surface but rejected by the other.
 */
export function freezeStudioHomeworkSource(
  source: StudioHomeworkSource,
): ClassHomeworkPayload {
  const activityId = source.activityId.trim();
  if (!activityId) throw new Error("Missing Activity Bank item.");
  if (!isAssignableStudioHomeworkFormat(source.format)) {
    throw new Error(ASSIGNABLE_DOCUMENT_HOMEWORK_ERROR);
  }

  const common = {
    activityId,
    pack: source.pack,
    authoring: source.authoring,
    titleHint: source.titleHint,
  };

  if (source.format === "cloze_open") {
    return freezeClozeOpenHomeworkPayload({ ...common, format: "cloze_open" });
  }
  if (source.format === "read_and_answer") {
    return freezeReadAndAnswerHomeworkPayload({ ...common, format: "read_and_answer" });
  }
  if (source.format === "picture_story") {
    return freezePictureStoryHomeworkPayload({ ...common, format: "picture_story" });
  }
  if (source.format === "cloze_choice") {
    return freezeClozeChoiceHomeworkPayload({ ...common, format: "cloze_choice" });
  }
  if (source.format === "definition_match") {
    return freezeDefinitionMatchHomeworkPayload({ ...common, format: "definition_match" });
  }
  if (source.format === "question_writing") {
    return freezeQuestionWritingHomeworkPayload({ ...common, format: "question_writing" });
  }
  if (source.format === "picture_writing") {
    return freezePictureWritingHomeworkPayload({ ...common, format: "picture_writing" });
  }
  if (source.format === "word_annotation") {
    return freezeWordAnnotationHomeworkPayload({ ...common, format: "word_annotation" });
  }
  if (source.format === "sentence_columns") {
    return freezeSentenceColumnsHomeworkPayload({ ...common, format: "sentence_columns" });
  }
  if (source.format === "verb_table") {
    return freezeVerbTableHomeworkPayload({ ...common, format: "verb_table" });
  }
  if (source.format === "picture_cloze") {
    return freezePictureClozeHomeworkPayload({ ...common, format: "picture_cloze" });
  }

  return freezeStudioActivityHomeworkPayload({
    activityId,
    format: source.format as Parameters<typeof freezeStudioActivityHomeworkPayload>[0]["format"],
    pack: source.pack,
    titleHint: source.titleHint,
  });
}
