import {
  formatRequest,
  getAdjectiveCueEmoji,
  type DrinkAdjective,
} from "@/lib/blender/drink-adjectives";
import { getIngredientTags } from "@/lib/blender/drink-ingredients";

export type DrinkFixPrompt = {
  line: string;
  speakText: string;
  targetAdjective: DrinkAdjective;
  cueEmoji: string;
};

/** Prefer this mismatched tag when building mistake-aware fix copy. */
const WRONG_TAG_PRIORITY: Partial<Record<DrinkAdjective, DrinkAdjective[]>> = {
  sour: ["sweet", "creamy", "juicy"],
  sweet: ["sour", "creamy"],
  red: ["green", "sweet"],
  green: ["red", "sweet"],
  cold: ["juicy", "sweet", "creamy"],
  juicy: ["sweet", "creamy", "cold"],
  creamy: ["sour", "sweet"],
};

type FixTemplate = { line: string; speakText: string };

const FIX_TEMPLATES: Record<string, FixTemplate> = {
  "sour|sweet": {
    line: "It's too sweet! Let's make it more sour.",
    speakText: "It's too sweet! Let's make it more sour.",
  },
  "sweet|sour": {
    line: "It's too sour! Let's make it sweeter.",
    speakText: "It's too sour! Let's make it sweeter.",
  },
  "red|green": {
    line: "That's too green! Let's make it redder.",
    speakText: "That's too green! Let's make it redder.",
  },
  "green|red": {
    line: "That's too red! Let's make it greener.",
    speakText: "That's too red! Let's make it greener.",
  },
  "cold|juicy": {
    line: "It's not cold enough! Let's make it colder.",
    speakText: "It's not cold enough! Let's make it colder.",
  },
  "cold|sweet": {
    line: "It's not cold enough! Let's make it colder.",
    speakText: "It's not cold enough! Let's make it colder.",
  },
  "cold|creamy": {
    line: "It's not cold enough! Let's make it colder.",
    speakText: "It's not cold enough! Let's make it colder.",
  },
  "juicy|cold": {
    line: "It's too cold! Let's make it juicier.",
    speakText: "It's too cold! Let's make it juicier.",
  },
  "creamy|sour": {
    line: "It's too sour! Let's make it creamier.",
    speakText: "It's too sour! Let's make it creamier.",
  },
  "creamy|sweet": {
    line: "It's too sweet! Let's make it creamier.",
    speakText: "It's too sweet! Let's make it creamier.",
  },
};

function templateKey(requested: DrinkAdjective, wrongTag: DrinkAdjective): string {
  return `${requested}|${wrongTag}`;
}

function pickWrongTag(
  requested: DrinkAdjective,
  pickedIngredientId: string,
): DrinkAdjective | null {
  const tags = getIngredientTags(pickedIngredientId).filter((t) => t !== requested);
  if (tags.length === 0) return null;

  const priority = WRONG_TAG_PRIORITY[requested] ?? [];
  for (const candidate of priority) {
    if (tags.includes(candidate)) return candidate;
  }
  return tags[0] ?? null;
}

function fallbackFixPrompt(requested: DrinkAdjective): DrinkFixPrompt {
  const display = formatRequest(requested);
  const line = `That's not quite ${display.adjective}! Let's fix it.`;
  return {
    line,
    speakText: line,
    targetAdjective: requested,
    cueEmoji: getAdjectiveCueEmoji(requested),
  };
}

export function buildFixPrompt(opts: {
  requested: DrinkAdjective;
  pickedIngredientId: string;
}): DrinkFixPrompt {
  const { requested, pickedIngredientId } = opts;
  const wrongTag = pickWrongTag(requested, pickedIngredientId);
  const cueEmoji = getAdjectiveCueEmoji(requested);

  if (!wrongTag) {
    return fallbackFixPrompt(requested);
  }

  const template = FIX_TEMPLATES[templateKey(requested, wrongTag)];
  if (template) {
    return {
      ...template,
      targetAdjective: requested,
      cueEmoji,
    };
  }

  return fallbackFixPrompt(requested);
}
