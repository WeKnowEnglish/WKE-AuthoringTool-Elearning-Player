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
import {
  documentModuleFormatLabel,
  documentModuleValidationIssues,
} from "@/lib/homework-collections/document-module";

type Props = {
  part: HomeworkCollectionDocumentModulePart;
  answers: Record<string, string>;
  onAnswersChange: (answers: Record<string, string>) => void;
};

function withPartChrome<T extends { title: string; instructions: string }>(
  playable: T,
  part: HomeworkCollectionDocumentModulePart,
): T {
  return {
    ...playable,
    title: part.title.trim() || playable.title,
    instructions: part.instructions.trim() || playable.instructions,
  };
}

export function HomeworkCollectionDocumentModulePartSurface({
  part,
  answers,
  onAnswersChange,
}: Props) {
  const issues = documentModuleValidationIssues(part);
  const shared = {
    answers,
    onAnswersChange,
    embedInHomeworkCollection: true,
    eyebrow: documentModuleFormatLabel(part.moduleFormat),
  };

  const readAndAnswer = useMemo(() => {
    if (part.moduleFormat !== "read_and_answer") return null;
    try {
      return withPartChrome(
        toReadAndAnswerPlayable(validateReadAndAnswerDocument(part.document)),
        part,
      );
    } catch {
      return null;
    }
  }, [part]);

  const clozeChoice = useMemo(() => {
    if (part.moduleFormat !== "cloze_choice") return null;
    try {
      return withPartChrome(
        toClozeChoicePlayable(validateClozeChoiceDocument(part.document)),
        part,
      );
    } catch {
      return null;
    }
  }, [part]);

  const clozeOpen = useMemo(() => {
    if (part.moduleFormat !== "cloze_open") return null;
    try {
      return withPartChrome(
        toClozeOpenPlayable(validateClozeOpenDocument(part.document)),
        part,
      );
    } catch {
      return null;
    }
  }, [part]);

  const definitionMatch = useMemo(() => {
    if (part.moduleFormat !== "definition_match") return null;
    try {
      return withPartChrome(
        toDefinitionMatchPlayable(validateDefinitionMatchDocument(part.document)),
        part,
      );
    } catch {
      return null;
    }
  }, [part]);

  const pictureStory = useMemo(() => {
    if (part.moduleFormat !== "picture_story") return null;
    try {
      return withPartChrome(
        toPictureStoryPlayable(validatePictureStoryDocument(part.document)),
        part,
      );
    } catch {
      return null;
    }
  }, [part]);

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
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-950">
      <p>Keep editing this activity to preview it.</p>
      {issues.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-amber-900">
          {issues.slice(0, 5).map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs font-semibold text-amber-900">
          Reading activity content is not available or failed validation.
        </p>
      )}
    </div>
  );
}
