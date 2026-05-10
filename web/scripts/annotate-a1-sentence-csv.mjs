/**
 * Annotate `A1 Sentence Bank.csv` — fill metadata columns for sentence rows
 * that don't have any yet. NEVER overwrites rows you've already edited in
 * Excel; existing values win.
 *
 * Workflow:
 *   - Add a new sentence's metadata to METADATA_BATCH_N below.
 *   - Add its variant_lexemes string to VARIANT_LEXEMES_BY_SENTENCE.
 *   - Run `node web/scripts/annotate-a1-sentence-csv.mjs`.
 *   - The script:
 *       • renames any legacy `topics` column to `structure_id` in the header,
 *       • normalizes a known mojibake (`oG?` → `o'`) introduced when the
 *         spreadsheet was saved as CSV with the wrong encoding,
 *       • for each sentence row, fills metadata ONLY if every metadata cell
 *         (target_word..difficulty) is empty. Any non-empty value tells the
 *         script "the human owns this row" and it leaves the row alone.
 *
 * Columns:
 *   - structure_id: grammar pattern family of the frame (abilities_modal,
 *     possession_have, present_continuous, …). Replaced legacy `topics`.
 *     Content topic now lives on the lexeme in `master-vocabulary.ts`.
 *   - tags: grammar / pattern flags. Some legacy rows include semantic
 *     tokens (food, school, …); content topic should ideally live on the
 *     lexeme, but mixed tags are tolerated.
 *   - variant_lexemes: semicolon-separated tokens; run
 *     `npm run expand:sentence-variants -- …` to materialize sibling rows.
 *     Distinct from acceptable_targets, which controls grading equivalence.
 *   - variant_group: optional stable id for expanded sibling rows (set by the
 *     expand script; leave empty for legacy rows).
 *
 * Fallback paths via env (in case the canonical CSV is locked by Excel):
 *   CSV_READ_PATH  — defaults to repo-root `A1 Sentence Bank.csv`
 *   CSV_WRITE_PATH — defaults to repo-root `A1 Sentence Bank.csv`
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const csvPath = path.join(repoRoot, "A1 Sentence Bank.csv");
const csvReadPath = process.env.CSV_READ_PATH ?? csvPath;
const csvWritePath = process.env.CSV_WRITE_PATH ?? csvPath;

const HEADER = [
  "sentence",
  "target_word",
  "acceptable_targets",
  "variant_lexemes",
  "structure_id",
  "tags",
  "cefr",
  "difficulty",
  "variant_group",
];

/**
 * Sentences 49-98 in the bank — rows starting from "He has one old map."
 * through "I always drink water.". Variants below in VARIANT_LEXEMES_BY_SENTENCE.
 */
