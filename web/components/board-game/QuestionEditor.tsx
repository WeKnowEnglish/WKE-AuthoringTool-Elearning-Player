"use client";

import { useState } from "react";
import { KidButton } from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";
import { STORY_BUILDER_A2_QUESTIONS } from "@/lib/board-game/decks/story-builder-a2";
import {
  parseQuestionsJson,
  SAMPLE_QUESTIONS,
} from "@/lib/board-game/question-utils";
import type { Question } from "@/lib/board-game/types";

type QuestionType = "multiple_choice" | "fill_blank";

type Props = {
  questions: Question[];
  onChange: (questions: Question[]) => void;
};

function randomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function QuestionEditor({ questions, onChange }: Props) {
  const [questionType, setQuestionType] = useState<QuestionType>("multiple_choice");
  const [prompt, setPrompt] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [useFourthOption, setUseFourthOption] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [sentence, setSentence] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setPrompt("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setOptionD("");
    setCorrectAnswer("");
    setSentence("");
    setError(null);
  }

  function addQuestion() {
    setError(null);
    try {
      if (questionType === "multiple_choice") {
        const options = [optionA, optionB, optionC, useFourthOption ? optionD : null]
          .filter((option): option is string => Boolean(option?.trim()))
          .map((option) => option.trim());

        if (!prompt.trim()) throw new Error("Enter a question prompt.");
        if (options.length < 3) throw new Error("Add at least 3 answer options.");
        if (!correctAnswer.trim()) throw new Error("Choose the correct answer.");
        if (!options.includes(correctAnswer.trim())) {
          throw new Error("Correct answer must match one of the options.");
        }

        onChange([
          ...questions,
          {
            id: randomId(),
            type: "multiple_choice",
            prompt: prompt.trim(),
            options,
            correctAnswer: correctAnswer.trim(),
          },
        ]);
      } else {
        if (!sentence.trim()) throw new Error("Enter a sentence with a blank (use ___).");
        if (!correctAnswer.trim()) throw new Error("Enter the correct answer.");

        onChange([
          ...questions,
          {
            id: randomId(),
            type: "fill_blank",
            sentence: sentence.trim(),
            correctAnswer: correctAnswer.trim(),
          },
        ]);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add question.");
    }
  }

  function importQuestions() {
    setError(null);
    try {
      const imported = parseQuestionsJson(pasteText);
      onChange([...questions, ...imported]);
      setPasteText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    }
  }

  const mcOptions = [optionA, optionB, optionC, useFourthOption ? optionD : null]
    .filter((option): option is string => Boolean(option?.trim()))
    .map((option) => option.trim());

  return (
    <KidPanel>
      <h2 className="text-xl font-bold text-kid-ink">Questions</h2>
      <p className="mt-2 text-sm text-kid-ink/70">
        Add questions one at a time or paste a JSON array. Students answer aloud; you mark correct or
        incorrect.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <KidButton
          variant={questionType === "multiple_choice" ? "primary" : "secondary"}
          onClick={() => setQuestionType("multiple_choice")}
        >
          Multiple Choice
        </KidButton>
        <KidButton
          variant={questionType === "fill_blank" ? "primary" : "secondary"}
          onClick={() => setQuestionType("fill_blank")}
        >
          Fill in the Blank
        </KidButton>
      </div>

      {questionType === "multiple_choice" ? (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-sm font-semibold text-kid-ink">Question prompt</span>
            <input
              className="mt-1 w-full rounded-lg border-4 border-kid-ink px-3 py-2 text-lg"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="What color is the sky?"
            />
          </label>
          {[optionA, optionB, optionC, optionD].map((value, index) => {
            if (index === 3 && !useFourthOption) return null;
            const labels = ["Option A", "Option B", "Option C", "Option D"];
            const setters = [setOptionA, setOptionB, setOptionC, setOptionD];
            return (
              <label key={labels[index]} className="block">
                <span className="text-sm font-semibold text-kid-ink">{labels[index]}</span>
                <input
                  className="mt-1 w-full rounded-lg border-4 border-kid-ink px-3 py-2 text-lg"
                  value={value}
                  onChange={(event) => setters[index]!(event.target.value)}
                />
              </label>
            );
          })}
          <label className="flex items-center gap-2 text-sm font-semibold text-kid-ink">
            <input
              type="checkbox"
              checked={useFourthOption}
              onChange={(event) => setUseFourthOption(event.target.checked)}
            />
            Add a 4th option
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-kid-ink">Correct answer</span>
            <select
              className="mt-1 w-full rounded-lg border-4 border-kid-ink px-3 py-2 text-lg"
              value={correctAnswer}
              onChange={(event) => setCorrectAnswer(event.target.value)}
            >
              <option value="">Select correct answer</option>
              {mcOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-sm font-semibold text-kid-ink">Sentence with blank</span>
            <input
              className="mt-1 w-full rounded-lg border-4 border-kid-ink px-3 py-2 text-lg"
              value={sentence}
              onChange={(event) => setSentence(event.target.value)}
              placeholder="I ___ to school every day."
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-kid-ink">Correct answer</span>
            <input
              className="mt-1 w-full rounded-lg border-4 border-kid-ink px-3 py-2 text-lg"
              value={correctAnswer}
              onChange={(event) => setCorrectAnswer(event.target.value)}
              placeholder="walk"
            />
          </label>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <KidButton onClick={addQuestion}>Add Question</KidButton>
        <KidButton variant="secondary" onClick={() => onChange(SAMPLE_QUESTIONS)}>
          Load Sample Questions
        </KidButton>
        <KidButton variant="accent" onClick={() => onChange(STORY_BUILDER_A2_QUESTIONS)}>
          Load Story Builder (A2)
        </KidButton>
      </div>

      <div className="mt-6 space-y-2">
        <label className="block">
          <span className="text-sm font-semibold text-kid-ink">Paste JSON</span>
          <textarea
            className="mt-1 min-h-32 w-full rounded-lg border-4 border-kid-ink px-3 py-2 font-mono text-sm"
            value={pasteText}
            onChange={(event) => setPasteText(event.target.value)}
            placeholder={'[{"type":"multiple_choice","prompt":"...","options":["A","B","C"],"correctAnswer":"A"}]'}
          />
        </label>
        <KidButton variant="secondary" onClick={importQuestions}>
          Import JSON
        </KidButton>
      </div>

      {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}

      <div className="mt-6">
        <h3 className="text-lg font-bold text-kid-ink">{questions.length} question(s)</h3>
        {questions.length === 0 ? (
          <p className="mt-2 text-sm text-kid-ink/70">Add at least one question to start the game.</p>
        ) : (
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {questions.map((question, index) => (
              <li
                key={question.id}
                className="flex items-start justify-between gap-3 rounded-lg border-4 border-kid-ink bg-kid-surface-muted px-3 py-2"
              >
                <div>
                  <span className="text-xs font-bold uppercase text-kid-ink/60">
                    {question.type === "multiple_choice" ? "MC" : "Fill"} #{index + 1}
                  </span>
                  <p className="text-sm font-semibold text-kid-ink">
                    {question.type === "multiple_choice" ? question.prompt : question.sentence}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md border-2 border-kid-ink px-2 py-1 text-xs font-bold"
                  onClick={() => onChange(questions.filter((item) => item.id !== question.id))}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </KidPanel>
  );
}
