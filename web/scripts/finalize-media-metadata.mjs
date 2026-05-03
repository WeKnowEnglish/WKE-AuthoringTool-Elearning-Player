/**
 * Reads teacher-exported media CSV, assigns meta_categories (primary + cross-tags),
 * dedupes meta_tags, writes review copies under web/sample-imports/.
 *
 * Usage (from web/):
 *   node scripts/finalize-media-metadata.mjs
 *   node scripts/finalize-media-metadata.mjs "C:/path/to/source.csv"
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Single source of truth for category slugs (lowercase; matches teacher UI normalization). */
export const MEDIA_CATEGORY_TAXONOMY = [
  "actions",
  "animals",
  "birds",
  "body",
  "clothes",
  "colors",
  "desserts",
  "drinks",
  "farm",
  "food",
  "home",
  "insects",
  "jobs",
  "marine",
  "misc",
  "nature",
  "numbers",
  "people",
  "pets",
  "school",
  "snacks",
  "sports",
  "swimwear",
  "toys",
  "transport",
  "weather",
  "zoo",
];

/** Short blurbs for teacher-facing review JSON. */
export const MEDIA_CATEGORY_DESCRIPTIONS = {
  actions: "Verb illustrations (draw, sing, …).",
  animals: "Any creature; combine with pets, marine, zoo, farm, birds, insects.",
  birds: "Bird vocabulary (often overlaps zoo or farm).",
  body: "Body parts and anatomy.",
  clothes: "General clothing; combine with swimwear when relevant.",
  colors: "Color words and swatches.",
  desserts: "Sweet treats (ice cream, cake, …).",
  drinks: "Beverages (juice, milk, water as a drink).",
  farm: "Farm animals and barnyard vocabulary.",
  food: "Broad food topic; cross-tags narrow it.",
  home: "Furniture and simple home objects.",
  insects: "Bugs and small crawlers (bee, spider, …).",
  jobs: "Occupations (cross-tag with people for workers).",
  marine: "Sea / ocean life and strong water-habitat animals.",
  misc: "Banners, recordings, placeholders.",
  nature: "Landscapes, nest, sun, natural hazards outside daily weather.",
  numbers: "Digit flash images.",
  people: "Humans including students and workers.",
  pets: "Common companion animals at home.",
  school: "Classroom tools and school subjects.",
  snacks: "Snack foods (chips, popcorn, …).",
  sports: "Sports gear and sports topic.",
  swimwear: "Swimsuit and swim trunks.",
  toys: "Toys and games.",
  transport: "Vehicles and travel.",
  weather: "Weather nouns and weather adjectives.",
  zoo: "Animals typically taught as zoo / wild exhibits (not pets or farm-only).",
};

const COLOR_WORDS = new Set([
  "red",
  "blue",
  "green",
  "black",
  "white",
  "yellow",
  "orange",
  "purple",
  "pink",
  "brown",
  "gray",
  "grey",
  "gold",
  "silver",
]);

const WEATHER_ADJECTIVE_STEMS = new Set([
  "hot",
  "cold",
  "warm",
  "cool",
  "snowy",
  "rainy",
  "windy",
  "cloudy",
  "sunny",
  "foggy",
]);

function parseJsonArray(raw) {
  if (raw == null || raw === "") return [];
  const s = String(raw).trim();
  if (!s || s === "[]") return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map((x) => String(x).trim().toLowerCase()) : [];
  } catch {
    return [];
  }
}

function toJsonArray(arr) {
  const norm = [...new Set(arr.map((x) => String(x).trim().toLowerCase()).filter(Boolean))].sort();
  return JSON.stringify(norm);
}

function stemFromFilename(name) {
  const base = path.basename(String(name || "")).replace(/\.[^.]+$/i, "");
  return base.trim().toLowerCase();
}

const PEOPLE_STEMS = new Set([
  "acrobat",
  "actor",
  "actress",
  "artist",
  "astronaut",
  "banker",
  "biologist",
  "builder",
  "chef",
  "clown",
  "computer programmer",
  "dentist",
  "detective",
  "doctor",
  "electrician",
  "firefighter",
  "librarian",
  "mechanic",
  "nurse",
  "pilot",
  "police",
  "principal",
  "reporter",
  "teacher",
  "vet",
  "waiter",
  "waitress",
  "zookeeper",
  "student 1",
  "student 1crop",
  "student 2",
  "student 2 crop",
  "student 3",
  "student 3 crop",
  "aj with mic",
  "aj with mic crop",
]);

