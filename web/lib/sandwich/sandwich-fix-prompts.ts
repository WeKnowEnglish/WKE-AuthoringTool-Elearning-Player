import {
  getSandwichIngredient,
  type SandwichIngredientId,
} from "@/lib/sandwich/sandwich-ingredients";

export type SandwichFixPrompt = {
  line: string;
  speakText: string;
  targetIngredientId: SandwichIngredientId;
  cueEmoji: string;
  highlightWord: string;
};

export function buildFixPrompt(opts: {
  requested: SandwichIngredientId;
  pickedIngredientId: string;
}): SandwichFixPrompt {
  const { requested } = opts;
  const item = getSandwichIngredient(requested)!;
  const line = `That's not ${item.label}! Let's fix it.`;
  return {
    line,
    speakText: line,
    targetIngredientId: requested,
    cueEmoji: item.cueEmoji,
    highlightWord: item.label,
  };
}
