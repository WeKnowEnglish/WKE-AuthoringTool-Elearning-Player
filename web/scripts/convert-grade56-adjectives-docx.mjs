/**
 * One-time converter: Grade 56 adjectives docx → grade56-adjectives-v1.ts
 * Run from web/: node scripts/convert-grade56-adjectives-docx.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extractPath = path.join(__dirname, "grade56-adjectives-extract.txt");
const outPath = path.join(
  __dirname,
  "../lib/live-game/modes/english-craft/grade56-adjectives-v1.ts",
);

const ANSWER_KEY =
  "cababbabaabaacaaababaaaabcababaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa".split("");

function readExtractText() {
  if (!fs.existsSync(extractPath)) {
    throw new Error(
      `Missing ${extractPath}. Re-extract from docx with PowerShell before running this script.`,
    );
  }
  return fs.readFileSync(extractPath, "utf8").trim();
}

function parseQuestions(text) {
  const keyIndex = text.indexOf("Answer Key");
  const body = keyIndex >= 0 ? text.slice(0, keyIndex).trim() : text;
  const keyText = keyIndex >= 0 ? text.slice(keyIndex + "Answer Key".length).trim() : "";
  const keyLetters = keyText.replace(/[^a-d]/gi, "").toLowerCase().split("");

  const blockRe = /(\d{1,2})\.\s+([\s\S]*?)(?=\s\d{1,2}\.\s|$)/g;
  const questions = [];

  for (const match of body.matchAll(blockRe)) {
    const num = Number(match[1]);
    if (num < 1 || num > 60) continue;
    const rest = match[2].trim();

    const optMatch = rest.match(
      /^(.*?)\s+a\)\s*(.*?)\s+b\)\s*(.*?)\s+c\)\s*(.*?)\s+d\)\s*(.*?)$/i,
    );
    if (!optMatch) {
      throw new Error(`Could not parse question ${num}: ${rest.slice(0, 80)}...`);
    }

    const prompt = optMatch[1].trim();
    const options = [optMatch[2], optMatch[3], optMatch[4], optMatch[5]].map((o) =>
      o.trim().replace(/\s+$/, ""),
    );
    const letter = keyLetters[num - 1] ?? ANSWER_KEY[num - 1];
    if (!letter) throw new Error(`Missing answer key for Q${num}`);
    const letterIndex = { a: 0, b: 1, c: 2, d: 3 }[letter];
    if (letterIndex == null) throw new Error(`Bad answer key for Q${num}: ${letter}`);
    const correctAnswer = options[letterIndex];

    const targetWord = extractTargetWord(prompt, correctAnswer);
    const spellHint = correctAnswer;

    questions.push({
      id: `adj-${String(num).padStart(3, "0")}`,
      prompt,
      options,
      correctAnswer,
      targetWord,
      spellHint,
    });
  }

  if (questions.length !== 60) {
    throw new Error(`Expected 60 questions, got ${questions.length}`);
  }
  return questions;
}

function extractTargetWord(prompt, correctAnswer) {
  const meansMatch = prompt.match(/The word\s+(\w+)\s+means:/i);
  if (meansMatch) return meansMatch[1].toLowerCase();

  const feltMatch = prompt.match(/\bfelt\s+(\w+)\s+before/i);
  if (feltMatch) return feltMatch[1].toLowerCase();

  const blankMatch = prompt.match(/very\s+______/i);
  if (blankMatch) return correctAnswer.toLowerCase();

  const coachMatch = prompt.match(/coach was\s+(\w+)/i);
  if (coachMatch) return coachMatch[1].toLowerCase();

  const becameMatch = prompt.match(/\bbecame\s+(\w+)/i);
  if (becameMatch) return becameMatch[1].toLowerCase();

  const verbAdjMatch = prompt.match(/\b(?:smelled|looked)\s+(\w+)/i);
  if (verbAdjMatch) return verbAdjMatch[1].toLowerCase();

  const wasAdjMatch = prompt.match(
    /\b(?:was|is|are|were)\s+(\w+)\s*(?:,|on|when|and|before|after|early|during|near|so)/i,
  );
  if (wasAdjMatch) return wasAdjMatch[1].toLowerCase();

  const nameWasMatch = prompt.match(/\b[A-Z][a-z]+\s+was\s+(\w+)/);
  if (nameWasMatch) return nameWasMatch[1].toLowerCase();

  const thisMeans = prompt.match(/This means/i);
  if (thisMeans) {
    const m = prompt.match(/\b(?:was|were|is|are)\s+(\w+)/i);
    if (m) return m[1].toLowerCase();
  }

  return correctAnswer.toLowerCase();
}

function emitTs(questions) {
  const lines = questions.map((q) => {
    const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `  {
    id: "${q.id}",
    prompt: "${esc(q.prompt)}",
    options: [${q.options.map((o) => `"${esc(o)}"`).join(", ")}],
    correctAnswer: "${esc(q.correctAnswer)}",
    targetWord: "${esc(q.targetWord)}",
    spellHint: "${esc(q.spellHint)}",
  }`;
  });

  return `import "server-only";
import type { EnglishCraftAdjectiveQuestion } from "@/lib/live-game/modes/english-craft/questions-v1";

/** Grade 5–6 adjectives — generated from Grade 56 adjectives 60 question bank.docx */
export const GRADE56_ADJECTIVES_MC_V1: EnglishCraftAdjectiveQuestion[] = [
${lines.join(",\n")},
];

export const GRADE56_ADJECTIVES_CRAFT_V1 = {
  id: "adj-craft-bridge",
  prompt: "Put the sentence in order to build the bridge:",
  wordBank: ["The", "enormous", "museum", "was", "very", "interesting"],
  correctOrder: ["The", "enormous", "museum", "was", "very", "interesting"],
  slotCount: 6,
} as const;
`;
}

function main() {
  const text = readExtractText();
  const questions = parseQuestions(text);
  const uniqueTargets = new Set(questions.map((q) => q.targetWord));
  console.log(`Parsed ${questions.length} questions, ${uniqueTargets.size} unique target words`);
  fs.writeFileSync(outPath, emitTs(questions), "utf8");
  console.log("Wrote", outPath);
}

main();
