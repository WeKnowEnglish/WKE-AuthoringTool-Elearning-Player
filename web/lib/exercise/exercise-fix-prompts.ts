export type ExerciseFixPrompt = {
  line: string;
  speakText: string;
  targetWord: string;
  cueEmoji: string;
  highlightWord: string;
};

export function buildFixPrompt(opts: {
  expectedWord: string;
  pickedWord: string;
}): ExerciseFixPrompt {
  const { expectedWord } = opts;
  const line = `That's not ${expectedWord}! Put the right word here.`;
  return {
    line,
    speakText: line,
    targetWord: expectedWord,
    cueEmoji: "🪜",
    highlightWord: expectedWord,
  };
}
