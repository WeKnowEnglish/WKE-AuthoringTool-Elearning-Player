import path from "node:path";

const TOKEN_FIXES = new Map([
  ["councelor", "counselor"],
  ["listing", "listening"],
  ["oninion", "onion"],
  ["pencile", "pencil"],
  ["psoter", "poster"],
  ["seater", "sweater"],
  ["seocond", "second"],
  ["siting", "sitting"],
  ["studnets", "students"],
  ["studyin", "studying"],
]);

const DISPLAY_OVERRIDES = new Map([
  ["girl carrot", "Girl holding a carrot"],
  ["girl sushi", "Girl eating sushi"],
  ["head teacher principal", "Head teacher"],
  ["man teacher", "Male teacher"],
  ["principal head teacher", "Principal"],
  ["school lunch lady", "School cafeteria worker"],
  ["sports teacher coach", "PE teacher"],
  ["x girl sitting at desk reading", "Girl sitting at a desk reading"],
]);

const CLEAR_NOUNS = new Map([
  ["art teacher", ["art teachers", "countable"]],
  ["cabbage", ["cabbages", "countable"]],
  ["carrot", ["carrots", "countable"]],
  ["classroom cupboard", ["classroom cupboards", "countable"]],
  ["classroom door", ["classroom doors", "countable"]],
  ["classroom pin board", ["classroom pin boards", "countable"]],
  ["classroom water filter station", ["classroom water filter stations", "countable"]],
  ["classroom whiteboard", ["classroom whiteboards", "countable"]],
  ["cucumber", ["cucumbers", "countable"]],
  ["dim sum", [null, "uncountable"]],
  ["eggplant", ["eggplants", "countable"]],
  ["eraser", ["erasers", "countable"]],
  ["female teacher", ["female teachers", "countable"]],
  ["fried chicken", [null, "uncountable"]],
  ["fried rice", [null, "uncountable"]],
  ["gym teacher", ["gym teachers", "countable"]],
  ["hamburger", ["hamburgers", "countable"]],
  ["head teacher principal", ["head teachers", "countable"]],
  ["lettuce", [null, "uncountable"]],
  ["man teacher", ["male teachers", "countable"]],
  ["math teacher", ["math teachers", "countable"]],
  ["music teacher", ["music teachers", "countable"]],
  ["notebook", ["notebooks", "countable"]],
  ["onion", ["onions", "countable"]],
  ["pen", ["pens", "countable"]],
  ["pencil case", ["pencil cases", "countable"]],
  ["pencil", ["pencils", "countable"]],
  ["pencil sharpener", ["pencil sharpeners", "countable"]],
  ["pho", [null, "uncountable"]],
  ["potato", ["potatoes", "countable"]],
  ["principal head teacher", ["principals", "countable"]],
  ["pumpkin", ["pumpkins", "countable"]],
  ["ruler", ["rulers", "countable"]],
  ["school bus driver", ["school bus drivers", "countable"]],
  ["school counselor", ["school counselors", "countable"]],
  ["school janitor", ["school janitors", "countable"]],
  ["school librarian", ["school librarians", "countable"]],
  ["school lunch lady", ["school cafeteria workers", "countable"]],
  ["school nurse", ["school nurses", "countable"]],
  ["school secretary", ["school secretaries", "countable"]],
  ["school table", ["school tables", "countable"]],
  ["science teacher", ["science teachers", "countable"]],
  ["spaghetti", [null, "uncountable"]],
  ["sports teacher coach", ["PE teachers", "countable"]],
  ["student chair", ["student chairs", "countable"]],
  ["sushi", [null, "uncountable"]],
  ["sweet potato", ["sweet potatoes", "countable"]],
  ["window", ["windows", "countable"]],
]);

const PEOPLE_RE = /\b(boy|boys|girl|girls|student|students|teacher|principal|driver|counselor|janitor|librarian|nurse|secretary|worker|lady)\b/;
const JOB_RE = /\b(teacher|principal|driver|counselor|janitor|librarian|nurse|secretary|coach|lady)\b/;
const ACTION_RE = /\b(carrying|coloring|cutting|doing|eating|enjoying|holding|learning|listening|making|mixing|packing|painting|picking|playing|pointing|presenting|raising|reading|sitting|studying|taking|using|writing)\b/;
const FOOD_RE = /\b(cabbage|carrot|chicken|cucumber|curry|dim sum|eggplant|food|foods|fried rice|hamburger|ingredients|lettuce|onion|pho|pizza|potato|pumpkin|spaghetti|squash|steak|sushi|sweet potato|vegetable|vegetables)\b/;
const VEGETABLE_RE = /\b(cabbage|carrot|cucumber|eggplant|lettuce|onion|potato|pumpkin|squash|sweet potato|vegetable|vegetables)\b/;
const SUPPLY_RE = /\b(colored pencils|crayons|eraser|markers|notebook|pen|pencil case|pencil sharpener|pencil|ruler)\b/;
const CLASSROOM_RE = /\b(classroom|cubbies|cupboard|desk|door|pin board|table|water filter|whiteboard|window)\b/;

