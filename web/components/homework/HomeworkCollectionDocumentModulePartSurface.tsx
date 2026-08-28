"use client";

import { useMemo } from "react";
import { ClozeChoicePlayer } from "@/components/cloze-choice/ClozeChoicePlayer";
import { ClozeOpenPlayer } from "@/components/cloze-open/ClozeOpenPlayer";
import { DefinitionMatchPlayer } from "@/components/definition-match/DefinitionMatchPlayer";
import { PictureStoryPlayer } from "@/components/picture-story/PictureStoryPlayer";
import { ReadAndAnswerPlayer } from "@/components/read-and-answer/ReadAndAnswerPlayer";
import type { HomeworkCollectionDocumentModulePart } from "@/lib/homework-collections";
import {
  toClozeChoicePlayable,
  validateClozeChoiceDocument,
} from "@/lib/cloze-choice";
import { toClozeOpenPlayable, validateClozeOpenDocument } from "@/lib/cloze-open";
import {
  toDefinitionMatchPlayable,
  validateDefinitionMatchDocument,
} from "@/lib/definition-match";
import {
  toPictureStoryPlayable,
  validatePictureStoryDocument,
} from "@/lib/picture-story";
import {
  toReadAndAnswerPlayable,
  validateReadAndAnswerDocument,
} from "@/lib/read-and-answer";
import { documentModuleFormatLabel } from "@/lib/homework-collections/document-module";

type Props = {
  part: HomeworkCollectionDocumentModulePart;
  answers: Record<string, string>;
  onAnswersChange: (answers: Record<string, string>) => void;
};

export function HomeworkCollectionDocumentModulePartSurface({
  part,
  answers,
  onAnswersChange,
}: Props) {
  const shared = {
    answers,
    onAnswersChange,
    embedInHomeworkCollection: true,
    eyebrow: documentModuleFormatLabel(part.moduleFormat),
  };

  const readAndAnswer = useMemo(() => {
    if (part.moduleFormat !== "read_and_answer") return null;
    try {
      return toReadAndAnswerPlayable(validateReadAndAnswerDocument(part.document));
    } catch {
      return null;
    }
  }, [part.document, part.moduleFormat]);

  const clozeChoice = useMemo(() => {
    if (part.moduleFormat !== "cloze_choice") return null;
    try {
      return toClozeChoicePlayable(validateClozeChoiceDocument(part.document));
    } catch {
      return null;
    }
  }, [part.document, part.moduleFormat]);

  const clozeOpen = useMemo(() => {
    if (part.moduleFormat !== "cloze_open") return null;
    try {
      return toClozeOpenPlayable(validateClozeOpenDocument(part.document));
    } catch {
      return null;
    }
  }, [part.document, part.moduleFormat]);

  const definitionMatch = useMemo(() => {
    if (part.moduleFormat !== "definition_match") return null;
    try {
      return toDefinitionMatchPlayable(validateDefinitionMatchDocument(part.document));
    } catch {
      return null;
    }
  }, [part.document, part.moduleFormat]);

  const pictureStory = useMemo(() => {
    if (part.moduleFormat !== "picture_story") return null;
    try {
      return toPictureStoryPlayable(validatePictureStoryDocument(part.document));
    } catch {
      return null;
    }
  }, [part.document, part.moduleFormat]);

  if (part.moduleFormat === "read_and_answer" && readAndAnswer) {
    return <ReadAndAnswerPlayer activity={readAndAnswer} {...shared} />;
  }
  if (part.moduleFormat === "cloze_choice" && clozeChoice) {
    return <ClozeChoicePlayer activity={clozeChoice} {...shared} />;
  }
  if (part.moduleFormat === "cloze_open" && clozeOpen) {
    return <ClozeOpenPlayer activity={clozeOpen} {...shared} />;
  }
  if (part.moduleFormat === "definition_match" && definitionMatch) {
    return <DefinitionMatchPlayer activity={definitionMatch} {...shared} />;
  }
  if (part.moduleFormat === "picture_story" && pictureStory) {
    return <PictureStoryPlayer activity={pictureStory} {...shared} />;
  }

  return (
    <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
      Reading activity content is not available or failed validation.
    </p>
  );
}
