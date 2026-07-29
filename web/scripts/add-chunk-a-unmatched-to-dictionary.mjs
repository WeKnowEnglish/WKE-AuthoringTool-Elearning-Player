/**
 * Add Chunk A unmatched media item-names into the Primary candidate dictionary,
 * then rebuild the slim search index.
 *
 * Usage (from web/):
 *   node scripts/add-chunk-a-unmatched-to-dictionary.mjs
 *   node scripts/add-chunk-a-unmatched-to-dictionary.mjs --dry-run
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const DRY = process.argv.includes("--dry-run");

const reportPath = join(root, "tmp/chunk-a-lexicon-link-report.json");
const candidatesPath = join(
  root,
  "content/vocabulary/reference/primary-candidates/data/primary-vocabulary-candidates.v1.json",
);

const IRREGULAR = {
  feet: "foot",
  teeth: "tooth",
  mice: "mouse",
  geese: "goose",
  children: "child",
  people: "person",
  men: "man",
  women: "woman",
  leaves: "leaf",
  knives: "knife",
  wolves: "wolf",
  shelves: "shelf",
  loaves: "loaf",
  calves: "calf",
  halves: "half",
  lives: "life",
  wives: "wife",
  strawberries: "strawberry",
  cookies: "cookie",
  pancakes: "pancake",
  noodles: "noodle",
  puzzles: "puzzle",
  markers: "marker",
  mittens: "mitten",
  sandals: "sandal",
  sneakers: "sneaker",
  boots: "boot",
  chips: "chip",
  nuts: "nut",
  lips: "lip",
  lungs: "lung",
  organs: "organ",
  legos: "lego",
};

const NO_STEM = new Set([
  "shorts",
  "pants",
  "jeans",
  "glasses",
  "scissors",
  "clothes",
  "octopus",
  "platypus",
  "walrus",
  "bus",
  "cactus",
  "fungus",
  "hippo",
  "rhino",
  "buffalo",
  "moose",
  "deer",
  "sheep",
  "fish",
  "shrimp",
  "english",
  "yo",
]);

/** Heuristic topic for media-gap nouns (Primary topic vocabulary). */
const TOPIC_BY_LEMMA = {
  // animals / nature
  acrobat: "hobbies_free_time",
  actress: "jobs_community",
  alligator: "general_language",
  artist: "jobs_community",
  axolotl: "general_language",
  baboon: "general_language",
  backpack: "school_learning",
  balloon: "hobbies_free_time",
  banker: "jobs_community",
  beanie: "clothes_appearance",
  beaver: "general_language",
  biologist: "jobs_community",
  boot: "clothes_appearance",
  buffalo: "general_language",
  builder: "jobs_community",
  calf: "body_health",
  camel: "general_language",
  capybara: "general_language",
  cell: "body_health",
  chameleon: "general_language",
  cheetah: "general_language",
  chef: "jobs_community",
  chimpanzee: "general_language",
  chip: "food_drink",
  clown: "jobs_community",
  cobra: "general_language",
  cookie: "food_drink",
  crab: "general_language",
  crane: "general_language",
  crayon: "school_learning",
  crocodile: "general_language",
  cupcake: "food_drink",
  deer: "general_language",
  detective: "jobs_community",
  dinosaur: "general_language",
  dolphin: "general_language",
  donut: "food_drink",
  drought: "weather_seasons",
  duck: "general_language",
  eagle: "general_language",
  earthquake: "weather_seasons",
  elbow: "body_health",
  electrician: "jobs_community",
  elephant: "general_language",
  english: "language_learning",
  eraser: "school_learning",
  foot: "body_health",
  finger: "body_health",
  firefighter: "jobs_community",
  flamingo: "general_language",
  fox: "general_language",
  giraffe: "general_language",
  gorilla: "general_language",
  ham: "food_drink",
  hamster: "general_language",
  hedgehog: "general_language",
  hippo: "general_language",
  hotdog: "food_drink",
  hyena: "general_language",
  iguana: "general_language",
  jaguar: "general_language",
  jellyfish: "general_language",
  kangaroo: "general_language",
  koala: "general_language",
  lego: "hobbies_free_time",
  lemur: "general_language",
  leopard: "general_language",
  lettuce: "food_drink",
  librarian: "jobs_community",
  lightning: "weather_seasons",
  lip: "body_health",
  lizard: "general_language",
  lobster: "food_drink",
  lunchbox: "school_learning",
  lung: "body_health",
  marker: "school_learning",
  mechanic: "jobs_community",
  meerkat: "general_language",
  mitten: "clothes_appearance",
  model: "jobs_community",
  moose: "general_language",
  muscle: "body_health",
  nest: "general_language",
  noodle: "food_drink",
  nut: "food_drink",
  octopus: "general_language",
  orangutan: "general_language",
  orca: "general_language",
  organ: "body_health",
  ostrich: "general_language",
  otter: "general_language",
  owl: "general_language",
  pancake: "food_drink",
  panda: "general_language",
  panther: "general_language",
  parrot: "general_language",
  peacock: "general_language",
  penguin: "general_language",
  pilot: "jobs_community",
  platypus: "general_language",
  popcorn: "food_drink",
  puppet: "hobbies_free_time",
  puzzle: "hobbies_free_time",
  raccoon: "general_language",
  reindeer: "general_language",
  rhino: "general_language",
  robot: "hobbies_free_time",
  sandal: "clothes_appearance",
  scooter: "travel_transport",
  scorpion: "general_language",
  seahorse: "general_language",
  seal: "general_language",
  shark: "general_language",
  shorts: "clothes_appearance",
  shrimp: "food_drink",
  skateboard: "hobbies_free_time",
  skunk: "general_language",
  sloth: "general_language",
  sneaker: "clothes_appearance",
  spider: "general_language",
  squirrel: "general_language",
  starfish: "general_language",
  stingray: "general_language",
  storm: "weather_seasons",
  strawberry: "food_drink",
  swan: "general_language",
  sweater: "clothes_appearance",
  taco: "food_drink",
  thermometer: "body_health",
  throat: "body_health",
  tornado: "weather_seasons",
  toucan: "general_language",
  tracksuit: "clothes_appearance",
  trophy: "hobbies_free_time",
  tsunami: "weather_seasons",
  turtle: "general_language",
  tutu: "clothes_appearance",
  vet: "jobs_community",
  volcano: "world_places",
  walrus: "general_language",
  whale: "general_language",
  yo: "general_language",
  zookeeper: "jobs_community",
};