const BODY_STEMS = new Set([
  "ankle",
  "arm",
  "arms",
  "back",
  "body",
  "bone",
  "bones",
  "brain",
  "cell",
  "cheeks",
  "chest",
  "chin",
  "ear",
  "ears",
  "elbow",
  "eyes",
  "feet",
  "finger",
  "hand",
  "head",
  "heart",
  "knee",
  "leg",
  "legs",
  "lips",
  "lungs",
  "mouth",
  "muscle",
  "neck",
  "nose",
  "organs",
  "shoulder",
  "stomach",
  "teeth",
  "throat",
  "toes",
  "featured image body parts",
]);

const CLOTHES_STEMS = new Set([
  "backpack",
  "beanie",
  "boots",
  "dress",
  "flip flops",
  "gloves",
  "hat",
  "jacket",
  "jeans",
  "mittens",
  "rain boots",
  "rain coat",
  "sandals",
  "scarf",
  "shirt",
  "shoes",
  "shorts",
  "skirt",
  "sneakers",
  "socks",
  "sweater",
  "swim trunks",
  "swimsuit",
  "t-shirt",
  "tank top",
  "tracksuit",
  "tutu",
  "sunglasses",
]);

const FOOD_STEMS = new Set([
  "apple",
  "orange",
  "cupcake",
  "bag of chips",
  "bananas",
  "bread",
  "cake",
  "carrot",
  "cheese",
  "cheese (2)",
  "chips",
  "chocolate bar",
  "cookies",
  "donut",
  "egg",
  "french fries",
  "fruit",
  "grapes",
  "ham",
  "hamburger",
  "honey",
  "hotdog",
  "ice cream",
  "jam",
  "juice",
  "lettuce",
  "lunch",
  "lunchbox",
  "meat",
  "milk",
  "noodles",
  "nuts",
  "pancakes",
  "pear",
  "pizza",
  "pizza (2)",
  "popcorn",
  "potato",
  "rice",
  "rice (2)",
  "salad",
  "sandwich",
  "soup",
  "spaghetti",
  "strawberries",
  "strawberry",
  "taco",
  "tomato",
  "water",
  "yogurt",
]);

const WEATHER_STEMS = new Set([
  "cloud",
  "cloudy",
  "cold",
  "drought",
  "flood",
  "lightning",
  "rain",
  "rainy",
  "snow",
  "snowy",
  "storm",
  "temperature",
  "thermometer",
  "tornado",
  "tropical storm",
  "tsunami",
  "wind",
  "windy",
  "featured image weather",
  "sunny",
]);

const NATURE_STEMS = new Set([
  "earthquake",
  "volcano",
  "nest",
  "sun",
  "moon",
  "tree",
  "flower",
]);

const TRANSPORT_STEMS = new Set([
  "car",
  "plane",
  "train",
  "truck",
  "scooter",
  "skateboard",
  "roller skate",
]);

const TOYS_STEMS = new Set([
  "action figure",
  "ball",
  "balloon",
  "blocks",
  "doll",
  "kite",
  "legos",
  "puppet",
  "puzzles",
  "stacking ring",
  "teddy bear",
  "yo-yo",
  "toys games banner",
  "stuffed animals",
]);

const SPORTS_STEMS = new Set([
  "baseball gloves",
  "sports",
  "trophy",
]);

const SCHOOL_STEMS = new Set([
  "crayon",
  "eraser",
  "maths",
  "pencil",
  "pen",
  "markers",
  "classroom",
  "english",
  "computer",
]);

const HOME_STEMS = new Set(["table", "wall"]);

const ACTIONS_STEMS = new Set(["sing", "play", "draw", "write", "paint", "boil", "art"]);

