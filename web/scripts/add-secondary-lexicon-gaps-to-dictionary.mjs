/**
 * Add Secondary lexicon gaps into Primary candidates:
 * - 66 secondary_only lemmas (from map unmapped)
 * - Missing POS senses for review-queue words (per editorial decisions)
 *
 * Then rebuild search index + regenerate Secondary→Primary map.
 *
 * Usage (from web/):
 *   node scripts/add-secondary-lexicon-gaps-to-dictionary.mjs
 *   node scripts/add-secondary-lexicon-gaps-to-dictionary.mjs --dry-run
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const DRY = process.argv.includes("--dry-run");

const mapPath = join(
  root,
  "content/vocabulary/reference/secondary-lexicon/secondary-to-primary-lexicon-map.v1.json",
);
const secondaryPackPath = join(root, "g7-a2-complete-core-vocab-v1_2.json");
const candidatesPath = join(
  root,
  "content/vocabulary/reference/primary-candidates/data/primary-vocabulary-candidates.v1.json",
);

const TOPIC_BY_SECONDARY = {
  "school-life": "school_learning",
  "daily-routines": "daily_routines",
  personality: "feelings_personality",
  "feelings-opinions": "feelings_personality",
  "food-health": "body_health",
  "places-directions": "town_services",
  "technology-online-life": "digital_media",
  environment: "environment_sustainability",
  "stories-past-events": "stories_reading",
  "future-plans-jobs": "jobs_community",
  "social-life-communication": "social_communication",
  "academic-classroom-language": "school_learning",
};

/** Explicit missing POS senses to ensure (lemma → pos list). Existing rows kept. */
const REQUIRED_SENSES = [
  { lemma: "circle", pos: ["noun", "verb"] },
  { lemma: "complete", pos: ["verb", "adjective"] },
  { lemma: "correct", pos: ["verb", "adjective"] },
  { lemma: "match", pos: ["verb", "noun"] },
  { lemma: "underline", pos: ["verb", "noun"] },
  { lemma: "feed", pos: ["verb", "noun"] },
  { lemma: "shower", pos: ["verb", "noun"] },
  { lemma: "plastic", pos: ["noun", "adjective"] },
  { lemma: "principal", pos: ["noun"] }, // noun only (adjective may already exist)
  { lemma: "uniform", pos: ["noun", "adjective"] },
];

