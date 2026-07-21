"use client";

import { useEffect, useState } from "react";
import { DragSentenceView } from "@/components/lesson/interactions/DragSentenceView";
import { LetterMixupView } from "@/components/lesson/interactions/LetterMixupView";
import { McQuizView } from "@/components/lesson/interactions/McQuizView";
import { TrueFalseView } from "@/components/lesson/interactions/TrueFalseView";
import type { PackQuizCompiledQuestion } from "@/lib/vocabulary/pack-quiz";

type Props = {
  question: PackQuizCompiledQuestion;
  muted?: boolean;
  passed: boolean;
  showBack?: boolean;
  onBack?: () => void;
  onPass: () => void;
  onWrong?: () => void;
  onNext: () => void;
  /** Teacher preview: snappier MC / T/F feedback. */
  snappyCorrect?: boolean;
};

/**
 * Renders one pack-quiz question using the matching lesson interaction view.
 * F0 shell — T/F, letter, and sentence formats play when payloads exist; compilers land in F1+.
 */
export function PackQuizQuestionPlayer({
  question,
  muted = false,
  passed,
  showBack = false,
  onBack = () => undefined,
  onPass,
  onWrong = () => undefined,
  onNext,
  snappyCorrect = true,
}: Props) {
  const [sentenceFilled, setSentenceFilled] = useState<string[]>([]);

  useEffect(() => {
    setSentenceFilled([]);
  }, [question.id]);

  if (question.format === "multiple_choice") {
    return (
      <McQuizView
        key={question.id}
        parsed={question.payload}
        muted={muted}
        passed={passed}
        snappyCorrect={snappyCorrect}
        showBack={showBack}
        onBack={onBack}
        onPass={onPass}
        onWrong={onWrong}
        onNext={onNext}
      />
    );
  }

  if (question.format === "true_false") {
    return (
      <TrueFalseView
        key={question.id}
        parsed={question.payload}
        muted={muted}
        passed={passed}
        snappyCorrect={snappyCorrect}
        showBack={showBack}
        onBack={onBack}
        onPass={onPass}
        onWrong={onWrong}
        onNext={onNext}
      />
    );
  }

  if (question.format === "letter_scramble") {
    return (
      <LetterMixupView
        key={question.id}
        parsed={question.payload}
        muted={muted}
        passed={passed}
        showBack={showBack}
        onBack={onBack}
        onPass={onPass}
        onWrong={onWrong}
        onNext={onNext}
      />
    );
  }

  return (
    <DragSentenceView
      key={question.id}
      parsed={question.payload}
      muted={muted}
      filled={sentenceFilled}
      setFilled={setSentenceFilled}
      passed={passed}
      showBack={showBack}
      onBack={onBack}
      onPass={onPass}
      onWrong={onWrong}
      onNext={onNext}
    />
  );
}