const MISC_STEMS = new Set([
  "cover",
  "what do you like eating?",
  "image hot spot",
  "my classroom hotspot",
  "walking with backpack transparent",
  "waving transparent",
  "model",
  "robot",
  "fishing page 1",
  "guitar",
]);

/** Stems that are clearly animals (union minus people jobs that collide — none here). */
const ANIMAL_STEMS = new Set([
  "alligator",
  "axolotl",
  "baboon",
  "bat",
  "bear",
  "beaver",
  "bird",
  "buffalo",
  "camel",
  "capybara",
  "cat",
  "chameleon",
  "cheetah",
  "chicken",
  "chimpanzee",
  "cobra",
  "crab",
  "crane",
  "crocodile",
  "deer",
  "dinosaur",
  "dog",
  "dolphin",
  "duck",
  "eagle",
  "elephant",
  "flamingo",
  "fox",
  "frog",
  "giraffe",
  "gorilla",
  "hamster",
  "hedgehog",
  "hippo",
  "hyena",
  "iguana",
  "jaguar",
  "jellyfish",
  "kangaroo",
  "kitten",
  "koala",
  "komodo dragon",
  "lemur",
  "leopard",
  "lion",
  "lizard",
  "lobster",
  "monkey",
  "moose",
  "mouse",
  "octopus",
  "orangutan",
  "orca",
  "ostrich",
  "otter",
  "owl",
  "panda",
  "panther",
  "parrot",
  "peacock",
  "penguin",
  "platypus",
  "polar bear",
  "rabbit",
  "raccoon",
  "red panda",
  "reindeer",
  "rhino",
  "scorpion",
  "seal",
  "seahorse",
  "shark",
  "shrimp",
  "skunk",
  "sloth",
  "snake",
  "spider",
  "squirrel",
  "starfish",
  "stingray",
  "swan",
  "tiger",
  "toucan",
  "turtle",
  "walrus",
  "whale",
  "wolf",
  "woodpecker",
  "zebra",
  "fish",
  "calf",
  "boar",
  "bee",
  "ant",
  "butterfly",
  "dragonfly",
  "meerkat",
  "artic fox",
]);

/** Companion / home animals. */
const PET_STEMS = new Set(["dog", "cat", "hamster", "rabbit", "kitten", "mouse", "parrot"]);

/** Barnyard and common farm vocabulary. */
const FARM_STEMS = new Set(["chicken", "duck", "calf", "pig", "cow", "horse", "sheep", "goat"]);

/** Ocean, coast, and strong aquarium animals. */
const MARINE_STEMS = new Set([
  "dolphin",
  "whale",
  "shark",
  "octopus",
  "jellyfish",
  "seal",
  "seahorse",
  "starfish",
  "stingray",
  "crab",
  "lobster",
  "shrimp",
  "fish",
  "walrus",
  "orca",
  "otter",
  "penguin",
  "platypus",
]);

/** Avian vocabulary (overlaps farm or zoo). */
const BIRD_STEMS = new Set([
  "bird",
  "eagle",
  "owl",
  "duck",
  "chicken",
  "flamingo",
  "ostrich",
  "peacock",
  "penguin",
  "toucan",
  "swan",
  "parrot",
  "woodpecker",
  "crane",
]);

const INSECT_STEMS = new Set(["bee", "ant", "butterfly", "dragonfly", "spider", "scorpion"]);

/** Wild / exhibit animals (zoo or safari framing), excluding typical pets and farm-only birds. */
const ZOO_STEMS = new Set([
  "alligator",
  "axolotl",
  "baboon",
  "bat",
  "bear",
  "beaver",
  "buffalo",
  "camel",
  "capybara",
  "chameleon",
  "cheetah",
  "chimpanzee",
  "cobra",
  "crocodile",
  "deer",
  "dinosaur",
  "dolphin",
  "eagle",
  "elephant",
  "flamingo",
  "fox",
  "frog",
  "giraffe",
  "gorilla",
  "hedgehog",
  "hippo",
  "hyena",
  "iguana",
  "jaguar",
  "jellyfish",
  "kangaroo",
  "koala",
  "komodo dragon",
  "lemur",
  "leopard",
  "lion",
  "lizard",
  "meerkat",
  "monkey",
  "moose",
  "octopus",
  "orangutan",
  "orca",
  "ostrich",
  "otter",
  "owl",
  "panda",
  "panther",
  "peacock",
  "penguin",
  "platypus",
  "polar bear",
  "raccoon",
  "red panda",
  "reindeer",
  "rhino",
  "seal",
  "shark",
  "skunk",
  "sloth",
  "snake",
  "squirrel",
  "starfish",
  "stingray",
  "swan",
  "tiger",
  "toucan",
  "turtle",
  "walrus",
  "whale",
  "wolf",
  "woodpecker",
  "zebra",
  "crane",
  "fish",
  "shrimp",
  "lobster",
  "crab",
  "seahorse",
  "artic fox",
]);