function titleCase(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function collectionSlug(value) {
  return String(value || "wke-ai-starter")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "wke-ai-starter";
}

export function sourceStem(filename) {
  return path.basename(filename, path.extname(filename)).trim().toLowerCase().replace(/\s+/g, " ");
}

export function correctedStem(filename) {
  let value = sourceStem(filename);
  for (const [wrong, right] of TOKEN_FIXES) {
    value = value.replace(new RegExp(`\\b${wrong}\\b`, "g"), right);
  }
  return value;
}

export function displayNameForFile(filename) {
  const corrected = correctedStem(filename);
  const variantMatch = corrected.match(/^(.*)\s+\((\d+)\)$/);
  const base = (variantMatch?.[1] ?? corrected).trim();
  const display = DISPLAY_OVERRIDES.get(base) ?? titleCase(base);
  return variantMatch ? `${display} (variation ${variantMatch[2]})` : display;
}

function includesAny(value, regex) {
  return regex.test(value);
}

export function buildAssetMetadata({
  filename,
  collection,
  width,
  height,
  isOpaque,
  importedOn,
}) {
  const rawStem = sourceStem(filename);
  const corrected = correctedStem(filename);
  const base = corrected.replace(/\s+\(\d+\)$/, "").trim();
  const displayName = displayNameForFile(filename);
  const collectionTag = collectionSlug(collection);
  const people = includesAny(base, PEOPLE_RE);
  const action = includesAny(base, ACTION_RE);
  const noun = CLEAR_NOUNS.get(base) ?? null;
  const likelyScene =
    base.startsWith("students ") ||
    base.startsWith("two ") ||
    base.includes(" and ") ||
    (width > height && isOpaque && !noun);
  const assetRole = noun ? "vocabulary-object" : likelyScene ? "scene" : people ? "character" : "illustration";

  const categories = new Set(["school"]);
  const tags = new Set(["ai-generated", "illustration", "wke-image-library", collectionTag, assetRole]);

  if (people) {
    categories.add("people");
    tags.add("characters");
  }
  if (includesAny(base, JOB_RE)) categories.add("jobs");
  if (action) categories.add("actions");
  if (includesAny(base, FOOD_RE)) categories.add("food");
  if (includesAny(base, VEGETABLE_RE)) categories.add("vegetables");
  if (includesAny(base, SUPPLY_RE)) tags.add("school-supplies");
  if (includesAny(base, CLASSROOM_RE)) tags.add("classroom");
  if (!isOpaque) tags.add("transparent-cutout");
  if (likelyScene) tags.add("story-scene");
  if (likelyScene && isOpaque && width > height) tags.add("background");
  if (noun) tags.add("vocabulary");

  const alternativeNames = new Set();
  if (rawStem !== corrected) alternativeNames.add(rawStem);
  if (displayName.toLowerCase() !== corrected) alternativeNames.add(corrected);

  return {
    meta_item_name: displayName.slice(0, 120),
    meta_categories: [...categories].sort(),
    meta_tags: [...tags].sort(),
    meta_alternative_names: [...alternativeNames].sort(),
    meta_plural: noun?.[0] ?? null,
    meta_countability: noun?.[1] ?? "na",
    // An image can support many proficiency levels and language skills. Those
    // fields are intentionally left unclaimed until a curriculum editor links it.
    meta_level: null,
    meta_word_type: noun ? "noun" : null,
    meta_skills: [],
    meta_past_tense: null,
    meta_notes: [
      "AI-generated illustration imported from the WKE Image Library.",
      `Source file: ${filename}.`,
      `Imported ${importedOn}; automatic intake metadata should be human-reviewed before curriculum-critical use.`,
    ].join(" ").slice(0, 500),
  };
}

export function storageFilename(filename) {
  const base = correctedStem(filename)
    .replace(/\s+\((\d+)\)$/, "-variation-$1")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "asset";
  return `${base}.webp`;
}

