export function totalQuestionCount(input: {
  harvestCount: number;
  depositCount: number;
  craftCount: number;
}): number {
  return input.harvestCount + input.depositCount + input.craftCount;
}

export function formatQuestionSetCountLabel(input: {
  level: "A1" | "A2";
  questionCount: number;
}): string {
  const count = input.questionCount;
  return `${input.level} · ${count} question${count === 1 ? "" : "s"}`;
}