const DRINKS_STEMS = new Set(["juice", "milk", "water", "yogurt"]);

const SNACKS_STEMS = new Set(["chips", "bag of chips", "popcorn", "nuts", "chocolate bar"]);

const DESSERTS_STEMS = new Set(["ice cream", "cake", "cupcake", "donut", "cookies"]);

const SWIMWEAR_STEMS = new Set(["swimsuit", "swim trunks"]);

const JOB_STEMS = new Set([
  "acrobat",
  "actor",
  "actress",
  "artist",
  "astronaut",
  "banker",
  "biologist",
  "builder",
  "chef",
  "clown",
  "computer programmer",
  "dentist",
  "detective",
  "doctor",
  "electrician",
  "firefighter",
  "librarian",
  "mechanic",
  "nurse",
  "pilot",
  "police",
  "principal",
  "reporter",
  "teacher",
  "vet",
  "waiter",
  "waitress",
  "zookeeper",
]);

function animalCrossCategories(stem) {
  const add = [];
  if (MARINE_STEMS.has(stem)) add.push("marine");
  if (PET_STEMS.has(stem)) add.push("pets");
  if (FARM_STEMS.has(stem)) add.push("farm");
  if (BIRD_STEMS.has(stem)) add.push("birds");
  if (INSECT_STEMS.has(stem)) add.push("insects");
  if (ZOO_STEMS.has(stem)) add.push("zoo");
  return add;
}

function foodCrossCategories(stem) {
  const add = [];
  if (DRINKS_STEMS.has(stem)) add.push("drinks");
  if (SNACKS_STEMS.has(stem)) add.push("snacks");
  if (DESSERTS_STEMS.has(stem)) add.push("desserts");
  return add;
}

function inferPrimaryCategories(row) {
  const stem = stemFromFilename(row.original_filename);
  const item = (row.meta_item_name || "").trim().toLowerCase();
  const wordType = (row.meta_word_type || "").trim().toLowerCase();

  if (/^recorded-/i.test(stem) || row.content_type?.includes("audio")) {
    return ["misc"];
  }
  if (/^\d+$/.test(stem)) return ["numbers"];

  if (MISC_STEMS.has(stem)) return ["misc"];

  if (stem === "featured image body parts") return ["body"];
  if (stem === "featured image weather") return ["weather"];

  if (stem === "orange" || item === "orange") {
    if (wordType === "adjective") return ["colors"];
    return ["food"];
  }

  if (COLOR_WORDS.has(stem)) return ["colors"];

  if (WEATHER_ADJECTIVE_STEMS.has(stem)) return ["weather"];

  if (wordType === "adjective") {
    if (COLOR_WORDS.has(item)) return ["colors"];
    if (WEATHER_ADJECTIVE_STEMS.has(item)) return ["weather"];
  }

  if (PEOPLE_STEMS.has(stem)) return ["people"];
  if (BODY_STEMS.has(stem)) return ["body"];
  if (CLOTHES_STEMS.has(stem)) return ["clothes"];
  if (FOOD_STEMS.has(stem)) return ["food"];
  if (WEATHER_STEMS.has(stem)) return ["weather"];
  if (NATURE_STEMS.has(stem)) return ["nature"];
  if (TRANSPORT_STEMS.has(stem)) return ["transport"];
  if (TOYS_STEMS.has(stem)) return ["toys"];
  if (SPORTS_STEMS.has(stem)) return ["sports"];
  if (SCHOOL_STEMS.has(stem)) return ["school"];
  if (HOME_STEMS.has(stem)) return ["home"];
  if (ACTIONS_STEMS.has(stem)) return ["actions"];

  if (ANIMAL_STEMS.has(stem)) return ["animals"];

  return ["misc"];
}