const METADATA_BATCH_2 = [
  // ----- He has + numbers / quantifiers -----
  { sentence: "He has one old map.",            target_word: "map",     acceptable_targets: "",       structure_id: "possession_have",      tags: "have|numbers|adjectives|singular",                cefr: "a1", difficulty: "2" },
  { sentence: "He has three big boxes.",        target_word: "boxes",   acceptable_targets: "box",    structure_id: "possession_have",      tags: "have|numbers|plural|adjectives",                  cefr: "a1", difficulty: "3" },
  { sentence: "He has three heavy boxes.",      target_word: "boxes",   acceptable_targets: "box",    structure_id: "possession_have",      tags: "have|numbers|plural|adjectives",                  cefr: "a1", difficulty: "3" },
  { sentence: "He has three yellow pens.",      target_word: "pens",    acceptable_targets: "pen",    structure_id: "possession_have",      tags: "have|numbers|plural|color",                       cefr: "a1", difficulty: "3" },
  { sentence: "He has two blue pencils.",       target_word: "pencils", acceptable_targets: "pencil", structure_id: "possession_have",      tags: "have|numbers|plural|color",                       cefr: "a1", difficulty: "3" },
  { sentence: "He has two yellow markers.",     target_word: "markers", acceptable_targets: "marker", structure_id: "possession_have",      tags: "have|numbers|plural|color",                       cefr: "a1", difficulty: "3" },

  // ----- He is + adjective (state / emotion) -----
  { sentence: "He is cold.",                    target_word: "cold",    acceptable_targets: "",       structure_id: "be_adjective",         tags: "be|adjective|state",                              cefr: "a1", difficulty: "1" },
  { sentence: "He is full now.",                target_word: "full",    acceptable_targets: "",       structure_id: "be_adjective",         tags: "be|adjective|state|time_now",                     cefr: "a1", difficulty: "2" },
  { sentence: "He is hungry now.",              target_word: "hungry",  acceptable_targets: "",       structure_id: "be_adjective",         tags: "be|adjective|state|time_now",                     cefr: "a1", difficulty: "2" },

  // ----- He is + V-ing (present continuous) -----
  { sentence: "He is jumping high.",            target_word: "jumping", acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|movement",                  cefr: "a1", difficulty: "2" },
  { sentence: "He is jumping now.",             target_word: "jumping", acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|time_now",                  cefr: "a1", difficulty: "2" },
  { sentence: "He is reading a story.",         target_word: "story",   acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|read",                      cefr: "a1", difficulty: "2" },
  { sentence: "He is riding a bike.",           target_word: "bike",    acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|ride|transport",            cefr: "a1", difficulty: "2" },
  { sentence: "He is sleeping now.",            target_word: "sleeping",acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|state|time_now",            cefr: "a1", difficulty: "2" },
  { sentence: "He is telling a joke.",          target_word: "joke",    acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|tell|speech",               cefr: "a1", difficulty: "2" },

  // ----- He is + intensifier + adjective -----
  { sentence: "He is very angry.",              target_word: "angry",   acceptable_targets: "",       structure_id: "be_adjective",         tags: "be|adjective|emotions|intensifier",               cefr: "a1", difficulty: "2" },
  { sentence: "He is very sad.",                target_word: "sad",     acceptable_targets: "",       structure_id: "be_adjective",         tags: "be|adjective|emotions|intensifier",               cefr: "a1", difficulty: "2" },

  // ----- He is wearing + color + clothing -----
  { sentence: "He is wearing a blue hat.",      target_word: "hat",     acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|wear|clothes|color",        cefr: "a1", difficulty: "3" },
  { sentence: "He is wearing a red shirt.",     target_word: "shirt",   acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|wear|clothes|color",        cefr: "a1", difficulty: "3" },
  { sentence: "He is wearing a yellow coat.",   target_word: "coat",    acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|wear|clothes|color",        cefr: "a1", difficulty: "3" },

  // ----- He likes + adjective + plural -----
  { sentence: "He likes blue pens.",            target_word: "pens",    acceptable_targets: "pen",    structure_id: "likes_preferences",    tags: "present_simple|likes|plural|color",               cefr: "a1", difficulty: "3" },
  { sentence: "He likes fast planes.",          target_word: "planes",  acceptable_targets: "plane",  structure_id: "likes_preferences",    tags: "present_simple|likes|plural|adjective",           cefr: "a1", difficulty: "3" },
  { sentence: "He likes red cars.",             target_word: "cars",    acceptable_targets: "car",    structure_id: "likes_preferences",    tags: "present_simple|likes|plural|color",               cefr: "a1", difficulty: "3" },

  // ----- He loves + possessive + noun -----
  { sentence: "He loves his dog.",              target_word: "dog",     acceptable_targets: "",       structure_id: "likes_preferences",    tags: "present_simple|loves|possessive|animals",         cefr: "a1", difficulty: "2" },

  // ----- He never + V-s + noun (frequency) -----
  { sentence: "He never drinks milk.",          target_word: "milk",    acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|frequency_never|drinks",         cefr: "a1", difficulty: "2" },
  { sentence: "He never drinks soda.",          target_word: "soda",    acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|frequency_never|drinks",         cefr: "a1", difficulty: "2" },
  { sentence: "He never eats fish.",            target_word: "fish",    acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|frequency_never|eats",           cefr: "a1", difficulty: "2" },

  // ----- He V-s + obj + frequency -----
  { sentence: "He plays games every day.",      target_word: "games",   acceptable_targets: "game",   structure_id: "daily_routines_actions", tags: "present_simple|plays|frequency",                cefr: "a1", difficulty: "2" },

  // ----- He sits + preposition + place -----
  { sentence: "He sits on the bench.",          target_word: "bench",   acceptable_targets: "",       structure_id: "positions",            tags: "present_simple|sits|preposition_on|positions",    cefr: "a1", difficulty: "2" },
  { sentence: "He sits on the floor.",          target_word: "floor",   acceptable_targets: "",       structure_id: "positions",            tags: "present_simple|sits|preposition_on|positions",    cefr: "a1", difficulty: "2" },
  { sentence: "He sits under the tree.",        target_word: "tree",    acceptable_targets: "",       structure_id: "positions",            tags: "present_simple|sits|preposition_under|positions", cefr: "a1", difficulty: "2" },

  // ----- He usually V-s + obj + at + time -----
  { sentence: "He usually eats an egg at night.",   target_word: "egg",   acceptable_targets: "", structure_id: "daily_routines_actions", tags: "present_simple|frequency|eats|time", cefr: "a1", difficulty: "3" },
  { sentence: "He usually eats fruit at noon.",     target_word: "fruit", acceptable_targets: "", structure_id: "daily_routines_actions", tags: "present_simple|frequency|eats|time", cefr: "a1", difficulty: "3" },
  { sentence: "He usually eats rice at night.",     target_word: "rice",  acceptable_targets: "", structure_id: "daily_routines_actions", tags: "present_simple|frequency|eats|time", cefr: "a1", difficulty: "3" },

  { sentence: "He usually goes to bed at 9 o'clock.",         target_word: "bed",    acceptable_targets: "", structure_id: "daily_routines_actions", tags: "present_simple|frequency|goes|time",        cefr: "a1", difficulty: "3" },
  { sentence: "He usually goes to school at 8 o'clock.",      target_word: "school", acceptable_targets: "", structure_id: "daily_routines_actions", tags: "present_simple|frequency|goes|time|school", cefr: "a1", difficulty: "3" },
  { sentence: "He usually goes to the park at 5 o'clock.",    target_word: "park",   acceptable_targets: "", structure_id: "daily_routines_actions", tags: "present_simple|frequency|goes|time|places", cefr: "a1", difficulty: "3" },

  // ----- He walks to + place -----
  { sentence: "He walks to the bus.",           target_word: "bus",     acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|walks|movement|transport",     cefr: "a1", difficulty: "2" },
  { sentence: "He walks to the park.",          target_word: "park",    acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|walks|movement|places",        cefr: "a1", difficulty: "2" },
  { sentence: "He walks to the shop.",          target_word: "shop",    acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|walks|movement|places",        cefr: "a1", difficulty: "2" },

  // ----- Possessive subject -----
  { sentence: "Her cat is small.",              target_word: "small",   acceptable_targets: "",       structure_id: "be_adjective",         tags: "be|adjective|possessive|size|animals",            cefr: "a1", difficulty: "1" },
  { sentence: "Her mother has a phone.",        target_word: "phone",   acceptable_targets: "",       structure_id: "possession_have",      tags: "have|possessive|family",                          cefr: "a1", difficulty: "2" },
  { sentence: "Her sister is young.",           target_word: "young",   acceptable_targets: "",       structure_id: "be_adjective",         tags: "be|adjective|possessive|family|age",              cefr: "a1", difficulty: "1" },
  { sentence: "His grandfather has a cane.",    target_word: "cane",    acceptable_targets: "",       structure_id: "possession_have",      tags: "have|possessive|family",                          cefr: "a1", difficulty: "3" },
  { sentence: "His house is small.",            target_word: "small",   acceptable_targets: "",       structure_id: "be_adjective",         tags: "be|adjective|possessive|home|size",               cefr: "a1", difficulty: "1" },

  // ----- How + be + ... ? (greeting / wh-question) -----
  { sentence: "How are you?",                   target_word: "",        acceptable_targets: "",       structure_id: "greetings",            tags: "wh_question|how|greeting|fixed_phrase",           cefr: "a1", difficulty: "1" },
  { sentence: "How is the weather?",            target_word: "weather", acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|how|weather",                         cefr: "a1", difficulty: "2" },
  { sentence: "How is your mother?",            target_word: "mother",  acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|how|family|possessive",               cefr: "a1", difficulty: "2" },

  // ----- I always V + obj (routine) -----
  { sentence: "I always brush my teeth.",       target_word: "teeth",   acceptable_targets: "tooth",  structure_id: "daily_routines_actions", tags: "present_simple|always|brush|body|hygiene",      cefr: "a1", difficulty: "2" },
  { sentence: "I always drink water.",          target_word: "water",   acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|always|drink",                   cefr: "a1", difficulty: "1" },
];

/**
 * Sentences 99-198 in the bank — rows from "I always eat breakfast."
 * through "It is a small bird." Variants in VARIANT_LEXEMES_BY_SENTENCE.
 *
 * New structure_id values introduced here:
 *   - be_location        — "I am in the bathroom."
 *   - be_a_noun          — "It is a big house."
 *   - see_descriptions   — "I see a/an/N + (adj/color) + N(s)" family
 *   - yes_no_questions   — "Is it a big dog?", "Is the dog big?"
 */
const METADATA_BATCH_3 = [
  // ----- I always V + obj (frequency_always) -----
  { sentence: "I always eat breakfast.",        target_word: "breakfast", acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|always|eat|food",            cefr: "a1", difficulty: "1" },

  // ----- I am V-ing (now) — present_continuous -----
  { sentence: "I am coloring now.",             target_word: "coloring",  acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|time_now",              cefr: "a1", difficulty: "2" },
  { sentence: "I am eating now.",               target_word: "eating",    acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|time_now",              cefr: "a1", difficulty: "2" },
  { sentence: "I am holding a pen.",            target_word: "pen",       acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|hold|objects",          cefr: "a1", difficulty: "2" },

  // ----- I am + adjective (state, emotion) -----
  { sentence: "I am hot.",                      target_word: "hot",       acceptable_targets: "",      structure_id: "be_adjective",         tags: "be|adjective|state",                          cefr: "a1", difficulty: "1" },
  { sentence: "I am hungry.",                   target_word: "hungry",    acceptable_targets: "",      structure_id: "be_adjective",         tags: "be|adjective|state",                          cefr: "a1", difficulty: "1" },

  // ----- I am in the X (be_location) -----
  { sentence: "I am in the bathroom.",          target_word: "bathroom",  acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_in|location|home",             cefr: "a1", difficulty: "1" },
  { sentence: "I am in the bedroom.",           target_word: "bedroom",   acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_in|location|home",             cefr: "a1", difficulty: "1" },
  { sentence: "I am in the kitchen.",           target_word: "kitchen",   acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_in|location|home",             cefr: "a1", difficulty: "1" },

  // ----- I am V-ing + (prep) + obj (present_continuous) -----
  { sentence: "I am looking at the clock.",     target_word: "clock",     acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|look|preposition_at",   cefr: "a1", difficulty: "2" },
  { sentence: "I am reading.",                  target_word: "reading",   acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous",                       cefr: "a1", difficulty: "1" },
  { sentence: "I am standing in the room.",     target_word: "room",      acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|stand|preposition_in",  cefr: "a1", difficulty: "2" },
  { sentence: "I am standing near the door.",   target_word: "door",      acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|stand|preposition_near",cefr: "a1", difficulty: "2" },

  // ----- I am very + adjective (intensifier) -----
  { sentence: "I am very cold.",                target_word: "cold",      acceptable_targets: "",      structure_id: "be_adjective",         tags: "be|adjective|state|intensifier",              cefr: "a1", difficulty: "2" },
  { sentence: "I am very nervous.",             target_word: "nervous",   acceptable_targets: "",      structure_id: "be_adjective",         tags: "be|adjective|emotions|intensifier",           cefr: "a1", difficulty: "2" },
  { sentence: "I am very sleepy.",              target_word: "sleepy",    acceptable_targets: "",      structure_id: "be_adjective",         tags: "be|adjective|state|intensifier",              cefr: "a1", difficulty: "2" },
  { sentence: "I am very thirsty.",             target_word: "thirsty",   acceptable_targets: "",      structure_id: "be_adjective",         tags: "be|adjective|state|intensifier",              cefr: "a1", difficulty: "2" },

  // ----- I am V-ing + prep + obj -----
  { sentence: "I am waiting for the teacher.",  target_word: "teacher",   acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|wait|preposition_for",  cefr: "a1", difficulty: "2" },
  { sentence: "I am walking to the desk.",      target_word: "desk",      acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|walk|preposition_to",   cefr: "a1", difficulty: "2" },

  // ----- I can V (abilities_modal, can_affirmative) -----
  { sentence: "I can hear the music.",          target_word: "music",     acceptable_targets: "",      structure_id: "abilities_modal",      tags: "can_affirmative|hear|sense",                  cefr: "a1", difficulty: "2" },
  { sentence: "I can run.",                     target_word: "run",       acceptable_targets: "",      structure_id: "abilities_modal",      tags: "can_affirmative|ability|movement",            cefr: "a1", difficulty: "1" },
  { sentence: "I can see the bird.",            target_word: "bird",      acceptable_targets: "",      structure_id: "abilities_modal",      tags: "can_affirmative|see|sense",                   cefr: "a1", difficulty: "2" },
  { sentence: "I can smell the flower.",        target_word: "flower",    acceptable_targets: "",      structure_id: "abilities_modal",      tags: "can_affirmative|smell|sense",                 cefr: "a1", difficulty: "2" },

  // ----- I cannot V (abilities_modal, negative_ability) -----
  { sentence: "I cannot carry the box.",        target_word: "box",       acceptable_targets: "",      structure_id: "abilities_modal",      tags: "cannot|negative_ability|carry",               cefr: "a1", difficulty: "2" },
  { sentence: "I cannot climb the tree.",       target_word: "tree",      acceptable_targets: "",      structure_id: "abilities_modal",      tags: "cannot|negative_ability|climb",               cefr: "a1", difficulty: "2" },
  { sentence: "I cannot find my pen.",          target_word: "pen",       acceptable_targets: "",      structure_id: "abilities_modal",      tags: "cannot|negative_ability|find|possessive",     cefr: "a1", difficulty: "2" },
  { sentence: "I cannot see the board.",        target_word: "board",     acceptable_targets: "",      structure_id: "abilities_modal",      tags: "cannot|negative_ability|see|sense",           cefr: "a1", difficulty: "2" },
  { sentence: "I cannot swim fast.",            target_word: "swim",      acceptable_targets: "",      structure_id: "abilities_modal",      tags: "cannot|negative_ability|movement",            cefr: "a1", difficulty: "2" },

  // ----- I go to + place -----
  { sentence: "I go to school.",                target_word: "school",    acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|go|preposition_to|places",   cefr: "a1", difficulty: "1" },
  { sentence: "I go to the library.",           target_word: "library",   acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|go|preposition_to|places",   cefr: "a1", difficulty: "1" },
  { sentence: "I go to the park.",              target_word: "park",      acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|go|preposition_to|places",   cefr: "a1", difficulty: "1" },

  // ----- I have + (numbers + adj + color +) N(s) — possession_have -----
  { sentence: "I have a book.",                 target_word: "book",      acceptable_targets: "",      structure_id: "possession_have",      tags: "have|article_a|singular|objects",             cefr: "a1", difficulty: "1" },
  { sentence: "I have seven small orange fish.",target_word: "fish",      acceptable_targets: "",      structure_id: "possession_have",      tags: "have|numbers|adjective|color|plural|animals", cefr: "a1", difficulty: "3" },
  { sentence: "I have three big red apples.",   target_word: "apples",    acceptable_targets: "apple", structure_id: "possession_have",      tags: "have|numbers|adjective|color|plural|food",    cefr: "a1", difficulty: "3" },
  { sentence: "I have two small green birds.",  target_word: "birds",     acceptable_targets: "bird",  structure_id: "possession_have",      tags: "have|numbers|adjective|color|plural|animals", cefr: "a1", difficulty: "3" },

  // ----- I like / love + obj -----
  { sentence: "I like apples.",                 target_word: "apples",    acceptable_targets: "apple", structure_id: "likes_preferences",    tags: "present_simple|likes|food|plural",            cefr: "a1", difficulty: "1" },
  { sentence: "I like cheese.",                 target_word: "cheese",    acceptable_targets: "",      structure_id: "likes_preferences",    tags: "present_simple|likes|food|mass_noun",         cefr: "a1", difficulty: "1" },
  { sentence: "I love bananas.",                target_word: "bananas",   acceptable_targets: "banana",structure_id: "likes_preferences",    tags: "present_simple|loves|food|plural",            cefr: "a1", difficulty: "1" },

  // ----- I never go on + day (frequency_never) -----
  { sentence: "I never go to school on Saturday.", target_word: "Saturday", acceptable_targets: "",   structure_id: "daily_routines_actions", tags: "present_simple|frequency_never|go|days",    cefr: "a1", difficulty: "3" },
  { sentence: "I never go to school on Sunday.",   target_word: "Sunday",   acceptable_targets: "",   structure_id: "daily_routines_actions", tags: "present_simple|frequency_never|go|days",    cefr: "a1", difficulty: "3" },

  // ----- I see + a/an + (adj/color) + N — see_descriptions -----
  { sentence: "I see a blue fish.",             target_word: "fish",      acceptable_targets: "",      structure_id: "see_descriptions",     tags: "present_simple|see|color|article_a|singular", cefr: "a1", difficulty: "2" },
  { sentence: "I see a bright sun.",            target_word: "sun",       acceptable_targets: "",      structure_id: "see_descriptions",     tags: "present_simple|see|adjective|article_a|singular", cefr: "a1", difficulty: "2" },
  { sentence: "I see a cat.",                   target_word: "cat",       acceptable_targets: "",      structure_id: "see_descriptions",     tags: "present_simple|see|article_a|singular",       cefr: "a1", difficulty: "1" },
  { sentence: "I see a cold drink.",            target_word: "drink",     acceptable_targets: "",      structure_id: "see_descriptions",     tags: "present_simple|see|adjective|article_a|singular", cefr: "a1", difficulty: "2" },
  { sentence: "I see a green apple.",           target_word: "apple",     acceptable_targets: "",      structure_id: "see_descriptions",     tags: "present_simple|see|color|article_a|singular", cefr: "a1", difficulty: "2" },
  { sentence: "I see a happy girl.",            target_word: "girl",      acceptable_targets: "",      structure_id: "see_descriptions",     tags: "present_simple|see|adjective|article_a|singular|emotions", cefr: "a1", difficulty: "2" },
  { sentence: "I see a nice teacher.",          target_word: "teacher",   acceptable_targets: "",      structure_id: "see_descriptions",     tags: "present_simple|see|adjective|article_a|singular", cefr: "a1", difficulty: "2" },
  { sentence: "I see a pink flower.",           target_word: "flower",    acceptable_targets: "",      structure_id: "see_descriptions",     tags: "present_simple|see|color|article_a|singular", cefr: "a1", difficulty: "2" },
  { sentence: "I see a purple grape.",          target_word: "grape",     acceptable_targets: "",      structure_id: "see_descriptions",     tags: "present_simple|see|color|article_a|singular", cefr: "a1", difficulty: "2" },
  { sentence: "I see a quiet student.",         target_word: "student",   acceptable_targets: "",      structure_id: "see_descriptions",     tags: "present_simple|see|adjective|article_a|singular", cefr: "a1", difficulty: "2" },
  { sentence: "I see a sad boy.",               target_word: "boy",       acceptable_targets: "",      structure_id: "see_descriptions",     tags: "present_simple|see|adjective|article_a|singular|emotions", cefr: "a1", difficulty: "2" },
  { sentence: "I see a thin book.",             target_word: "book",      acceptable_targets: "",      structure_id: "see_descriptions",     tags: "present_simple|see|adjective|article_a|singular", cefr: "a1", difficulty: "2" },
  { sentence: "I see a white cat.",             target_word: "cat",       acceptable_targets: "",      structure_id: "see_descriptions",     tags: "present_simple|see|color|article_a|singular", cefr: "a1", difficulty: "2" },
  { sentence: "I see an old table.",            target_word: "table",     acceptable_targets: "",      structure_id: "see_descriptions",     tags: "present_simple|see|adjective|article_an|singular", cefr: "a1", difficulty: "2" },
  { sentence: "I see an orange.",               target_word: "orange",    acceptable_targets: "",      structure_id: "see_descriptions",     tags: "present_simple|see|article_an|singular|food", cefr: "a1", difficulty: "1" },

  // ----- I see + number + (adj/color/+adj) + N(plural) -----
  { sentence: "I see eight little ducks.",      target_word: "ducks",     acceptable_targets: "duck",  structure_id: "see_descriptions",     tags: "present_simple|see|numbers|adjective|plural|animals", cefr: "a1", difficulty: "3" },
  { sentence: "I see five big books.",          target_word: "books",     acceptable_targets: "book",  structure_id: "see_descriptions",     tags: "present_simple|see|numbers|adjective|plural", cefr: "a1", difficulty: "3" },
  { sentence: "I see five slow turtles.",       target_word: "turtles",   acceptable_targets: "turtle",structure_id: "see_descriptions",     tags: "present_simple|see|numbers|adjective|plural|animals", cefr: "a1", difficulty: "3" },
  { sentence: "I see five small balls.",        target_word: "balls",     acceptable_targets: "ball",  structure_id: "see_descriptions",     tags: "present_simple|see|numbers|adjective|plural", cefr: "a1", difficulty: "3" },
  { sentence: "I see four fast cars.",          target_word: "cars",      acceptable_targets: "car",   structure_id: "see_descriptions",     tags: "present_simple|see|numbers|adjective|plural|transport", cefr: "a1", difficulty: "3" },
  { sentence: "I see four green apples.",       target_word: "apples",    acceptable_targets: "apple", structure_id: "see_descriptions",     tags: "present_simple|see|numbers|color|plural|food", cefr: "a1", difficulty: "3" },
  { sentence: "I see four happy students.",     target_word: "students",  acceptable_targets: "student",structure_id: "see_descriptions",    tags: "present_simple|see|numbers|adjective|plural|emotions", cefr: "a1", difficulty: "3" },
  { sentence: "I see four large white clouds.", target_word: "clouds",    acceptable_targets: "cloud", structure_id: "see_descriptions",     tags: "present_simple|see|numbers|adjective|color|plural", cefr: "a1", difficulty: "3" },
  { sentence: "I see four small toys.",         target_word: "toys",      acceptable_targets: "toy",   structure_id: "see_descriptions",     tags: "present_simple|see|numbers|adjective|plural", cefr: "a1", difficulty: "3" },
  { sentence: "I see nine white eggs.",         target_word: "eggs",      acceptable_targets: "egg",   structure_id: "see_descriptions",     tags: "present_simple|see|numbers|color|plural",     cefr: "a1", difficulty: "3" },
  { sentence: "I see one big red ball.",        target_word: "ball",      acceptable_targets: "",      structure_id: "see_descriptions",     tags: "present_simple|see|numbers|adjective|color|singular", cefr: "a1", difficulty: "3" },
  { sentence: "I see one hungry dog.",          target_word: "dog",       acceptable_targets: "",      structure_id: "see_descriptions",     tags: "present_simple|see|numbers|adjective|singular|emotions", cefr: "a1", difficulty: "3" },
  { sentence: "I see one small yellow bird.",   target_word: "bird",      acceptable_targets: "",      structure_id: "see_descriptions",     tags: "present_simple|see|numbers|adjective|color|singular", cefr: "a1", difficulty: "3" },
  { sentence: "I see one tiny brown ant.",      target_word: "ant",       acceptable_targets: "",      structure_id: "see_descriptions",     tags: "present_simple|see|numbers|adjective|color|singular|article_an", cefr: "a1", difficulty: "3" },
  { sentence: "I see seven brown birds.",       target_word: "birds",     acceptable_targets: "bird",  structure_id: "see_descriptions",     tags: "present_simple|see|numbers|color|plural|animals", cefr: "a1", difficulty: "3" },
  { sentence: "I see seven fast boats.",        target_word: "boats",     acceptable_targets: "boat",  structure_id: "see_descriptions",     tags: "present_simple|see|numbers|adjective|plural|transport", cefr: "a1", difficulty: "3" },
  { sentence: "I see six long pencils.",        target_word: "pencils",   acceptable_targets: "pencil",structure_id: "see_descriptions",     tags: "present_simple|see|numbers|adjective|plural", cefr: "a1", difficulty: "3" },
  { sentence: "I see three big dogs.",          target_word: "dogs",      acceptable_targets: "dog",   structure_id: "see_descriptions",     tags: "present_simple|see|numbers|adjective|plural|animals", cefr: "a1", difficulty: "3" },
  { sentence: "I see three big red balls.",     target_word: "balls",     acceptable_targets: "ball",  structure_id: "see_descriptions",     tags: "present_simple|see|numbers|adjective|color|plural", cefr: "a1", difficulty: "3" },
  { sentence: "I see three fast birds.",        target_word: "birds",     acceptable_targets: "bird",  structure_id: "see_descriptions",     tags: "present_simple|see|numbers|adjective|plural|animals", cefr: "a1", difficulty: "3" },
  { sentence: "I see three fast fish.",         target_word: "fish",      acceptable_targets: "",      structure_id: "see_descriptions",     tags: "present_simple|see|numbers|adjective|plural|animals", cefr: "a1", difficulty: "3" },
  { sentence: "I see two red bags.",            target_word: "bags",      acceptable_targets: "bag",   structure_id: "see_descriptions",     tags: "present_simple|see|numbers|color|plural",     cefr: "a1", difficulty: "3" },
  { sentence: "I see two small birds.",         target_word: "birds",     acceptable_targets: "bird",  structure_id: "see_descriptions",     tags: "present_simple|see|numbers|adjective|plural|animals", cefr: "a1", difficulty: "3" },
  { sentence: "I see two small blue birds.",    target_word: "birds",     acceptable_targets: "bird",  structure_id: "see_descriptions",     tags: "present_simple|see|numbers|adjective|color|plural|animals", cefr: "a1", difficulty: "3" },

  // ----- I sometimes / usually V (frequency) -----
  { sentence: "I sometimes go to the park.",    target_word: "park",      acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|frequency_sometimes|go|preposition_to|places", cefr: "a1", difficulty: "2" },
  { sentence: "I sometimes help my brother.",   target_word: "brother",   acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|frequency_sometimes|help|family|possessive", cefr: "a1", difficulty: "2" },
  { sentence: "I sometimes walk to the park.",  target_word: "park",      acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|frequency_sometimes|walk|preposition_to|places", cefr: "a1", difficulty: "2" },
  { sentence: "I usually play with my cousin.", target_word: "cousin",    acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|frequency_usually|play|family|possessive|preposition_with", cefr: "a1", difficulty: "3" },
  { sentence: "I usually play with my dog.",    target_word: "dog",       acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|frequency_usually|play|preposition_with|possessive", cefr: "a1", difficulty: "2" },
  { sentence: "I usually play with my sister.", target_word: "sister",    acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|frequency_usually|play|family|possessive|preposition_with", cefr: "a1", difficulty: "3" },

  // ----- Yes/no questions: Is + it + a/an + (adj/color) + N? -----
  { sentence: "Is it a big dog?",               target_word: "dog",       acceptable_targets: "",      structure_id: "yes_no_questions",     tags: "be|yes_no_question|adjective|article_a|singular|animals", cefr: "a1", difficulty: "2" },
  { sentence: "Is it a red apple?",             target_word: "apple",     acceptable_targets: "",      structure_id: "yes_no_questions",     tags: "be|yes_no_question|color|article_a|singular|food", cefr: "a1", difficulty: "2" },
  { sentence: "Is it a sunny day?",             target_word: "day",       acceptable_targets: "",      structure_id: "yes_no_questions",     tags: "be|yes_no_question|adjective|weather|article_a", cefr: "a1", difficulty: "2" },

  // ----- Yes/no questions: Is + the + N + adj? -----
  { sentence: "Is the dog big?",                target_word: "big",       acceptable_targets: "",      structure_id: "yes_no_questions",     tags: "be|yes_no_question|adjective|article_the",    cefr: "a1", difficulty: "2" },
  { sentence: "Is the milk cold?",              target_word: "cold",      acceptable_targets: "",      structure_id: "yes_no_questions",     tags: "be|yes_no_question|adjective|article_the|food", cefr: "a1", difficulty: "2" },
  { sentence: "Is the teacher happy?",          target_word: "happy",     acceptable_targets: "",      structure_id: "yes_no_questions",     tags: "be|yes_no_question|adjective|article_the|emotions", cefr: "a1", difficulty: "2" },

  // ----- It cannot V (negative_ability with non-human subject) -----
  { sentence: "It cannot go fast.",             target_word: "fast",      acceptable_targets: "",      structure_id: "abilities_modal",      tags: "cannot|negative_ability|movement|adverb",     cefr: "a1", difficulty: "2" },
  { sentence: "It cannot run away.",            target_word: "run",       acceptable_targets: "",      structure_id: "abilities_modal",      tags: "cannot|negative_ability|movement|particle_away", cefr: "a1", difficulty: "2" },
  { sentence: "It cannot stay still.",          target_word: "still",     acceptable_targets: "",      structure_id: "abilities_modal",      tags: "cannot|negative_ability|stay",                cefr: "a1", difficulty: "2" },

  // ----- It has a (adj) + body part — possession_have -----
  { sentence: "It has a long neck.",            target_word: "neck",      acceptable_targets: "",      structure_id: "possession_have",      tags: "have|adjective|body_parts|article_a|animals",  cefr: "a1", difficulty: "2" },
  { sentence: "It has a long tail.",            target_word: "tail",      acceptable_targets: "",      structure_id: "possession_have",      tags: "have|adjective|body_parts|article_a|animals",  cefr: "a1", difficulty: "2" },
  { sentence: "It has a small nose.",           target_word: "nose",      acceptable_targets: "",      structure_id: "possession_have",      tags: "have|adjective|body_parts|article_a",  cefr: "a1", difficulty: "2" },

  // ----- It is a (adj) N — be_a_noun -----
  { sentence: "It is a big house.",             target_word: "house",     acceptable_targets: "",      structure_id: "be_a_noun",            tags: "be|adjective|article_a|singular|home",        cefr: "a1", difficulty: "1" },
  { sentence: "It is a loud bird.",             target_word: "bird",      acceptable_targets: "",      structure_id: "be_a_noun",            tags: "be|adjective|article_a|singular|animals",     cefr: "a1", difficulty: "2" },
  { sentence: "It is a small bird.",            target_word: "bird",      acceptable_targets: "",      structure_id: "be_a_noun",            tags: "be|adjective|article_a|singular|animals",     cefr: "a1", difficulty: "1" },
];

/**
 * Sentences 199-298 in the bank — rows from "It is eating a bone."
 * through "She stands in front of the window." Variants in
 * VARIANT_LEXEMES_BY_SENTENCE.
 *
 * No new structure_id values — this batch reuses present_continuous,
 * classroom_commands (imperatives), be_adjective, possession_have,
 * abilities_modal, daily_routines_actions, and likes_preferences.
 */
const METADATA_BATCH_4 = [
  // ----- It is V-ing ... (present_continuous, non-human subject) -----
  { sentence: "It is eating a bone.",           target_word: "bone",      acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|eat|article_a|animals", cefr: "a1", difficulty: "2" },
  { sentence: "It is raining today.",           target_word: "raining",   acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|weather|time_today",    cefr: "a1", difficulty: "2" },
  { sentence: "It is sleeping on the mat.",     target_word: "mat",       acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|sleep|preposition_on",  cefr: "a1", difficulty: "2" },

  // ----- Listen to the X (imperative) -----
  { sentence: "Listen to the bird.",            target_word: "bird",      acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|listen|preposition_to|article_the",cefr: "a1", difficulty: "1" },
  { sentence: "Listen to the music.",           target_word: "music",     acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|listen|preposition_to|article_the",cefr: "a1", difficulty: "1" },
  { sentence: "Listen to the teacher.",         target_word: "teacher",   acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|listen|preposition_to|article_the",cefr: "a1", difficulty: "1" },

  // ----- Look at the/this X (imperative) -----
  { sentence: "Look at the bird.",              target_word: "bird",      acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|look|preposition_at|article_the",  cefr: "a1", difficulty: "1" },
  { sentence: "Look at the board.",             target_word: "board",     acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|look|preposition_at|article_the",  cefr: "a1", difficulty: "1" },
  { sentence: "Look at the clock.",             target_word: "clock",     acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|look|preposition_at|article_the",  cefr: "a1", difficulty: "1" },
  { sentence: "Look at the map.",               target_word: "map",       acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|look|preposition_at|article_the",  cefr: "a1", difficulty: "1" },
  { sentence: "Look at the teacher.",           target_word: "teacher",   acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|look|preposition_at|article_the",  cefr: "a1", difficulty: "1" },
  { sentence: "Look at this picture.",          target_word: "picture",   acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|look|preposition_at|demonstrative_this", cefr: "a1", difficulty: "1" },

  // ----- My/Our + N + is/has/can ... (possessives) -----
  { sentence: "My bag is blue.",                target_word: "blue",      acceptable_targets: "",      structure_id: "be_adjective",         tags: "be|color|possessive_my",                      cefr: "a1", difficulty: "1" },
  { sentence: "My brother has a black hat.",    target_word: "hat",       acceptable_targets: "",      structure_id: "possession_have",      tags: "have|adjective|color|article_a|family|possessive_my", cefr: "a1", difficulty: "2" },
  { sentence: "My father has a phone.",         target_word: "phone",     acceptable_targets: "",      structure_id: "possession_have",      tags: "have|article_a|family|possessive_my",         cefr: "a1", difficulty: "1" },
  { sentence: "My father is tall.",             target_word: "tall",      acceptable_targets: "",      structure_id: "be_adjective",         tags: "be|adjective|family|possessive_my",           cefr: "a1", difficulty: "1" },
  { sentence: "My friend can dance.",           target_word: "dance",     acceptable_targets: "",      structure_id: "abilities_modal",      tags: "can_affirmative|ability|possessive_my",       cefr: "a1", difficulty: "1" },
  { sentence: "My mother is busy.",             target_word: "busy",      acceptable_targets: "",      structure_id: "be_adjective",         tags: "be|adjective|family|possessive_my",           cefr: "a1", difficulty: "1" },
  { sentence: "My sister is happy.",            target_word: "happy",     acceptable_targets: "",      structure_id: "be_adjective",         tags: "be|adjective|emotions|family|possessive_my",  cefr: "a1", difficulty: "1" },

  // ----- Open the/your X (imperative) -----
  { sentence: "Open the bag.",                  target_word: "bag",       acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|open|article_the",                 cefr: "a1", difficulty: "1" },
  { sentence: "Open the box.",                  target_word: "box",       acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|open|article_the",                 cefr: "a1", difficulty: "1" },
  { sentence: "Open the window.",               target_word: "window",    acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|open|article_the",                 cefr: "a1", difficulty: "1" },
  { sentence: "Open your book.",                target_word: "book",      acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|open|possessive_your",             cefr: "a1", difficulty: "1" },

  // ----- Our + N is + adj (be_adjective with possessive_our) -----
  { sentence: "Our house is big.",              target_word: "big",       acceptable_targets: "",      structure_id: "be_adjective",         tags: "be|adjective|possessive_our|home",            cefr: "a1", difficulty: "2" },
  { sentence: "Our teacher is nice.",           target_word: "nice",      acceptable_targets: "",      structure_id: "be_adjective",         tags: "be|adjective|possessive_our",                 cefr: "a1", difficulty: "2" },

  // ----- Pick up + obj / Please be + adj (imperative) -----
  { sentence: "Pick up the bag.",               target_word: "bag",       acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|pick_up|particle|article_the",     cefr: "a1", difficulty: "2" },
  { sentence: "Please be careful.",             target_word: "careful",   acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|please|be|adjective",              cefr: "a1", difficulty: "2" },
  { sentence: "Please be quiet now.",           target_word: "quiet",     acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|please|be|adjective|time_now",     cefr: "a1", difficulty: "2" },
  { sentence: "Please be quiet.",               target_word: "quiet",     acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|please|be|adjective",              cefr: "a1", difficulty: "1" },

  // ----- Please come ... (imperative) -----
  { sentence: "Please come here.",              target_word: "here",      acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|please|come|adverb",               cefr: "a1", difficulty: "1" },
  { sentence: "Please come to the front.",      target_word: "front",     acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|please|come|preposition_to|article_the", cefr: "a1", difficulty: "2" },
  { sentence: "Please come to the table.",      target_word: "table",     acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|please|come|preposition_to|article_the", cefr: "a1", difficulty: "2" },

  // ----- Please drink/eat the X (imperative) -----
  { sentence: "Please drink the juice.",        target_word: "juice",     acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|please|drink|article_the|food",    cefr: "a1", difficulty: "1" },
  { sentence: "Please drink the milk.",         target_word: "milk",      acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|please|drink|article_the|food",    cefr: "a1", difficulty: "1" },
  { sentence: "Please drink the water.",        target_word: "water",     acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|please|drink|article_the|food",    cefr: "a1", difficulty: "1" },
  { sentence: "Please eat the apple.",          target_word: "apple",     acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|please|eat|article_the|food",      cefr: "a1", difficulty: "1" },
  { sentence: "Please eat the bread.",          target_word: "bread",     acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|please|eat|article_the|food",      cefr: "a1", difficulty: "1" },
  { sentence: "Please eat the soup.",           target_word: "soup",      acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|please|eat|article_the|food",      cefr: "a1", difficulty: "1" },

  // ----- Please give me the X (ditransitive imperative) -----
  { sentence: "Please give me the book.",       target_word: "book",      acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|please|give|ditransitive|article_the", cefr: "a1", difficulty: "2" },
  { sentence: "Please give me the paper.",      target_word: "paper",     acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|please|give|ditransitive|article_the", cefr: "a1", difficulty: "2" },
  { sentence: "Please give me the pen.",        target_word: "pen",       acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|please|give|ditransitive|article_the", cefr: "a1", difficulty: "2" },

  // ----- Put the X in the Y (imperative w/ preposition) -----
  { sentence: "Put the book in the bag.",       target_word: "book",      acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|put|preposition_in|article_the",   cefr: "a1", difficulty: "2" },
  { sentence: "Put the pen in the box.",        target_word: "pen",       acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|put|preposition_in|article_the",   cefr: "a1", difficulty: "2" },
  { sentence: "Put the toy in the box.",        target_word: "toy",       acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|put|preposition_in|article_the",   cefr: "a1", difficulty: "2" },

  // ----- Read the / Say the (imperative) -----
  { sentence: "Read the sentence.",             target_word: "sentence",  acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|read|article_the",                 cefr: "a1", difficulty: "1" },
  { sentence: "Read the word.",                 target_word: "word",      acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|read|article_the",                 cefr: "a1", difficulty: "1" },
  { sentence: "Say the word.",                  target_word: "word",      acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|say|article_the",                  cefr: "a1", difficulty: "1" },

  // ----- She always V (frequency_always, 3rd_person) -----
  { sentence: "She always draws in the evening.",   target_word: "draws",   acceptable_targets: "draw",  structure_id: "daily_routines_actions", tags: "present_simple|frequency_always|3rd_person|times_of_day", cefr: "a1", difficulty: "3" },
  { sentence: "She always has a pen.",          target_word: "pen",       acceptable_targets: "",      structure_id: "possession_have",      tags: "present_simple|frequency_always|have|3rd_person|article_a", cefr: "a1", difficulty: "2" },
  { sentence: "She always has a smile.",        target_word: "smile",     acceptable_targets: "",      structure_id: "possession_have",      tags: "present_simple|frequency_always|have|3rd_person|article_a", cefr: "a1", difficulty: "2" },
  { sentence: "She always has an apple.",       target_word: "apple",     acceptable_targets: "",      structure_id: "possession_have",      tags: "present_simple|frequency_always|have|3rd_person|article_an|food", cefr: "a1", difficulty: "2" },
  { sentence: "She always reads in the morning.",   target_word: "reads",   acceptable_targets: "read",  structure_id: "daily_routines_actions", tags: "present_simple|frequency_always|3rd_person|times_of_day", cefr: "a1", difficulty: "3" },
  { sentence: "She always writes in the afternoon.",target_word: "writes",  acceptable_targets: "write", structure_id: "daily_routines_actions", tags: "present_simple|frequency_always|3rd_person|times_of_day", cefr: "a1", difficulty: "3" },

  // ----- She can V (abilities_modal, 3rd_person) -----
  { sentence: "She can jump high.",             target_word: "jump",      acceptable_targets: "",      structure_id: "abilities_modal",      tags: "can_affirmative|ability|3rd_person|adverb",   cefr: "a1", difficulty: "2" },
  { sentence: "She can speak English.",         target_word: "English",   acceptable_targets: "",      structure_id: "abilities_modal",      tags: "can_affirmative|ability|3rd_person|languages",cefr: "a1", difficulty: "2" },

  // ----- She does not V (present_simple negation, 3rd_person) -----
  { sentence: "She does not like bread.",       target_word: "bread",     acceptable_targets: "",      structure_id: "likes_preferences",    tags: "present_simple|negative|does_not|like|3rd_person|food", cefr: "a1", difficulty: "3" },
  { sentence: "She does not like fish.",        target_word: "fish",      acceptable_targets: "",      structure_id: "likes_preferences",    tags: "present_simple|negative|does_not|like|3rd_person|food", cefr: "a1", difficulty: "3" },
  { sentence: "She does not like rice.",        target_word: "rice",      acceptable_targets: "",      structure_id: "likes_preferences",    tags: "present_simple|negative|does_not|like|3rd_person|food", cefr: "a1", difficulty: "3" },
  { sentence: "She does not like spiders.",     target_word: "spiders",   acceptable_targets: "spider",structure_id: "likes_preferences",    tags: "present_simple|negative|does_not|like|3rd_person|animals|plural", cefr: "a1", difficulty: "3" },
  { sentence: "She does not watch TV.",         target_word: "TV",        acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|negative|does_not|watch|3rd_person", cefr: "a1", difficulty: "3" },

  // ----- She has + N / N + adj N (possession_have, 3rd_person) -----
  { sentence: "She has a dog.",                 target_word: "dog",       acceptable_targets: "",      structure_id: "possession_have",      tags: "have|3rd_person|article_a|animals",           cefr: "a1", difficulty: "1" },
  { sentence: "She has a kind friend.",         target_word: "friend",    acceptable_targets: "",      structure_id: "possession_have",      tags: "have|3rd_person|adjective|article_a",         cefr: "a1", difficulty: "2" },
  { sentence: "She has a new friend.",          target_word: "friend",    acceptable_targets: "",      structure_id: "possession_have",      tags: "have|3rd_person|adjective|article_a",         cefr: "a1", difficulty: "2" },
  { sentence: "She has five fresh eggs.",       target_word: "eggs",      acceptable_targets: "egg",   structure_id: "possession_have",      tags: "have|3rd_person|numbers|adjective|plural|food", cefr: "a1", difficulty: "3" },
  { sentence: "She has five new pencils.",      target_word: "pencils",   acceptable_targets: "pencil",structure_id: "possession_have",      tags: "have|3rd_person|numbers|adjective|plural",    cefr: "a1", difficulty: "3" },
  { sentence: "She has five small eggs.",       target_word: "eggs",      acceptable_targets: "egg",   structure_id: "possession_have",      tags: "have|3rd_person|numbers|adjective|plural|food", cefr: "a1", difficulty: "3" },
  { sentence: "She has four old books.",        target_word: "books",     acceptable_targets: "book",  structure_id: "possession_have",      tags: "have|3rd_person|numbers|adjective|plural",    cefr: "a1", difficulty: "3" },
  { sentence: "She has four white eggs.",       target_word: "eggs",      acceptable_targets: "egg",   structure_id: "possession_have",      tags: "have|3rd_person|numbers|color|plural|food",   cefr: "a1", difficulty: "3" },
  { sentence: "She has nine new stickers.",     target_word: "stickers",  acceptable_targets: "sticker",structure_id: "possession_have",     tags: "have|3rd_person|numbers|adjective|plural",    cefr: "a1", difficulty: "3" },
  { sentence: "She has three happy hamsters.",  target_word: "hamsters",  acceptable_targets: "hamster",structure_id: "possession_have",     tags: "have|3rd_person|numbers|adjective|plural|animals", cefr: "a1", difficulty: "3" },
  { sentence: "She has three small cats.",      target_word: "cats",      acceptable_targets: "cat",   structure_id: "possession_have",      tags: "have|3rd_person|numbers|adjective|plural|animals", cefr: "a1", difficulty: "3" },
  { sentence: "She has two happy dogs.",        target_word: "dogs",      acceptable_targets: "dog",   structure_id: "possession_have",      tags: "have|3rd_person|numbers|adjective|plural|animals", cefr: "a1", difficulty: "3" },

  // ----- She is V-ing ... (present_continuous, 3rd_person) -----
  { sentence: "She is closing the gate.",       target_word: "gate",      acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|3rd_person|close|article_the", cefr: "a1", difficulty: "2" },
  { sentence: "She is eating an apple.",        target_word: "apple",     acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|3rd_person|eat|article_an|food", cefr: "a1", difficulty: "2" },
  { sentence: "She is listening to the teacher.",target_word: "teacher",  acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|3rd_person|listen|preposition_to", cefr: "a1", difficulty: "2" },
  { sentence: "She is opening the box.",        target_word: "box",       acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|3rd_person|open|article_the", cefr: "a1", difficulty: "2" },
  { sentence: "She is opening the window.",     target_word: "window",    acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|3rd_person|open|article_the", cefr: "a1", difficulty: "2" },
  { sentence: "She is sitting next to me.",     target_word: "sitting",   acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|3rd_person|preposition_next_to", cefr: "a1", difficulty: "2" },
  { sentence: "She is sleeping in the bed.",    target_word: "bed",       acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|3rd_person|sleep|preposition_in", cefr: "a1", difficulty: "2" },
  { sentence: "She is standing by the tree.",   target_word: "tree",      acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|3rd_person|stand|preposition_by", cefr: "a1", difficulty: "2" },
  { sentence: "She is very happy.",             target_word: "happy",     acceptable_targets: "",      structure_id: "be_adjective",         tags: "be|adjective|3rd_person|intensifier|emotions",cefr: "a1", difficulty: "2" },
  { sentence: "She is washing the dishes.",     target_word: "dishes",    acceptable_targets: "dish",  structure_id: "present_continuous",   tags: "be|present_continuous|3rd_person|wash|article_the|plural", cefr: "a1", difficulty: "2" },

  // ----- She likes / loves ... (likes_preferences, 3rd_person) -----
  { sentence: "She likes bananas and eggs.",    target_word: "bananas",   acceptable_targets: "banana",structure_id: "likes_preferences",    tags: "present_simple|3rd_person|likes|food|plural|conjunction_and", cefr: "a1", difficulty: "3" },
  { sentence: "She likes her new bag.",         target_word: "bag",       acceptable_targets: "",      structure_id: "likes_preferences",    tags: "present_simple|3rd_person|likes|adjective|possessive_her", cefr: "a1", difficulty: "2" },
  { sentence: "She likes juice and cookies.",   target_word: "juice",     acceptable_targets: "",      structure_id: "likes_preferences",    tags: "present_simple|3rd_person|likes|food|conjunction_and", cefr: "a1", difficulty: "3" },
  { sentence: "She likes milk and bread.",      target_word: "milk",      acceptable_targets: "",      structure_id: "likes_preferences",    tags: "present_simple|3rd_person|likes|food|conjunction_and", cefr: "a1", difficulty: "3" },
  { sentence: "She likes the dog.",             target_word: "dog",       acceptable_targets: "",      structure_id: "likes_preferences",    tags: "present_simple|3rd_person|likes|article_the|animals", cefr: "a1", difficulty: "2" },

  // ----- She lives in a X (places, 3rd_person) -----
  { sentence: "She lives in a city.",           target_word: "city",      acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|3rd_person|live|preposition_in|article_a|places", cefr: "a1", difficulty: "2" },
  { sentence: "She lives in a flat.",           target_word: "flat",      acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|3rd_person|live|preposition_in|article_a|home", cefr: "a1", difficulty: "2" },
  { sentence: "She lives in a house.",          target_word: "house",     acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|3rd_person|live|preposition_in|article_a|home", cefr: "a1", difficulty: "2" },

  // ----- She loves her X -----
  { sentence: "She loves her cat.",             target_word: "cat",       acceptable_targets: "",      structure_id: "likes_preferences",    tags: "present_simple|3rd_person|loves|possessive_her|animals", cefr: "a1", difficulty: "2" },
  { sentence: "She loves her doll.",            target_word: "doll",      acceptable_targets: "",      structure_id: "likes_preferences",    tags: "present_simple|3rd_person|loves|possessive_her", cefr: "a1", difficulty: "2" },

  // ----- She needs / plays / sometimes V -----
  { sentence: "She needs a new eraser.",        target_word: "eraser",    acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|3rd_person|need|adjective|article_a", cefr: "a1", difficulty: "3" },
  { sentence: "She plays football well.",       target_word: "football",  acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|3rd_person|play|sports|adverb", cefr: "a1", difficulty: "3" },
  { sentence: "She sometimes finds a coin.",    target_word: "coin",      acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|3rd_person|frequency_sometimes|find|article_a", cefr: "a1", difficulty: "3" },
  { sentence: "She sometimes helps her friend.",target_word: "friend",    acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|3rd_person|frequency_sometimes|help|possessive_her", cefr: "a1", difficulty: "3" },
  { sentence: "She sometimes helps her mother.",target_word: "mother",    acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|3rd_person|frequency_sometimes|help|possessive_her|family", cefr: "a1", difficulty: "3" },

  // ----- She stands in front of the X -----
  { sentence: "She stands in front of the class.", target_word: "class",  acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|3rd_person|stand|preposition_in_front_of|article_the", cefr: "a1", difficulty: "3" },
  { sentence: "She stands in front of the mirror.",target_word: "mirror", acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|3rd_person|stand|preposition_in_front_of|article_the", cefr: "a1", difficulty: "3" },
  { sentence: "She stands in front of the window.",target_word: "window", acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|3rd_person|stand|preposition_in_front_of|article_the", cefr: "a1", difficulty: "3" },
];

/**
 * Sentences 299-398 in the bank — rows from "Sit next to me." through
 * "There are two clean cups." Variants in VARIANT_LEXEMES_BY_SENTENCE.
 *
 * New structure_id introduced here:
 *   - existential_there  — "There are eight boys in the yard." family
 * Existing reused: classroom_commands, be_a_noun, be_location,
 * be_adjective, present_continuous, daily_routines_actions.
 */
const METADATA_BATCH_5 = [
  // ----- Sit next to / on ... (imperative) -----
  { sentence: "Sit next to me.",                target_word: "me",        acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|sit|preposition_next_to|pronoun_object", cefr: "a1", difficulty: "1" },
  { sentence: "Sit next to the window.",        target_word: "window",    acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|sit|preposition_next_to|article_the", cefr: "a1", difficulty: "1" },
  { sentence: "Sit next to your friend.",       target_word: "friend",    acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|sit|preposition_next_to|possessive_your", cefr: "a1", difficulty: "1" },
  { sentence: "Sit on the bench.",              target_word: "bench",     acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|sit|preposition_on|article_the",   cefr: "a1", difficulty: "1" },
  { sentence: "Sit on the chair.",              target_word: "chair",     acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|sit|preposition_on|article_the",   cefr: "a1", difficulty: "1" },
  { sentence: "Sit on the floor.",              target_word: "floor",     acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|sit|preposition_on|article_the",   cefr: "a1", difficulty: "1" },
  { sentence: "Sit on the grass.",              target_word: "grass",     acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|sit|preposition_on|article_the",   cefr: "a1", difficulty: "1" },
  { sentence: "Sit on the mat.",                target_word: "mat",       acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|sit|preposition_on|article_the",   cefr: "a1", difficulty: "1" },

  // ----- Stand X, please. (imperative w/ adverb/particle) -----
  { sentence: "Stand back, please.",            target_word: "back",      acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|stand|please|adverb",              cefr: "a1", difficulty: "1" },
  { sentence: "Stand up, please.",              target_word: "up",        acceptable_targets: "",      structure_id: "classroom_commands",   tags: "imperative|stand|please|particle",            cefr: "a1", difficulty: "1" },

  // ----- That is + (a/her/my/your) + N — be_a_noun w/ demonstrative_that -----
  { sentence: "That is a brave dog.",           target_word: "dog",       acceptable_targets: "",      structure_id: "be_a_noun",            tags: "be|demonstrative_that|adjective|article_a|singular|animals", cefr: "a1", difficulty: "2" },
  { sentence: "That is a fast bird.",           target_word: "bird",      acceptable_targets: "",      structure_id: "be_a_noun",            tags: "be|demonstrative_that|adjective|article_a|singular|animals", cefr: "a1", difficulty: "2" },
  { sentence: "That is a small bird.",          target_word: "bird",      acceptable_targets: "",      structure_id: "be_a_noun",            tags: "be|demonstrative_that|adjective|article_a|singular|animals", cefr: "a1", difficulty: "1" },
  { sentence: "That is her mirror.",            target_word: "mirror",    acceptable_targets: "",      structure_id: "be_a_noun",            tags: "be|demonstrative_that|possessive_her|singular", cefr: "a1", difficulty: "2" },
  { sentence: "That is my chair.",              target_word: "chair",     acceptable_targets: "",      structure_id: "be_a_noun",            tags: "be|demonstrative_that|possessive_my|singular", cefr: "a1", difficulty: "1" },
  { sentence: "That is your chair.",            target_word: "chair",     acceptable_targets: "",      structure_id: "be_a_noun",            tags: "be|demonstrative_that|possessive_your|singular", cefr: "a1", difficulty: "1" },

  // ----- The X is + prep + Y (be_location) -----
  { sentence: "The apple is in my bag.",        target_word: "bag",       acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_in|article_the|possessive_my|food", cefr: "a1", difficulty: "2" },
  { sentence: "The apple is on the plate.",     target_word: "plate",     acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_on|article_the|food",          cefr: "a1", difficulty: "2" },

  // ----- The X is + adj (be_adjective) -----
  { sentence: "The baby is happy.",             target_word: "happy",     acceptable_targets: "",      structure_id: "be_adjective",         tags: "be|adjective|emotions|article_the",           cefr: "a1", difficulty: "1" },

  // ----- The X is + prep + Y (be_location) -----
  { sentence: "The bag is on the floor.",       target_word: "floor",     acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_on|article_the",               cefr: "a1", difficulty: "1" },
  { sentence: "The bag is under the desk.",     target_word: "desk",      acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_under|article_the",            cefr: "a1", difficulty: "1" },
  { sentence: "The ball is under the desk.",    target_word: "desk",      acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_under|article_the",            cefr: "a1", difficulty: "1" },
  { sentence: "The ball is under the table.",   target_word: "table",     acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_under|article_the",            cefr: "a1", difficulty: "1" },
  { sentence: "The bike is behind the house.",  target_word: "house",     acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_behind|article_the|transport", cefr: "a1", difficulty: "2" },
  { sentence: "The bird is on the tree.",       target_word: "tree",      acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_on|article_the|animals",       cefr: "a1", difficulty: "1" },
  { sentence: "The bird is on the wall.",       target_word: "wall",      acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_on|article_the|animals",       cefr: "a1", difficulty: "1" },
  { sentence: "The book is in the box.",        target_word: "box",       acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_in|article_the",               cefr: "a1", difficulty: "1" },
  { sentence: "The book is next to the lamp.",  target_word: "lamp",      acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_next_to|article_the",          cefr: "a1", difficulty: "2" },

  // ----- The boy/girl + V/is ... -----
  { sentence: "The boy is sad.",                target_word: "sad",       acceptable_targets: "",      structure_id: "be_adjective",         tags: "be|adjective|emotions|article_the",           cefr: "a1", difficulty: "1" },
  { sentence: "The boy reads a book.",          target_word: "book",      acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|3rd_person|read|article_a|article_the", cefr: "a1", difficulty: "2" },
  { sentence: "The boys play football.",        target_word: "football",  acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|3rd_person_plural|play|sports", cefr: "a1", difficulty: "2" },

  // ----- The cake/candy/cat ... is ... (be_location + present_continuous) -----
  { sentence: "The cake is on the plate.",      target_word: "plate",     acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_on|article_the|food",          cefr: "a1", difficulty: "1" },
  { sentence: "The candy is in my pocket.",     target_word: "pocket",    acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_in|article_the|possessive_my|food", cefr: "a1", difficulty: "2" },
  { sentence: "The cat is behind the door.",    target_word: "door",      acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_behind|article_the|animals",   cefr: "a1", difficulty: "2" },
  { sentence: "The cat is drinking milk.",      target_word: "milk",      acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|drink|animals|food",    cefr: "a1", difficulty: "2" },
  { sentence: "The cat is on the table.",       target_word: "table",     acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_on|article_the|animals",       cefr: "a1", difficulty: "1" },
  { sentence: "The cat is sleeping on the chair.", target_word: "chair",  acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|sleep|preposition_on|animals", cefr: "a1", difficulty: "2" },

  // ----- The dog ... -----
  { sentence: "The dog is behind the chair.",   target_word: "chair",     acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_behind|article_the|animals",   cefr: "a1", difficulty: "2" },
  { sentence: "The dog is playing with a ball.",target_word: "ball",      acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|play|preposition_with|animals", cefr: "a1", difficulty: "2" },
  { sentence: "The dog is running fast.",       target_word: "running",   acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|adverb|animals",        cefr: "a1", difficulty: "2" },
  { sentence: "The dog is wagging its tail.",   target_word: "tail",      acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|wag|possessive_its|animals|body_parts", cefr: "a1", difficulty: "2" },

  // ----- The girl ... -----
  { sentence: "The girl is happy.",             target_word: "happy",     acceptable_targets: "",      structure_id: "be_adjective",         tags: "be|adjective|emotions|article_the",           cefr: "a1", difficulty: "1" },
  { sentence: "The girl writes a letter.",      target_word: "letter",    acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|3rd_person|write|article_a|article_the", cefr: "a1", difficulty: "2" },
  { sentence: "The girls jump rope.",           target_word: "rope",      acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|3rd_person_plural|jump|sports", cefr: "a1", difficulty: "2" },

  // ----- The hat / keys / kitten / milk / note ... -----
  { sentence: "The hat is on the shelf.",       target_word: "shelf",     acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_on|article_the|clothes",       cefr: "a1", difficulty: "2" },
  { sentence: "The keys are in the bowl.",      target_word: "bowl",      acceptable_targets: "",      structure_id: "be_location",          tags: "be|are|preposition_in|article_the|plural",    cefr: "a1", difficulty: "2" },
  { sentence: "The kitten is playing with yarn.", target_word: "yarn",    acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|play|preposition_with|animals", cefr: "a1", difficulty: "3" },
  { sentence: "The milk is in the fridge.",     target_word: "fridge",    acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_in|article_the|food",          cefr: "a1", difficulty: "2" },
  { sentence: "The milk is on the table.",      target_word: "table",     acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_on|article_the|food",          cefr: "a1", difficulty: "1" },
  { sentence: "The note is on the fridge.",     target_word: "fridge",    acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_on|article_the",               cefr: "a1", difficulty: "2" },

  // ----- The pen / pencil / poster / rug / ruler / shoe ... -----
  { sentence: "The pen is in the bag.",         target_word: "bag",       acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_in|article_the",               cefr: "a1", difficulty: "1" },
  { sentence: "The pen is next to the book.",   target_word: "book",      acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_next_to|article_the",          cefr: "a1", difficulty: "2" },
  { sentence: "The pencil is in my hand.",      target_word: "hand",      acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_in|article_the|possessive_my|body_parts", cefr: "a1", difficulty: "2" },
  { sentence: "The pencil is on the paper.",    target_word: "paper",     acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_on|article_the",               cefr: "a1", difficulty: "1" },
  { sentence: "The poster is on the wall.",     target_word: "wall",      acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_on|article_the",               cefr: "a1", difficulty: "2" },
  { sentence: "The rug is under the bed.",      target_word: "bed",       acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_under|article_the",            cefr: "a1", difficulty: "2" },
  { sentence: "The ruler is next to the pen.",  target_word: "pen",       acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_next_to|article_the",          cefr: "a1", difficulty: "2" },
  { sentence: "The shoe is on the mat.",        target_word: "mat",       acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_on|article_the|clothes",       cefr: "a1", difficulty: "1" },

  // ----- The student ... -----
  { sentence: "The student is smart.",          target_word: "smart",     acceptable_targets: "",      structure_id: "be_adjective",         tags: "be|adjective|article_the",                    cefr: "a1", difficulty: "2" },
  { sentence: "The student raises a hand.",     target_word: "hand",      acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|3rd_person|raise|article_a|article_the|body_parts", cefr: "a1", difficulty: "3" },
  { sentence: "The student sits down.",         target_word: "sits",      acceptable_targets: "sit",   structure_id: "daily_routines_actions", tags: "present_simple|3rd_person|sit|particle_down", cefr: "a1", difficulty: "3" },
  { sentence: "The students listen to music.",  target_word: "music",     acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|3rd_person_plural|listen|preposition_to", cefr: "a1", difficulty: "2" },

  // ----- The teacher ... -----
  { sentence: "The teacher is good.",           target_word: "good",      acceptable_targets: "",      structure_id: "be_adjective",         tags: "be|adjective|article_the",                    cefr: "a1", difficulty: "1" },
  { sentence: "The teacher is nice.",           target_word: "nice",      acceptable_targets: "",      structure_id: "be_adjective",         tags: "be|adjective|article_the",                    cefr: "a1", difficulty: "1" },
  { sentence: "The teacher is pointing.",       target_word: "pointing",  acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|article_the",           cefr: "a1", difficulty: "2" },
  { sentence: "The teacher is talking.",        target_word: "talking",   acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|article_the",           cefr: "a1", difficulty: "2" },
  { sentence: "The teacher is writing.",        target_word: "writing",   acceptable_targets: "",      structure_id: "present_continuous",   tags: "be|present_continuous|article_the",           cefr: "a1", difficulty: "2" },
  { sentence: "The teacher opens the book.",    target_word: "book",      acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|3rd_person|open|article_the",  cefr: "a1", difficulty: "2" },
  { sentence: "The teacher rings the bell.",    target_word: "bell",      acceptable_targets: "",      structure_id: "daily_routines_actions", tags: "present_simple|3rd_person|ring|article_the",  cefr: "a1", difficulty: "3" },

  // ----- The toy ... -----
  { sentence: "The toy is under the sofa.",     target_word: "sofa",      acceptable_targets: "",      structure_id: "be_location",          tags: "be|preposition_under|article_the",            cefr: "a1", difficulty: "1" },

  // ----- Their X is Y (be_adjective + possessive_their) -----
  { sentence: "Their boat is slow.",            target_word: "slow",      acceptable_targets: "",      structure_id: "be_adjective",         tags: "be|adjective|possessive_their|transport",     cefr: "a1", difficulty: "2" },
  { sentence: "Their car is fast.",             target_word: "fast",      acceptable_targets: "",      structure_id: "be_adjective",         tags: "be|adjective|possessive_their|transport",     cefr: "a1", difficulty: "2" },
  { sentence: "Their car is old.",              target_word: "old",       acceptable_targets: "",      structure_id: "be_adjective",         tags: "be|adjective|possessive_their|transport",     cefr: "a1", difficulty: "2" },

  // ----- There are + number + (adj/color) + N(s) (+ prep + place) — existential_there -----
  { sentence: "There are eight boys in the yard.",     target_word: "boys",     acceptable_targets: "boy",     structure_id: "existential_there", tags: "existential|there_are|numbers|preposition_in|article_the|plural", cefr: "a1", difficulty: "3" },
  { sentence: "There are five apples in the box.",     target_word: "apples",   acceptable_targets: "apple",   structure_id: "existential_there", tags: "existential|there_are|numbers|preposition_in|article_the|plural|food", cefr: "a1", difficulty: "3" },
  { sentence: "There are five boxes.",                 target_word: "boxes",    acceptable_targets: "box",     structure_id: "existential_there", tags: "existential|there_are|numbers|plural", cefr: "a1", difficulty: "2" },
  { sentence: "There are five girls in the room.",     target_word: "girls",    acceptable_targets: "girl",    structure_id: "existential_there", tags: "existential|there_are|numbers|preposition_in|article_the|plural", cefr: "a1", difficulty: "3" },
  { sentence: "There are five pencils.",               target_word: "pencils",  acceptable_targets: "pencil",  structure_id: "existential_there", tags: "existential|there_are|numbers|plural", cefr: "a1", difficulty: "2" },
  { sentence: "There are four birds.",                 target_word: "birds",    acceptable_targets: "bird",    structure_id: "existential_there", tags: "existential|there_are|numbers|plural|animals", cefr: "a1", difficulty: "2" },
  { sentence: "There are four books in the bag.",      target_word: "books",    acceptable_targets: "book",    structure_id: "existential_there", tags: "existential|there_are|numbers|preposition_in|article_the|plural", cefr: "a1", difficulty: "3" },
  { sentence: "There are four oranges in the box.",    target_word: "oranges",  acceptable_targets: "orange",  structure_id: "existential_there", tags: "existential|there_are|numbers|preposition_in|article_the|plural|food", cefr: "a1", difficulty: "3" },
  { sentence: "There are four pears in the bowl.",     target_word: "pears",    acceptable_targets: "pear",    structure_id: "existential_there", tags: "existential|there_are|numbers|preposition_in|article_the|plural|food", cefr: "a1", difficulty: "3" },
  { sentence: "There are four pens in the drawer.",    target_word: "pens",     acceptable_targets: "pen",     structure_id: "existential_there", tags: "existential|there_are|numbers|preposition_in|article_the|plural", cefr: "a1", difficulty: "3" },
  { sentence: "There are four students in the room.",  target_word: "students", acceptable_targets: "student", structure_id: "existential_there", tags: "existential|there_are|numbers|preposition_in|article_the|plural", cefr: "a1", difficulty: "3" },
  { sentence: "There are six books on the shelf.",     target_word: "books",    acceptable_targets: "book",    structure_id: "existential_there", tags: "existential|there_are|numbers|preposition_on|article_the|plural", cefr: "a1", difficulty: "3" },
  { sentence: "There are six green chairs.",           target_word: "chairs",   acceptable_targets: "chair",   structure_id: "existential_there", tags: "existential|there_are|numbers|color|plural", cefr: "a1", difficulty: "3" },
  { sentence: "There are ten small fish.",             target_word: "fish",     acceptable_targets: "",        structure_id: "existential_there", tags: "existential|there_are|numbers|adjective|plural|animals", cefr: "a1", difficulty: "3" },
  { sentence: "There are three bags on the floor.",    target_word: "bags",     acceptable_targets: "bag",     structure_id: "existential_there", tags: "existential|there_are|numbers|preposition_on|article_the|plural", cefr: "a1", difficulty: "3" },
  { sentence: "There are three children in the park.", target_word: "children", acceptable_targets: "child",   structure_id: "existential_there", tags: "existential|there_are|numbers|preposition_in|article_the|plural|irregular_plural", cefr: "a1", difficulty: "3" },
  { sentence: "There are three pens on the desk.",     target_word: "pens",     acceptable_targets: "pen",     structure_id: "existential_there", tags: "existential|there_are|numbers|preposition_on|article_the|plural", cefr: "a1", difficulty: "3" },
  { sentence: "There are three pens.",                 target_word: "pens",     acceptable_targets: "pen",     structure_id: "existential_there", tags: "existential|there_are|numbers|plural", cefr: "a1", difficulty: "2" },
  { sentence: "There are three red kites.",            target_word: "kites",    acceptable_targets: "kite",    structure_id: "existential_there", tags: "existential|there_are|numbers|color|plural", cefr: "a1", difficulty: "3" },
  { sentence: "There are three round balls.",          target_word: "balls",    acceptable_targets: "ball",    structure_id: "existential_there", tags: "existential|there_are|numbers|adjective|plural", cefr: "a1", difficulty: "3" },
  { sentence: "There are three yellow bananas.",       target_word: "bananas",  acceptable_targets: "banana",  structure_id: "existential_there", tags: "existential|there_are|numbers|color|plural|food", cefr: "a1", difficulty: "3" },
  { sentence: "There are two bags on the bike.",       target_word: "bags",     acceptable_targets: "bag",     structure_id: "existential_there", tags: "existential|there_are|numbers|preposition_on|article_the|plural", cefr: "a1", difficulty: "3" },
  { sentence: "There are two bags on the chair.",      target_word: "bags",     acceptable_targets: "bag",     structure_id: "existential_there", tags: "existential|there_are|numbers|preposition_on|article_the|plural", cefr: "a1", difficulty: "3" },
  { sentence: "There are two big boxes.",              target_word: "boxes",    acceptable_targets: "box",     structure_id: "existential_there", tags: "existential|there_are|numbers|adjective|plural", cefr: "a1", difficulty: "3" },
  { sentence: "There are two birds in the sky.",       target_word: "birds",    acceptable_targets: "bird",    structure_id: "existential_there", tags: "existential|there_are|numbers|preposition_in|article_the|plural|animals", cefr: "a1", difficulty: "3" },
  { sentence: "There are two cats on the bed.",        target_word: "cats",     acceptable_targets: "cat",     structure_id: "existential_there", tags: "existential|there_are|numbers|preposition_on|article_the|plural|animals", cefr: "a1", difficulty: "3" },
  { sentence: "There are two clean cups.",             target_word: "cups",     acceptable_targets: "cup",     structure_id: "existential_there", tags: "existential|there_are|numbers|adjective|plural", cefr: "a1", difficulty: "3" },
];

/**
 * Sentences 399-498 in the bank — rows from "There are two clean desks."
 * through "We are tired." Variants in VARIANT_LEXEMES_BY_SENTENCE.
 *
 * No new structure_id values — reuses existential_there, be_a_noun
 * (now also covering demonstrative_these/this/those + be), be_location,
 * be_adjective, present_continuous, abilities_modal, likes_preferences,
 * possession_have, daily_routines_actions, classroom_commands.
 */
const METADATA_BATCH_6 = [
  // ----- There are two + (adj/color) + N(s) (+ in/on + place) -----
  { sentence: "There are two clean desks.",            target_word: "desks",     acceptable_targets: "desk",     structure_id: "existential_there", tags: "existential|there_are|numbers|adjective|plural", cefr: "a1", difficulty: "3" },
  { sentence: "There are two doctors in the office.",  target_word: "doctors",   acceptable_targets: "doctor",   structure_id: "existential_there", tags: "existential|there_are|numbers|preposition_in|article_the|plural|people", cefr: "a1", difficulty: "3" },
  { sentence: "There are two empty bags.",             target_word: "bags",      acceptable_targets: "bag",      structure_id: "existential_there", tags: "existential|there_are|numbers|adjective|plural", cefr: "a1", difficulty: "3" },
  { sentence: "There are two new tables.",             target_word: "tables",    acceptable_targets: "table",    structure_id: "existential_there", tags: "existential|there_are|numbers|adjective|plural", cefr: "a1", difficulty: "3" },
  { sentence: "There are two soft cats.",              target_word: "cats",      acceptable_targets: "cat",      structure_id: "existential_there", tags: "existential|there_are|numbers|adjective|plural|animals", cefr: "a1", difficulty: "3" },
  { sentence: "There are two teachers in the park.",   target_word: "teachers",  acceptable_targets: "teacher",  structure_id: "existential_there", tags: "existential|there_are|numbers|preposition_in|article_the|plural|people", cefr: "a1", difficulty: "3" },

  // ----- There is a/an + adj + N (singular existential) -----
  { sentence: "There is a big dog.",                   target_word: "dog",       acceptable_targets: "",         structure_id: "existential_there", tags: "existential|there_is|adjective|article_a|singular|animals", cefr: "a1", difficulty: "2" },
  { sentence: "There is a cold room.",                 target_word: "room",      acceptable_targets: "",         structure_id: "existential_there", tags: "existential|there_is|adjective|article_a|singular", cefr: "a1", difficulty: "2" },
  { sentence: "There is a dark room.",                 target_word: "room",      acceptable_targets: "",         structure_id: "existential_there", tags: "existential|there_is|adjective|article_a|singular", cefr: "a1", difficulty: "2" },
  { sentence: "There is a dirty table.",               target_word: "table",     acceptable_targets: "",         structure_id: "existential_there", tags: "existential|there_is|adjective|article_a|singular", cefr: "a1", difficulty: "2" },
  { sentence: "There is a happy teacher.",             target_word: "teacher",   acceptable_targets: "",         structure_id: "existential_there", tags: "existential|there_is|adjective|article_a|singular|emotions", cefr: "a1", difficulty: "2" },
  { sentence: "There is a heavy box.",                 target_word: "box",       acceptable_targets: "",         structure_id: "existential_there", tags: "existential|there_is|adjective|article_a|singular", cefr: "a1", difficulty: "2" },
  { sentence: "There is a long pencil.",               target_word: "pencil",    acceptable_targets: "",         structure_id: "existential_there", tags: "existential|there_is|adjective|article_a|singular", cefr: "a1", difficulty: "2" },
  { sentence: "There is a new chair.",                 target_word: "chair",     acceptable_targets: "",         structure_id: "existential_there", tags: "existential|there_is|adjective|article_a|singular", cefr: "a1", difficulty: "2" },
  { sentence: "There is a nice room.",                 target_word: "room",      acceptable_targets: "",         structure_id: "existential_there", tags: "existential|there_is|adjective|article_a|singular", cefr: "a1", difficulty: "2" },
  { sentence: "There is a small book.",                target_word: "book",      acceptable_targets: "",         structure_id: "existential_there", tags: "existential|there_is|adjective|article_a|singular", cefr: "a1", difficulty: "1" },
  { sentence: "There is a small duck.",                target_word: "duck",      acceptable_targets: "",         structure_id: "existential_there", tags: "existential|there_is|adjective|article_a|singular|animals", cefr: "a1", difficulty: "1" },
  { sentence: "There is a tall teacher.",              target_word: "teacher",   acceptable_targets: "",         structure_id: "existential_there", tags: "existential|there_is|adjective|article_a|singular", cefr: "a1", difficulty: "2" },
  { sentence: "There is a wide door.",                 target_word: "door",      acceptable_targets: "",         structure_id: "existential_there", tags: "existential|there_is|adjective|article_a|singular", cefr: "a1", difficulty: "2" },
  { sentence: "There is a yellow ball.",               target_word: "ball",      acceptable_targets: "",         structure_id: "existential_there", tags: "existential|there_is|color|article_a|singular", cefr: "a1", difficulty: "2" },
  { sentence: "There is an old bag.",                  target_word: "bag",       acceptable_targets: "",         structure_id: "existential_there", tags: "existential|there_is|adjective|article_an|singular", cefr: "a1", difficulty: "2" },

  // ----- There is one + adj + N + in + place -----
  { sentence: "There is one big table in the kitchen.",  target_word: "table",   acceptable_targets: "",         structure_id: "existential_there", tags: "existential|there_is|numbers|adjective|preposition_in|article_the|singular|home", cefr: "a1", difficulty: "3" },
  { sentence: "There is one long table in the class.",   target_word: "table",   acceptable_targets: "",         structure_id: "existential_there", tags: "existential|there_is|numbers|adjective|preposition_in|article_the|singular", cefr: "a1", difficulty: "3" },
  { sentence: "There is one round table in the room.",   target_word: "table",   acceptable_targets: "",         structure_id: "existential_there", tags: "existential|there_is|numbers|adjective|preposition_in|article_the|singular", cefr: "a1", difficulty: "3" },

  // ----- These are + possessive + N(s) — be_a_noun w/ demonstrative_these -----
  { sentence: "These are her drawings.",        target_word: "drawings",  acceptable_targets: "drawing",structure_id: "be_a_noun",            tags: "be|are|demonstrative_these|possessive_her|plural", cefr: "a1", difficulty: "2" },
  { sentence: "These are his books.",           target_word: "books",     acceptable_targets: "book",   structure_id: "be_a_noun",            tags: "be|are|demonstrative_these|possessive_his|plural", cefr: "a1", difficulty: "2" },
  { sentence: "These are my rulers.",           target_word: "rulers",    acceptable_targets: "ruler",  structure_id: "be_a_noun",            tags: "be|are|demonstrative_these|possessive_my|plural", cefr: "a1", difficulty: "2" },
  { sentence: "These are my shoes.",            target_word: "shoes",     acceptable_targets: "shoe",   structure_id: "be_a_noun",            tags: "be|are|demonstrative_these|possessive_my|plural|clothes", cefr: "a1", difficulty: "2" },
  { sentence: "These are our toys.",            target_word: "toys",      acceptable_targets: "toy",    structure_id: "be_a_noun",            tags: "be|are|demonstrative_these|possessive_our|plural", cefr: "a1", difficulty: "2" },
  { sentence: "These are their toys.",          target_word: "toys",      acceptable_targets: "toy",    structure_id: "be_a_noun",            tags: "be|are|demonstrative_these|possessive_their|plural", cefr: "a1", difficulty: "2" },

  // ----- They always V on (day) (frequency_always, 3rd_person_plural) -----
  { sentence: "They always listen on Monday.",  target_word: "Monday",    acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|frequency_always|3rd_person_plural|listen|days", cefr: "a1", difficulty: "3" },
  { sentence: "They always play on Wednesday.", target_word: "Wednesday", acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|frequency_always|3rd_person_plural|play|days", cefr: "a1", difficulty: "3" },
  { sentence: "They always study on Tuesday.",  target_word: "Tuesday",   acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|frequency_always|3rd_person_plural|study|days", cefr: "a1", difficulty: "3" },

  // ----- They are at + place (be_location, 3rd_person_plural) -----
  { sentence: "They are at home.",              target_word: "home",      acceptable_targets: "",       structure_id: "be_location",          tags: "be|3rd_person_plural|preposition_at|location",cefr: "a1", difficulty: "1" },
  { sentence: "They are at the door.",          target_word: "door",      acceptable_targets: "",       structure_id: "be_location",          tags: "be|3rd_person_plural|preposition_at|article_the", cefr: "a1", difficulty: "2" },
  { sentence: "They are at the park gate.",     target_word: "park gate", acceptable_targets: "",       structure_id: "be_location",          tags: "be|3rd_person_plural|preposition_at|article_the|compound_noun", cefr: "a1", difficulty: "3" },
  { sentence: "They are at the school gate.",   target_word: "school gate", acceptable_targets: "",     structure_id: "be_location",          tags: "be|3rd_person_plural|preposition_at|article_the|compound_noun", cefr: "a1", difficulty: "3" },

  // ----- They are V-ing ... / They are + adj (present_continuous + be_adjective) -----
  { sentence: "They are eating bread.",         target_word: "bread",     acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|3rd_person_plural|eat|food", cefr: "a1", difficulty: "2" },
  { sentence: "They are excited.",              target_word: "excited",   acceptable_targets: "",       structure_id: "be_adjective",         tags: "be|adjective|3rd_person_plural|emotions",     cefr: "a1", difficulty: "2" },
  { sentence: "They are hiding in the room.",   target_word: "room",      acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|3rd_person_plural|hide|preposition_in|article_the", cefr: "a1", difficulty: "2" },
  { sentence: "They are in the hallway.",       target_word: "hallway",   acceptable_targets: "",       structure_id: "be_location",          tags: "be|3rd_person_plural|preposition_in|article_the|location", cefr: "a1", difficulty: "1" },
  { sentence: "They are in the kitchen.",       target_word: "kitchen",   acceptable_targets: "",       structure_id: "be_location",          tags: "be|3rd_person_plural|preposition_in|article_the|home", cefr: "a1", difficulty: "1" },
  { sentence: "They are playing a game.",       target_word: "game",      acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|3rd_person_plural|play|article_a", cefr: "a1", difficulty: "2" },
  { sentence: "They are playing in the park.",  target_word: "park",      acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|3rd_person_plural|play|preposition_in|article_the", cefr: "a1", difficulty: "2" },
  { sentence: "They are running fast.",         target_word: "running",   acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|3rd_person_plural|adverb", cefr: "a1", difficulty: "2" },
  { sentence: "They are sitting in the park.",  target_word: "park",      acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|3rd_person_plural|sit|preposition_in|article_the", cefr: "a1", difficulty: "2" },
  { sentence: "They are throwing the ball.",    target_word: "ball",      acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|3rd_person_plural|throw|article_the", cefr: "a1", difficulty: "2" },
  { sentence: "They are very lonely.",          target_word: "lonely",    acceptable_targets: "",       structure_id: "be_adjective",         tags: "be|adjective|3rd_person_plural|intensifier|emotions", cefr: "a1", difficulty: "2" },
  { sentence: "They are very tired.",           target_word: "tired",     acceptable_targets: "",       structure_id: "be_adjective",         tags: "be|adjective|3rd_person_plural|intensifier|state", cefr: "a1", difficulty: "2" },
  { sentence: "They are walking to school.",    target_word: "school",    acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|3rd_person_plural|walk|preposition_to|places", cefr: "a1", difficulty: "2" },
  { sentence: "They are waving hello.",         target_word: "hello",     acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|3rd_person_plural|wave|greeting", cefr: "a1", difficulty: "2" },

  // ----- They can V (abilities_modal, 3rd_person_plural) -----
  { sentence: "They can draw a cat.",           target_word: "cat",       acceptable_targets: "",       structure_id: "abilities_modal",      tags: "can_affirmative|3rd_person_plural|draw|article_a", cefr: "a1", difficulty: "2" },
  { sentence: "They can speak slowly.",         target_word: "slowly",    acceptable_targets: "",       structure_id: "abilities_modal",      tags: "can_affirmative|3rd_person_plural|speak|adverb", cefr: "a1", difficulty: "3" },
  { sentence: "They can wait for the bus.",     target_word: "bus",       acceptable_targets: "",       structure_id: "abilities_modal",      tags: "can_affirmative|3rd_person_plural|wait|preposition_for|article_the", cefr: "a1", difficulty: "3" },

  // ----- They do not like X (likes_preferences negation, 3rd_person_plural) -----
  { sentence: "They do not like beans.",        target_word: "beans",     acceptable_targets: "bean",   structure_id: "likes_preferences",    tags: "present_simple|negative|do_not|like|3rd_person_plural|food|plural", cefr: "a1", difficulty: "3" },
  { sentence: "They do not like eggs.",         target_word: "eggs",      acceptable_targets: "egg",    structure_id: "likes_preferences",    tags: "present_simple|negative|do_not|like|3rd_person_plural|food|plural", cefr: "a1", difficulty: "3" },
  { sentence: "They do not like milk.",         target_word: "milk",      acceptable_targets: "",       structure_id: "likes_preferences",    tags: "present_simple|negative|do_not|like|3rd_person_plural|food|mass_noun", cefr: "a1", difficulty: "3" },

  // ----- They eat ... / They have ... / They like ... -----
  { sentence: "They eat bread for breakfast.",  target_word: "bread",     acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|3rd_person_plural|eat|food|preposition_for", cefr: "a1", difficulty: "3" },
  { sentence: "They eat rice every day.",       target_word: "rice",      acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|3rd_person_plural|eat|food|frequency_every_day", cefr: "a1", difficulty: "3" },
  { sentence: "They have a big house.",         target_word: "house",     acceptable_targets: "",       structure_id: "possession_have",      tags: "have|3rd_person_plural|adjective|article_a|home", cefr: "a1", difficulty: "2" },
  { sentence: "They have a loud bird.",         target_word: "bird",      acceptable_targets: "",       structure_id: "possession_have",      tags: "have|3rd_person_plural|adjective|article_a|animals", cefr: "a1", difficulty: "2" },
  { sentence: "They have a small dog.",         target_word: "dog",       acceptable_targets: "",       structure_id: "possession_have",      tags: "have|3rd_person_plural|adjective|article_a|animals", cefr: "a1", difficulty: "1" },
  { sentence: "They like to play football.",    target_word: "football",  acceptable_targets: "",       structure_id: "likes_preferences",    tags: "present_simple|3rd_person_plural|like|infinitive|play|sports", cefr: "a1", difficulty: "3" },
  { sentence: "They like to run.",              target_word: "run",       acceptable_targets: "",       structure_id: "likes_preferences",    tags: "present_simple|3rd_person_plural|like|infinitive", cefr: "a1", difficulty: "2" },
  { sentence: "They like to swim.",             target_word: "swim",      acceptable_targets: "",       structure_id: "likes_preferences",    tags: "present_simple|3rd_person_plural|like|infinitive", cefr: "a1", difficulty: "2" },

  // ----- They never V ... -----
  { sentence: "They never jump on the table.",  target_word: "table",     acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|3rd_person_plural|frequency_never|jump|preposition_on|article_the", cefr: "a1", difficulty: "3" },
  { sentence: "They never run in the house.",   target_word: "house",     acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|3rd_person_plural|frequency_never|run|preposition_in|article_the", cefr: "a1", difficulty: "3" },
  { sentence: "They never run in the room.",    target_word: "room",      acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|3rd_person_plural|frequency_never|run|preposition_in|article_the", cefr: "a1", difficulty: "3" },

  // ----- They sing / sometimes V / study / usually / wash -----
  { sentence: "They sing a song.",              target_word: "song",      acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|3rd_person_plural|sing|article_a", cefr: "a1", difficulty: "2" },
  { sentence: "They sing in the morning.",      target_word: "morning",   acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|3rd_person_plural|sing|preposition_in|article_the|times_of_day", cefr: "a1", difficulty: "2" },
  { sentence: "They sometimes eat fruit.",      target_word: "fruit",     acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|3rd_person_plural|frequency_sometimes|eat|food", cefr: "a1", difficulty: "2" },
  { sentence: "They sometimes eat pizza.",      target_word: "pizza",     acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|3rd_person_plural|frequency_sometimes|eat|food", cefr: "a1", difficulty: "2" },
  { sentence: "They sometimes play games.",     target_word: "games",     acceptable_targets: "game",   structure_id: "daily_routines_actions", tags: "present_simple|3rd_person_plural|frequency_sometimes|play|plural", cefr: "a1", difficulty: "2" },
  { sentence: "They study in the library.",     target_word: "library",   acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|3rd_person_plural|study|preposition_in|article_the|places", cefr: "a1", difficulty: "2" },
  { sentence: "They usually come home at 4 o'clock.",  target_word: "4 o'clock",  acceptable_targets: "", structure_id: "daily_routines_actions", tags: "present_simple|3rd_person_plural|frequency_usually|come|preposition_at|time_clock", cefr: "a1", difficulty: "3" },
  { sentence: "They usually come home in the afternoon.", target_word: "afternoon", acceptable_targets: "", structure_id: "daily_routines_actions", tags: "present_simple|3rd_person_plural|frequency_usually|come|preposition_in|article_the|times_of_day", cefr: "a1", difficulty: "3" },
  { sentence: "They usually leave at 3 o'clock.", target_word: "3 o'clock", acceptable_targets: "",     structure_id: "daily_routines_actions", tags: "present_simple|3rd_person_plural|frequency_usually|leave|preposition_at|time_clock", cefr: "a1", difficulty: "3" },
  { sentence: "They wash their hands.",         target_word: "hands",     acceptable_targets: "hand",   structure_id: "daily_routines_actions", tags: "present_simple|3rd_person_plural|wash|possessive_their|body_parts|plural", cefr: "a1", difficulty: "3" },

  // ----- This is + possessive + N — be_a_noun w/ demonstrative_this -----
  { sentence: "This is her bag.",               target_word: "bag",       acceptable_targets: "",       structure_id: "be_a_noun",            tags: "be|demonstrative_this|possessive_her|singular", cefr: "a1", difficulty: "1" },
  { sentence: "This is her desk.",              target_word: "desk",      acceptable_targets: "",       structure_id: "be_a_noun",            tags: "be|demonstrative_this|possessive_her|singular", cefr: "a1", difficulty: "1" },
  { sentence: "This is his ball.",              target_word: "ball",      acceptable_targets: "",       structure_id: "be_a_noun",            tags: "be|demonstrative_this|possessive_his|singular", cefr: "a1", difficulty: "1" },
  { sentence: "This is my brother's toy.",      target_word: "toy",       acceptable_targets: "",       structure_id: "be_a_noun",            tags: "be|demonstrative_this|possessive_my|possessive_apostrophe|family|singular", cefr: "a1", difficulty: "3" },
  { sentence: "This is my desk.",               target_word: "desk",      acceptable_targets: "",       structure_id: "be_a_noun",            tags: "be|demonstrative_this|possessive_my|singular", cefr: "a1", difficulty: "1" },
  { sentence: "This is my pen.",                target_word: "pen",       acceptable_targets: "",       structure_id: "be_a_noun",            tags: "be|demonstrative_this|possessive_my|singular", cefr: "a1", difficulty: "1" },
  { sentence: "This is our classroom.",         target_word: "classroom", acceptable_targets: "",       structure_id: "be_a_noun",            tags: "be|demonstrative_this|possessive_our|singular", cefr: "a1", difficulty: "2" },
  { sentence: "This is our lunch.",             target_word: "lunch",     acceptable_targets: "",       structure_id: "be_a_noun",            tags: "be|demonstrative_this|possessive_our|singular|food", cefr: "a1", difficulty: "2" },
  { sentence: "This is your paper.",            target_word: "paper",     acceptable_targets: "",       structure_id: "be_a_noun",            tags: "be|demonstrative_this|possessive_your|singular", cefr: "a1", difficulty: "1" },

  // ----- Those are + possessive + N(s) — be_a_noun w/ demonstrative_those -----
  { sentence: "Those are her pencils.",         target_word: "pencils",   acceptable_targets: "pencil", structure_id: "be_a_noun",            tags: "be|are|demonstrative_those|possessive_her|plural", cefr: "a1", difficulty: "2" },
  { sentence: "Those are our coats.",           target_word: "coats",     acceptable_targets: "coat",   structure_id: "be_a_noun",            tags: "be|are|demonstrative_those|possessive_our|plural|clothes", cefr: "a1", difficulty: "2" },
  { sentence: "Those are your shoes.",          target_word: "shoes",     acceptable_targets: "shoe",   structure_id: "be_a_noun",            tags: "be|are|demonstrative_those|possessive_your|plural|clothes", cefr: "a1", difficulty: "2" },

  // ----- Turn off X (imperative) -----
  { sentence: "Turn off the light.",            target_word: "light",     acceptable_targets: "",       structure_id: "classroom_commands",   tags: "imperative|turn_off|particle|article_the",    cefr: "a1", difficulty: "2" },

  // ----- We always say X (1st_person_plural) -----
  { sentence: "We always say hello.",           target_word: "hello",     acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|frequency_always|1st_person_plural|say|greeting", cefr: "a1", difficulty: "2" },
  { sentence: "We always say please.",          target_word: "please",    acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|frequency_always|1st_person_plural|say|polite", cefr: "a1", difficulty: "2" },
  { sentence: "We always say thank you.",       target_word: "thank you", acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|frequency_always|1st_person_plural|say|polite", cefr: "a1", difficulty: "2" },

  // ----- We are V-ing ... / We are + adj -----
  { sentence: "We are jumping on the grass.",   target_word: "grass",     acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|1st_person_plural|jump|preposition_on|article_the", cefr: "a1", difficulty: "2" },
  { sentence: "We are learning English.",       target_word: "English",   acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|1st_person_plural|learn|languages", cefr: "a1", difficulty: "2" },
  { sentence: "We are listening to a song.",    target_word: "song",      acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|1st_person_plural|listen|preposition_to|article_a", cefr: "a1", difficulty: "2" },
  { sentence: "We are looking at the bird.",    target_word: "bird",      acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|1st_person_plural|look|preposition_at|article_the", cefr: "a1", difficulty: "2" },
  { sentence: "We are sitting on the chair.",   target_word: "chair",     acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|1st_person_plural|sit|preposition_on|article_the", cefr: "a1", difficulty: "2" },
  { sentence: "We are tired.",                  target_word: "tired",     acceptable_targets: "",       structure_id: "be_adjective",         tags: "be|adjective|1st_person_plural|state", cefr: "a1", difficulty: "1" },
];

/**
 * Sentences 499-595 in the bank — final 97 rows from "We are very bored."
 * through "Your pencil is short." Variants in VARIANT_LEXEMES_BY_SENTENCE.
 *
 * No new structure_id values — reuses everything from prior batches.
 * Heavy in wh_questions (rows 541-567) and the You + V family.
 */
const METADATA_BATCH_7 = [
  // ----- We are very + adj / We are V-ing -----
  { sentence: "We are very bored.",             target_word: "bored",     acceptable_targets: "",       structure_id: "be_adjective",         tags: "be|adjective|1st_person_plural|intensifier|state", cefr: "a1", difficulty: "2" },
  { sentence: "We are very hot.",               target_word: "hot",       acceptable_targets: "",       structure_id: "be_adjective",         tags: "be|adjective|1st_person_plural|intensifier|state", cefr: "a1", difficulty: "2" },
  { sentence: "We are watching a movie.",       target_word: "movie",     acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|1st_person_plural|watch|article_a", cefr: "a1", difficulty: "2" },

  // ----- We can / cannot V (abilities_modal, 1st_person_plural) -----
  { sentence: "We can bake a cake.",            target_word: "cake",      acceptable_targets: "",       structure_id: "abilities_modal",      tags: "can_affirmative|1st_person_plural|bake|article_a|food", cefr: "a1", difficulty: "2" },
  { sentence: "We can build a tower.",          target_word: "tower",     acceptable_targets: "",       structure_id: "abilities_modal",      tags: "can_affirmative|1st_person_plural|build|article_a", cefr: "a1", difficulty: "2" },
  { sentence: "We can find the ball.",          target_word: "ball",      acceptable_targets: "",       structure_id: "abilities_modal",      tags: "can_affirmative|1st_person_plural|find|article_the", cefr: "a1", difficulty: "2" },
  { sentence: "We can help you.",               target_word: "you",       acceptable_targets: "",       structure_id: "abilities_modal",      tags: "can_affirmative|1st_person_plural|help|pronoun_object", cefr: "a1", difficulty: "2" },
  { sentence: "We can write words.",            target_word: "words",     acceptable_targets: "word",   structure_id: "abilities_modal",      tags: "can_affirmative|1st_person_plural|write|plural", cefr: "a1", difficulty: "2" },
  { sentence: "We cannot fly.",                 target_word: "fly",       acceptable_targets: "",       structure_id: "abilities_modal",      tags: "cannot|negative_ability|1st_person_plural", cefr: "a1", difficulty: "1" },

  // ----- We do not like + (adj) + N (negation, 1st_person_plural) -----
  { sentence: "We do not like bad games.",      target_word: "games",     acceptable_targets: "game",   structure_id: "likes_preferences",    tags: "present_simple|negative|do_not|like|1st_person_plural|adjective|plural", cefr: "a1", difficulty: "3" },
  { sentence: "We do not like cold food.",      target_word: "food",      acceptable_targets: "",       structure_id: "likes_preferences",    tags: "present_simple|negative|do_not|like|1st_person_plural|adjective|food", cefr: "a1", difficulty: "3" },
  { sentence: "We do not like old toys.",       target_word: "toys",      acceptable_targets: "toy",    structure_id: "likes_preferences",    tags: "present_simple|negative|do_not|like|1st_person_plural|adjective|plural", cefr: "a1", difficulty: "3" },

  // ----- We have ... (possession_have, 1st_person_plural) -----
  { sentence: "We have a classroom.",           target_word: "classroom", acceptable_targets: "",       structure_id: "possession_have",      tags: "have|1st_person_plural|article_a|singular", cefr: "a1", difficulty: "1" },
  { sentence: "We have five nice friends.",     target_word: "friends",   acceptable_targets: "friend", structure_id: "possession_have",      tags: "have|1st_person_plural|numbers|adjective|plural|people", cefr: "a1", difficulty: "3" },
  { sentence: "We have four nice teachers.",    target_word: "teachers",  acceptable_targets: "teacher",structure_id: "possession_have",      tags: "have|1st_person_plural|numbers|adjective|plural|people", cefr: "a1", difficulty: "3" },
  { sentence: "We have six kind teachers.",     target_word: "teachers",  acceptable_targets: "teacher",structure_id: "possession_have",      tags: "have|1st_person_plural|numbers|adjective|plural|people", cefr: "a1", difficulty: "3" },
  { sentence: "We have three sharpies.",        target_word: "sharpies",  acceptable_targets: "sharpie",structure_id: "possession_have",      tags: "have|1st_person_plural|numbers|plural", cefr: "a1", difficulty: "3" },
  { sentence: "We have two balls.",             target_word: "balls",     acceptable_targets: "ball",   structure_id: "possession_have",      tags: "have|1st_person_plural|numbers|plural", cefr: "a1", difficulty: "2" },

  // ----- We hide / love / never V ... -----
  { sentence: "We hide in the closet.",         target_word: "closet",    acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|1st_person_plural|hide|preposition_in|article_the", cefr: "a1", difficulty: "3" },
  { sentence: "We love our garden.",            target_word: "garden",    acceptable_targets: "",       structure_id: "likes_preferences",    tags: "present_simple|1st_person_plural|loves|possessive_our", cefr: "a1", difficulty: "2" },
  { sentence: "We love our house.",             target_word: "house",     acceptable_targets: "",       structure_id: "likes_preferences",    tags: "present_simple|1st_person_plural|loves|possessive_our|home", cefr: "a1", difficulty: "2" },
  { sentence: "We love our school.",            target_word: "school",    acceptable_targets: "",       structure_id: "likes_preferences",    tags: "present_simple|1st_person_plural|loves|possessive_our", cefr: "a1", difficulty: "2" },
  { sentence: "We never run in the hall.",      target_word: "hall",      acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|1st_person_plural|frequency_never|run|preposition_in|article_the", cefr: "a1", difficulty: "3" },
  { sentence: "We never shout in the library.", target_word: "library",   acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|1st_person_plural|frequency_never|shout|preposition_in|article_the", cefr: "a1", difficulty: "3" },
  { sentence: "We never sleep in class.",       target_word: "class",     acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|1st_person_plural|frequency_never|sleep|preposition_in", cefr: "a1", difficulty: "3" },

  // ----- We play / run in ... (present_simple) -----
  { sentence: "We play in the park.",           target_word: "park",      acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|1st_person_plural|play|preposition_in|article_the|places", cefr: "a1", difficulty: "1" },
  { sentence: "We run in the garden.",          target_word: "garden",    acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|1st_person_plural|run|preposition_in|article_the", cefr: "a1", difficulty: "1" },

  // ----- We see + number + (adj/color) + N(plural) — see_descriptions -----
  { sentence: "We see five green trees.",       target_word: "trees",     acceptable_targets: "tree",   structure_id: "see_descriptions",     tags: "present_simple|see|1st_person_plural|numbers|color|plural", cefr: "a1", difficulty: "3" },
  { sentence: "We see four tall trees.",        target_word: "trees",     acceptable_targets: "tree",   structure_id: "see_descriptions",     tags: "present_simple|see|1st_person_plural|numbers|adjective|plural", cefr: "a1", difficulty: "3" },
  { sentence: "We see six thin trees.",         target_word: "trees",     acceptable_targets: "tree",   structure_id: "see_descriptions",     tags: "present_simple|see|1st_person_plural|numbers|adjective|plural", cefr: "a1", difficulty: "3" },
  { sentence: "We see three angry bees.",       target_word: "bees",      acceptable_targets: "bee",    structure_id: "see_descriptions",     tags: "present_simple|see|1st_person_plural|numbers|adjective|plural|animals|emotions", cefr: "a1", difficulty: "3" },
  { sentence: "We see three happy dogs.",       target_word: "dogs",      acceptable_targets: "dog",    structure_id: "see_descriptions",     tags: "present_simple|see|1st_person_plural|numbers|adjective|plural|animals|emotions", cefr: "a1", difficulty: "3" },
  { sentence: "We see two small fish.",         target_word: "fish",      acceptable_targets: "",       structure_id: "see_descriptions",     tags: "present_simple|see|1st_person_plural|numbers|adjective|plural|animals", cefr: "a1", difficulty: "3" },

  // ----- We sit next to ... / sometimes / usually -----
  { sentence: "We sit next to the exit.",       target_word: "exit",      acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|1st_person_plural|sit|preposition_next_to|article_the", cefr: "a1", difficulty: "2" },
  { sentence: "We sit next to the teacher.",    target_word: "teacher",   acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|1st_person_plural|sit|preposition_next_to|article_the", cefr: "a1", difficulty: "2" },
  { sentence: "We sit next to the window.",     target_word: "window",    acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|1st_person_plural|sit|preposition_next_to|article_the", cefr: "a1", difficulty: "2" },
  { sentence: "We sometimes see a bird.",       target_word: "bird",      acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|1st_person_plural|frequency_sometimes|see|article_a|animals", cefr: "a1", difficulty: "2" },
  { sentence: "We sometimes see a cat.",        target_word: "cat",       acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|1st_person_plural|frequency_sometimes|see|article_a|animals", cefr: "a1", difficulty: "2" },
  { sentence: "We sometimes see a squirrel.",   target_word: "squirrel",  acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|1st_person_plural|frequency_sometimes|see|article_a|animals", cefr: "a1", difficulty: "2" },
  { sentence: "We usually sit here.",           target_word: "here",      acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|1st_person_plural|frequency_usually|sit|adverb", cefr: "a1", difficulty: "2" },
  { sentence: "We usually sit together.",       target_word: "together",  acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|1st_person_plural|frequency_usually|sit|adverb", cefr: "a1", difficulty: "2" },
  { sentence: "We usually walk together.",      target_word: "together",  acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|1st_person_plural|frequency_usually|walk|adverb", cefr: "a1", difficulty: "2" },

  // ----- What do you V? (wh_questions) -----
  { sentence: "What do you have?",              target_word: "have",      acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|what|do|2nd_person|present_simple", cefr: "a1", difficulty: "2" },
  { sentence: "What do you need?",              target_word: "need",      acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|what|do|2nd_person|present_simple", cefr: "a1", difficulty: "2" },
  { sentence: "What do you see?",               target_word: "see",       acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|what|do|2nd_person|present_simple", cefr: "a1", difficulty: "2" },

  // ----- What is in/that/this/your X? -----
  { sentence: "What is in that box?",           target_word: "box",       acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|what|be|preposition_in|demonstrative_that", cefr: "a1", difficulty: "3" },
  { sentence: "What is in the bag?",            target_word: "bag",       acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|what|be|preposition_in|article_the", cefr: "a1", difficulty: "2" },
  { sentence: "What is that noise?",            target_word: "noise",     acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|what|be|demonstrative_that", cefr: "a1", difficulty: "3" },
  { sentence: "What is that?",                  target_word: "that",      acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|what|be|demonstrative_that|fixed_phrase", cefr: "a1", difficulty: "1" },
  { sentence: "What is this?",                  target_word: "this",      acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|what|be|demonstrative_this|fixed_phrase", cefr: "a1", difficulty: "1" },
  { sentence: "What is your name?",             target_word: "name",      acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|what|be|possessive_your|fixed_phrase", cefr: "a1", difficulty: "1" },

  // ----- When do you V? -----
  { sentence: "When do you eat?",               target_word: "eat",       acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|when|do|2nd_person|present_simple", cefr: "a1", difficulty: "2" },
  { sentence: "When do you sleep?",             target_word: "sleep",     acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|when|do|2nd_person|present_simple", cefr: "a1", difficulty: "2" },
  { sentence: "When do you wake up?",           target_word: "wake up",   acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|when|do|2nd_person|present_simple|particle", cefr: "a1", difficulty: "3" },

  // ----- Where do they/we/you V? -----
  { sentence: "Where do they go?",              target_word: "go",        acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|where|do|3rd_person_plural|present_simple", cefr: "a1", difficulty: "3" },
  { sentence: "Where do we sit?",               target_word: "sit",       acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|where|do|1st_person_plural|present_simple", cefr: "a1", difficulty: "3" },
  { sentence: "Where do you live?",             target_word: "live",      acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|where|do|2nd_person|present_simple", cefr: "a1", difficulty: "3" },

  // ----- Where is X? -----
  { sentence: "Where is my bag?",               target_word: "bag",       acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|where|be|possessive_my", cefr: "a1", difficulty: "1" },
  { sentence: "Where is the cat?",              target_word: "cat",       acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|where|be|article_the|animals", cefr: "a1", difficulty: "1" },
  { sentence: "Where is the dog?",              target_word: "dog",       acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|where|be|article_the|animals", cefr: "a1", difficulty: "1" },
  { sentence: "Where is the teacher?",          target_word: "teacher",   acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|where|be|article_the|people", cefr: "a1", difficulty: "1" },
  { sentence: "Where is your father?",          target_word: "father",    acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|where|be|possessive_your|family", cefr: "a1", difficulty: "2" },
  { sentence: "Where is your mother?",          target_word: "mother",    acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|where|be|possessive_your|family", cefr: "a1", difficulty: "2" },

  // ----- Who is X? -----
  { sentence: "Who is he?",                     target_word: "he",        acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|who|be|pronoun_subject|fixed_phrase", cefr: "a1", difficulty: "1" },
  { sentence: "Who is she?",                    target_word: "she",       acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|who|be|pronoun_subject|fixed_phrase", cefr: "a1", difficulty: "1" },
  { sentence: "Who is that man?",               target_word: "man",       acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|who|be|demonstrative_that|people", cefr: "a1", difficulty: "2" },
  { sentence: "Who is your best friend?",       target_word: "friend",    acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|who|be|possessive_your|adjective", cefr: "a1", difficulty: "2" },
  { sentence: "Who is your friend?",            target_word: "friend",    acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|who|be|possessive_your", cefr: "a1", difficulty: "2" },
  { sentence: "Who is your teacher?",           target_word: "teacher",   acceptable_targets: "",       structure_id: "wh_questions",         tags: "wh_question|who|be|possessive_your", cefr: "a1", difficulty: "2" },

  // ----- Write your name (imperative) -----
  { sentence: "Write your name here.",          target_word: "name",      acceptable_targets: "",       structure_id: "classroom_commands",   tags: "imperative|write|possessive_your|adverb", cefr: "a1", difficulty: "2" },
  { sentence: "Write your name.",               target_word: "name",      acceptable_targets: "",       structure_id: "classroom_commands",   tags: "imperative|write|possessive_your", cefr: "a1", difficulty: "1" },

  // ----- You are a + (adj) + N -----
  { sentence: "You are a brave girl.",          target_word: "girl",      acceptable_targets: "",       structure_id: "be_a_noun",            tags: "be|2nd_person|adjective|article_a|singular", cefr: "a1", difficulty: "2" },
  { sentence: "You are a good student.",        target_word: "student",   acceptable_targets: "",       structure_id: "be_a_noun",            tags: "be|2nd_person|adjective|article_a|singular", cefr: "a1", difficulty: "2" },
  { sentence: "You are a nice friend.",         target_word: "friend",    acceptable_targets: "",       structure_id: "be_a_noun",            tags: "be|2nd_person|adjective|article_a|singular", cefr: "a1", difficulty: "2" },

  // ----- You are V-ing ... (present_continuous, 2nd_person) -----
  { sentence: "You are drawing a house.",       target_word: "house",     acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|2nd_person|draw|article_a", cefr: "a1", difficulty: "2" },
  { sentence: "You are drawing a picture.",     target_word: "picture",   acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|2nd_person|draw|article_a", cefr: "a1", difficulty: "2" },
  { sentence: "You are drinking juice.",        target_word: "juice",     acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|2nd_person|drink|food", cefr: "a1", difficulty: "2" },
  { sentence: "You are drinking milk.",         target_word: "milk",      acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|2nd_person|drink|food", cefr: "a1", difficulty: "2" },
  { sentence: "You are making a sandwich.",     target_word: "sandwich",  acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|2nd_person|make|article_a|food", cefr: "a1", difficulty: "2" },
  { sentence: "You are writing a word.",        target_word: "word",      acceptable_targets: "",       structure_id: "present_continuous",   tags: "be|present_continuous|2nd_person|write|article_a", cefr: "a1", difficulty: "2" },

  // ----- You can / cannot V (abilities_modal, 2nd_person) -----
  { sentence: "You can jump.",                  target_word: "jump",      acceptable_targets: "",       structure_id: "abilities_modal",      tags: "can_affirmative|2nd_person|ability", cefr: "a1", difficulty: "1" },
  { sentence: "You cannot catch the bird.",     target_word: "bird",      acceptable_targets: "",       structure_id: "abilities_modal",      tags: "cannot|negative_ability|2nd_person|catch|article_the", cefr: "a1", difficulty: "2" },
  { sentence: "You cannot fly a kite.",         target_word: "kite",      acceptable_targets: "",       structure_id: "abilities_modal",      tags: "cannot|negative_ability|2nd_person|fly|article_a", cefr: "a1", difficulty: "3" },

  // ----- You count / do not / have / usually / walk -----
  { sentence: "You count the numbers.",         target_word: "numbers",   acceptable_targets: "number", structure_id: "daily_routines_actions", tags: "present_simple|2nd_person|count|article_the|plural", cefr: "a1", difficulty: "2" },
  { sentence: "You do not like cats.",          target_word: "cats",      acceptable_targets: "cat",    structure_id: "likes_preferences",    tags: "present_simple|negative|do_not|like|2nd_person|animals|plural", cefr: "a1", difficulty: "3" },
  { sentence: "You do not like dogs.",          target_word: "dogs",      acceptable_targets: "dog",    structure_id: "likes_preferences",    tags: "present_simple|negative|do_not|like|2nd_person|animals|plural", cefr: "a1", difficulty: "3" },
  { sentence: "You do not like noise.",         target_word: "noise",     acceptable_targets: "",       structure_id: "likes_preferences",    tags: "present_simple|negative|do_not|like|2nd_person|mass_noun", cefr: "a1", difficulty: "3" },
  { sentence: "You have a green apple.",        target_word: "apple",     acceptable_targets: "",       structure_id: "possession_have",      tags: "have|2nd_person|color|article_a|food", cefr: "a1", difficulty: "2" },
  { sentence: "You have a silver coin.",        target_word: "coin",      acceptable_targets: "",       structure_id: "possession_have",      tags: "have|2nd_person|color|article_a", cefr: "a1", difficulty: "3" },
  { sentence: "You usually drink milk.",        target_word: "milk",      acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|2nd_person|frequency_usually|drink|food", cefr: "a1", difficulty: "2" },
  { sentence: "You usually play football.",     target_word: "football",  acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|2nd_person|frequency_usually|play|sports", cefr: "a1", difficulty: "2" },
  { sentence: "You usually wear a sweater.",    target_word: "sweater",   acceptable_targets: "",       structure_id: "daily_routines_clothes", tags: "present_simple|2nd_person|frequency_usually|wear|article_a|clothes", cefr: "a1", difficulty: "2" },
  { sentence: "You walk to school.",            target_word: "school",    acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|2nd_person|walk|preposition_to|places", cefr: "a1", difficulty: "1" },
  { sentence: "You walk with your friend.",     target_word: "friend",    acceptable_targets: "",       structure_id: "daily_routines_actions", tags: "present_simple|2nd_person|walk|preposition_with|possessive_your", cefr: "a1", difficulty: "2" },

  // ----- Your X is + adj (be_adjective + possessive_your) -----
  { sentence: "Your apple is red.",             target_word: "red",       acceptable_targets: "",       structure_id: "be_adjective",         tags: "be|adjective|color|possessive_your|food", cefr: "a1", difficulty: "1" },
  { sentence: "Your pencil is sharp.",          target_word: "sharp",     acceptable_targets: "",       structure_id: "be_adjective",         tags: "be|adjective|possessive_your", cefr: "a1", difficulty: "2" },
  { sentence: "Your pencil is short.",          target_word: "short",     acceptable_targets: "",       structure_id: "be_adjective",         tags: "be|adjective|possessive_your", cefr: "a1", difficulty: "2" },
];

const VARIANT_LEXEMES_BY_SENTENCE = {
  // possession_have
  "He has one old map.":               "map;book;toy;ball;bag;hat",
  "He has three big boxes.":           "boxes;bags;cups;books;hats",
  "He has three heavy boxes.":         "boxes;bags;books;cups",
  "He has three yellow pens.":         "pens;pencils;markers;crayons;rulers",
  "He has two blue pencils.":          "pencils;pens;markers;crayons;rulers",
  "He has two yellow markers.":        "markers;pens;pencils;crayons;rulers",

  // be + adjective
  "He is cold.":                       "cold;hot;sad;happy;hungry;tired;angry;sleepy;thirsty;bored;nervous;sick",
  "He is full now.":                   "full;hungry;thirsty;sleepy;tired;hot;cold",
  "He is hungry now.":                 "hungry;thirsty;tired;sleepy;hot;cold;full",
  "He is very angry.":                 "angry;sad;happy;tired;sleepy;nervous;bored;excited;hungry",
  "He is very sad.":                   "sad;happy;angry;tired;sleepy;nervous;bored;excited",

  // present continuous
  "He is jumping high.":               "jumping;running;swimming;flying;climbing",
  "He is jumping now.":                "jumping;running;walking;eating;reading;sleeping;dancing;writing;sitting;singing",
  "He is reading a story.":            "story;book;letter;poem",
  "He is riding a bike.":              "bike;horse;bus",
  "He is sleeping now.":               "sleeping;eating;reading;writing;running;walking;sitting;standing;dancing;singing;playing",
  "He is telling a joke.":             "joke;story;name;secret",
  "He is wearing a blue hat.":         "hat;shirt;jacket;coat;sweater",
  "He is wearing a red shirt.":        "shirt;hat;jacket;coat;sweater",
  "He is wearing a yellow coat.":      "coat;hat;shirt;jacket;sweater",

  // likes / loves
  "He likes blue pens.":               "pens;pencils;markers;crayons;books",
  "He likes fast planes.":             "planes;cars;trucks;trains;boats;bikes",
  "He likes red cars.":                "cars;trucks;buses;trains;bikes;planes;boats",
  "He loves his dog.":                 "dog;cat;bird;fish;hamster;bunny;rabbit",

  // frequency_never + drinks/eats
  "He never drinks milk.":             "milk;water;juice;soda;coffee;tea",
  "He never drinks soda.":             "soda;milk;juice;water;coffee;tea",
  "He never eats fish.":               "fish;rice;bread;soup;eggs;pizza;meat",

  // present simple actions
  "He plays games every day.":         "games;sports;cards;football;tennis;chess",
  "He sits on the bench.":             "bench;chair;floor;mat;grass",
  "He sits on the floor.":             "floor;bench;chair;mat;grass;bed",
  "He sits under the tree.":           "tree;table;desk;bed;chair",

  // usually + eats / goes
  "He usually eats an egg at night.":  "egg;apple;orange;banana",
  "He usually eats fruit at noon.":    "fruit;rice;bread;soup;pizza;cake",
  "He usually eats rice at night.":    "rice;bread;soup;fruit;pizza",
  "He usually goes to bed at 9 o'clock.":      "bed;school;the park;the library;the shop",
  "He usually goes to school at 8 o'clock.":   "school;bed;the park;the library;the shop",
  "He usually goes to the park at 5 o'clock.": "park;school;bed;library;shop",

  // walks
  "He walks to the bus.":              "bus;school;park;shop;library;door",
  "He walks to the park.":             "park;school;shop;library;bus;door",
  "He walks to the shop.":             "shop;school;park;library;bus",

  // possessive subjects
  "Her cat is small.":                 "small;big;cute;happy;sad;old;young;pretty",
  "Her mother has a phone.":           "phone;bag;car;book;hat;pen",
  "Her sister is young.":              "young;old;happy;sad;tall;short;tired",
  "His grandfather has a cane.":       "cane;hat;phone;bag;book",
  "His house is small.":               "small;big;new;old;clean;dirty;nice",

  // wh-questions
  "How are you?":                      "",
  "How is the weather?":               "weather;sky;day;dog;cat;teacher",
  "How is your mother?":               "mother;father;brother;sister;family;dog;cat",

  // I always
  "I always brush my teeth.":          "teeth;hair",
  "I always drink water.":             "water;milk;juice;soda;tea;coffee",

  // ===== Batch 3 (sentences 99-198) =====

  // I always V + obj
  "I always eat breakfast.":           "breakfast;lunch;dinner;rice;bread;an apple;a banana",

  // I am V-ing now
  "I am coloring now.":                "coloring;eating;reading;writing;drawing;painting;singing;dancing;jumping;running",
  "I am eating now.":                  "eating;drinking;reading;writing;sleeping;sitting;standing;walking;running;singing",
  "I am holding a pen.":               "pen;book;ball;pencil;ruler;phone",

  // I am + adjective
  "I am hot.":                         "hot;cold;sad;happy;hungry;tired;angry;sleepy;thirsty;bored;nervous;sick;full",
  "I am hungry.":                      "hungry;thirsty;tired;sleepy;hot;cold;full;sad;happy;sick",

  // I am in the X
  "I am in the bathroom.":             "bathroom;bedroom;kitchen;classroom;living room;hallway;garden",
  "I am in the bedroom.":              "bedroom;bathroom;kitchen;classroom;living room;hallway",
  "I am in the kitchen.":              "kitchen;bathroom;bedroom;classroom;living room;garden",

  // I am V-ing + (prep) + obj
  "I am looking at the clock.":        "clock;board;picture;bird;tree;sky",
  "I am reading.":                     "reading;writing;eating;drinking;singing;dancing;jumping;running;sleeping;sitting;standing;walking;swimming",
  "I am standing in the room.":        "room;hallway;kitchen;classroom;hall;line",
  "I am standing near the door.":      "door;window;teacher;board;table;chair",

  // I am very + adjective
  "I am very cold.":                   "cold;hot;sad;happy;hungry;tired;angry;sleepy;thirsty;bored;nervous;sick",
  "I am very nervous.":                "nervous;tired;sleepy;hungry;thirsty;hot;cold;sad;happy;bored;excited",
  "I am very sleepy.":                 "sleepy;tired;hungry;thirsty;hot;cold;sad;happy;bored;nervous",
  "I am very thirsty.":                "thirsty;hungry;sleepy;tired;hot;cold;sad;happy;sick",

  // I am V-ing + prep + obj
  "I am waiting for the teacher.":     "teacher;bus;mom;dad;friend;sister;brother",
  "I am walking to the desk.":         "desk;door;window;board;table;chair;teacher",

  // I can V
  "I can hear the music.":             "music;bell;teacher;bird;dog;cat",
  "I can run.":                        "run;walk;jump;swim;dance;sing;read;write;draw;cook",
  "I can see the bird.":               "bird;cat;dog;tree;flower;sun;moon",
  "I can smell the flower.":           "flower;food;rice;bread;coffee;tea",

  // I cannot V
  "I cannot carry the box.":           "box;bag;table;chair;bike",
  "I cannot climb the tree.":          "tree;wall;ladder;mountain",
  "I cannot find my pen.":             "pen;book;bag;phone;keys",
  "I cannot see the board.":           "board;sun;sky;door;clock;teacher",
  "I cannot swim fast.":               "swim;run;walk;jump;dance",

  // I go to + place
  "I go to school.":                   "school;bed;the park;the library;the shop;the store",
  "I go to the library.":              "library;school;park;shop;store",
  "I go to the park.":                 "park;school;library;shop;store",

  // I have + obj
  "I have a book.":                    "book;pen;ball;dog;cat;phone;hat",
  "I have seven small orange fish.":   "fish;turtles;dogs;cats;rabbits;birds",
  "I have three big red apples.":      "apples;balls;cars;hats;tomatoes;flowers",
  "I have two small green birds.":     "birds;trees;apples;leaves;balls;frogs",

  // I like / love + obj
  "I like apples.":                    "apples;bananas;oranges;grapes;cookies;pizza;pears",
  "I like cheese.":                    "cheese;bread;rice;pizza;soup;chocolate",
  "I love bananas.":                   "bananas;apples;oranges;grapes;cookies;pears",

  // I never go on + day
  "I never go to school on Saturday.": "Saturday;Sunday;Monday;Tuesday;Wednesday;Thursday;Friday",
  "I never go to school on Sunday.":   "Sunday;Saturday;Monday;Tuesday;Wednesday;Thursday;Friday",

  // I see a/an + (adj/color) + N
  "I see a blue fish.":                "fish;bird;cat;dog;flower;car",
  "I see a bright sun.":               "sun;moon;sky;star;light",
  "I see a cat.":                      "cat;dog;bird;fish;tree;flower;ball;hat;book;car",
  "I see a cold drink.":               "drink;ice cream;water;soda",
  "I see a green apple.":              "apple;banana;pear;tree;leaf",
  "I see a happy girl.":               "girl;boy;teacher;mom;dad;baby;dog",
  "I see a nice teacher.":             "teacher;mom;dad;friend;girl;boy",
  "I see a pink flower.":              "flower;tree;hat;car;dress",
  "I see a purple grape.":             "grape;flower;hat;dress",
  "I see a quiet student.":            "student;teacher;girl;boy;baby",
  "I see a sad boy.":                  "boy;girl;teacher;mom;dad;baby",
  "I see a thin book.":                "book;pen;pencil;ruler;tree",
  "I see a white cat.":                "cat;dog;bird;fish;flower;car;hat",
  "I see an old table.":               "table;apple;orange;egg;ant;umbrella",
  "I see an orange.":                  "orange;apple;egg;ant;umbrella",

  // I see + number + (adj/color/+adj) + N(plural)
  "I see eight little ducks.":         "ducks;cats;dogs;rabbits;birds;mice",
  "I see five big books.":             "books;apples;balls;hats;cars",
  "I see five slow turtles.":          "turtles;cats;dogs;birds;cars",
  "I see five small balls.":           "balls;cats;dogs;books;hats",
  "I see four fast cars.":             "cars;trucks;trains;bikes;planes;boats",
  "I see four green apples.":          "apples;balls;cars;hats;leaves",
  "I see four happy students.":        "students;teachers;boys;girls;babies",
  "I see four large white clouds.":    "clouds;flowers;cars;trees;rabbits",
  "I see four small toys.":            "toys;balls;cars;books;hats",
  "I see nine white eggs.":            "eggs;flowers;clouds;cars;hats",
  "I see one big red ball.":           "ball;car;hat;flower;apple",
  "I see one hungry dog.":             "dog;cat;bird;baby;boy;girl",
  "I see one small yellow bird.":      "bird;cat;dog;flower;ball",
  "I see one tiny brown ant.":         "ant;dog;cat;mouse;bug",
  "I see seven brown birds.":          "birds;cats;dogs;mice;bugs",
  "I see seven fast boats.":           "boats;cars;trucks;trains;planes;bikes",
  "I see six long pencils.":           "pencils;pens;rulers;markers;crayons",
  "I see three big dogs.":             "dogs;cats;birds;rabbits;boys",
  "I see three big red balls.":        "balls;cars;hats;flowers",
  "I see three fast birds.":           "birds;cats;dogs;cars;trucks",
  "I see three fast fish.":            "fish;birds;cats;dogs",
  "I see two red bags.":               "bags;hats;balls;books;cars",
  "I see two small birds.":            "birds;cats;dogs;balls;cars",
  "I see two small blue birds.":       "birds;cats;dogs;flowers;balls",

  // I sometimes / usually V
  "I sometimes go to the park.":       "park;school;library;shop;store;beach",
  "I sometimes help my brother.":      "brother;sister;mom;dad;friend;teacher",
  "I sometimes walk to the park.":     "park;school;library;shop;store;bus",
  "I usually play with my cousin.":    "cousin;brother;sister;dog;cat;friend",
  "I usually play with my dog.":       "dog;cat;bird;cousin;sister;brother",
  "I usually play with my sister.":    "sister;brother;cousin;dog;cat;friend",

  // Yes/no questions
  "Is it a big dog?":                  "dog;cat;bird;car;ball;hat",
  "Is it a red apple?":                "apple;banana;orange;ball;car",
  "Is it a sunny day?":                "day;morning;afternoon",
  "Is the dog big?":                   "big;small;happy;sad;cute;old;young",
  "Is the milk cold?":                 "cold;hot;fresh;old;new",
  "Is the teacher happy?":             "happy;sad;angry;tired;busy;nice",

  // It cannot V
  "It cannot go fast.":                "fast;far;high;slow",
  "It cannot run away.":               "run;jump;walk;swim;fly",
  "It cannot stay still.":             "still;here;quiet",

  // It has a (adj) + body part
  "It has a long neck.":               "neck;tail;nose;leg;arm;ear",
  "It has a long tail.":               "tail;neck;nose;leg;ear",
  "It has a small nose.":              "nose;tail;neck;mouth;ear;leg",

  // It is a (adj) N
  "It is a big house.":                "house;dog;cat;car;ball;hat;tree",
  "It is a loud bird.":                "bird;dog;cat;car;truck",
  "It is a small bird.":               "bird;dog;cat;ball;hat;car",

  // ===== Batch 4 (sentences 199-298) =====

  // It is V-ing ...
  "It is eating a bone.":              "bone;leaf;fish;apple;cookie",
  "It is raining today.":              "raining;snowing;pouring;hailing",
  "It is sleeping on the mat.":        "mat;floor;bed;chair;sofa;rug",

  // Listen to the X
  "Listen to the bird.":               "bird;teacher;music;song;clock;dog",
  "Listen to the music.":              "music;teacher;bird;song;bell",
  "Listen to the teacher.":            "teacher;music;song;bird;mom;dad",

  // Look at the/this X
  "Look at the bird.":                 "bird;board;clock;teacher;tree;sky;map;picture",
  "Look at the board.":                "board;clock;teacher;map;picture;book",
  "Look at the clock.":                "clock;board;teacher;map;picture;book",
  "Look at the map.":                  "map;board;clock;picture;book",
  "Look at the teacher.":              "teacher;board;clock;map;picture;book",
  "Look at this picture.":             "picture;book;map;word;sentence;letter",

  // My/Our possessives
  "My bag is blue.":                   "blue;red;green;yellow;black;white;pink;purple;orange;brown",
  "My brother has a black hat.":       "hat;cat;car;ball;bag;phone",
  "My father has a phone.":            "phone;car;dog;book;hat;bag",
  "My father is tall.":                "tall;short;happy;sad;tired;busy;nice;kind",
  "My friend can dance.":              "dance;sing;swim;run;jump;cook;read;write;draw",
  "My mother is busy.":                "busy;tired;happy;sad;nice;kind;tall;short",
  "My sister is happy.":               "happy;sad;tired;busy;nice;kind;tall;short",
  "Our house is big.":                 "big;small;new;old;nice;clean",
  "Our teacher is nice.":              "nice;kind;happy;tall;busy;tired",

  // Open the/your X
  "Open the bag.":                     "bag;box;door;window;book",
  "Open the box.":                     "box;bag;door;window;book",
  "Open the window.":                  "window;door;bag;box;book",
  "Open your book.":                   "book;bag;box;eyes;mouth",

  // Pick up / Please be ...
  "Pick up the bag.":                  "bag;book;pen;ball;phone;hat",
  "Please be careful.":                "careful;quiet;kind;ready;quick",
  "Please be quiet now.":              "quiet;careful;kind;ready",
  "Please be quiet.":                  "quiet;careful;kind;ready;quick",

  // Please come ...
  "Please come here.":                 "here;in;back;over;close",
  "Please come to the front.":         "front;back;board;door;table",
  "Please come to the table.":         "table;board;door;front;back;desk",

  // Please drink/eat the X
  "Please drink the juice.":           "juice;water;milk;tea;coffee;soda",
  "Please drink the milk.":            "milk;water;juice;tea;coffee",
  "Please drink the water.":           "water;milk;juice;tea;coffee;soda",
  "Please eat the apple.":             "apple;banana;orange;cookie;bread",
  "Please eat the bread.":             "bread;rice;cheese;soup;cookie",
  "Please eat the soup.":              "soup;rice;bread;cheese;noodles",

  // Please give me the X
  "Please give me the book.":          "book;pen;ball;phone;bag;paper",
  "Please give me the paper.":         "paper;book;pen;phone;bag",
  "Please give me the pen.":           "pen;book;paper;phone;bag",

  // Put the X in the Y
  "Put the book in the bag.":          "book;pen;phone;ball;hat",
  "Put the pen in the box.":           "pen;book;ball;phone;toy",
  "Put the toy in the box.":           "toy;book;pen;phone;ball",

  // Read the / Say the
  "Read the sentence.":                "sentence;word;book;letter;paragraph;story",
  "Read the word.":                    "word;sentence;book;letter;story",
  "Say the word.":                     "word;sentence;name;number;letter",

  // She always V
  "She always draws in the evening.":  "draws;reads;writes;sings;dances;runs",
  "She always has a pen.":             "pen;book;phone;hat;bag",
  "She always has a smile.":           "smile;book;pen;flower",
  "She always has an apple.":          "apple;orange;egg;umbrella",
  "She always reads in the morning.":  "reads;writes;draws;sings;dances;runs;walks",
  "She always writes in the afternoon.":"writes;reads;draws;sings;dances;runs",

  // She can V
  "She can jump high.":                "jump;run;swim;reach;throw",
  "She can speak English.":            "English;Spanish;French;Chinese;Japanese",

  // She does not V
  "She does not like bread.":          "bread;rice;fish;cheese;soup;milk",
  "She does not like fish.":           "fish;bread;rice;cheese;soup;milk",
  "She does not like rice.":           "rice;bread;fish;cheese;soup",
  "She does not like spiders.":        "spiders;bugs;snakes;mice;rats",
  "She does not watch TV.":            "TV;movies;news;cartoons",

  // She has + N
  "She has a dog.":                    "dog;cat;bird;fish;rabbit;hamster",
  "She has a kind friend.":            "friend;teacher;sister;brother",
  "She has a new friend.":             "friend;bag;phone;dog;cat",
  "She has five fresh eggs.":          "eggs;apples;cookies;flowers",
  "She has five new pencils.":         "pencils;pens;books;hats;bags",
  "She has five small eggs.":          "eggs;apples;dogs;cats;balls",
  "She has four old books.":           "books;pens;hats;bags;cars",
  "She has four white eggs.":          "eggs;flowers;hats;cats;dogs",
  "She has nine new stickers.":        "stickers;pens;books;toys",
  "She has three happy hamsters.":     "hamsters;dogs;cats;rabbits;birds",
  "She has three small cats.":         "cats;dogs;birds;rabbits;hamsters",
  "She has two happy dogs.":           "dogs;cats;birds;rabbits;hamsters",

  // She is V-ing ...
  "She is closing the gate.":          "gate;door;window;box;bag",
  "She is eating an apple.":           "apple;orange;egg",
  "She is listening to the teacher.":  "teacher;music;bird;song",
  "She is opening the box.":           "box;door;window;bag;book",
  "She is opening the window.":        "window;door;box;bag;book",
  "She is sitting next to me.":        "sitting;standing;walking;running",
  "She is sleeping in the bed.":       "bed;chair;sofa;room;car",
  "She is standing by the tree.":      "tree;door;window;board;table",
  "She is very happy.":                "happy;sad;tired;busy;nice;kind;hungry;thirsty",
  "She is washing the dishes.":        "dishes;car;clothes;floor;windows",

  // She likes / loves ...
  "She likes bananas and eggs.":       "bananas;apples;oranges;cookies",
  "She likes her new bag.":            "bag;hat;dress;phone;shoes",
  "She likes juice and cookies.":      "juice;water;milk;tea",
  "She likes milk and bread.":         "milk;water;juice;tea;cheese",
  "She likes the dog.":                "dog;cat;bird;teacher;book",
  "She loves her cat.":                "cat;dog;bird;sister;brother;mom;dad",
  "She loves her doll.":               "doll;cat;dog;bag;hat;book",

  // She lives in a X
  "She lives in a city.":              "city;town;village;house;flat;school",
  "She lives in a flat.":              "flat;house;city;town;village",
  "She lives in a house.":             "house;flat;city;town;village",

  // She needs / plays / sometimes V
  "She needs a new eraser.":           "eraser;pen;pencil;ruler;book;bag",
  "She plays football well.":          "football;basketball;tennis;chess",
  "She sometimes finds a coin.":       "coin;pen;key;ball",
  "She sometimes helps her friend.":   "friend;sister;brother;mom;dad;teacher",
  "She sometimes helps her mother.":   "mother;father;sister;brother;friend;teacher",

  // She stands in front of the X
  "She stands in front of the class.": "class;board;teacher;mirror;window;door",
  "She stands in front of the mirror.":"mirror;window;board;door;class",
  "She stands in front of the window.":"window;mirror;board;door;class",

  // ===== Batch 5 (sentences 299-398) =====

  // Sit next to / on
  "Sit next to me.":                   "me;him;her;us",
  "Sit next to the window.":           "window;door;board;wall;teacher;table",
  "Sit next to your friend.":          "friend;sister;brother;mom;dad;teacher",
  "Sit on the bench.":                 "bench;chair;floor;mat;grass;sofa",
  "Sit on the chair.":                 "chair;bench;floor;mat;grass;sofa",
  "Sit on the floor.":                 "floor;chair;bench;mat;grass;sofa",
  "Sit on the grass.":                 "grass;floor;chair;bench;mat;sofa",
  "Sit on the mat.":                   "mat;floor;chair;bench;grass;sofa",

  // Stand X, please.
  "Stand back, please.":               "back;up;here;still",
  "Stand up, please.":                 "up;back;here;still",

  // That is + ...
  "That is a brave dog.":              "dog;cat;bird;baby;girl;boy",
  "That is a fast bird.":              "bird;dog;cat;car;train",
  "That is a small bird.":             "bird;dog;cat;ball;hat",
  "That is her mirror.":               "mirror;bag;hat;phone;book",
  "That is my chair.":                 "chair;bag;book;pen;hat",
  "That is your chair.":               "chair;bag;book;pen;hat",

  // The X is + prep + Y / The X is + adj
  "The apple is in my bag.":           "bag;box;pocket;hand",
  "The apple is on the plate.":        "plate;table;floor;chair;mat",
  "The baby is happy.":                "happy;sad;tired;hungry;cute",
  "The bag is on the floor.":          "floor;table;chair;bed;sofa",
  "The bag is under the desk.":        "desk;table;chair;bed;sofa",
  "The ball is under the desk.":       "desk;table;chair;bed;sofa",
  "The ball is under the table.":      "table;desk;chair;bed;sofa",
  "The bike is behind the house.":     "house;tree;wall;door;car",
  "The bird is on the tree.":          "tree;wall;roof;wire;branch",
  "The bird is on the wall.":          "wall;tree;roof;door;window",
  "The book is in the box.":           "box;bag;drawer;shelf",
  "The book is next to the lamp.":     "lamp;clock;phone;pen;cup",

  // The boy / boys
  "The boy is sad.":                   "sad;happy;tired;hungry;angry",
  "The boy reads a book.":             "book;letter;sentence;word;newspaper",
  "The boys play football.":           "football;basketball;tennis;chess",

  // The cake/candy/cat
  "The cake is on the plate.":         "plate;table;floor;tray",
  "The candy is in my pocket.":        "pocket;bag;hand;mouth",
  "The cat is behind the door.":       "door;chair;tree;sofa;wall",
  "The cat is drinking milk.":         "milk;water;juice;tea",
  "The cat is on the table.":          "table;chair;floor;sofa;bed",
  "The cat is sleeping on the chair.": "chair;sofa;bed;floor;mat",

  // The dog
  "The dog is behind the chair.":      "chair;door;tree;sofa;wall",
  "The dog is playing with a ball.":   "ball;toy;stick;bone;rope",
  "The dog is running fast.":          "running;walking;jumping;swimming",
  "The dog is wagging its tail.":      "tail",

  // The girl / girls
  "The girl is happy.":                "happy;sad;tired;hungry;cute;quiet",
  "The girl writes a letter.":         "letter;book;word;sentence;poem",
  "The girls jump rope.":              "rope",

  // The hat / keys / kitten / milk / note
  "The hat is on the shelf.":          "shelf;table;chair;bed;floor",
  "The keys are in the bowl.":         "bowl;bag;box;drawer;pocket",
  "The kitten is playing with yarn.":  "yarn;ball;string;toy",
  "The milk is in the fridge.":        "fridge;bowl;glass;cup;bottle",
  "The milk is on the table.":         "table;chair;floor;shelf",
  "The note is on the fridge.":        "fridge;table;wall;door;board",

  // The pen / pencil / poster / rug / ruler / shoe
  "The pen is in the bag.":            "bag;box;drawer;pocket;hand",
  "The pen is next to the book.":      "book;ruler;pencil;phone;cup",
  "The pencil is in my hand.":         "hand;bag;box;mouth;pocket",
  "The pencil is on the paper.":       "paper;table;desk;book;floor",
  "The poster is on the wall.":        "wall;door;window;board",
  "The rug is under the bed.":         "bed;table;chair;sofa;desk",
  "The ruler is next to the pen.":     "pen;pencil;book;paper;phone",
  "The shoe is on the mat.":           "mat;floor;chair;bed;table",

  // The student
  "The student is smart.":             "smart;quiet;happy;sad;busy;tired;kind",
  "The student raises a hand.":        "hand;flag;book",
  "The student sits down.":            "sits;stands;kneels",
  "The students listen to music.":     "music;teacher;bird;song;bell",

  // The teacher
  "The teacher is good.":              "good;nice;kind;happy;tired;busy;smart",
  "The teacher is nice.":              "nice;kind;good;happy;tired;busy;smart",
  "The teacher is pointing.":          "pointing;writing;reading;talking;walking;standing",
  "The teacher is talking.":           "talking;reading;writing;walking;standing;pointing;singing",
  "The teacher is writing.":           "writing;reading;talking;walking;standing;pointing;singing",
  "The teacher opens the book.":       "book;door;window;box;bag",
  "The teacher rings the bell.":       "bell;phone;alarm;buzzer",

  // The toy
  "The toy is under the sofa.":        "sofa;table;chair;bed;desk",

  // Their X is Y
  "Their boat is slow.":               "slow;fast;old;new;big;small",
  "Their car is fast.":                "fast;slow;old;new;big;small",
  "Their car is old.":                 "old;new;fast;slow;big;small",

  // There are ...
  "There are eight boys in the yard.":     "boys;girls;dogs;cats;children",
  "There are five apples in the box.":     "apples;oranges;balls;cookies;eggs",
  "There are five boxes.":                 "boxes;bags;hats;balls",
  "There are five girls in the room.":     "girls;boys;dogs;cats;children;teachers",
  "There are five pencils.":               "pencils;pens;rulers;books;hats",
  "There are four birds.":                 "birds;cats;dogs;hats;balls",
  "There are four books in the bag.":      "books;pens;hats;balls",
  "There are four oranges in the box.":    "oranges;apples;eggs;balls",
  "There are four pears in the bowl.":     "pears;apples;oranges;eggs;cookies",
  "There are four pens in the drawer.":    "pens;pencils;rulers;books;hats",
  "There are four students in the room.":  "students;teachers;boys;girls;children",
  "There are six books on the shelf.":     "books;pens;hats;balls",
  "There are six green chairs.":           "chairs;tables;cars;hats;balls",
  "There are ten small fish.":             "fish;cats;dogs;birds;balls",
  "There are three bags on the floor.":    "bags;hats;balls;books;cars",
  "There are three children in the park.": "children;boys;girls;dogs;cats",
  "There are three pens on the desk.":     "pens;pencils;books;rulers;hats",
  "There are three pens.":                 "pens;pencils;books;rulers;hats",
  "There are three red kites.":            "kites;balls;cars;hats;flowers",
  "There are three round balls.":          "balls;tables;hats;clocks;coins",
  "There are three yellow bananas.":       "bananas;apples;flowers;hats",
  "There are two bags on the bike.":       "bags;baskets;boxes;hats",
  "There are two bags on the chair.":      "bags;hats;balls;books",
  "There are two big boxes.":              "boxes;bags;cars;hats;balls",
  "There are two birds in the sky.":       "birds;clouds;planes;kites",
  "There are two cats on the bed.":        "cats;dogs;birds;toys;pillows",
  "There are two clean cups.":             "cups;plates;glasses;bowls;spoons",

  // ===== Batch 6 (sentences 399-498) =====

  // There are two + adj + N(s) (+ in + place)
  "There are two clean desks.":            "desks;tables;chairs;cars;hats",
  "There are two doctors in the office.":  "doctors;teachers;nurses;workers;students",
  "There are two empty bags.":             "bags;boxes;cups;bottles;cans",
  "There are two new tables.":             "tables;chairs;desks;cars;hats",
  "There are two soft cats.":              "cats;dogs;rabbits;pillows",
  "There are two teachers in the park.":   "teachers;students;boys;girls;dogs;cats",

  // There is a/an + adj + N
  "There is a big dog.":                   "dog;cat;bird;ball;hat;car",
  "There is a cold room.":                 "room;day;drink;floor",
  "There is a dark room.":                 "room;sky;day;cloud",
  "There is a dirty table.":               "table;chair;floor;hat;shoe",
  "There is a happy teacher.":             "teacher;girl;boy;baby;mom;dad",
  "There is a heavy box.":                 "box;bag;rock;chair",
  "There is a long pencil.":               "pencil;pen;ruler;rope;line",
  "There is a new chair.":                 "chair;table;car;phone;hat",
  "There is a nice room.":                 "room;teacher;day;gift;dog",
  "There is a small book.":                "book;cat;dog;ball;hat",
  "There is a small duck.":                "duck;cat;dog;bird;rabbit",
  "There is a tall teacher.":              "teacher;boy;girl;tree;building",
  "There is a wide door.":                 "door;window;room;table",
  "There is a yellow ball.":               "ball;hat;flower;car;sun",
  "There is an old bag.":                  "bag;apple;orange;egg;umbrella",

  // There is one + adj + table in the X
  "There is one big table in the kitchen.":  "table;chair;sofa;clock;window",
  "There is one long table in the class.":   "table;board;wall;desk",
  "There is one round table in the room.":   "table;chair;clock;mirror;window",

  // These are + possessive + N(s)
  "These are her drawings.":           "drawings;books;pencils;shoes;toys",
  "These are his books.":              "books;shoes;toys;pencils;pens",
  "These are my rulers.":              "rulers;pens;pencils;books;shoes",
  "These are my shoes.":               "shoes;socks;pants;hats;gloves",
  "These are our toys.":               "toys;books;pencils;pens;crayons",
  "These are their toys.":             "toys;books;pencils;pens;crayons",

  // They always V on day
  "They always listen on Monday.":     "Monday;Tuesday;Wednesday;Thursday;Friday;Saturday;Sunday",
  "They always play on Wednesday.":    "Wednesday;Monday;Tuesday;Thursday;Friday;Saturday;Sunday",
  "They always study on Tuesday.":     "Tuesday;Monday;Wednesday;Thursday;Friday;Saturday;Sunday",

  // They are at + place
  "They are at home.":                 "home;school;work",
  "They are at the door.":             "door;window;table;board;gate",
  "They are at the park gate.":        "park gate;school gate",
  "They are at the school gate.":      "school gate;park gate",

  // They are V-ing / They are + adj
  "They are eating bread.":            "bread;rice;cheese;soup;cake;pizza",
  "They are excited.":                 "excited;happy;sad;tired;hungry;bored",
  "They are hiding in the room.":      "room;bathroom;classroom;closet;garden",
  "They are in the hallway.":          "hallway;classroom;kitchen;bedroom;bathroom;garden",
  "They are in the kitchen.":          "kitchen;bathroom;bedroom;hallway;living room;garden",
  "They are playing a game.":          "game;song;trick",
  "They are playing in the park.":     "park;garden;yard;classroom;school",
  "They are running fast.":            "running;walking;jumping;swimming;riding",
  "They are sitting in the park.":     "park;garden;classroom;car;room",
  "They are throwing the ball.":       "ball;stick;rock;toy;coin",
  "They are very lonely.":             "lonely;sad;tired;happy;bored;hungry",
  "They are very tired.":              "tired;happy;sad;hungry;bored;sleepy",
  "They are walking to school.":       "school;the park;the library;the door",
  "They are waving hello.":            "hello;goodbye",

  // They can V
  "They can draw a cat.":              "cat;dog;bird;tree;flower;house",
  "They can speak slowly.":            "slowly;quickly;softly;loudly;clearly",
  "They can wait for the bus.":        "bus;train;teacher;mom",

  // They do not like X
  "They do not like beans.":           "beans;peas;carrots;onions;mushrooms",
  "They do not like eggs.":            "eggs;beans;peas;mushrooms",
  "They do not like milk.":            "milk;water;juice;tea;coffee",

  // They eat / have / like ...
  "They eat bread for breakfast.":     "bread;rice;cheese;soup;cookies",
  "They eat rice every day.":          "rice;bread;noodles;soup;fish",
  "They have a big house.":            "house;car;dog;cat;ball",
  "They have a loud bird.":            "bird;dog;cat;car;phone",
  "They have a small dog.":            "dog;cat;bird;ball;car",
  "They like to play football.":       "football;basketball;tennis;chess",
  "They like to run.":                 "run;walk;swim;dance;sing",
  "They like to swim.":                "swim;run;walk;dance;sing",

  // They never V
  "They never jump on the table.":     "table;chair;sofa;bed;floor",
  "They never run in the house.":      "house;classroom;hallway;kitchen",
  "They never run in the room.":       "room;classroom;hallway;kitchen;house",

  // They sing / sometimes / study / usually / wash
  "They sing a song.":                 "song;poem",
  "They sing in the morning.":         "morning;afternoon;evening",
  "They sometimes eat fruit.":         "fruit;rice;bread;cheese;soup",
  "They sometimes eat pizza.":         "pizza;bread;rice;noodles;soup",
  "They sometimes play games.":        "games;songs;sports;tricks",
  "They study in the library.":        "library;classroom;school;park;room",
  "They usually come home at 4 o'clock.":      "4 o'clock;5 o'clock;6 o'clock;3 o'clock",
  "They usually come home in the afternoon.":  "afternoon;morning;evening",
  "They usually leave at 3 o'clock.":          "3 o'clock;4 o'clock;5 o'clock;6 o'clock",
  "They wash their hands.":            "hands;clothes;car;dishes",

  // This is + possessive + N
  "This is her bag.":                  "bag;hat;phone;book;pen",
  "This is her desk.":                 "desk;chair;bag;book",
  "This is his ball.":                 "ball;bag;hat;phone;book",
  "This is my brother's toy.":         "toy;ball;car;hat;book",
  "This is my desk.":                  "desk;chair;bag;book;pen",
  "This is my pen.":                   "pen;book;bag;hat;phone",
  "This is our classroom.":            "classroom;school;teacher;house",
  "This is our lunch.":                "lunch;dinner;breakfast;snack",
  "This is your paper.":               "paper;book;pen;chair;desk",

  // Those are + possessive + N(s)
  "Those are her pencils.":            "pencils;pens;books;shoes;rulers",
  "Those are our coats.":              "coats;hats;shoes;bags;jackets",
  "Those are your shoes.":             "shoes;socks;pants;hats;gloves",

  // Turn off ...
  "Turn off the light.":               "light;TV;radio;fan;phone;computer",

  // We always say X
  "We always say hello.":              "hello;goodbye;please;thank you",
  "We always say please.":             "please;hello;goodbye;thank you;sorry",
  "We always say thank you.":          "thank you;hello;goodbye;please;sorry",

  // We are V-ing / We are + adj
  "We are jumping on the grass.":      "grass;floor;mat;bed;sofa",
  "We are learning English.":          "English;Spanish;French;Chinese;math;science",
  "We are listening to a song.":       "song;teacher;bird;music",
  "We are looking at the bird.":       "bird;board;clock;teacher;tree;sky",
  "We are sitting on the chair.":      "chair;bench;sofa;floor;mat",
  "We are tired.":                     "tired;happy;sad;hungry;sleepy;bored",

  // ===== Batch 7 (sentences 499-595, final batch) =====

  // We are very + adj / We are V-ing
  "We are very bored.":                "bored;happy;sad;tired;hungry;sleepy;hot;cold",
  "We are very hot.":                  "hot;cold;happy;sad;tired;hungry;sleepy;bored",
  "We are watching a movie.":          "movie;show;game;cartoon;bird",

  // We can / cannot V
  "We can bake a cake.":               "cake;cookie;pizza;bread;pie",
  "We can build a tower.":             "tower;house;wall;bridge;robot",
  "We can find the ball.":             "ball;book;pen;phone;keys",
  "We can help you.":                  "you;them;him;her",
  "We can write words.":               "words;letters;sentences;numbers",
  "We cannot fly.":                    "fly;swim;dance;sing;cook",

  // We do not like
  "We do not like bad games.":         "games;movies;songs;jokes;sports",
  "We do not like cold food.":         "food;weather;water;rooms;days",
  "We do not like old toys.":          "toys;books;shoes;cars;hats",

  // We have
  "We have a classroom.":              "classroom;teacher;school;car;dog",
  "We have five nice friends.":        "friends;teachers;students;cousins;neighbors",
  "We have four nice teachers.":       "teachers;friends;students;cousins",
  "We have six kind teachers.":        "teachers;friends;students;cousins",
  "We have three sharpies.":           "sharpies;pens;pencils;crayons;markers",
  "We have two balls.":                "balls;hats;books;toys;pens",

  // We hide / love / never
  "We hide in the closet.":            "closet;room;classroom;garden;hallway",
  "We love our garden.":               "garden;house;school;teacher;dog;cat",
  "We love our house.":                "house;garden;school;teacher;dog;cat",
  "We love our school.":               "school;house;garden;teacher;classroom",
  "We never run in the hall.":         "hall;house;classroom;hallway;kitchen",
  "We never shout in the library.":    "library;classroom;school;park;house",
  "We never sleep in class.":          "class",

  // We play / run
  "We play in the park.":              "park;garden;yard;classroom;school",
  "We run in the garden.":             "garden;park;yard;hallway;school",

  // We see + number + adj/color + N(plural)
  "We see five green trees.":          "trees;flowers;balls;cars;leaves",
  "We see four tall trees.":           "trees;teachers;buildings;towers",
  "We see six thin trees.":            "trees;pencils;rulers;sticks",
  "We see three angry bees.":          "bees;dogs;cats;wasps",
  "We see three happy dogs.":          "dogs;cats;birds;rabbits;students",
  "We see two small fish.":            "fish;cats;dogs;birds;rabbits",

  // We sit next to / sometimes / usually
  "We sit next to the exit.":          "exit;door;window;board;wall",
  "We sit next to the teacher.":       "teacher;exit;door;window;board",
  "We sit next to the window.":        "window;door;exit;board;wall;teacher",
  "We sometimes see a bird.":          "bird;cat;dog;squirrel;rabbit",
  "We sometimes see a cat.":           "cat;dog;bird;squirrel;rabbit",
  "We sometimes see a squirrel.":      "squirrel;cat;dog;bird;rabbit",
  "We usually sit here.":              "here;there;together;quietly",
  "We usually sit together.":          "together;here;quietly;nearby",
  "We usually walk together.":         "together;here;quietly;nearby",

  // What do you V?
  "What do you have?":                 "have;need;see;like;eat",
  "What do you need?":                 "need;have;want;see;like",
  "What do you see?":                  "see;hear;need;have;like",

  // What is in/that/this/your X?
  "What is in that box?":              "box;bag;cup;drawer;pocket",
  "What is in the bag?":               "bag;box;drawer;pocket;cup",
  "What is that noise?":               "noise;sound;smell;color;animal",
  "What is that?":                     "that;this",
  "What is this?":                     "this;that",
  "What is your name?":                "name;age;number;color;phone",

  // When do you V?
  "When do you eat?":                  "eat;sleep;wake up;study;play",
  "When do you sleep?":                "sleep;eat;study;play;wake up",
  "When do you wake up?":              "wake up;sleep;eat;study;play",

  // Where do they/we/you V?
  "Where do they go?":                 "go;sit;eat;sleep;study",
  "Where do we sit?":                  "sit;eat;go;study;sleep",
  "Where do you live?":                "live;sit;eat;go;sleep;study",

  // Where is X?
  "Where is my bag?":                  "bag;book;phone;pen;hat",
  "Where is the cat?":                 "cat;dog;bird;teacher;mom",
  "Where is the dog?":                 "dog;cat;bird;teacher;mom",
  "Where is the teacher?":             "teacher;cat;dog;mom;dad;sister;brother",
  "Where is your father?":             "father;mother;sister;brother;teacher;friend",
  "Where is your mother?":             "mother;father;sister;brother;teacher;friend",

  // Who is X?
  "Who is he?":                        "he;she",
  "Who is she?":                       "she;he",
  "Who is that man?":                  "man;woman;boy;girl;teacher",
  "Who is your best friend?":          "friend;teacher",
  "Who is your friend?":               "friend;teacher;sister;brother;mother",
  "Who is your teacher?":              "teacher;friend;mother;father;sister;brother",

  // Write your name
  "Write your name here.":             "name;age;number;phone",
  "Write your name.":                  "name;age;number;phone",

  // You are a + (adj) + N
  "You are a brave girl.":             "girl;boy;student;child;dog",
  "You are a good student.":           "student;teacher;friend;person;girl;boy",
  "You are a nice friend.":            "friend;teacher;student;person;girl;boy",

  // You are V-ing
  "You are drawing a house.":          "house;tree;car;cat;flower;dog",
  "You are drawing a picture.":        "picture;house;tree;flower;cat",
  "You are drinking juice.":           "juice;milk;water;tea;coffee;soda",
  "You are drinking milk.":            "milk;juice;water;tea;coffee;soda",
  "You are making a sandwich.":        "sandwich;cake;cookie;pizza",
  "You are writing a word.":           "word;letter;sentence;name;number",

  // You can / cannot
  "You can jump.":                     "jump;run;swim;dance;sing;cook;read;write",
  "You cannot catch the bird.":        "bird;ball;cat;mouse;fish",
  "You cannot fly a kite.":            "kite;plane",

  // You + present_simple
  "You count the numbers.":            "numbers;letters;words;coins",
  "You do not like cats.":             "cats;dogs;birds;snakes;spiders",
  "You do not like dogs.":             "dogs;cats;birds;snakes;spiders",
  "You do not like noise.":            "noise;rain;cold;heat",
  "You have a green apple.":           "apple;ball;hat;car;tree",
  "You have a silver coin.":           "coin;car;phone;ring",
  "You usually drink milk.":           "milk;water;juice;tea;coffee;soda",
  "You usually play football.":        "football;basketball;tennis;chess",
  "You usually wear a sweater.":       "sweater;shirt;hat;coat;jacket",
  "You walk to school.":               "school;the park;the library;the door",
  "You walk with your friend.":        "friend;sister;brother;mom;dad",

  // Your X is Y
  "Your apple is red.":                "red;green;yellow;ripe;sweet",
  "Your pencil is sharp.":             "sharp;short;long;new;old",
  "Your pencil is short.":             "short;long;sharp;new;old",
};

const ALL_METADATA = [...METADATA_BATCH_2, ...METADATA_BATCH_3, ...METADATA_BATCH_4, ...METADATA_BATCH_5, ...METADATA_BATCH_6, ...METADATA_BATCH_7];
for (const row of ALL_METADATA) {
  row.variant_lexemes = VARIANT_LEXEMES_BY_SENTENCE[row.sentence] ?? "";
}

/**
 * Repair encoding bug introduced when Excel saved a smart-quote (’) as
 * Windows-1252 0x92 and a downstream tool re-decoded it as UTF-8 (G + ?).
 */
function fixMojibake(s) {
  if (typeof s !== "string") return s;
  return s
    .replace(/oG\?clock/g, "o'clock")
    .replace(/G\?clock/g, "'clock")
    .replace(/G\?/g, "'");
}

/**
 * A row "owns its metadata" if any of cells 2..8 (target through variant_group)
 * are non-empty after trim. We never overwrite owned rows.
 */
function rowHasMetadata(cells) {
  for (let i = 1; i <= 8; i += 1) {
    if (String(cells[i] ?? "").trim() !== "") return true;
  }
  return false;
}

function main() {
  const raw = fs.readFileSync(csvReadPath, "utf8");
  const rows = parse(raw, {
    columns: false,
    skip_empty_lines: false,
    relax_column_count: true,
    trim: true,
  });

  if (rows.length === 0) {
    throw new Error(`Empty CSV at ${csvReadPath}`);
  }

  // Drop existing header (first row); rebuild it from canonical HEADER below.
  const dataRows = rows.slice(1).filter((r) => r.length && String(r[0] ?? "").trim());
  const mapBySentence = new Map(ALL_METADATA.map((m) => [m.sentence.trim(), m]));

  const out = [HEADER];
  let filled = 0;
  let preserved = 0;
  let untouched = 0;
  let mojibakeFixed = 0;

  for (const dataRow of dataRows) {
    let sentence = String(dataRow[0]).trim();
    const repaired = fixMojibake(sentence);
    if (repaired !== sentence) {
      sentence = repaired;
      mojibakeFixed += 1;
    }

    if (rowHasMetadata(dataRow)) {
      // Human owns this row. Keep what they wrote, only fix the sentence text.
      const cells = [...dataRow];
      cells[0] = sentence;
      while (cells.length < HEADER.length) cells.push("");
      out.push(cells.slice(0, HEADER.length));
      preserved += 1;
      continue;
    }

    const meta = mapBySentence.get(sentence);
    if (meta) {
      out.push([
        sentence,
        meta.target_word,
        meta.acceptable_targets,
        meta.variant_lexemes ?? "",
        meta.structure_id,
        meta.tags,
        meta.cefr,
        meta.difficulty,
        meta.variant_group ?? "",
      ]);
      filled += 1;
    } else {
      out.push([sentence, "", "", "", "", "", "", "", ""]);
      untouched += 1;
    }
  }

  const csvOut = stringify(out, { header: false });
  fs.writeFileSync(csvWritePath, csvOut, "utf8");
  console.log(`Wrote ${csvWritePath}`);
  console.log(`  Preserved (had metadata):  ${preserved}`);
  console.log(`  Filled (from metadata):    ${filled}`);
  console.log(`  Untouched (still empty):   ${untouched}`);
  console.log(`  Mojibake fixes:            ${mojibakeFixed}`);
}

main();