function normalize(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s']/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toCanonicalLemma(itemName) {
  const exact = normalize(itemName);
  if (!exact) return null;
  if (IRREGULAR[exact]) return IRREGULAR[exact];
  if (NO_STEM.has(exact)) return exact;
  // cookies / movies style: vowel + ies → drop s
  if (/[aeiou]ies$/i.test(exact) && exact.length > 4) return exact.slice(0, -1);
  if (exact.endsWith("ies") && exact.length > 4) return `${exact.slice(0, -3)}y`;
  if (
    exact.endsWith("ses") ||
    exact.endsWith("xes") ||
    exact.endsWith("zes") ||
    exact.endsWith("ches") ||
    exact.endsWith("shes")
  ) {
    return exact.slice(0, -2);
  }
  if (exact.endsWith("s") && !exact.endsWith("ss") && exact.length > 3) return exact.slice(0, -1);
  return exact;
}

function slugLemma(lemma) {
  return lemma.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function makeEntry(lemma, topic) {
  const id = `pv_${slugLemma(lemma)}_noun`;
  return {
    id,
    lemma,
    normalizedLemma: lemma,
    pos: "noun",
    senseKey: "unspecified",
    variants: [],
    sourceCefr: "A1",
    cefrBandCandidate: "A1",
    primaryStageCandidate: "A1_1",
    levelBasis: "primary_curriculum_decision",
    primaryTopic: topic,
    topics: [topic],
    sourceTopics: [],
    vocabularyLane: "general_english",
    acceptableTypedAnswers: [lemma],
    forms: {},
    grammar: {},
    learnerDefinitionEn: null,
    learnerMeaningVi: null,
    exampleSentence: null,
    mediaHint: null,
    sourceRefs: ["chunk_a_media_gap"],
    status: "candidate",
    review: {
      status: "unreviewed",
      needs: [
        "confirm_sense",
        "confirm_primary_stage",
        "add_learner_definition_en",
        "add_learner_meaning_vi",
        "add_forms_and_grammar",
        "add_example_and_media",
      ],
    },
  };
}

const report = JSON.parse(readFileSync(reportPath, "utf8"));
const unmatchedNames = [...new Set((report.unmatched || []).map((u) => u.itemName))];
const dataset = JSON.parse(readFileSync(candidatesPath, "utf8"));

const existingByNorm = new Map();
const existingIds = new Set();
for (const e of dataset.entries) {
  existingIds.add(e.id);
  const key = `${normalize(e.normalizedLemma || e.lemma)}::${e.pos}`;
  if (!existingByNorm.has(key)) existingByNorm.set(key, e);
}

const planned = [];
const alreadyPresent = [];
const skipped = [];

for (const name of unmatchedNames.sort((a, b) => a.localeCompare(b))) {
  const lemma = toCanonicalLemma(name);
  if (!lemma || lemma.includes(" ")) {
    skipped.push({ name, reason: "empty_or_multiword", lemma });
    continue;
  }
  const key = `${lemma}::noun`;
  const existing = existingByNorm.get(key);
  if (existing) {
    alreadyPresent.push({ name, lemma, existingId: existing.id });
    continue;
  }
  const topic = TOPIC_BY_LEMMA[lemma] || "general_language";
  const entry = makeEntry(lemma, topic);
  if (existingIds.has(entry.id) || planned.some((p) => p.id === entry.id)) {
    alreadyPresent.push({ name, lemma, existingId: entry.id });
    continue;
  }
  planned.push(entry);
  existingByNorm.set(key, entry);
  existingIds.add(entry.id);
}

console.log("Unmatched media names:", unmatchedNames.length);
console.log("New dictionary entries:", planned.length);
console.log("Already in dictionary (after canonical lemma):", alreadyPresent.length);
console.log("Skipped:", skipped.length);
if (alreadyPresent.length) {
  console.log("\nAlready present (will link after plural fix / re-run):");
  for (const x of alreadyPresent) console.log(`  ${x.name} → ${x.lemma} (${x.existingId})`);
}
if (skipped.length) {
  console.log("\nSkipped:");
  for (const x of skipped) console.log(`  ${x.name}: ${x.reason}`);
}
console.log("\nWill add:");
for (const e of planned) console.log(`  ${e.id}  [${e.primaryTopic}]`);

if (DRY) {
  console.log("\nDry-run only — no files written.");
  process.exit(0);
}

dataset.entries.push(...planned);
dataset.entryCount = dataset.entries.length;
dataset.datasetVersion = "0.1.1-candidate-chunk-a-media-gap";
dataset.notes = [
  ...(Array.isArray(dataset.notes) ? dataset.notes : dataset.notes ? [dataset.notes] : []),
  `Added ${planned.length} noun candidates from Chunk A media gap (${new Date().toISOString().slice(0, 10)}).`,
];

writeFileSync(candidatesPath, `${JSON.stringify(dataset)}\n`);
console.log(`\nWrote ${planned.length} entries → ${candidatesPath}`);
console.log(`entryCount now ${dataset.entryCount}`);

const build = spawnSync(process.execPath, [join(__dirname, "build-primary-vocabulary-search-index.mjs")], {
  cwd: root,
  stdio: "inherit",
});
if (build.status !== 0) process.exit(build.status || 1);

writeFileSync(
  join(root, "tmp/chunk-a-dictionary-add-report.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      added: planned.map((e) => ({ id: e.id, lemma: e.lemma, primaryTopic: e.primaryTopic })),
      alreadyPresent,
      skipped,
      entryCount: dataset.entryCount,
    },
    null,
    2,
  ),
);
console.log("Done.");