function enrichCrossCategories(primary, stem) {
  const s = new Set(primary.filter((c) => MEDIA_CATEGORY_TAXONOMY.includes(c)));

  const isAnimal = s.has("animals") || ANIMAL_STEMS.has(stem);
  if (isAnimal) {
    s.add("animals");
    for (const c of animalCrossCategories(stem)) s.add(c);
  }

  const isFood = s.has("food") || FOOD_STEMS.has(stem);
  if (isFood) {
    s.add("food");
    for (const c of foodCrossCategories(stem)) s.add(c);
  }

  const isClothes = s.has("clothes") || CLOTHES_STEMS.has(stem);
  if (isClothes) {
    s.add("clothes");
    if (SWIMWEAR_STEMS.has(stem)) s.add("swimwear");
  }

  const isPeople = s.has("people") || PEOPLE_STEMS.has(stem);
  if (isPeople) {
    s.add("people");
    if (JOB_STEMS.has(stem)) s.add("jobs");
  }

  return [...s].sort();
}

function finalizeRowCategories(row) {
  const stem = stemFromFilename(row.original_filename);
  const primary = inferPrimaryCategories(row);
  return enrichCrossCategories(primary, stem);
}

function dedupeTags(tags) {
  const out = [];
  const seen = new Set();
  for (const t of tags) {
    const n = String(t).trim().toLowerCase();
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

function main() {
  const defaultInput = path.join("C:", "Users", "brady", "Downloads", "media_assets_metadata_updated.csv");
  const inputPath = process.argv[2] || defaultInput;
  if (!fs.existsSync(inputPath)) {
    console.error("Input CSV not found:", inputPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, "utf8");
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });

  const outDir = path.join(__dirname, "..", "sample-imports");
  fs.mkdirSync(outDir, { recursive: true });

  const taxonomyPath = path.join(outDir, "media-metadata-taxonomy.json");
  fs.writeFileSync(
    taxonomyPath,
    JSON.stringify(
      {
        categories: MEDIA_CATEGORY_TAXONOMY,
        descriptions: MEDIA_CATEGORY_DESCRIPTIONS,
      },
      null,
      2,
    ),
    "utf8",
  );

  for (const row of rows) {
    const cats = finalizeRowCategories(row);
    row.meta_categories = toJsonArray(cats);

    const tags = dedupeTags(parseJsonArray(row.meta_tags));
    row.meta_tags = toJsonArray(tags.length ? tags : ["vocabulary"]);

    const skills = dedupeTags(parseJsonArray(row.meta_skills));
    row.meta_skills = toJsonArray(skills);
  }

  const columns = [
    "id",
    "storage_path",
    "public_url",
    "original_filename",
    "content_type",
    "uploaded_by",
    "created_at",
    "sha256_hash",
    "phash",
    "meta_categories",
    "meta_tags",
    "meta_alternative_names",
    "meta_plural",
    "meta_countability",
    "meta_level",
    "meta_word_type",
    "meta_skills",
    "meta_past_tense",
    "meta_notes",
    "meta_item_name",
  ];

  const csvOut = stringify(rows, { header: true, columns });
  const csvPath = path.join(outDir, "media_assets_metadata_final.csv");
  fs.writeFileSync(csvPath, csvOut, "utf8");

  const summary = {};
  for (const c of MEDIA_CATEGORY_TAXONOMY) summary[c] = 0;
  for (const row of rows) {
    for (const c of parseJsonArray(row.meta_categories)) {
      if (summary[c] !== undefined) summary[c] += 1;
    }
  }

  const summaryPath = path.join(outDir, "media-metadata-category-summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify({ rowCount: rows.length, byCategory: summary }, null, 2), "utf8");

  console.log("Wrote:", taxonomyPath);
  console.log("Wrote:", csvPath);
  console.log("Wrote:", summaryPath);
  console.log("Category counts:", summary);
}

main();