function normalize(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function slugLemma(lemma) {
  return normalize(lemma)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function primaryPosFromSecondaryRaw(rawPos, matchPos) {
  if (matchPos) return matchPos;
  const key = String(rawPos || "")
    .trim()
    .toLowerCase();
  switch (key) {
    case "noun":
    case "noun phrase":
      return "noun";
    case "verb":
    case "phrasal verb":
    case "verb phrase":
      return "verb";
    case "adjective":
      return "adjective";
    case "adverb":
      return "adverb";
    case "preposition":
      return "preposition";
    case "conjunction":
      return "conjunction";
    case "phrase":
      // Directional / instructional chunks → verb; discourse markers → adverb
      return "verb";
    default:
      return "noun";
  }
}

function phrasePosOverride(lemma, rawPos) {
  const n = normalize(lemma);
  if (n === "after that") return "adverb";
  if (n === "free time") return "noun";
  return primaryPosFromSecondaryRaw(rawPos, null);
}

function makeEntry({
  lemma,
  pos,
  topic,
  learnerDefinitionEn,
  learnerMeaningVi,
  exampleSentence,
  sourceWordItemId,
}) {
  const id = `pv_${slugLemma(lemma)}_${pos}`;
  return {
    id,
    lemma,
    normalizedLemma: normalize(lemma),
    pos,
    senseKey: "unspecified",
    variants: [],
    sourceCefr: "A2",
    cefrBandCandidate: "A2",
    primaryStageCandidate: "A2_1",
    levelBasis: "primary_curriculum_decision",
    primaryTopic: topic,
    topics: [topic],
    sourceTopics: ["secondary_g7_a2_core"],
    vocabularyLane: "general_english",
    acceptableTypedAnswers: [lemma],
    forms: {},
    grammar: {},
    learnerDefinitionEn: learnerDefinitionEn || null,
    learnerMeaningVi: learnerMeaningVi || null,
    exampleSentence: exampleSentence || null,
    mediaHint: null,
    sourceRefs: [
      "secondary_g7_a2_core_vocab_v1_2",
      sourceWordItemId ? `secondary:${sourceWordItemId}` : "secondary_pos_gap",
    ].filter(Boolean),
    status: "candidate",
    review: {
      status: "unreviewed",
      needs: [
        "confirm_sense",
        "confirm_primary_stage",
        "add_forms_and_grammar",
        "add_example_and_media",
      ],
    },
  };
}

function indexSecondaryPack(pack) {
  const byId = new Map();
  for (const topic of pack.topics || []) {
    for (const set of topic.sets || []) {
      for (const item of set.items || []) {
        byId.set(item.wordItemId, item);
      }
    }
  }
  return byId;
}

const map = JSON.parse(readFileSync(mapPath, "utf8"));
const pack = JSON.parse(readFileSync(secondaryPackPath, "utf8"));
const byWordItemId = indexSecondaryPack(pack);
const dataset = JSON.parse(readFileSync(candidatesPath, "utf8"));

const existingIds = new Set(dataset.entries.map((e) => e.id));
const existingKeys = new Set(
  dataset.entries.map((e) => `${normalize(e.normalizedLemma || e.lemma)}::${e.pos}`),
);

const planned = [];
const skipped = [];

function planEntry(entry) {
  const key = `${entry.normalizedLemma}::${entry.pos}`;
  if (existingIds.has(entry.id) || existingKeys.has(key)) {
    skipped.push({ id: entry.id, reason: "already_present" });
    return;
  }
  if (planned.some((p) => p.id === entry.id || `${p.normalizedLemma}::${p.pos}` === key)) {
    skipped.push({ id: entry.id, reason: "duplicate_in_batch" });
    return;
  }
  planned.push(entry);
  existingIds.add(entry.id);
  existingKeys.add(key);
}

// 1) Unmapped Secondary items
for (const row of map.unmapped || []) {
  const item = byWordItemId.get(row.wordItemId);
  const lemma = normalize(row.lemma || row.word);
  const pos =
    lemma.includes(" ") || String(row.rawPos).toLowerCase().includes("phrase")
      ? phrasePosOverride(lemma, row.rawPos)
      : primaryPosFromSecondaryRaw(row.rawPos, row.matchPos);
  const topic = TOPIC_BY_SECONDARY[row.topicId] || "general_language";
  planEntry(
    makeEntry({
      lemma: item?.lemma || item?.word || row.lemma || row.word,
      pos,
      topic,
      learnerDefinitionEn: item?.studentMeaningEn ?? null,
      learnerMeaningVi: item?.vnMeaning ?? null,
      exampleSentence: item?.exampleSentence ?? null,
      sourceWordItemId: row.wordItemId,
    }),
  );
}

// 2) Required POS senses (editorial)
for (const req of REQUIRED_SENSES) {
  const lemma = normalize(req.lemma);
  // Prefer Secondary pack defs when this lemma appears there
  const secondaryHit = [...byWordItemId.values()].find(
    (it) => normalize(it.lemma || it.word) === lemma,
  );
  const topic = secondaryHit
    ? TOPIC_BY_SECONDARY[secondaryHit.topicId] || "general_language"
    : "general_language";
  for (const pos of req.pos) {
    planEntry(
      makeEntry({
        lemma: secondaryHit?.lemma || secondaryHit?.word || req.lemma,
        pos,
        topic,
        learnerDefinitionEn: secondaryHit?.studentMeaningEn ?? null,
        learnerMeaningVi: secondaryHit?.vnMeaning ?? null,
        exampleSentence: secondaryHit?.exampleSentence ?? null,
        sourceWordItemId: secondaryHit?.wordItemId ?? null,
      }),
    );
  }
}

console.log("Planned new entries:", planned.length);
console.log("Skipped (already present / dup):", skipped.length);
console.log(
  "By POS:",
  planned.reduce((acc, e) => {
    acc[e.pos] = (acc[e.pos] || 0) + 1;
    return acc;
  }, {}),
);
console.log(
  "Sample ids:",
  planned.slice(0, 8).map((e) => e.id),
);

if (DRY) {
  console.log("Dry run — no files written.");
  process.exit(0);
}

dataset.entries.push(...planned);
dataset.entryCount = dataset.entries.length;
dataset.datasetVersion = "0.1.2-candidate-secondary-lexicon-gaps";
dataset.updatedAt = new Date().toISOString().slice(0, 10);

writeFileSync(candidatesPath, `${JSON.stringify(dataset, null, 2)}\n`);
console.log(`Wrote ${dataset.entryCount} candidates → ${candidatesPath}`);

const indexResult = spawnSync(
  process.execPath,
  [join(root, "scripts/build-primary-vocabulary-search-index.mjs")],
  { cwd: root, stdio: "inherit" },
);
if (indexResult.status !== 0) process.exit(indexResult.status ?? 1);

const mapResult = spawnSync(
  process.execPath,
  [
    join(root, "node_modules/tsx/dist/cli.mjs"),
    join(root, "scripts/generate-secondary-primary-lexicon-map.ts"),
  ],
  { cwd: root, stdio: "inherit", shell: true },
);
if (mapResult.status !== 0) {
  // Fallback: npm script
  const npmResult = spawnSync("npm", ["run", "generate:secondary-primary-lexicon-map"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  if (npmResult.status !== 0) process.exit(npmResult.status ?? 1);
}

console.log("Done.");
