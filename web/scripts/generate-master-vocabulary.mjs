/**
 * Generator for `web/lib/curated-sentences/master-vocabulary.ts` — the
 * authoritative source for every lemma the curated sentence-bank pipeline
 * cares about (nouns, verbs, and later adjectives, pronouns, ...).
 *
 * Authoring model:
 *   - Edit the NOUN_ENTRIES / VERB_ENTRIES (etc.) arrays below in compact
 *     form, then re-run this script. The generated .ts file is overwritten;
 *     do NOT hand-edit it.
 *   - Each section is sorted alphabetically by `id` automatically; the
 *     output places visible banner comments between sections.
 *
 * Usage (from repo root):
 *   node web/scripts/generate-master-vocabulary.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const target = path.join(repoRoot, "web/lib/curated-sentences/master-vocabulary.ts");

/**
 * Compact entry shapes (defaults: cefr=a1):
 *
 * NOUN_ENTRIES item:
 *   id, lemma, diff, base, plural?, count(=count|mass|both|n_a),
 *   art(=a|an|none), topics, tags, typed?, media?, ex?, notes?,
 *   ipl(irregular_plural)?, display?
 *   Mass nouns: omit `plural`, set count=mass, art=none.
 *
 * VERB_ENTRIES item:
 *   id, lemma, diff, base, third?, past?, pp?, ing?,
 *   am?, is?, are?, was?, were?,        // copula 'be' only
 *   vc(=action|state|copula|modal|auxiliary),
 *   trans(=transitive|intransitive|both|ditransitive),
 *   ipast(irregular_past)?, takes_inf?, parts(particles)?,
 *   objects(typical_objects)?, topics, tags, typed?, media?, ex?, notes?
 */
const E = (data) => data;

const NOUN_ENTRIES = [
  // ---------- A ----------
  E({ id: "afternoon", lemma: "afternoon", diff: 2, base: "afternoon", plural: "afternoons", count: "count", art: "an", topics: ["time"], tags: ["time_of_day"], typed: ["afternoon", "afternoons"], media: "afternoon", ex: "They usually come home in the afternoon." }),
  E({ id: "alarm", lemma: "alarm", diff: 2, base: "alarm", plural: "alarms", count: "count", art: "an", topics: ["school", "home"], tags: ["sound", "device"], typed: ["alarm", "alarms"], media: "alarm" }),
  E({ id: "animal", lemma: "animal", diff: 2, base: "animal", plural: "animals", count: "count", art: "an", topics: ["animals", "nature"], tags: ["creature"], typed: ["animal", "animals"], media: "animal" }),
  E({ id: "ant", lemma: "ant", diff: 2, base: "ant", plural: "ants", count: "count", art: "an", topics: ["animals", "nature"], tags: ["insect", "small_animal"], typed: ["ant", "ants"], media: "ant", ex: "I see one tiny brown ant." }),
  E({ id: "apple", lemma: "apple", diff: 1, base: "apple", plural: "apples", count: "count", art: "an", topics: ["food"], tags: ["fruit", "edible"], typed: ["apple", "apples"], media: "apple", ex: "Do you want an apple?" }),

  // ---------- B ----------
  E({ id: "baby", lemma: "baby", diff: 1, base: "baby", plural: "babies", count: "count", art: "a", topics: ["family", "people"], tags: ["child"], typed: ["baby", "babies"], media: "baby", ex: "The baby is happy.", ipl: true, notes: "y \u2192 ies plural rule." }),
  E({ id: "bag", lemma: "bag", diff: 1, base: "bag", plural: "bags", count: "count", art: "a", topics: ["school", "objects"], tags: ["container"], typed: ["bag", "bags"], media: "bag", ex: "My bag is blue." }),
  E({ id: "ball", lemma: "ball", diff: 1, base: "ball", plural: "balls", count: "count", art: "a", topics: ["toys", "sports"], tags: ["round", "play"], typed: ["ball", "balls"], media: "ball", ex: "He can kick the ball." }),
  E({ id: "banana", lemma: "banana", diff: 1, base: "banana", plural: "bananas", count: "count", art: "a", topics: ["food"], tags: ["fruit", "edible"], typed: ["banana", "bananas"], media: "banana", ex: "I love bananas." }),
  E({ id: "baseball", lemma: "baseball", diff: 2, base: "baseball", plural: "baseballs", count: "both", art: "a", topics: ["sports"], tags: ["ball_game"], typed: ["baseball", "baseballs"], media: "baseball", notes: "Mass for the sport ('play baseball'); count for the ball." }),
  E({ id: "basketball", lemma: "basketball", diff: 2, base: "basketball", plural: "basketballs", count: "both", art: "a", topics: ["sports"], tags: ["ball_game"], typed: ["basketball", "basketballs"], media: "basketball", notes: "Mass for the sport ('play basketball'); count for the ball." }),
  E({ id: "bean", lemma: "bean", diff: 2, base: "bean", plural: "beans", count: "count", art: "a", topics: ["food"], tags: ["vegetable", "edible"], typed: ["bean", "beans"], media: "bean", ex: "They do not like beans." }),
  E({ id: "bed", lemma: "bed", diff: 1, base: "bed", plural: "beds", count: "count", art: "a", topics: ["home", "furniture"], tags: ["sleep", "bedroom"], typed: ["bed", "beds"], media: "bed", ex: "She is sleeping in the bed." }),
  E({ id: "bee", lemma: "bee", diff: 2, base: "bee", plural: "bees", count: "count", art: "a", topics: ["animals", "nature"], tags: ["insect"], typed: ["bee", "bees"], media: "bee", ex: "We see three angry bees." }),
  E({ id: "bell", lemma: "bell", diff: 2, base: "bell", plural: "bells", count: "count", art: "a", topics: ["school"], tags: ["sound", "device"], typed: ["bell", "bells"], media: "bell", ex: "Can you hear the bell?" }),
  E({ id: "bench", lemma: "bench", diff: 2, base: "bench", plural: "benches", count: "count", art: "a", topics: ["furniture", "places"], tags: ["seat", "outdoor"], typed: ["bench", "benches"], media: "bench", ex: "He sits on the bench." }),
  E({ id: "bike", lemma: "bike", diff: 1, base: "bike", plural: "bikes", count: "count", art: "a", topics: ["transport"], tags: ["vehicle"], typed: ["bike", "bikes", "bicycle", "bicycles"], media: "bike", ex: "He is riding a bike." }),
  E({ id: "bird", lemma: "bird", diff: 1, base: "bird", plural: "birds", count: "count", art: "a", topics: ["animals", "nature"], tags: ["flying", "small_animal"], typed: ["bird", "birds"], media: "bird", ex: "I can see the bird." }),
  E({ id: "board", lemma: "board", diff: 2, base: "board", plural: "boards", count: "count", art: "a", topics: ["school"], tags: ["surface", "classroom"], typed: ["board", "boards"], media: "board", ex: "I cannot see the board." }),
  E({ id: "boat", lemma: "boat", diff: 2, base: "boat", plural: "boats", count: "count", art: "a", topics: ["transport", "nature"], tags: ["vehicle", "water"], typed: ["boat", "boats"], media: "boat", ex: "Their boat is slow." }),
  E({ id: "bone", lemma: "bone", diff: 2, base: "bone", plural: "bones", count: "count", art: "a", topics: ["animals", "body"], tags: ["pet_food"], typed: ["bone", "bones"], media: "bone", ex: "It is eating a bone." }),
  E({ id: "book", lemma: "book", diff: 1, base: "book", plural: "books", count: "count", art: "a", topics: ["school", "objects"], tags: ["reading"], typed: ["book", "books"], media: "book", ex: "I have a book." }),
  E({ id: "bowl", lemma: "bowl", diff: 2, base: "bowl", plural: "bowls", count: "count", art: "a", topics: ["home", "food"], tags: ["container", "kitchen"], typed: ["bowl", "bowls"], media: "bowl", ex: "There are four pears in the bowl." }),
  E({ id: "box", lemma: "box", diff: 1, base: "box", plural: "boxes", count: "count", art: "a", topics: ["objects"], tags: ["container"], typed: ["box", "boxes"], media: "box", ex: "Open the box." }),
  E({ id: "boy", lemma: "boy", diff: 1, base: "boy", plural: "boys", count: "count", art: "a", topics: ["people"], tags: ["child", "male"], typed: ["boy", "boys"], media: "boy", ex: "The boy is sad." }),
  E({ id: "bread", lemma: "bread", diff: 1, base: "bread", count: "mass", art: "none", topics: ["food"], tags: ["edible", "staple"], typed: ["bread"], media: "bread", ex: "She does not like bread.", notes: "Mass noun \u2014 avoid 'a bread' / 'breads' in generated frames." }),
  E({ id: "breakfast", lemma: "breakfast", diff: 1, base: "breakfast", plural: "breakfasts", count: "both", art: "none", topics: ["food"], tags: ["meal"], typed: ["breakfast", "breakfasts"], media: "breakfast", ex: "I always eat breakfast.", notes: "Usually mass ('eat breakfast'); count for individual meals." }),
  E({ id: "brother", lemma: "brother", diff: 1, base: "brother", plural: "brothers", count: "count", art: "a", topics: ["family", "people"], tags: ["sibling", "male"], typed: ["brother", "brothers"], media: "brother", ex: "I sometimes help my brother." }),
  E({ id: "bus", lemma: "bus", diff: 1, base: "bus", plural: "buses", count: "count", art: "a", topics: ["transport"], tags: ["vehicle"], typed: ["bus", "buses"], media: "bus", ex: "He walks to the bus." }),
  E({ id: "bush", lemma: "bush", diff: 3, base: "bush", plural: "bushes", count: "count", art: "a", topics: ["nature"], tags: ["plant"], typed: ["bush", "bushes"], media: "bush", notes: "Appears only as a variant lexeme (Draw a small flower \u2192 bush)." }),

  // ---------- C ----------
  E({ id: "cake", lemma: "cake", diff: 1, base: "cake", plural: "cakes", count: "both", art: "a", topics: ["food"], tags: ["dessert", "edible"], typed: ["cake", "cakes"], media: "cake", ex: "We can bake a cake." }),
  E({ id: "candy", lemma: "candy", diff: 1, base: "candy", plural: "candies", count: "both", art: "none", topics: ["food"], tags: ["sweet", "edible"], typed: ["candy", "candies"], media: "candy", ex: "The candy is in my pocket.", ipl: true, notes: "Often used as mass noun ('some candy'). y \u2192 ies plural rule." }),
  E({ id: "cane", lemma: "cane", diff: 2, base: "cane", plural: "canes", count: "count", art: "a", topics: ["objects"], tags: ["walking_aid"], typed: ["cane", "canes"], media: "cane", ex: "His grandfather has a cane." }),
  E({ id: "cap", lemma: "cap", diff: 2, base: "cap", plural: "caps", count: "count", art: "a", topics: ["clothes"], tags: ["accessory", "headwear"], typed: ["cap", "caps"], media: "cap" }),
  E({ id: "car", lemma: "car", diff: 1, base: "car", plural: "cars", count: "count", art: "a", topics: ["transport"], tags: ["vehicle"], typed: ["car", "cars"], media: "car", ex: "He likes red cars." }),
  E({ id: "card", lemma: "card", diff: 2, base: "card", plural: "cards", count: "count", art: "a", topics: ["school", "art", "objects"], tags: ["paper"], typed: ["card", "cards"], media: "card" }),
  E({ id: "carrot", lemma: "carrot", diff: 2, base: "carrot", plural: "carrots", count: "count", art: "a", topics: ["food"], tags: ["vegetable", "edible"], typed: ["carrot", "carrots"], media: "carrot" }),
  E({ id: "cat", lemma: "cat", diff: 1, base: "cat", plural: "cats", count: "count", art: "a", topics: ["animals"], tags: ["pet", "small_animal"], typed: ["cat", "cats"], media: "cat", ex: "I see a white cat." }),
  E({ id: "cello", lemma: "cello", diff: 2, base: "cello", plural: "cellos", count: "count", art: "a", topics: ["music"], tags: ["instrument", "string"], typed: ["cello", "cellos"], media: "cello" }),
  E({ id: "chair", lemma: "chair", diff: 1, base: "chair", plural: "chairs", count: "count", art: "a", topics: ["furniture", "home"], tags: ["seat"], typed: ["chair", "chairs"], media: "chair", ex: "Sit on the chair." }),
  E({ id: "cheese", lemma: "cheese", diff: 1, base: "cheese", count: "mass", art: "none", topics: ["food"], tags: ["dairy", "edible"], typed: ["cheese"], media: "cheese", ex: "I like cheese.", notes: "Mass noun \u2014 avoid 'a cheese' / 'cheeses' in generated frames." }),
  E({ id: "child", lemma: "child", diff: 1, base: "child", plural: "children", count: "count", art: "a", topics: ["family", "people"], tags: ["young"], typed: ["child", "children", "kid", "kids"], media: "child", ex: "There are three children in the park.", ipl: true, notes: "Irregular plural 'children'." }),
  E({ id: "chips", lemma: "chips", diff: 2, base: "chips", plural: "chips", count: "count", art: "none", topics: ["food"], tags: ["edible", "snack"], typed: ["chips", "fries"], media: "chips", ipl: true, notes: "Plural-only noun; avoid 'a chips'." }),
  E({ id: "chocolate", lemma: "chocolate", diff: 1, base: "chocolate", plural: "chocolates", count: "both", art: "none", topics: ["food"], tags: ["sweet", "edible", "dessert"], typed: ["chocolate", "chocolates"], media: "chocolate", notes: "Usually mass ('some chocolate'); count for individual pieces." }),
  E({ id: "city", lemma: "city", diff: 2, base: "city", plural: "cities", count: "count", art: "a", topics: ["places"], tags: ["location"], typed: ["city", "cities"], media: "city", ex: "She lives in a city.", ipl: true, notes: "y \u2192 ies plural rule." }),
  E({ id: "class", lemma: "class", diff: 2, base: "class", plural: "classes", count: "count", art: "a", topics: ["school", "places"], tags: ["lesson", "group"], typed: ["class", "classes"], media: "class", ex: "There is one long table in the class." }),
  E({ id: "classroom", lemma: "classroom", diff: 2, base: "classroom", plural: "classrooms", count: "count", art: "a", topics: ["school", "places"], tags: ["place"], typed: ["classroom", "classrooms"], media: "classroom", ex: "This is our classroom." }),
  E({ id: "clock", lemma: "clock", diff: 1, base: "clock", plural: "clocks", count: "count", art: "a", topics: ["objects", "time"], tags: ["device"], typed: ["clock", "clocks"], media: "clock", ex: "Look at the clock." }),
  E({ id: "closet", lemma: "closet", diff: 2, base: "closet", plural: "closets", count: "count", art: "a", topics: ["home", "furniture"], tags: ["storage"], typed: ["closet", "closets"], media: "closet", ex: "We hide in the closet." }),
  E({ id: "cloud", lemma: "cloud", diff: 2, base: "cloud", plural: "clouds", count: "count", art: "a", topics: ["nature", "weather"], tags: ["sky"], typed: ["cloud", "clouds"], media: "cloud", ex: "I see four large white clouds." }),
  E({ id: "coat", lemma: "coat", diff: 2, base: "coat", plural: "coats", count: "count", art: "a", topics: ["clothes"], tags: ["outerwear", "warm"], typed: ["coat", "coats"], media: "coat", ex: "He is wearing a yellow coat." }),
  E({ id: "coffee", lemma: "coffee", diff: 2, base: "coffee", count: "mass", art: "none", topics: ["food", "drinks"], tags: ["beverage"], typed: ["coffee"], media: "coffee", notes: "Mass noun in A1; 'a coffee' (a cup) is a context-only count usage." }),
  E({ id: "coin", lemma: "coin", diff: 2, base: "coin", plural: "coins", count: "count", art: "a", topics: ["money", "objects"], tags: ["money_unit"], typed: ["coin", "coins"], media: "coin", ex: "She sometimes finds a coin." }),
  E({ id: "cookie", lemma: "cookie", diff: 1, base: "cookie", plural: "cookies", count: "count", art: "a", topics: ["food"], tags: ["dessert", "edible", "sweet"], typed: ["cookie", "cookies"], media: "cookie", ex: "Do you want a cookie?" }),
  E({ id: "cousin", lemma: "cousin", diff: 2, base: "cousin", plural: "cousins", count: "count", art: "a", topics: ["family", "people"], tags: ["relative"], typed: ["cousin", "cousins"], media: "cousin", ex: "I usually play with my cousin." }),
  E({ id: "cracker", lemma: "cracker", diff: 2, base: "cracker", plural: "crackers", count: "count", art: "a", topics: ["food"], tags: ["edible", "snack"], typed: ["cracker", "crackers"], media: "cracker" }),
  E({ id: "crayon", lemma: "crayon", diff: 2, base: "crayon", plural: "crayons", count: "count", art: "a", topics: ["school", "art"], tags: ["art_supply"], typed: ["crayon", "crayons"], media: "crayon" }),
  E({ id: "cup", lemma: "cup", diff: 1, base: "cup", plural: "cups", count: "count", art: "a", topics: ["home", "food"], tags: ["container", "kitchen"], typed: ["cup", "cups"], media: "cup", ex: "There are two clean cups." }),

  // ---------- D ----------
  E({ id: "day", lemma: "day", diff: 1, base: "day", plural: "days", count: "count", art: "a", topics: ["time"], tags: ["time_period"], typed: ["day", "days"], media: "day", ex: "They eat rice every day." }),
  E({ id: "desk", lemma: "desk", diff: 1, base: "desk", plural: "desks", count: "count", art: "a", topics: ["school", "furniture"], tags: ["work_surface"], typed: ["desk", "desks"], media: "desk", ex: "Clean the desk." }),
  E({ id: "dish", lemma: "dish", diff: 2, base: "dish", plural: "dishes", count: "count", art: "a", topics: ["home", "food"], tags: ["dishware", "kitchen"], typed: ["dish", "dishes"], media: "dish", ex: "She is washing the dishes." }),
  E({ id: "doctor", lemma: "doctor", diff: 2, base: "doctor", plural: "doctors", count: "count", art: "a", topics: ["jobs", "people"], tags: ["profession", "medical"], typed: ["doctor", "doctors"], media: "doctor", ex: "There are two doctors in the office." }),
  E({ id: "dog", lemma: "dog", diff: 1, base: "dog", plural: "dogs", count: "count", art: "a", topics: ["animals"], tags: ["pet"], typed: ["dog", "dogs"], media: "dog", ex: "I see one hungry dog." }),
  E({ id: "doll", lemma: "doll", diff: 2, base: "doll", plural: "dolls", count: "count", art: "a", topics: ["toys"], tags: ["figure", "play"], typed: ["doll", "dolls"], media: "doll", ex: "She loves her doll." }),
  E({ id: "door", lemma: "door", diff: 1, base: "door", plural: "doors", count: "count", art: "a", topics: ["home", "objects"], tags: ["entry"], typed: ["door", "doors"], media: "door", ex: "The cat is behind the door." }),
  E({ id: "drawer", lemma: "drawer", diff: 3, base: "drawer", plural: "drawers", count: "count", art: "a", topics: ["home", "furniture"], tags: ["storage"], typed: ["drawer", "drawers"], media: "drawer", ex: "There are four pens in the drawer." }),
  E({ id: "drawing", lemma: "drawing", diff: 2, base: "drawing", plural: "drawings", count: "count", art: "a", topics: ["art", "school"], tags: ["picture", "paper"], typed: ["drawing", "drawings"], media: "drawing", ex: "These are her drawings." }),
  E({ id: "drink", lemma: "drink", diff: 2, base: "drink", plural: "drinks", count: "count", art: "a", topics: ["food", "drinks"], tags: ["beverage"], typed: ["drink", "drinks"], media: "drink", ex: "I see a cold drink.", notes: "Also a verb \u2014 separate entry id 'drink_verb' if/when added." }),
  E({ id: "drum", lemma: "drum", diff: 2, base: "drum", plural: "drums", count: "count", art: "a", topics: ["music"], tags: ["instrument", "percussion"], typed: ["drum", "drums"], media: "drum" }),
  E({ id: "duck", lemma: "duck", diff: 1, base: "duck", plural: "ducks", count: "count", art: "a", topics: ["animals", "nature"], tags: ["bird", "water_animal"], typed: ["duck", "ducks"], media: "duck", ex: "There is a small duck." }),

  // ---------- E ----------
  E({ id: "egg", lemma: "egg", diff: 1, base: "egg", plural: "eggs", count: "count", art: "an", topics: ["food"], tags: ["edible", "breakfast"], typed: ["egg", "eggs"], media: "egg", ex: "She has five fresh eggs." }),
  E({ id: "eraser", lemma: "eraser", diff: 2, base: "eraser", plural: "erasers", count: "count", art: "an", topics: ["school"], tags: ["stationery"], typed: ["eraser", "erasers", "rubber"], media: "eraser", ex: "She needs a new eraser." }),
  E({ id: "evening", lemma: "evening", diff: 1, base: "evening", plural: "evenings", count: "count", art: "an", topics: ["time"], tags: ["time_of_day"], typed: ["evening", "evenings"], media: "evening", ex: "She always draws in the evening." }),
  E({ id: "exit", lemma: "exit", diff: 3, base: "exit", plural: "exits", count: "count", art: "an", topics: ["places"], tags: ["way_out", "sign"], typed: ["exit", "exits"], media: "exit", ex: "We sit next to the exit." }),
  E({ id: "eye", lemma: "eye", diff: 1, base: "eye", plural: "eyes", count: "count", art: "an", topics: ["body"], tags: ["face", "body_part"], typed: ["eye", "eyes"], media: "eye", ex: "Close your eyes." }),

  // ---------- F ----------
  E({ id: "father", lemma: "father", diff: 1, base: "father", plural: "fathers", count: "count", art: "a", topics: ["family", "people"], tags: ["parent", "male"], typed: ["father", "fathers", "dad", "dads"], media: "father", ex: "My father has a phone." }),
  E({ id: "fish", lemma: "fish", diff: 1, base: "fish", plural: "fish", count: "both", art: "a", topics: ["animals", "food", "nature"], tags: ["water_animal", "edible"], typed: ["fish"], media: "fish", ex: "I have seven small orange fish.", ipl: true, notes: "Same form for singular and plural ('three fish')." }),
  E({ id: "flat", lemma: "flat", diff: 2, base: "flat", plural: "flats", count: "count", art: "a", topics: ["home", "places"], tags: ["dwelling"], typed: ["flat", "flats", "apartment", "apartments"], media: "flat", ex: "She lives in a flat.", notes: "British English for apartment; also an adjective in other contexts." }),
  E({ id: "floor", lemma: "floor", diff: 1, base: "floor", plural: "floors", count: "count", art: "a", topics: ["home", "places"], tags: ["surface"], typed: ["floor", "floors"], media: "floor", ex: "The bag is on the floor." }),
  E({ id: "flower", lemma: "flower", diff: 1, base: "flower", plural: "flowers", count: "count", art: "a", topics: ["nature"], tags: ["plant"], typed: ["flower", "flowers"], media: "flower", ex: "I see a pink flower." }),
  E({ id: "flute", lemma: "flute", diff: 2, base: "flute", plural: "flutes", count: "count", art: "a", topics: ["music"], tags: ["instrument"], typed: ["flute", "flutes"], media: "flute" }),
  E({ id: "folder", lemma: "folder", diff: 2, base: "folder", plural: "folders", count: "count", art: "a", topics: ["school"], tags: ["stationery", "storage"], typed: ["folder", "folders"], media: "folder" }),
  E({ id: "food", lemma: "food", diff: 1, base: "food", count: "mass", art: "none", topics: ["food"], tags: ["edible"], typed: ["food"], media: "food", ex: "We do not like cold food.", notes: "Mass noun \u2014 avoid 'a food' / 'foods' in generated frames." }),
  E({ id: "football", lemma: "football", diff: 1, base: "football", plural: "footballs", count: "both", art: "a", topics: ["sports"], tags: ["ball_game"], typed: ["football", "footballs", "soccer"], media: "football", ex: "Do they play football?", notes: "Mass when referring to the sport ('play football'); count for the ball ('a football')." }),
  E({ id: "fridge", lemma: "fridge", diff: 2, base: "fridge", plural: "fridges", count: "count", art: "a", topics: ["home", "kitchen"], tags: ["appliance"], typed: ["fridge", "fridges", "refrigerator", "refrigerators"], media: "fridge", ex: "The milk is in the fridge." }),
  E({ id: "friend", lemma: "friend", diff: 1, base: "friend", plural: "friends", count: "count", art: "a", topics: ["people"], tags: ["relationship"], typed: ["friend", "friends"], media: "friend", ex: "She has a kind friend." }),
  E({ id: "fries", lemma: "fries", diff: 2, base: "fries", plural: "fries", count: "count", art: "none", topics: ["food"], tags: ["edible", "fast_food"], typed: ["fries", "chips", "french fries"], media: "fries", ipl: true, notes: "Plural-only noun; use with 'some'/'the'/numbers, never 'a fries'." }),
  E({ id: "fruit", lemma: "fruit", diff: 1, base: "fruit", plural: "fruits", count: "both", art: "none", topics: ["food"], tags: ["edible"], typed: ["fruit", "fruits"], media: "fruit", ex: "They sometimes eat fruit.", notes: "At A1 typically used as mass ('eat fruit'); 'fruits' is rarer." }),

  // ---------- G ----------
  E({ id: "game", lemma: "game", diff: 1, base: "game", plural: "games", count: "count", art: "a", topics: ["play", "games"], tags: ["activity"], typed: ["game", "games"], media: "game", ex: "They are playing a game." }),
  E({ id: "garden", lemma: "garden", diff: 2, base: "garden", plural: "gardens", count: "count", art: "a", topics: ["home", "nature"], tags: ["outdoor_place", "plants"], typed: ["garden", "gardens"], media: "garden", ex: "We love our garden." }),
  E({ id: "gate", lemma: "gate", diff: 2, base: "gate", plural: "gates", count: "count", art: "a", topics: ["home", "places"], tags: ["entry"], typed: ["gate", "gates"], media: "gate", ex: "She is closing the gate." }),
  E({ id: "girl", lemma: "girl", diff: 1, base: "girl", plural: "girls", count: "count", art: "a", topics: ["people"], tags: ["child", "female"], typed: ["girl", "girls"], media: "girl", ex: "I see a happy girl." }),
  E({ id: "goal", lemma: "goal", diff: 2, base: "goal", plural: "goals", count: "count", art: "a", topics: ["sports"], tags: ["target", "score"], typed: ["goal", "goals"], media: "goal" }),
  E({ id: "golf", lemma: "golf", diff: 2, base: "golf", count: "mass", art: "none", topics: ["sports"], tags: ["ball_game"], typed: ["golf"], media: "golf", notes: "Mass noun \u2014 'play golf', never 'a golf'." }),
  E({ id: "grandfather", lemma: "grandfather", diff: 2, base: "grandfather", plural: "grandfathers", count: "count", art: "a", topics: ["family", "people"], tags: ["relative", "male", "elder"], typed: ["grandfather", "grandfathers", "grandpa", "granddad"], media: "grandfather", ex: "His grandfather has a cane." }),
  E({ id: "grape", lemma: "grape", diff: 2, base: "grape", plural: "grapes", count: "count", art: "a", topics: ["food"], tags: ["fruit", "edible"], typed: ["grape", "grapes"], media: "grape", ex: "I see a purple grape." }),
  E({ id: "grass", lemma: "grass", diff: 2, base: "grass", count: "mass", art: "none", topics: ["nature"], tags: ["plant", "ground_cover"], typed: ["grass"], media: "grass", ex: "Sit on the grass.", notes: "Mass noun \u2014 avoid 'a grass' / 'grasses' in generated frames." }),
  E({ id: "guitar", lemma: "guitar", diff: 1, base: "guitar", plural: "guitars", count: "count", art: "a", topics: ["music"], tags: ["instrument", "string"], typed: ["guitar", "guitars"], media: "guitar", ex: "Can he play the guitar?" }),

  // ---------- H ----------
  E({ id: "hall", lemma: "hall", diff: 2, base: "hall", plural: "halls", count: "count", art: "a", topics: ["school", "home", "places"], tags: ["corridor"], typed: ["hall", "halls", "hallway", "hallways"], media: "hall", ex: "We never run in the hall." }),
  E({ id: "hamster", lemma: "hamster", diff: 2, base: "hamster", plural: "hamsters", count: "count", art: "a", topics: ["animals"], tags: ["pet", "small_animal"], typed: ["hamster", "hamsters"], media: "hamster", ex: "She has three happy hamsters." }),
  E({ id: "hand", lemma: "hand", diff: 1, base: "hand", plural: "hands", count: "count", art: "a", topics: ["body"], tags: ["body_part"], typed: ["hand", "hands"], media: "hand", ex: "Give me your hand." }),
  E({ id: "hat", lemma: "hat", diff: 1, base: "hat", plural: "hats", count: "count", art: "a", topics: ["clothes"], tags: ["accessory", "headwear"], typed: ["hat", "hats"], media: "hat", ex: "He always wears a hat." }),
  E({ id: "home", lemma: "home", diff: 1, base: "home", plural: "homes", count: "count", art: "a", topics: ["home", "places"], tags: ["dwelling"], typed: ["home", "homes"], media: "home", ex: "They are at home.", notes: "Often used adverbially ('go home'); separate 'home_adv' entry if/when adverbs are added." }),
  E({ id: "house", lemma: "house", diff: 1, base: "house", plural: "houses", count: "count", art: "a", topics: ["home", "places"], tags: ["dwelling"], typed: ["house", "houses"], media: "house", ex: "It is a big house." }),

  // ---------- J ----------
  E({ id: "jacket", lemma: "jacket", diff: 2, base: "jacket", plural: "jackets", count: "count", art: "a", topics: ["clothes"], tags: ["outerwear", "warm"], typed: ["jacket", "jackets"], media: "jacket" }),
  E({ id: "joke", lemma: "joke", diff: 2, base: "joke", plural: "jokes", count: "count", art: "a", topics: ["communication", "people"], tags: ["speech", "humor"], typed: ["joke", "jokes"], media: "joke", ex: "He is telling a joke." }),
  E({ id: "juice", lemma: "juice", diff: 1, base: "juice", count: "mass", art: "none", topics: ["food", "drinks"], tags: ["beverage"], typed: ["juice"], media: "juice", ex: "Do you like juice?", notes: "Mass noun \u2014 'some juice', avoid 'a juice' in A1 frames." }),

  // ---------- K ----------
  E({ id: "key", lemma: "key", diff: 2, base: "key", plural: "keys", count: "count", art: "a", topics: ["home", "objects"], tags: ["device", "small_object"], typed: ["key", "keys"], media: "key", ex: "The keys are in the bowl." }),
  E({ id: "kitchen", lemma: "kitchen", diff: 2, base: "kitchen", plural: "kitchens", count: "count", art: "a", topics: ["home", "places"], tags: ["room"], typed: ["kitchen", "kitchens"], media: "kitchen", ex: "I am in the kitchen." }),
  E({ id: "kite", lemma: "kite", diff: 2, base: "kite", plural: "kites", count: "count", art: "a", topics: ["toys", "play"], tags: ["outdoor_play"], typed: ["kite", "kites"], media: "kite", ex: "He has a new kite." }),
  E({ id: "kitten", lemma: "kitten", diff: 2, base: "kitten", plural: "kittens", count: "count", art: "a", topics: ["animals"], tags: ["pet", "small_animal", "baby_animal"], typed: ["kitten", "kittens"], media: "kitten", ex: "The kitten is playing with yarn." }),

  // ---------- L ----------
  E({ id: "lamp", lemma: "lamp", diff: 2, base: "lamp", plural: "lamps", count: "count", art: "a", topics: ["home"], tags: ["light_source"], typed: ["lamp", "lamps"], media: "lamp", ex: "The book is next to the lamp." }),
  E({ id: "letter", lemma: "letter", diff: 2, base: "letter", plural: "letters", count: "count", art: "a", topics: ["communication", "school"], tags: ["writing", "paper"], typed: ["letter", "letters"], media: "letter", ex: "The girl writes a letter." }),
  E({ id: "library", lemma: "library", diff: 2, base: "library", plural: "libraries", count: "count", art: "a", topics: ["school", "places"], tags: ["place", "books"], typed: ["library", "libraries"], media: "library", ex: "I go to the library.", ipl: true, notes: "y \u2192 ies plural rule." }),
  E({ id: "light", lemma: "light", diff: 2, base: "light", plural: "lights", count: "both", art: "a", topics: ["home", "objects"], tags: ["light_source"], typed: ["light", "lights"], media: "light", ex: "Turn off the light.", notes: "Count for fixtures ('a light'); mass for the phenomenon ('the light')." }),
  E({ id: "lunch", lemma: "lunch", diff: 1, base: "lunch", plural: "lunches", count: "both", art: "none", topics: ["food"], tags: ["meal"], typed: ["lunch", "lunches"], media: "lunch", ex: "This is our lunch.", notes: "Usually mass ('have lunch'); count for individual servings." }),

  // ---------- M ----------
  E({ id: "man", lemma: "man", diff: 1, base: "man", plural: "men", count: "count", art: "a", topics: ["people"], tags: ["adult", "male"], typed: ["man", "men"], media: "man", ex: "Who is that man?", ipl: true, notes: "Irregular plural 'men'." }),
  E({ id: "map", lemma: "map", diff: 2, base: "map", plural: "maps", count: "count", art: "a", topics: ["school", "objects"], tags: ["paper", "geography"], typed: ["map", "maps"], media: "map", ex: "Look at the map." }),
  E({ id: "marker", lemma: "marker", diff: 2, base: "marker", plural: "markers", count: "count", art: "a", topics: ["school", "art"], tags: ["art_supply", "stationery"], typed: ["marker", "markers"], media: "marker", ex: "She has two yellow markers." }),
  E({ id: "mat", lemma: "mat", diff: 2, base: "mat", plural: "mats", count: "count", art: "a", topics: ["home", "objects"], tags: ["floor_covering"], typed: ["mat", "mats"], media: "mat", ex: "Sit on the mat." }),
  E({ id: "milk", lemma: "milk", diff: 1, base: "milk", count: "mass", art: "none", topics: ["food", "drinks"], tags: ["dairy", "beverage"], typed: ["milk"], media: "milk", ex: "He drinks milk.", notes: "Mass noun \u2014 avoid 'a milk' / 'milks' in generated frames." }),
  E({ id: "mirror", lemma: "mirror", diff: 2, base: "mirror", plural: "mirrors", count: "count", art: "a", topics: ["home", "objects"], tags: ["glass", "reflection"], typed: ["mirror", "mirrors"], media: "mirror", ex: "That is her mirror." }),
  E({ id: "moon", lemma: "moon", diff: 2, base: "moon", plural: "moons", count: "count", art: "a", topics: ["nature"], tags: ["sky", "celestial"], typed: ["moon", "moons"], media: "moon", notes: "Earth's moon usually used with 'the' ('the moon')." }),
  E({ id: "morning", lemma: "morning", diff: 1, base: "morning", plural: "mornings", count: "count", art: "a", topics: ["time"], tags: ["time_of_day"], typed: ["morning", "mornings"], media: "morning", ex: "She always reads in the morning." }),
  E({ id: "mother", lemma: "mother", diff: 1, base: "mother", plural: "mothers", count: "count", art: "a", topics: ["family", "people"], tags: ["parent", "female"], typed: ["mother", "mothers", "mom", "mum", "moms"], media: "mother", ex: "Her mother has a phone." }),
  E({ id: "mouth", lemma: "mouth", diff: 1, base: "mouth", plural: "mouths", count: "count", art: "a", topics: ["body"], tags: ["face", "body_part"], typed: ["mouth", "mouths"], media: "mouth" }),
  E({ id: "movie", lemma: "movie", diff: 2, base: "movie", plural: "movies", count: "count", art: "a", topics: ["entertainment"], tags: ["film"], typed: ["movie", "movies", "film", "films"], media: "movie", ex: "We are watching a movie." }),
  E({ id: "music", lemma: "music", diff: 1, base: "music", count: "mass", art: "none", topics: ["music"], tags: ["art", "sound"], typed: ["music"], media: "music", ex: "Listen to the music.", notes: "Mass noun \u2014 avoid 'a music' / 'musics' in generated frames." }),

  // ---------- N ----------
  E({ id: "name", lemma: "name", diff: 1, base: "name", plural: "names", count: "count", art: "a", topics: ["communication"], tags: ["identity"], typed: ["name", "names"], media: "name", ex: "What is your name?" }),
  E({ id: "net", lemma: "net", diff: 2, base: "net", plural: "nets", count: "count", art: "a", topics: ["sports", "objects"], tags: ["mesh"], typed: ["net", "nets"], media: "net" }),
  E({ id: "night", lemma: "night", diff: 1, base: "night", plural: "nights", count: "count", art: "a", topics: ["time"], tags: ["time_of_day"], typed: ["night", "nights"], media: "night", ex: "He usually eats rice at night." }),
  E({ id: "noise", lemma: "noise", diff: 2, base: "noise", plural: "noises", count: "both", art: "a", topics: ["sound"], tags: ["loud"], typed: ["noise", "noises"], media: "noise", ex: "What is that noise?", notes: "Count for individual sounds; mass for noise in general ('a lot of noise')." }),
  E({ id: "noodle", lemma: "noodle", diff: 2, base: "noodle", plural: "noodles", count: "count", art: "a", topics: ["food"], tags: ["edible", "staple"], typed: ["noodle", "noodles"], media: "noodle", notes: "Almost always plural ('some noodles')." }),
  E({ id: "noon", lemma: "noon", diff: 2, base: "noon", count: "mass", art: "none", topics: ["time"], tags: ["time_of_day"], typed: ["noon"], media: "noon", ex: "He usually eats fruit at noon.", notes: "Mass-like; used in 'at noon', no article." }),
  E({ id: "nose", lemma: "nose", diff: 1, base: "nose", plural: "noses", count: "count", art: "a", topics: ["body"], tags: ["face", "body_part"], typed: ["nose", "noses"], media: "nose", ex: "It has a small nose." }),
  E({ id: "note", lemma: "note", diff: 2, base: "note", plural: "notes", count: "count", art: "a", topics: ["communication", "school"], tags: ["paper", "writing"], typed: ["note", "notes"], media: "note", ex: "The note is on the fridge." }),
  E({ id: "notebook", lemma: "notebook", diff: 2, base: "notebook", plural: "notebooks", count: "count", art: "a", topics: ["school"], tags: ["paper", "stationery"], typed: ["notebook", "notebooks"], media: "notebook" }),

  // ---------- O ----------
  E({ id: "office", lemma: "office", diff: 2, base: "office", plural: "offices", count: "count", art: "an", topics: ["places", "jobs"], tags: ["work_place"], typed: ["office", "offices"], media: "office", ex: "There are two doctors in the office." }),
  E({ id: "orange", lemma: "orange", diff: 1, base: "orange", plural: "oranges", count: "count", art: "an", topics: ["food"], tags: ["fruit", "edible"], typed: ["orange", "oranges"], media: "orange", ex: "I see an orange.", notes: "Also a color adjective \u2014 separate entry id 'orange_adj' if/when adjectives are added." }),

  // ---------- P ----------
  E({ id: "paper", lemma: "paper", diff: 1, base: "paper", plural: "papers", count: "both", art: "none", topics: ["school", "art"], tags: ["material", "writing"], typed: ["paper", "papers"], media: "paper", ex: "This is your paper.", notes: "Usually mass ('some paper'); count for sheets/essays ('a paper')." }),
  E({ id: "park", lemma: "park", diff: 1, base: "park", plural: "parks", count: "count", art: "a", topics: ["places"], tags: ["outdoor", "play_place"], typed: ["park", "parks"], media: "park", ex: "I go to the park." }),
  E({ id: "peach", lemma: "peach", diff: 2, base: "peach", plural: "peaches", count: "count", art: "a", topics: ["food"], tags: ["fruit", "edible"], typed: ["peach", "peaches"], media: "peach" }),
  E({ id: "pear", lemma: "pear", diff: 2, base: "pear", plural: "pears", count: "count", art: "a", topics: ["food"], tags: ["fruit", "edible"], typed: ["pear", "pears"], media: "pear", ex: "There are four pears in the bowl." }),
  E({ id: "pen", lemma: "pen", diff: 1, base: "pen", plural: "pens", count: "count", art: "a", topics: ["school", "objects"], tags: ["stationery", "writing"], typed: ["pen", "pens"], media: "pen", ex: "He has a blue pen." }),
  E({ id: "pencil", lemma: "pencil", diff: 1, base: "pencil", plural: "pencils", count: "count", art: "a", topics: ["school", "objects"], tags: ["stationery", "writing"], typed: ["pencil", "pencils"], media: "pencil", ex: "There is a long pencil." }),
  E({ id: "phone", lemma: "phone", diff: 1, base: "phone", plural: "phones", count: "count", art: "a", topics: ["objects", "communication"], tags: ["device"], typed: ["phone", "phones", "telephone", "telephones"], media: "phone", ex: "Her mother has a phone." }),
  E({ id: "piano", lemma: "piano", diff: 2, base: "piano", plural: "pianos", count: "count", art: "a", topics: ["music"], tags: ["instrument"], typed: ["piano", "pianos"], media: "piano" }),
  E({ id: "picture", lemma: "picture", diff: 1, base: "picture", plural: "pictures", count: "count", art: "a", topics: ["art", "objects"], tags: ["image"], typed: ["picture", "pictures"], media: "picture", ex: "Color the picture." }),
  E({ id: "pineapple", lemma: "pineapple", diff: 2, base: "pineapple", plural: "pineapples", count: "count", art: "a", topics: ["food"], tags: ["fruit", "edible"], typed: ["pineapple", "pineapples"], media: "pineapple" }),
  E({ id: "pizza", lemma: "pizza", diff: 1, base: "pizza", plural: "pizzas", count: "both", art: "a", topics: ["food"], tags: ["edible", "fast_food"], typed: ["pizza", "pizzas"], media: "pizza", ex: "Do you like pizza?", notes: "Mass when generic ('eat pizza'); count for individual pies." }),
  E({ id: "plane", lemma: "plane", diff: 1, base: "plane", plural: "planes", count: "count", art: "a", topics: ["transport"], tags: ["vehicle", "flying"], typed: ["plane", "planes", "airplane", "airplanes"], media: "plane", ex: "He likes fast planes." }),
  E({ id: "plate", lemma: "plate", diff: 2, base: "plate", plural: "plates", count: "count", art: "a", topics: ["home", "food"], tags: ["dishware", "kitchen"], typed: ["plate", "plates"], media: "plate", ex: "The cake is on the plate." }),
  E({ id: "pocket", lemma: "pocket", diff: 2, base: "pocket", plural: "pockets", count: "count", art: "a", topics: ["clothes"], tags: ["container"], typed: ["pocket", "pockets"], media: "pocket", ex: "The candy is in my pocket." }),
  E({ id: "poster", lemma: "poster", diff: 2, base: "poster", plural: "posters", count: "count", art: "a", topics: ["art", "school"], tags: ["paper", "wall_decoration"], typed: ["poster", "posters"], media: "poster", ex: "The poster is on the wall." }),

  // ---------- R ----------
  E({ id: "rice", lemma: "rice", diff: 1, base: "rice", count: "mass", art: "none", topics: ["food"], tags: ["edible", "staple", "grain"], typed: ["rice"], media: "rice", ex: "They eat rice every day.", notes: "Mass noun \u2014 avoid 'a rice' / 'rices' in generated frames." }),
  E({ id: "room", lemma: "room", diff: 1, base: "room", plural: "rooms", count: "count", art: "a", topics: ["home", "places"], tags: ["interior_space"], typed: ["room", "rooms"], media: "room", ex: "I am standing in the room." }),
  E({ id: "rope", lemma: "rope", diff: 2, base: "rope", plural: "ropes", count: "both", art: "a", topics: ["objects", "sports"], tags: ["cord"], typed: ["rope", "ropes"], media: "rope", ex: "The girls jump rope.", notes: "Mass when generic ('jump rope'); count for individual ropes." }),
  E({ id: "rug", lemma: "rug", diff: 2, base: "rug", plural: "rugs", count: "count", art: "a", topics: ["home"], tags: ["floor_covering"], typed: ["rug", "rugs"], media: "rug", ex: "The rug is under the bed." }),
  E({ id: "ruler", lemma: "ruler", diff: 2, base: "ruler", plural: "rulers", count: "count", art: "a", topics: ["school", "objects"], tags: ["stationery", "measure"], typed: ["ruler", "rulers"], media: "ruler", ex: "The ruler is next to the pen." }),

  // ---------- S ----------
  E({ id: "sandwich", lemma: "sandwich", diff: 1, base: "sandwich", plural: "sandwiches", count: "count", art: "a", topics: ["food"], tags: ["edible", "meal"], typed: ["sandwich", "sandwiches"], media: "sandwich", ex: "You are making a sandwich." }),
  E({ id: "school", lemma: "school", diff: 1, base: "school", plural: "schools", count: "both", art: "a", topics: ["school", "places"], tags: ["place", "education"], typed: ["school", "schools"], media: "school", ex: "I go to school.", notes: "Mass when generic ('go to school'); count for individual schools." }),
  E({ id: "sentence", lemma: "sentence", diff: 2, base: "sentence", plural: "sentences", count: "count", art: "a", topics: ["communication", "school"], tags: ["language"], typed: ["sentence", "sentences"], media: "sentence", ex: "Read the sentence." }),
  E({ id: "shelf", lemma: "shelf", diff: 2, base: "shelf", plural: "shelves", count: "count", art: "a", topics: ["home", "furniture"], tags: ["storage"], typed: ["shelf", "shelves"], media: "shelf", ex: "The hat is on the shelf.", ipl: true, notes: "Irregular plural 'shelves' (f \u2192 ves)." }),
  E({ id: "shirt", lemma: "shirt", diff: 1, base: "shirt", plural: "shirts", count: "count", art: "a", topics: ["clothes"], tags: ["upper_body"], typed: ["shirt", "shirts"], media: "shirt", ex: "He is wearing a red shirt." }),
  E({ id: "shoe", lemma: "shoe", diff: 1, base: "shoe", plural: "shoes", count: "count", art: "a", topics: ["clothes"], tags: ["footwear"], typed: ["shoe", "shoes"], media: "shoe", ex: "The shoe is on the mat." }),
  E({ id: "shop", lemma: "shop", diff: 2, base: "shop", plural: "shops", count: "count", art: "a", topics: ["places"], tags: ["store"], typed: ["shop", "shops", "store", "stores"], media: "shop", ex: "He walks to the shop." }),
  E({ id: "sister", lemma: "sister", diff: 1, base: "sister", plural: "sisters", count: "count", art: "a", topics: ["family", "people"], tags: ["sibling", "female"], typed: ["sister", "sisters"], media: "sister", ex: "I usually play with my sister." }),
  E({ id: "sky", lemma: "sky", diff: 2, base: "sky", plural: "skies", count: "both", art: "a", topics: ["nature", "weather"], tags: ["above"], typed: ["sky", "skies"], media: "sky", ex: "There are two birds in the sky.", ipl: true, notes: "Usually 'the sky' (singular)." }),
  E({ id: "smile", lemma: "smile", diff: 2, base: "smile", plural: "smiles", count: "count", art: "a", topics: ["body", "emotions"], tags: ["face", "expression"], typed: ["smile", "smiles"], media: "smile", ex: "She always has a smile.", notes: "Also a verb \u2014 separate entry id 'smile_verb' if/when added." }),
  E({ id: "soda", lemma: "soda", diff: 1, base: "soda", count: "mass", art: "none", topics: ["food", "drinks"], tags: ["beverage", "sweet"], typed: ["soda", "pop"], media: "soda", ex: "He never drinks soda.", notes: "Mass noun in A1; 'a soda' (a can) is context-only count usage." }),
  E({ id: "sofa", lemma: "sofa", diff: 2, base: "sofa", plural: "sofas", count: "count", art: "a", topics: ["home", "furniture"], tags: ["seat"], typed: ["sofa", "sofas", "couch", "couches"], media: "sofa", ex: "The toy is under the sofa." }),
  E({ id: "song", lemma: "song", diff: 1, base: "song", plural: "songs", count: "count", art: "a", topics: ["music", "communication"], tags: ["audio"], typed: ["song", "songs"], media: "song", ex: "They sing a song." }),
  E({ id: "soup", lemma: "soup", diff: 1, base: "soup", plural: "soups", count: "both", art: "a", topics: ["food"], tags: ["edible", "liquid"], typed: ["soup", "soups"], media: "soup", ex: "He eats soup now.", notes: "Usually mass ('some soup'); count for varieties ('a soup')." }),
  E({ id: "spider", lemma: "spider", diff: 2, base: "spider", plural: "spiders", count: "count", art: "a", topics: ["animals", "nature"], tags: ["arachnid", "small_animal"], typed: ["spider", "spiders"], media: "spider", ex: "She does not like spiders." }),
  E({ id: "sport", lemma: "sport", diff: 2, base: "sport", plural: "sports", count: "count", art: "a", topics: ["sports"], tags: ["activity"], typed: ["sport", "sports"], media: "sport" }),
  E({ id: "squirrel", lemma: "squirrel", diff: 3, base: "squirrel", plural: "squirrels", count: "count", art: "a", topics: ["animals", "nature"], tags: ["small_animal"], typed: ["squirrel", "squirrels"], media: "squirrel", ex: "We sometimes see a squirrel." }),
  E({ id: "sticker", lemma: "sticker", diff: 2, base: "sticker", plural: "stickers", count: "count", art: "a", topics: ["school", "art", "objects"], tags: ["paper"], typed: ["sticker", "stickers"], media: "sticker", ex: "She has nine new stickers." }),
  E({ id: "story", lemma: "story", diff: 2, base: "story", plural: "stories", count: "count", art: "a", topics: ["communication", "entertainment"], tags: ["narrative"], typed: ["story", "stories"], media: "story", ex: "He is reading a story.", ipl: true, notes: "y \u2192 ies plural rule." }),
  E({ id: "student", lemma: "student", diff: 1, base: "student", plural: "students", count: "count", art: "a", topics: ["school", "people"], tags: ["learner"], typed: ["student", "students"], media: "student", ex: "The student is smart." }),
  E({ id: "sun", lemma: "sun", diff: 1, base: "sun", plural: "suns", count: "count", art: "a", topics: ["nature", "weather"], tags: ["sky", "celestial"], typed: ["sun", "suns"], media: "sun", ex: "I see a bright sun.", notes: "Earth's sun usually used with 'the' ('the sun')." }),
  E({ id: "sweater", lemma: "sweater", diff: 2, base: "sweater", plural: "sweaters", count: "count", art: "a", topics: ["clothes"], tags: ["outerwear", "warm"], typed: ["sweater", "sweaters", "jumper", "jumpers"], media: "sweater", ex: "You usually wear a sweater." }),

  // ---------- T ----------
  E({ id: "table", lemma: "table", diff: 1, base: "table", plural: "tables", count: "count", art: "a", topics: ["furniture", "home"], tags: ["surface"], typed: ["table", "tables"], media: "table", ex: "I see an old table." }),
  E({ id: "tail", lemma: "tail", diff: 2, base: "tail", plural: "tails", count: "count", art: "a", topics: ["animals", "body"], tags: ["body_part"], typed: ["tail", "tails"], media: "tail", ex: "It has a long tail." }),
  E({ id: "teacher", lemma: "teacher", diff: 1, base: "teacher", plural: "teachers", count: "count", art: "a", topics: ["school", "people", "jobs"], tags: ["profession", "education"], typed: ["teacher", "teachers"], media: "teacher", ex: "Listen to the teacher." }),
  E({ id: "tennis", lemma: "tennis", diff: 2, base: "tennis", count: "mass", art: "none", topics: ["sports"], tags: ["ball_game"], typed: ["tennis"], media: "tennis", notes: "Mass noun \u2014 'play tennis', never 'a tennis'." }),
  E({ id: "tooth", lemma: "tooth", diff: 1, base: "tooth", plural: "teeth", count: "count", art: "a", topics: ["body"], tags: ["mouth", "body_part"], typed: ["tooth", "teeth"], media: "tooth", ex: "I always brush my teeth.", ipl: true, notes: "Irregular plural 'teeth'." }),
  E({ id: "tower", lemma: "tower", diff: 2, base: "tower", plural: "towers", count: "count", art: "a", topics: ["objects", "places"], tags: ["structure", "tall"], typed: ["tower", "towers"], media: "tower", ex: "We can build a tower." }),
  E({ id: "toy", lemma: "toy", diff: 1, base: "toy", plural: "toys", count: "count", art: "a", topics: ["toys", "play"], tags: ["plaything"], typed: ["toy", "toys"], media: "toy", ex: "He has one new toy." }),
  E({ id: "tree", lemma: "tree", diff: 1, base: "tree", plural: "trees", count: "count", art: "a", topics: ["nature"], tags: ["plant"], typed: ["tree", "trees"], media: "tree", ex: "He sits under the tree." }),
  E({ id: "trumpet", lemma: "trumpet", diff: 2, base: "trumpet", plural: "trumpets", count: "count", art: "a", topics: ["music"], tags: ["instrument", "brass"], typed: ["trumpet", "trumpets"], media: "trumpet" }),
  E({ id: "turtle", lemma: "turtle", diff: 2, base: "turtle", plural: "turtles", count: "count", art: "a", topics: ["animals", "nature"], tags: ["water_animal", "reptile"], typed: ["turtle", "turtles"], media: "turtle", ex: "I see five slow turtles." }),
  E({ id: "tv", lemma: "TV", diff: 1, base: "TV", plural: "TVs", count: "count", art: "a", topics: ["entertainment", "home"], tags: ["device", "electronics"], typed: ["TV", "TVs", "television", "televisions"], media: "tv", display: "TV", ex: "She does not watch TV." }),

  // ---------- V ----------
  E({ id: "violin", lemma: "violin", diff: 2, base: "violin", plural: "violins", count: "count", art: "a", topics: ["music"], tags: ["instrument", "string"], typed: ["violin", "violins"], media: "violin" }),

  // ---------- W ----------
  E({ id: "wall", lemma: "wall", diff: 1, base: "wall", plural: "walls", count: "count", art: "a", topics: ["home", "objects"], tags: ["surface", "structure"], typed: ["wall", "walls"], media: "wall", ex: "The bird is on the wall." }),
  E({ id: "water", lemma: "water", diff: 1, base: "water", count: "mass", art: "none", topics: ["food", "drinks", "nature"], tags: ["beverage", "liquid"], typed: ["water"], media: "water", ex: "He drinks water now.", notes: "Mass noun \u2014 avoid 'a water' / 'waters' in A1 frames." }),
  E({ id: "watermelon", lemma: "watermelon", diff: 2, base: "watermelon", plural: "watermelons", count: "both", art: "a", topics: ["food"], tags: ["fruit", "edible"], typed: ["watermelon", "watermelons"], media: "watermelon", notes: "Original CSV had typo 'watermellon' \u2014 normalize to 'watermelon'." }),
  E({ id: "weather", lemma: "weather", diff: 2, base: "weather", count: "mass", art: "none", topics: ["nature", "weather"], tags: ["climate"], typed: ["weather"], media: "weather", ex: "How is the weather?", notes: "Mass noun \u2014 avoid 'a weather' / 'weathers' in generated frames." }),
  E({ id: "window", lemma: "window", diff: 1, base: "window", plural: "windows", count: "count", art: "a", topics: ["home", "objects"], tags: ["opening", "glass"], typed: ["window", "windows"], media: "window", ex: "Open the window." }),
  E({ id: "word", lemma: "word", diff: 1, base: "word", plural: "words", count: "count", art: "a", topics: ["communication", "school"], tags: ["language"], typed: ["word", "words"], media: "word", ex: "Read the word." }),

  // ---------- Y ----------
  E({ id: "yard", lemma: "yard", diff: 2, base: "yard", plural: "yards", count: "count", art: "a", topics: ["home", "places"], tags: ["outdoor"], typed: ["yard", "yards"], media: "yard", ex: "There are eight boys in the yard." }),
  E({ id: "yarn", lemma: "yarn", diff: 3, base: "yarn", count: "mass", art: "none", topics: ["objects", "art"], tags: ["thread"], typed: ["yarn"], media: "yarn", ex: "The kitten is playing with yarn.", notes: "Mass noun \u2014 avoid 'a yarn' / 'yarns' in generated frames." }),
];

const VERB_ENTRIES = [
  E({ id: "be", lemma: "be", diff: 1, base: "be", third: "is", past: "was", pp: "been", ing: "being", am: "am", is: "is", are: "are", was: "was", were: "were", vc: "copula", trans: "intransitive", ipast: true, topics: ["state"], tags: ["essential", "linking"], typed: ["be", "am", "is", "are", "was", "were", "been", "being"], ex: "I am a student.", notes: "Highly irregular copula. Person/number split: I am, you/we/they are, he/she/it is. Past: I/he/she/it was; you/we/they were. Past participle 'been'." }),
  E({ id: "brush", lemma: "brush", diff: 1, base: "brush", third: "brushes", past: "brushed", pp: "brushed", ing: "brushing", vc: "action", trans: "transitive", objects: ["teeth", "hair"], topics: ["routines", "body"], tags: ["hygiene"], typed: ["brush", "brushes", "brushed", "brushing"], ex: "I always brush my teeth.", notes: "sh \u2192 shes for third-person." }),
  E({ id: "can", lemma: "can", diff: 1, base: "can", past: "could", vc: "modal", trans: "intransitive", topics: ["abilities"], tags: ["modal", "ability"], typed: ["can", "could", "cannot", "can't"], ex: "She can speak English.", notes: "Modal \u2014 no third-person -s, no -ing form. Negative: cannot / can't. Past: could (largely out of A1)." }),
  E({ id: "clean", lemma: "clean", diff: 1, base: "clean", third: "cleans", past: "cleaned", pp: "cleaned", ing: "cleaning", vc: "action", trans: "transitive", objects: ["desk", "room", "house"], topics: ["routines", "school"], tags: ["chore"], typed: ["clean", "cleans", "cleaned", "cleaning"], ex: "Clean the desk." }),
  E({ id: "close", lemma: "close", diff: 1, base: "close", third: "closes", past: "closed", pp: "closed", ing: "closing", vc: "action", trans: "transitive", objects: ["box", "door", "book", "eyes", "window", "gate"], topics: ["classroom_commands"], tags: ["common_action"], typed: ["close", "closes", "closed", "closing", "shut"], ex: "Close the box." }),
  E({ id: "color", lemma: "color", diff: 1, base: "color", third: "colors", past: "colored", pp: "colored", ing: "coloring", vc: "action", trans: "transitive", objects: ["picture"], topics: ["art", "school"], tags: ["creative"], typed: ["color", "colors", "colored", "coloring", "colour", "colours", "coloured", "colouring"], ex: "Color the picture.", notes: "British 'colour' accepted as typed answer." }),
  E({ id: "come", lemma: "come", diff: 1, base: "come", third: "comes", past: "came", pp: "come", ing: "coming", vc: "action", trans: "intransitive", ipast: true, parts: ["here", "to"], topics: ["movement"], tags: ["motion"], typed: ["come", "comes", "came", "coming"], ex: "Please come here.", notes: "Irregular: came (past), but past participle is 'come' (same as base)." }),
  E({ id: "do", lemma: "do", diff: 1, base: "do", third: "does", past: "did", pp: "done", ing: "doing", vc: "auxiliary", trans: "both", ipast: true, topics: ["actions", "questions"], tags: ["essential", "auxiliary"], typed: ["do", "does", "did", "done", "doing", "don't", "doesn't", "didn't"], ex: "Do you like juice?", notes: "Dual function: auxiliary in questions / negatives ('Do you ...?', 'She doesn't ...') and main verb ('do homework'). Irregular past 'did', past participle 'done'." }),
  E({ id: "draw", lemma: "draw", diff: 1, base: "draw", third: "draws", past: "drew", pp: "drawn", ing: "drawing", vc: "action", trans: "both", ipast: true, objects: ["picture", "tree", "cat", "flower", "house"], topics: ["art", "school"], tags: ["creative"], typed: ["draw", "draws", "drew", "drawn", "drawing"], ex: "Draw a small flower." }),
  E({ id: "drink_verb", lemma: "drink", diff: 1, base: "drink", third: "drinks", past: "drank", pp: "drunk", ing: "drinking", vc: "action", trans: "both", ipast: true, objects: ["water", "milk", "juice", "soda", "coffee"], topics: ["food", "drinks"], tags: ["consume"], typed: ["drink", "drinks", "drank", "drunk", "drinking"], ex: "He drinks milk.", notes: "Verb id is 'drink_verb' to disambiguate from the noun lemma 'drink' (id 'drink')." }),
  E({ id: "eat", lemma: "eat", diff: 1, base: "eat", third: "eats", past: "ate", pp: "eaten", ing: "eating", vc: "action", trans: "both", ipast: true, objects: ["bread", "rice", "fruit", "soup", "egg", "pizza"], topics: ["food"], tags: ["consume"], typed: ["eat", "eats", "ate", "eaten", "eating"], ex: "When do you eat?" }),
  E({ id: "find", lemma: "find", diff: 1, base: "find", third: "finds", past: "found", pp: "found", ing: "finding", vc: "action", trans: "transitive", ipast: true, objects: ["coin", "ball", "pen", "key"], topics: ["actions"], tags: ["search"], typed: ["find", "finds", "found", "finding"], ex: "She sometimes finds a coin." }),
  E({ id: "give", lemma: "give", diff: 1, base: "give", third: "gives", past: "gave", pp: "given", ing: "giving", vc: "action", trans: "ditransitive", ipast: true, objects: ["pen", "book", "paper", "hand"], topics: ["actions", "social"], tags: ["transfer"], typed: ["give", "gives", "gave", "given", "giving"], ex: "Give me your hand.", notes: "Ditransitive: 'give X Y' (give me a pen) or 'give Y to X' (give a pen to me)." }),
  E({ id: "go", lemma: "go", diff: 1, base: "go", third: "goes", past: "went", pp: "gone", ing: "going", vc: "action", trans: "intransitive", ipast: true, parts: ["to", "home"], topics: ["movement"], tags: ["motion", "essential"], typed: ["go", "goes", "went", "gone", "going"], ex: "I go to school.", notes: "Highly irregular past 'went' (suppletive). Often paired with 'to + place' or with 'home' (no preposition: go home)." }),
  E({ id: "have", lemma: "have", diff: 1, base: "have", third: "has", past: "had", pp: "had", ing: "having", vc: "state", trans: "transitive", ipast: true, topics: ["possession"], tags: ["essential", "auxiliary"], typed: ["have", "has", "had", "having", "have got", "has got"], ex: "I have a book.", notes: "Main verb (possession) at A1; also auxiliary for perfect tenses (out of A1 scope). British 'have got' commonly accepted in possession." }),
  E({ id: "hear", lemma: "hear", diff: 1, base: "hear", third: "hears", past: "heard", pp: "heard", ing: "hearing", vc: "state", trans: "transitive", ipast: true, objects: ["bell", "music", "alarm", "noise"], topics: ["perception"], tags: ["sense"], typed: ["hear", "hears", "heard", "hearing"], ex: "I can hear the music.", notes: "Stative perception verb \u2014 typically used with 'can' rather than progressive (avoid 'I am hearing')." }),
  E({ id: "help", lemma: "help", diff: 1, base: "help", third: "helps", past: "helped", pp: "helped", ing: "helping", vc: "action", trans: "transitive", takes_inf: true, objects: ["mother", "brother", "friend", "teacher"], topics: ["social"], tags: ["assist"], typed: ["help", "helps", "helped", "helping"], ex: "Can you help me?", notes: "Optional infinitive ('help me to do' or 'help me do' \u2014 both grammatical at A1)." }),
  E({ id: "hold", lemma: "hold", diff: 1, base: "hold", third: "holds", past: "held", pp: "held", ing: "holding", vc: "action", trans: "transitive", ipast: true, objects: ["pen", "book", "ball", "hand"], topics: ["actions"], tags: ["grip"], typed: ["hold", "holds", "held", "holding"], ex: "I am holding a pen." }),
  E({ id: "jump", lemma: "jump", diff: 1, base: "jump", third: "jumps", past: "jumped", pp: "jumped", ing: "jumping", vc: "action", trans: "intransitive", topics: ["movement", "abilities"], tags: ["motion"], typed: ["jump", "jumps", "jumped", "jumping", "hop", "leap"], ex: "Can he jump far?" }),
  E({ id: "learn", lemma: "learn", diff: 1, base: "learn", third: "learns", past: "learned", pp: "learned", ing: "learning", vc: "action", trans: "both", objects: ["English"], topics: ["school"], tags: ["education"], typed: ["learn", "learns", "learned", "learnt", "learning"], ex: "We are learning English.", notes: "British also uses 'learnt' for V2/V3." }),
  E({ id: "like", lemma: "like", diff: 1, base: "like", third: "likes", past: "liked", pp: "liked", ing: "liking", vc: "state", trans: "transitive", takes_inf: true, topics: ["preferences"], tags: ["preference"], typed: ["like", "likes", "liked", "liking"], ex: "Do you like juice?", notes: "Optional infinitive ('like to play') or gerund ('like playing'). Stative \u2014 progressive normally avoided." }),
  E({ id: "listen", lemma: "listen", diff: 1, base: "listen", third: "listens", past: "listened", pp: "listened", ing: "listening", vc: "action", trans: "intransitive", parts: ["to"], objects: ["music", "teacher", "song"], topics: ["perception"], tags: ["sense"], typed: ["listen", "listens", "listened", "listening"], ex: "Listen to the teacher.", notes: "Always followed by 'to' before object: listen TO the music." }),
  E({ id: "live", lemma: "live", diff: 1, base: "live", third: "lives", past: "lived", pp: "lived", ing: "living", vc: "state", trans: "intransitive", parts: ["in", "on"], topics: ["state", "places"], tags: ["existence"], typed: ["live", "lives", "lived", "living"], ex: "She lives in a city." }),
  E({ id: "look", lemma: "look", diff: 1, base: "look", third: "looks", past: "looked", pp: "looked", ing: "looking", vc: "action", trans: "intransitive", parts: ["at"], objects: ["clock", "board", "picture", "bird"], topics: ["perception"], tags: ["sense"], typed: ["look", "looks", "looked", "looking"], ex: "Look at the clock.", notes: "Always followed by 'at' before object: look AT the clock. (Distinct from copula 'look + adj' \u2014 'You look happy' \u2014 not modeled here yet.)" }),
  E({ id: "love", lemma: "love", diff: 1, base: "love", third: "loves", past: "loved", pp: "loved", ing: "loving", vc: "state", trans: "transitive", takes_inf: true, objects: ["dog", "cat", "garden", "house", "music"], topics: ["preferences", "emotions"], tags: ["affection"], typed: ["love", "loves", "loved", "loving"], ex: "He loves his dog." }),
  E({ id: "make", lemma: "make", diff: 1, base: "make", third: "makes", past: "made", pp: "made", ing: "making", vc: "action", trans: "transitive", ipast: true, objects: ["sandwich", "cake", "noise", "bed"], topics: ["actions"], tags: ["create"], typed: ["make", "makes", "made", "making"], ex: "You are making a sandwich." }),
  E({ id: "need", lemma: "need", diff: 1, base: "need", third: "needs", past: "needed", pp: "needed", ing: "needing", vc: "state", trans: "transitive", takes_inf: true, objects: ["eraser", "pen", "help"], topics: ["preferences"], tags: ["necessity"], typed: ["need", "needs", "needed", "needing"], ex: "She needs a new eraser.", notes: "Stative \u2014 progressive normally avoided." }),
  E({ id: "open", lemma: "open", diff: 1, base: "open", third: "opens", past: "opened", pp: "opened", ing: "opening", vc: "action", trans: "transitive", objects: ["bag", "box", "door", "window", "book"], topics: ["classroom_commands"], tags: ["common_action"], typed: ["open", "opens", "opened", "opening"], ex: "Open the box." }),
  E({ id: "paint", lemma: "paint", diff: 1, base: "paint", third: "paints", past: "painted", pp: "painted", ing: "painting", vc: "action", trans: "both", objects: ["picture", "wall"], topics: ["art"], tags: ["creative"], typed: ["paint", "paints", "painted", "painting"], ex: "He paints pictures every night." }),
  E({ id: "play", lemma: "play", diff: 1, base: "play", third: "plays", past: "played", pp: "played", ing: "playing", vc: "action", trans: "both", objects: ["football", "guitar", "games", "music", "chess"], topics: ["activities", "play"], tags: ["activity"], typed: ["play", "plays", "played", "playing"], ex: "Do they play football?" }),
  E({ id: "put", lemma: "put", diff: 1, base: "put", third: "puts", past: "put", pp: "put", ing: "putting", vc: "action", trans: "transitive", ipast: true, parts: ["in", "on"], objects: ["book", "toy", "pen"], topics: ["actions"], tags: ["place"], typed: ["put", "puts", "putting"], ex: "Put the book in the bag.", notes: "Same form for V1, V2, and V3 (all 'put'). Doubles the t before -ing: putting." }),
  E({ id: "read", lemma: "read", diff: 1, base: "read", third: "reads", past: "read", pp: "read", ing: "reading", vc: "action", trans: "both", ipast: true, objects: ["book", "story", "word", "sentence"], topics: ["school"], tags: ["literacy"], typed: ["read", "reads", "reading"], ex: "Read the word.", notes: "Same spelling for V1/V2/V3 ('read') but pronunciation differs: V1 /ri\u02D0d/, V2/V3 /r\u025Bd/." }),
  E({ id: "ride", lemma: "ride", diff: 1, base: "ride", third: "rides", past: "rode", pp: "ridden", ing: "riding", vc: "action", trans: "transitive", ipast: true, objects: ["bike", "horse"], topics: ["transport"], tags: ["motion"], typed: ["ride", "rides", "rode", "ridden", "riding"], ex: "He is riding a bike." }),
  E({ id: "run", lemma: "run", diff: 1, base: "run", third: "runs", past: "ran", pp: "run", ing: "running", vc: "action", trans: "intransitive", ipast: true, topics: ["movement"], tags: ["motion"], typed: ["run", "runs", "ran", "running"], ex: "I can run fast.", notes: "Past participle 'run' (same as base). Doubles the n before -ing: running." }),
  E({ id: "say", lemma: "say", diff: 1, base: "say", third: "says", past: "said", pp: "said", ing: "saying", vc: "action", trans: "transitive", ipast: true, objects: ["hello", "please", "name", "word"], topics: ["communication"], tags: ["speech"], typed: ["say", "says", "said", "saying"], ex: "Say the word.", notes: "Pronunciation: third-person 'says' is /sez/, past 'said' is /sed/." }),
  E({ id: "see", lemma: "see", diff: 1, base: "see", third: "sees", past: "saw", pp: "seen", ing: "seeing", vc: "state", trans: "transitive", ipast: true, objects: ["cat", "bird", "tree", "house"], topics: ["perception"], tags: ["sense"], typed: ["see", "sees", "saw", "seen"], ex: "I see a cat.", notes: "Stative perception verb \u2014 typically used in present simple, not progressive (avoid 'I am seeing')." }),
  E({ id: "sit", lemma: "sit", diff: 1, base: "sit", third: "sits", past: "sat", pp: "sat", ing: "sitting", vc: "action", trans: "intransitive", ipast: true, parts: ["on", "in", "next to", "down"], objects: ["chair", "bench", "floor", "mat"], topics: ["positions", "classroom_commands"], tags: ["body_position"], typed: ["sit", "sits", "sat", "sitting"], ex: "Sit on the chair." }),
  E({ id: "sleep", lemma: "sleep", diff: 1, base: "sleep", third: "sleeps", past: "slept", pp: "slept", ing: "sleeping", vc: "state", trans: "intransitive", ipast: true, parts: ["in", "on"], topics: ["routines"], tags: ["state"], typed: ["sleep", "sleeps", "slept", "sleeping"], ex: "He is sleeping now." }),
  E({ id: "speak", lemma: "speak", diff: 1, base: "speak", third: "speaks", past: "spoke", pp: "spoken", ing: "speaking", vc: "action", trans: "both", ipast: true, objects: ["English"], topics: ["communication"], tags: ["speech"], typed: ["speak", "speaks", "spoke", "spoken", "speaking"], ex: "She can speak English." }),
  E({ id: "stand", lemma: "stand", diff: 1, base: "stand", third: "stands", past: "stood", pp: "stood", ing: "standing", vc: "action", trans: "intransitive", ipast: true, parts: ["up", "in front of"], topics: ["positions", "classroom_commands"], tags: ["body_position"], typed: ["stand", "stands", "stood", "standing"], ex: "Stand up, please." }),
  E({ id: "study", lemma: "study", diff: 1, base: "study", third: "studies", past: "studied", pp: "studied", ing: "studying", vc: "action", trans: "both", ipast: true, objects: ["English"], topics: ["school"], tags: ["education"], typed: ["study", "studies", "studied", "studying"], ex: "They study in the library.", notes: "y \u2192 ies for third-person; y \u2192 ied for past." }),
  E({ id: "swim", lemma: "swim", diff: 1, base: "swim", third: "swims", past: "swam", pp: "swum", ing: "swimming", vc: "action", trans: "intransitive", ipast: true, topics: ["movement", "sports"], tags: ["motion", "water"], typed: ["swim", "swims", "swam", "swum", "swimming"], ex: "He cannot swim.", notes: "Doubles the m before -ing: swimming." }),
  E({ id: "talk", lemma: "talk", diff: 1, base: "talk", third: "talks", past: "talked", pp: "talked", ing: "talking", vc: "action", trans: "intransitive", parts: ["to", "about"], topics: ["communication"], tags: ["speech"], typed: ["talk", "talks", "talked", "talking"], ex: "The teacher is talking." }),
  E({ id: "tell", lemma: "tell", diff: 1, base: "tell", third: "tells", past: "told", pp: "told", ing: "telling", vc: "action", trans: "ditransitive", ipast: true, objects: ["story", "joke", "name"], topics: ["communication"], tags: ["speech"], typed: ["tell", "tells", "told", "telling"], ex: "He is telling a joke.", notes: "Ditransitive: 'tell X Y' (tell me a joke) or 'tell Y to X' (tell a joke to me)." }),
  E({ id: "walk", lemma: "walk", diff: 1, base: "walk", third: "walks", past: "walked", pp: "walked", ing: "walking", vc: "action", trans: "intransitive", parts: ["to"], topics: ["movement"], tags: ["motion"], typed: ["walk", "walks", "walked", "walking"], ex: "I am walking to the desk." }),
  E({ id: "want", lemma: "want", diff: 1, base: "want", third: "wants", past: "wanted", pp: "wanted", ing: "wanting", vc: "state", trans: "transitive", takes_inf: true, objects: ["cookie", "apple", "pen", "milk", "juice"], topics: ["preferences"], tags: ["desire"], typed: ["want", "wants", "wanted", "wanting"], ex: "Do you want a cookie?", notes: "Stative \u2014 progressive normally avoided. Productive 'want to + V' frame." }),
  E({ id: "wash", lemma: "wash", diff: 1, base: "wash", third: "washes", past: "washed", pp: "washed", ing: "washing", vc: "action", trans: "transitive", objects: ["dishes", "hands", "face", "car"], topics: ["routines", "body"], tags: ["hygiene"], typed: ["wash", "washes", "washed", "washing"], ex: "She is washing the dishes.", notes: "sh \u2192 shes for third-person." }),
  E({ id: "watch", lemma: "watch", diff: 1, base: "watch", third: "watches", past: "watched", pp: "watched", ing: "watching", vc: "action", trans: "transitive", objects: ["TV", "movie", "show"], topics: ["entertainment"], tags: ["sense"], typed: ["watch", "watches", "watched", "watching"], ex: "She does not watch TV.", notes: "ch \u2192 ches for third-person. Distinct from noun 'watch' (a wristwatch) \u2014 may need a noun id 'watch_noun' if added later." }),
  E({ id: "wear", lemma: "wear", diff: 1, base: "wear", third: "wears", past: "wore", pp: "worn", ing: "wearing", vc: "action", trans: "transitive", ipast: true, objects: ["hat", "shirt", "jacket", "coat", "sweater"], topics: ["clothes"], tags: ["clothing"], typed: ["wear", "wears", "wore", "worn", "wearing"], ex: "He always wears a hat." }),
  E({ id: "write", lemma: "write", diff: 1, base: "write", third: "writes", past: "wrote", pp: "written", ing: "writing", vc: "action", trans: "both", ipast: true, objects: ["letter", "name", "word"], topics: ["school"], tags: ["literacy"], typed: ["write", "writes", "wrote", "written", "writing"], ex: "Write your name." }),

  // ----- Batch 2 (next 50) -----
  E({ id: "ask", lemma: "ask", diff: 1, base: "ask", third: "asks", past: "asked", pp: "asked", ing: "asking", vc: "action", trans: "transitive", objects: ["question", "name"], topics: ["communication"], tags: ["speech"], typed: ["ask", "asks", "asked", "asking"], ex: "Can I ask a question?", notes: "Often ditransitive: 'ask X Y' (ask me a question)." }),
  E({ id: "bake", lemma: "bake", diff: 1, base: "bake", third: "bakes", past: "baked", pp: "baked", ing: "baking", vc: "action", trans: "transitive", objects: ["cake", "bread", "cookie"], topics: ["food"], tags: ["create"], typed: ["bake", "bakes", "baked", "baking"], ex: "We can bake a cake.", notes: "Drops -e before -ing: baking." }),
  E({ id: "bring", lemma: "bring", diff: 1, base: "bring", third: "brings", past: "brought", pp: "brought", ing: "bringing", vc: "action", trans: "ditransitive", ipast: true, objects: ["pen", "book", "bag"], topics: ["actions"], tags: ["transfer"], typed: ["bring", "brings", "brought", "bringing"], ex: "Bring me a pen.", notes: "Ditransitive: 'bring X Y' (bring me a pen) or 'bring Y to X'. Irregular: brought." }),
  E({ id: "build", lemma: "build", diff: 1, base: "build", third: "builds", past: "built", pp: "built", ing: "building", vc: "action", trans: "transitive", ipast: true, objects: ["tower", "house", "wall"], topics: ["actions"], tags: ["create"], typed: ["build", "builds", "built", "building"], ex: "We can build a tower.", notes: "Irregular past 'built'." }),
  E({ id: "buy", lemma: "buy", diff: 1, base: "buy", third: "buys", past: "bought", pp: "bought", ing: "buying", vc: "action", trans: "ditransitive", ipast: true, objects: ["apple", "book", "ticket"], topics: ["shopping"], tags: ["transfer"], typed: ["buy", "buys", "bought", "buying"], ex: "She buys an apple.", notes: "Ditransitive: 'buy X Y' (buy me a book) or 'buy Y for X'. Irregular: bought." }),
  E({ id: "call", lemma: "call", diff: 1, base: "call", third: "calls", past: "called", pp: "called", ing: "calling", vc: "action", trans: "transitive", objects: ["mom", "friend", "name"], topics: ["communication"], tags: ["contact"], typed: ["call", "calls", "called", "calling"], ex: "She calls her mother.", notes: "Two A1 senses: 'phone someone' and 'name someone' (They call him Tom)." }),
  E({ id: "carry", lemma: "carry", diff: 1, base: "carry", third: "carries", past: "carried", pp: "carried", ing: "carrying", vc: "action", trans: "transitive", objects: ["box", "bag", "baby"], topics: ["actions"], tags: ["transport"], typed: ["carry", "carries", "carried", "carrying"], ex: "I cannot carry the box.", notes: "y \u2192 ies for third-person; y \u2192 ied for past." }),
  E({ id: "catch", lemma: "catch", diff: 1, base: "catch", third: "catches", past: "caught", pp: "caught", ing: "catching", vc: "action", trans: "transitive", ipast: true, objects: ["ball", "bird", "bus"], topics: ["actions", "sports"], tags: ["motion"], typed: ["catch", "catches", "caught", "catching"], ex: "You cannot catch the bird.", notes: "ch \u2192 ches for third-person. Irregular: caught." }),
  E({ id: "climb", lemma: "climb", diff: 1, base: "climb", third: "climbs", past: "climbed", pp: "climbed", ing: "climbing", vc: "action", trans: "both", objects: ["tree", "wall", "ladder"], topics: ["movement"], tags: ["motion"], typed: ["climb", "climbs", "climbed", "climbing"], ex: "I cannot climb the tree." }),
  E({ id: "cook", lemma: "cook", diff: 1, base: "cook", third: "cooks", past: "cooked", pp: "cooked", ing: "cooking", vc: "action", trans: "both", objects: ["dinner", "rice", "egg"], topics: ["food", "routines"], tags: ["create"], typed: ["cook", "cooks", "cooked", "cooking"], ex: "She cooks dinner." }),
  E({ id: "count", lemma: "count", diff: 1, base: "count", third: "counts", past: "counted", pp: "counted", ing: "counting", vc: "action", trans: "transitive", objects: ["numbers", "apples"], topics: ["school", "math"], tags: ["enumerate"], typed: ["count", "counts", "counted", "counting"], ex: "You count the numbers." }),
  E({ id: "cut", lemma: "cut", diff: 1, base: "cut", third: "cuts", past: "cut", pp: "cut", ing: "cutting", vc: "action", trans: "transitive", ipast: true, objects: ["paper", "apple", "bread"], topics: ["actions"], tags: ["divide"], typed: ["cut", "cuts", "cutting"], ex: "She cuts the bread.", notes: "Same form for V1, V2, V3 (all 'cut'). Doubles the t: cutting." }),
  E({ id: "dance", lemma: "dance", diff: 1, base: "dance", third: "dances", past: "danced", pp: "danced", ing: "dancing", vc: "action", trans: "intransitive", topics: ["activities", "abilities"], tags: ["activity"], typed: ["dance", "dances", "danced", "dancing"], ex: "My friend can dance.", notes: "Drops -e before -ing: dancing." }),
  E({ id: "fall", lemma: "fall", diff: 1, base: "fall", third: "falls", past: "fell", pp: "fallen", ing: "falling", vc: "action", trans: "intransitive", ipast: true, parts: ["down", "off"], topics: ["movement"], tags: ["motion"], typed: ["fall", "falls", "fell", "fallen", "falling"], ex: "The leaf falls down.", notes: "Irregular: fell, fallen." }),
  E({ id: "feel", lemma: "feel", diff: 1, base: "feel", third: "feels", past: "felt", pp: "felt", ing: "feeling", vc: "state", trans: "both", ipast: true, topics: ["emotions", "perception"], tags: ["sense"], typed: ["feel", "feels", "felt", "feeling"], ex: "I feel happy today.", notes: "Stative when describing inner state ('I feel happy'); active when describing touch ('feel the cold water'). Irregular: felt." }),
  E({ id: "finish", lemma: "finish", diff: 1, base: "finish", third: "finishes", past: "finished", pp: "finished", ing: "finishing", vc: "action", trans: "both", objects: ["work", "book", "homework"], topics: ["actions"], tags: ["complete"], typed: ["finish", "finishes", "finished", "finishing"], ex: "I finish my homework.", notes: "sh \u2192 shes for third-person." }),
  E({ id: "fly", lemma: "fly", diff: 1, base: "fly", third: "flies", past: "flew", pp: "flown", ing: "flying", vc: "action", trans: "both", ipast: true, objects: ["plane", "kite"], topics: ["movement", "transport"], tags: ["motion"], typed: ["fly", "flies", "flew", "flown", "flying"], ex: "We cannot fly.", notes: "Irregular: flew, flown. y \u2192 ies for third-person." }),
  E({ id: "get", lemma: "get", diff: 1, base: "get", third: "gets", past: "got", pp: "got", ing: "getting", vc: "action", trans: "both", ipast: true, objects: ["ball", "book", "drink"], topics: ["actions"], tags: ["acquire"], typed: ["get", "gets", "got", "gotten", "getting"], ex: "I get a new book.", notes: "Doubles the t: getting. British V3 'got', American V3 'gotten' (both accepted in typed answers)." }),
  E({ id: "hide", lemma: "hide", diff: 1, base: "hide", third: "hides", past: "hid", pp: "hidden", ing: "hiding", vc: "action", trans: "both", ipast: true, parts: ["in", "behind"], topics: ["games", "actions"], tags: ["concealment"], typed: ["hide", "hides", "hid", "hidden", "hiding"], ex: "We hide in the closet.", notes: "Irregular: hid, hidden. Drops -e: hiding." }),
  E({ id: "kick", lemma: "kick", diff: 1, base: "kick", third: "kicks", past: "kicked", pp: "kicked", ing: "kicking", vc: "action", trans: "transitive", objects: ["ball", "door"], topics: ["sports", "actions"], tags: ["motion"], typed: ["kick", "kicks", "kicked", "kicking"], ex: "He can kick the ball." }),
  E({ id: "know", lemma: "know", diff: 1, base: "know", third: "knows", past: "knew", pp: "known", ing: "knowing", vc: "state", trans: "transitive", ipast: true, topics: ["state", "knowledge"], tags: ["knowledge"], typed: ["know", "knows", "knew", "known"], ex: "I know your name.", notes: "Stative \u2014 typically used in present simple, not progressive (avoid 'I am knowing'). Irregular: knew, known." }),
  E({ id: "laugh", lemma: "laugh", diff: 1, base: "laugh", third: "laughs", past: "laughed", pp: "laughed", ing: "laughing", vc: "action", trans: "intransitive", parts: ["at"], topics: ["emotions"], tags: ["sound"], typed: ["laugh", "laughs", "laughed", "laughing"], ex: "The boys laugh.", notes: "With object, takes 'at': 'laugh AT the joke'." }),
  E({ id: "leave", lemma: "leave", diff: 1, base: "leave", third: "leaves", past: "left", pp: "left", ing: "leaving", vc: "action", trans: "both", ipast: true, topics: ["movement"], tags: ["motion"], typed: ["leave", "leaves", "left", "leaving"], ex: "They usually leave at 3 o'clock.", notes: "Irregular: left. Drops -e: leaving. Distinct from noun 'leaves' (plural of leaf)." }),
  E({ id: "meet", lemma: "meet", diff: 1, base: "meet", third: "meets", past: "met", pp: "met", ing: "meeting", vc: "action", trans: "transitive", ipast: true, objects: ["friend", "teacher"], topics: ["social"], tags: ["encounter"], typed: ["meet", "meets", "met", "meeting"], ex: "I meet my friend.", notes: "Irregular: met (V2=V3)." }),
  E({ id: "move", lemma: "move", diff: 1, base: "move", third: "moves", past: "moved", pp: "moved", ing: "moving", vc: "action", trans: "both", topics: ["movement"], tags: ["motion"], typed: ["move", "moves", "moved", "moving"], ex: "Please move the chair.", notes: "Drops -e: moving." }),
  E({ id: "pick", lemma: "pick", diff: 1, base: "pick", third: "picks", past: "picked", pp: "picked", ing: "picking", vc: "action", trans: "transitive", parts: ["up"], objects: ["bag", "ball", "pen"], topics: ["actions"], tags: ["lift"], typed: ["pick", "picks", "picked", "picking", "pick up"], ex: "Pick up the bag.", notes: "Often phrasal: 'pick up'." }),
  E({ id: "point", lemma: "point", diff: 1, base: "point", third: "points", past: "pointed", pp: "pointed", ing: "pointing", vc: "action", trans: "intransitive", parts: ["at", "to"], topics: ["actions", "communication"], tags: ["gesture"], typed: ["point", "points", "pointed", "pointing"], ex: "The teacher is pointing.", notes: "Distinct from noun 'point' (a dot, a score)." }),
  E({ id: "pull", lemma: "pull", diff: 1, base: "pull", third: "pulls", past: "pulled", pp: "pulled", ing: "pulling", vc: "action", trans: "transitive", objects: ["door", "rope"], topics: ["actions"], tags: ["force"], typed: ["pull", "pulls", "pulled", "pulling"], ex: "Pull the door." }),
  E({ id: "push", lemma: "push", diff: 1, base: "push", third: "pushes", past: "pushed", pp: "pushed", ing: "pushing", vc: "action", trans: "transitive", objects: ["door", "button"], topics: ["actions"], tags: ["force"], typed: ["push", "pushes", "pushed", "pushing"], ex: "Push the door.", notes: "sh \u2192 shes for third-person." }),
  E({ id: "rain", lemma: "rain", diff: 1, base: "rain", third: "rains", past: "rained", pp: "rained", ing: "raining", vc: "action", trans: "intransitive", topics: ["weather"], tags: ["weather"], typed: ["rain", "rains", "rained", "raining"], ex: "It is raining today.", notes: "Weather verb \u2014 used impersonally with dummy 'it': 'It rains', 'It is raining'. If a noun 'rain' is added later, use id 'rain_noun' to disambiguate." }),
  E({ id: "raise", lemma: "raise", diff: 1, base: "raise", third: "raises", past: "raised", pp: "raised", ing: "raising", vc: "action", trans: "transitive", objects: ["hand"], topics: ["classroom_commands"], tags: ["lift"], typed: ["raise", "raises", "raised", "raising"], ex: "The student raises a hand.", notes: "Drops -e: raising." }),
  E({ id: "ring", lemma: "ring", diff: 1, base: "ring", third: "rings", past: "rang", pp: "rung", ing: "ringing", vc: "action", trans: "both", ipast: true, objects: ["bell"], topics: ["actions", "sound"], tags: ["sound"], typed: ["ring", "rings", "rang", "rung", "ringing"], ex: "The teacher rings the bell.", notes: "Irregular: rang, rung. If a noun 'ring' (jewelry) is added later, use id 'ring_noun' to disambiguate." }),
  E({ id: "shout", lemma: "shout", diff: 1, base: "shout", third: "shouts", past: "shouted", pp: "shouted", ing: "shouting", vc: "action", trans: "intransitive", parts: ["at"], topics: ["communication"], tags: ["speech", "sound"], typed: ["shout", "shouts", "shouted", "shouting"], ex: "We never shout in the library." }),
  E({ id: "show", lemma: "show", diff: 1, base: "show", third: "shows", past: "showed", pp: "shown", ing: "showing", vc: "action", trans: "ditransitive", ipast: true, objects: ["picture", "book"], topics: ["actions", "communication"], tags: ["display"], typed: ["show", "shows", "showed", "shown", "showing"], ex: "Show me your book.", notes: "Past 'showed' is regular; past participle 'shown' is irregular. Ditransitive: 'show X Y' (show me a picture)." }),
  E({ id: "sing", lemma: "sing", diff: 1, base: "sing", third: "sings", past: "sang", pp: "sung", ing: "singing", vc: "action", trans: "both", ipast: true, objects: ["song"], topics: ["activities", "music"], tags: ["sound"], typed: ["sing", "sings", "sang", "sung", "singing"], ex: "They sing a song.", notes: "Irregular: sang, sung." }),
  E({ id: "smell", lemma: "smell", diff: 1, base: "smell", third: "smells", past: "smelled", pp: "smelled", ing: "smelling", vc: "state", trans: "both", topics: ["perception"], tags: ["sense"], typed: ["smell", "smells", "smelled", "smelt", "smelling"], ex: "I can smell the flower.", notes: "Stative perception verb \u2014 typically used with 'can' rather than progressive. British also accepts 'smelt' for V2/V3." }),
  E({ id: "start", lemma: "start", diff: 1, base: "start", third: "starts", past: "started", pp: "started", ing: "starting", vc: "action", trans: "both", takes_inf: true, topics: ["actions"], tags: ["begin"], typed: ["start", "starts", "started", "starting"], ex: "We start at 8 o'clock.", notes: "Followed by infinitive ('start to run') or gerund ('start running')." }),
  E({ id: "stay", lemma: "stay", diff: 1, base: "stay", third: "stays", past: "stayed", pp: "stayed", ing: "staying", vc: "state", trans: "intransitive", parts: ["here", "with"], topics: ["state", "movement"], tags: ["remain"], typed: ["stay", "stays", "stayed", "staying"], ex: "It cannot stay still." }),
  E({ id: "stop", lemma: "stop", diff: 1, base: "stop", third: "stops", past: "stopped", pp: "stopped", ing: "stopping", vc: "action", trans: "both", topics: ["actions", "movement"], tags: ["halt"], typed: ["stop", "stops", "stopped", "stopping"], ex: "Please stop.", notes: "Doubles the p: stopping, stopped." }),
  E({ id: "take", lemma: "take", diff: 1, base: "take", third: "takes", past: "took", pp: "taken", ing: "taking", vc: "action", trans: "transitive", ipast: true, objects: ["pen", "book", "bus"], topics: ["actions"], tags: ["transfer"], typed: ["take", "takes", "took", "taken", "taking"], ex: "Take the pen.", notes: "Drops -e: taking. Irregular: took, taken." }),
  E({ id: "teach", lemma: "teach", diff: 1, base: "teach", third: "teaches", past: "taught", pp: "taught", ing: "teaching", vc: "action", trans: "ditransitive", ipast: true, objects: ["English"], topics: ["school"], tags: ["education"], typed: ["teach", "teaches", "taught", "teaching"], ex: "She teaches us English.", notes: "ch \u2192 ches for third-person. Ditransitive: 'teach X Y' (teach us English). Irregular: taught." }),
  E({ id: "think", lemma: "think", diff: 1, base: "think", third: "thinks", past: "thought", pp: "thought", ing: "thinking", vc: "state", trans: "both", ipast: true, topics: ["state", "knowledge"], tags: ["mental"], typed: ["think", "thinks", "thought", "thinking"], ex: "I think it is cold.", notes: "Stative when expressing opinion ('I think it's good' \u2014 present simple); active when meaning 'consider' ('I am thinking about it'). Irregular: thought." }),
  E({ id: "throw", lemma: "throw", diff: 1, base: "throw", third: "throws", past: "threw", pp: "thrown", ing: "throwing", vc: "action", trans: "transitive", ipast: true, parts: ["away"], objects: ["ball"], topics: ["sports", "actions"], tags: ["motion"], typed: ["throw", "throws", "threw", "thrown", "throwing"], ex: "They are throwing the ball.", notes: "Irregular: threw, thrown." }),
  E({ id: "try", lemma: "try", diff: 1, base: "try", third: "tries", past: "tried", pp: "tried", ing: "trying", vc: "action", trans: "both", takes_inf: true, topics: ["actions"], tags: ["attempt"], typed: ["try", "tries", "tried", "trying"], ex: "I try my best.", notes: "y \u2192 ies for third-person; y \u2192 ied for past. Followed by infinitive ('try to run') or gerund ('try running')." }),
  E({ id: "turn", lemma: "turn", diff: 1, base: "turn", third: "turns", past: "turned", pp: "turned", ing: "turning", vc: "action", trans: "both", parts: ["off", "on", "around"], objects: ["light", "page"], topics: ["actions", "classroom_commands"], tags: ["rotate"], typed: ["turn", "turns", "turned", "turning"], ex: "Turn off the light.", notes: "Often phrasal: 'turn off', 'turn on', 'turn around'." }),
  E({ id: "wag", lemma: "wag", diff: 1, base: "wag", third: "wags", past: "wagged", pp: "wagged", ing: "wagging", vc: "action", trans: "transitive", objects: ["tail"], topics: ["animals"], tags: ["motion"], typed: ["wag", "wags", "wagged", "wagging"], ex: "The dog is wagging its tail.", notes: "Doubles the g: wagging, wagged." }),
  E({ id: "wait", lemma: "wait", diff: 1, base: "wait", third: "waits", past: "waited", pp: "waited", ing: "waiting", vc: "action", trans: "intransitive", parts: ["for"], topics: ["actions", "movement"], tags: ["delay"], typed: ["wait", "waits", "waited", "waiting"], ex: "I am waiting for the teacher.", notes: "Always with 'for' before object: wait FOR the bus." }),
  E({ id: "wake", lemma: "wake", diff: 1, base: "wake", third: "wakes", past: "woke", pp: "woken", ing: "waking", vc: "action", trans: "both", ipast: true, parts: ["up"], topics: ["routines"], tags: ["state_change"], typed: ["wake", "wakes", "woke", "woken", "waking", "wake up"], ex: "When do you wake up?", notes: "Often phrasal: 'wake up'. Irregular: woke, woken. Drops -e: waking." }),
  E({ id: "wave", lemma: "wave", diff: 1, base: "wave", third: "waves", past: "waved", pp: "waved", ing: "waving", vc: "action", trans: "both", objects: ["hand"], topics: ["actions", "social"], tags: ["gesture"], typed: ["wave", "waves", "waved", "waving"], ex: "They are waving hello.", notes: "Drops -e: waving." }),
  E({ id: "work", lemma: "work", diff: 1, base: "work", third: "works", past: "worked", pp: "worked", ing: "working", vc: "action", trans: "intransitive", parts: ["with", "on"], topics: ["activities", "school"], tags: ["activity"], typed: ["work", "works", "worked", "working"], ex: "I work in the office." }),

  // ----- Batch 3 (final A1 verbs) -----
  E({ id: "agree", lemma: "agree", diff: 1, base: "agree", third: "agrees", past: "agreed", pp: "agreed", ing: "agreeing", vc: "state", trans: "intransitive", takes_inf: true, parts: ["with", "to"], topics: ["communication"], tags: ["opinion"], typed: ["agree", "agrees", "agreed", "agreeing"], ex: "I agree with you.", notes: "agree WITH a person, agree TO a plan, agree TO do something." }),
  E({ id: "answer", lemma: "answer", diff: 1, base: "answer", third: "answers", past: "answered", pp: "answered", ing: "answering", vc: "action", trans: "transitive", objects: ["question", "phone"], topics: ["communication", "school"], tags: ["speech"], typed: ["answer", "answers", "answered", "answering"], ex: "Please answer the question.", notes: "Distinct from noun 'answer' (response)." }),
  E({ id: "arrive", lemma: "arrive", diff: 1, base: "arrive", third: "arrives", past: "arrived", pp: "arrived", ing: "arriving", vc: "action", trans: "intransitive", parts: ["at", "in"], topics: ["movement"], tags: ["motion"], typed: ["arrive", "arrives", "arrived", "arriving"], ex: "We arrive at school.", notes: "arrive AT a small place (school), arrive IN a big place (London). Drops -e: arriving." }),
  E({ id: "believe", lemma: "believe", diff: 1, base: "believe", third: "believes", past: "believed", pp: "believed", ing: "believing", vc: "state", trans: "transitive", topics: ["state", "knowledge"], tags: ["mental"], typed: ["believe", "believes", "believed", "believing"], ex: "I believe you.", notes: "Stative \u2014 typically present simple, not progressive. Drops -e: believing." }),
  E({ id: "borrow", lemma: "borrow", diff: 1, base: "borrow", third: "borrows", past: "borrowed", pp: "borrowed", ing: "borrowing", vc: "action", trans: "transitive", parts: ["from"], objects: ["pen", "book"], topics: ["actions"], tags: ["transfer"], typed: ["borrow", "borrows", "borrowed", "borrowing"], ex: "Can I borrow a pen?", notes: "borrow FROM someone (vs lend TO someone)." }),
  E({ id: "break", lemma: "break", diff: 1, base: "break", third: "breaks", past: "broke", pp: "broken", ing: "breaking", vc: "action", trans: "both", ipast: true, objects: ["glass", "toy", "window"], topics: ["actions"], tags: ["damage"], typed: ["break", "breaks", "broke", "broken", "breaking"], ex: "Don't break the toy.", notes: "Irregular: broke, broken." }),
  E({ id: "choose", lemma: "choose", diff: 1, base: "choose", third: "chooses", past: "chose", pp: "chosen", ing: "choosing", vc: "action", trans: "transitive", ipast: true, objects: ["color", "answer"], topics: ["actions"], tags: ["select"], typed: ["choose", "chooses", "chose", "chosen", "choosing"], ex: "Please choose a color.", notes: "Irregular: chose, chosen. Drops -e: choosing." }),
  E({ id: "cough", lemma: "cough", diff: 1, base: "cough", third: "coughs", past: "coughed", pp: "coughed", ing: "coughing", vc: "action", trans: "intransitive", topics: ["body", "health"], tags: ["sound"], typed: ["cough", "coughs", "coughed", "coughing"], ex: "I cough when I am sick." }),
  E({ id: "cry", lemma: "cry", diff: 1, base: "cry", third: "cries", past: "cried", pp: "cried", ing: "crying", vc: "action", trans: "intransitive", topics: ["emotions"], tags: ["sound"], typed: ["cry", "cries", "cried", "crying"], ex: "The baby is crying.", notes: "y \u2192 ies for third-person; y \u2192 ied for past." }),
  E({ id: "decide", lemma: "decide", diff: 1, base: "decide", third: "decides", past: "decided", pp: "decided", ing: "deciding", vc: "action", trans: "both", ipast: false, takes_inf: true, topics: ["actions", "knowledge"], tags: ["mental"], typed: ["decide", "decides", "decided", "deciding"], ex: "I decide to go now.", notes: "Drops -e: deciding. Often: decide TO do something." }),
  E({ id: "drive", lemma: "drive", diff: 1, base: "drive", third: "drives", past: "drove", pp: "driven", ing: "driving", vc: "action", trans: "both", ipast: true, objects: ["car", "bus"], topics: ["transport"], tags: ["motion"], typed: ["drive", "drives", "drove", "driven", "driving"], ex: "She drives a car.", notes: "Irregular: drove, driven. Drops -e: driving." }),
  E({ id: "enjoy", lemma: "enjoy", diff: 1, base: "enjoy", third: "enjoys", past: "enjoyed", pp: "enjoyed", ing: "enjoying", vc: "state", trans: "transitive", objects: ["music", "book", "game"], topics: ["preferences", "emotions"], tags: ["preference"], typed: ["enjoy", "enjoys", "enjoyed", "enjoying"], ex: "I enjoy music.", notes: "Followed by gerund ('enjoy playing'), NOT infinitive (no 'enjoy to play')." }),
  E({ id: "enter", lemma: "enter", diff: 1, base: "enter", third: "enters", past: "entered", pp: "entered", ing: "entering", vc: "action", trans: "both", objects: ["room", "house"], topics: ["movement"], tags: ["motion"], typed: ["enter", "enters", "entered", "entering"], ex: "Please enter the room.", notes: "Transitive without preposition: 'enter the room' (NOT 'enter into the room')." }),
  E({ id: "explain", lemma: "explain", diff: 1, base: "explain", third: "explains", past: "explained", pp: "explained", ing: "explaining", vc: "action", trans: "transitive", parts: ["to"], objects: ["question", "answer", "rule"], topics: ["communication", "school"], tags: ["speech"], typed: ["explain", "explains", "explained", "explaining"], ex: "Can you explain the answer?", notes: "explain X to Y (NOT 'explain Y X' \u2014 NOT ditransitive like tell/give)." }),
  E({ id: "fix", lemma: "fix", diff: 1, base: "fix", third: "fixes", past: "fixed", pp: "fixed", ing: "fixing", vc: "action", trans: "transitive", objects: ["bike", "phone", "toy"], topics: ["actions"], tags: ["repair"], typed: ["fix", "fixes", "fixed", "fixing"], ex: "He fixes the bike.", notes: "x \u2192 xes for third-person." }),
  E({ id: "forget", lemma: "forget", diff: 1, base: "forget", third: "forgets", past: "forgot", pp: "forgotten", ing: "forgetting", vc: "state", trans: "transitive", ipast: true, takes_inf: true, topics: ["state", "knowledge"], tags: ["mental"], typed: ["forget", "forgets", "forgot", "forgotten", "forgetting"], ex: "I always forget my pen.", notes: "Irregular: forgot, forgotten. Doubles the t: forgetting." }),
  E({ id: "happen", lemma: "happen", diff: 1, base: "happen", third: "happens", past: "happened", pp: "happened", ing: "happening", vc: "action", trans: "intransitive", topics: ["state"], tags: ["event"], typed: ["happen", "happens", "happened", "happening"], ex: "What happened?", notes: "Often used impersonally: 'What happened?' / 'It happens every day.'" }),
  E({ id: "hate", lemma: "hate", diff: 1, base: "hate", third: "hates", past: "hated", pp: "hated", ing: "hating", vc: "state", trans: "transitive", takes_inf: true, topics: ["preferences", "emotions"], tags: ["preference"], typed: ["hate", "hates", "hated", "hating"], ex: "I hate cold weather.", notes: "Stative. Drops -e: hating. Followed by infinitive ('hate to do') or gerund ('hate doing')." }),
  E({ id: "hope", lemma: "hope", diff: 1, base: "hope", third: "hopes", past: "hoped", pp: "hoped", ing: "hoping", vc: "state", trans: "both", takes_inf: true, topics: ["state", "emotions"], tags: ["mental"], typed: ["hope", "hopes", "hoped", "hoping"], ex: "I hope to see you.", notes: "Followed by 'to' + verb or 'that' + clause. Drops -e: hoping." }),
  E({ id: "hug", lemma: "hug", diff: 1, base: "hug", third: "hugs", past: "hugged", pp: "hugged", ing: "hugging", vc: "action", trans: "transitive", objects: ["mom", "friend", "dog"], topics: ["social", "emotions"], tags: ["affection"], typed: ["hug", "hugs", "hugged", "hugging"], ex: "She hugs her friend.", notes: "Doubles the g: hugging, hugged." }),
  E({ id: "kiss", lemma: "kiss", diff: 1, base: "kiss", third: "kisses", past: "kissed", pp: "kissed", ing: "kissing", vc: "action", trans: "transitive", objects: ["mom", "baby"], topics: ["social", "emotions"], tags: ["affection"], typed: ["kiss", "kisses", "kissed", "kissing"], ex: "She kisses the baby.", notes: "ss \u2192 sses for third-person." }),
  E({ id: "lend", lemma: "lend", diff: 1, base: "lend", third: "lends", past: "lent", pp: "lent", ing: "lending", vc: "action", trans: "ditransitive", ipast: true, parts: ["to"], objects: ["pen", "book", "money"], topics: ["actions"], tags: ["transfer"], typed: ["lend", "lends", "lent", "lending"], ex: "Can you lend me a pen?", notes: "Ditransitive: 'lend X Y' or 'lend Y to X'. Irregular: lent. Opposite of borrow." }),
  E({ id: "miss", lemma: "miss", diff: 1, base: "miss", third: "misses", past: "missed", pp: "missed", ing: "missing", vc: "state", trans: "transitive", objects: ["bus", "mom", "friend"], topics: ["emotions", "movement"], tags: ["loss"], typed: ["miss", "misses", "missed", "missing"], ex: "I miss my mom.", notes: "Two A1 senses: 'fail to catch' (miss the bus) and 'feel sad about absence' (miss my mom). ss \u2192 sses for third-person." }),
  E({ id: "plan", lemma: "plan", diff: 1, base: "plan", third: "plans", past: "planned", pp: "planned", ing: "planning", vc: "action", trans: "both", takes_inf: true, topics: ["actions"], tags: ["mental"], typed: ["plan", "plans", "planned", "planning"], ex: "We plan to go to the park.", notes: "Doubles the n: planning, planned. Often: 'plan to do something'." }),
  E({ id: "prefer", lemma: "prefer", diff: 1, base: "prefer", third: "prefers", past: "preferred", pp: "preferred", ing: "preferring", vc: "state", trans: "transitive", takes_inf: true, topics: ["preferences"], tags: ["preference"], typed: ["prefer", "prefers", "preferred", "preferring"], ex: "I prefer tea.", notes: "Stative. Doubles the r before -ed/-ing: preferred, preferring." }),
  E({ id: "promise", lemma: "promise", diff: 1, base: "promise", third: "promises", past: "promised", pp: "promised", ing: "promising", vc: "action", trans: "ditransitive", takes_inf: true, topics: ["communication"], tags: ["speech"], typed: ["promise", "promises", "promised", "promising"], ex: "I promise to help.", notes: "Drops -e: promising. Ditransitive: 'promise X Y' (promise me a visit). Often: 'promise to do something'." }),
  E({ id: "remember", lemma: "remember", diff: 1, base: "remember", third: "remembers", past: "remembered", pp: "remembered", ing: "remembering", vc: "state", trans: "transitive", takes_inf: true, topics: ["state", "knowledge"], tags: ["mental"], typed: ["remember", "remembers", "remembered", "remembering"], ex: "I remember your name.", notes: "Stative \u2014 typically present simple. Followed by infinitive ('remember to do') or gerund ('remember doing'); meanings differ slightly." }),
  E({ id: "rest", lemma: "rest", diff: 1, base: "rest", third: "rests", past: "rested", pp: "rested", ing: "resting", vc: "state", trans: "intransitive", topics: ["routines", "health"], tags: ["state"], typed: ["rest", "rests", "rested", "resting"], ex: "I need to rest.", notes: "Distinct from noun 'rest' (the remainder)." }),
  E({ id: "return", lemma: "return", diff: 1, base: "return", third: "returns", past: "returned", pp: "returned", ing: "returning", vc: "action", trans: "both", parts: ["to"], topics: ["movement", "actions"], tags: ["motion", "transfer"], typed: ["return", "returns", "returned", "returning"], ex: "She returns home at 5.", notes: "Two A1 senses: 'come back' (intransitive: 'return home') and 'give back' (transitive: 'return the book')." }),
  E({ id: "send", lemma: "send", diff: 1, base: "send", third: "sends", past: "sent", pp: "sent", ing: "sending", vc: "action", trans: "ditransitive", ipast: true, objects: ["letter", "message", "gift"], topics: ["communication", "actions"], tags: ["transfer"], typed: ["send", "sends", "sent", "sending"], ex: "She sends a letter.", notes: "Irregular: sent. Ditransitive: 'send X Y' (send me a letter) or 'send Y to X'." }),
  E({ id: "share", lemma: "share", diff: 1, base: "share", third: "shares", past: "shared", pp: "shared", ing: "sharing", vc: "action", trans: "both", parts: ["with"], objects: ["food", "toy", "book"], topics: ["social"], tags: ["transfer"], typed: ["share", "shares", "shared", "sharing"], ex: "Please share your toys.", notes: "Drops -e: sharing. Often: 'share X with Y'." }),
  E({ id: "shop_verb", lemma: "shop", diff: 1, base: "shop", third: "shops", past: "shopped", pp: "shopped", ing: "shopping", vc: "action", trans: "intransitive", parts: ["for"], topics: ["activities"], tags: ["activity"], typed: ["shop", "shops", "shopped", "shopping"], ex: "We shop on Saturday.", notes: "Verb id is 'shop_verb' to disambiguate from the noun lemma 'shop' (id 'shop'). Doubles the p: shopping, shopped." }),
  E({ id: "shut", lemma: "shut", diff: 1, base: "shut", third: "shuts", past: "shut", pp: "shut", ing: "shutting", vc: "action", trans: "transitive", ipast: true, objects: ["door", "window", "book"], topics: ["classroom_commands"], tags: ["common_action"], typed: ["shut", "shuts", "shutting", "close"], ex: "Shut the door.", notes: "Same form for V1, V2, V3 (all 'shut'). Doubles the t: shutting. Synonym of 'close' \u2014 may share variant_lexemes pool." }),
  E({ id: "sign", lemma: "sign", diff: 1, base: "sign", third: "signs", past: "signed", pp: "signed", ing: "signing", vc: "action", trans: "transitive", objects: ["paper", "name"], topics: ["actions"], tags: ["write"], typed: ["sign", "signs", "signed", "signing"], ex: "Please sign your name.", notes: "Distinct from noun 'sign' (a notice / gesture)." }),
  E({ id: "smile_verb", lemma: "smile", diff: 1, base: "smile", third: "smiles", past: "smiled", pp: "smiled", ing: "smiling", vc: "action", trans: "intransitive", parts: ["at"], topics: ["emotions", "social"], tags: ["affection"], typed: ["smile", "smiles", "smiled", "smiling"], ex: "She smiles at me.", notes: "Verb id is 'smile_verb' to disambiguate from the noun lemma 'smile' (id 'smile'). Drops -e: smiling. With object, takes 'at': 'smile AT me'." }),
  E({ id: "sneeze", lemma: "sneeze", diff: 1, base: "sneeze", third: "sneezes", past: "sneezed", pp: "sneezed", ing: "sneezing", vc: "action", trans: "intransitive", topics: ["body", "health"], tags: ["sound"], typed: ["sneeze", "sneezes", "sneezed", "sneezing"], ex: "I sneeze a lot in spring.", notes: "Drops -e: sneezing." }),
  E({ id: "spell", lemma: "spell", diff: 1, base: "spell", third: "spells", past: "spelled", pp: "spelled", ing: "spelling", vc: "action", trans: "transitive", objects: ["name", "word"], topics: ["school"], tags: ["literacy"], typed: ["spell", "spells", "spelled", "spelt", "spelling"], ex: "Can you spell your name?", notes: "British also accepts 'spelt' for V2/V3." }),
  E({ id: "spend", lemma: "spend", diff: 1, base: "spend", third: "spends", past: "spent", pp: "spent", ing: "spending", vc: "action", trans: "transitive", ipast: true, objects: ["money", "time"], topics: ["actions", "shopping"], tags: ["transfer"], typed: ["spend", "spends", "spent", "spending"], ex: "I spend my money.", notes: "Irregular: spent. Two A1 senses: 'spend money' and 'spend time'." }),
  E({ id: "taste", lemma: "taste", diff: 1, base: "taste", third: "tastes", past: "tasted", pp: "tasted", ing: "tasting", vc: "state", trans: "both", topics: ["food", "perception"], tags: ["sense"], typed: ["taste", "tastes", "tasted", "tasting"], ex: "I taste the soup.", notes: "Stative perception verb \u2014 often used with 'can': 'I can taste the salt'. Drops -e: tasting." }),
  E({ id: "thank", lemma: "thank", diff: 1, base: "thank", third: "thanks", past: "thanked", pp: "thanked", ing: "thanking", vc: "action", trans: "transitive", parts: ["for"], topics: ["communication", "social"], tags: ["politeness"], typed: ["thank", "thanks", "thanked", "thanking"], ex: "I thank my teacher.", notes: "Often 'thank X for Y'." }),
  E({ id: "touch", lemma: "touch", diff: 1, base: "touch", third: "touches", past: "touched", pp: "touched", ing: "touching", vc: "action", trans: "transitive", objects: ["wall", "book", "screen"], topics: ["actions", "perception"], tags: ["sense"], typed: ["touch", "touches", "touched", "touching"], ex: "Don't touch the wall.", notes: "ch \u2192 ches for third-person." }),
  E({ id: "understand", lemma: "understand", diff: 1, base: "understand", third: "understands", past: "understood", pp: "understood", ing: "understanding", vc: "state", trans: "transitive", ipast: true, topics: ["state", "knowledge"], tags: ["mental"], typed: ["understand", "understands", "understood", "understanding"], ex: "I understand the question.", notes: "Stative \u2014 typically present simple, not progressive. Irregular: understood." }),
  E({ id: "use", lemma: "use", diff: 1, base: "use", third: "uses", past: "used", pp: "used", ing: "using", vc: "action", trans: "transitive", objects: ["pen", "phone", "computer"], topics: ["actions"], tags: ["operate"], typed: ["use", "uses", "used", "using"], ex: "I use a pen.", notes: "Drops -e: using. Distinct from 'used to' (past habit), which is out of A1 scope." }),
  E({ id: "visit", lemma: "visit", diff: 1, base: "visit", third: "visits", past: "visited", pp: "visited", ing: "visiting", vc: "action", trans: "transitive", objects: ["grandma", "friend", "museum"], topics: ["social", "movement"], tags: ["social"], typed: ["visit", "visits", "visited", "visiting"], ex: "We visit grandma.", notes: "Transitive without preposition: 'visit grandma' (NOT 'visit to grandma')." }),
  E({ id: "warn", lemma: "warn", diff: 1, base: "warn", third: "warns", past: "warned", pp: "warned", ing: "warning", vc: "action", trans: "transitive", takes_inf: true, parts: ["about"], topics: ["communication"], tags: ["speech"], typed: ["warn", "warns", "warned", "warning"], ex: "She warns me about the dog.", notes: "Often 'warn X about Y' or 'warn X to do Y'." }),
  E({ id: "win", lemma: "win", diff: 1, base: "win", third: "wins", past: "won", pp: "won", ing: "winning", vc: "action", trans: "both", ipast: true, objects: ["game", "race", "prize"], topics: ["sports", "games"], tags: ["competition"], typed: ["win", "wins", "won", "winning"], ex: "We win the game.", notes: "Irregular: won. Doubles the n: winning. Distinct from noun 'win' (a victory)." }),
  E({ id: "wonder", lemma: "wonder", diff: 1, base: "wonder", third: "wonders", past: "wondered", pp: "wondered", ing: "wondering", vc: "state", trans: "both", topics: ["state", "knowledge"], tags: ["mental"], typed: ["wonder", "wonders", "wondered", "wondering"], ex: "I wonder what time it is.", notes: "Often followed by 'if/whether/wh-' clause: 'I wonder if it will rain.' Distinct from noun 'wonder' (amazement)." }),
  E({ id: "worry", lemma: "worry", diff: 1, base: "worry", third: "worries", past: "worried", pp: "worried", ing: "worrying", vc: "state", trans: "intransitive", parts: ["about"], topics: ["emotions"], tags: ["mental"], typed: ["worry", "worries", "worried", "worrying"], ex: "Don't worry about the test.", notes: "y \u2192 ies for third-person; y \u2192 ied for past. Often 'worry about'." }),
  E({ id: "wrap", lemma: "wrap", diff: 1, base: "wrap", third: "wraps", past: "wrapped", pp: "wrapped", ing: "wrapping", vc: "action", trans: "transitive", objects: ["gift", "box"], topics: ["actions"], tags: ["cover"], typed: ["wrap", "wraps", "wrapped", "wrapping"], ex: "She wraps the gift.", notes: "Doubles the p: wrapping, wrapped." }),
  E({ id: "yell", lemma: "yell", diff: 1, base: "yell", third: "yells", past: "yelled", pp: "yelled", ing: "yelling", vc: "action", trans: "intransitive", parts: ["at"], topics: ["communication", "emotions"], tags: ["sound"], typed: ["yell", "yells", "yelled", "yelling"], ex: "Don't yell at me.", notes: "Often 'yell at' someone." }),
];

const sortedNouns = [...NOUN_ENTRIES].sort((a, b) => a.id.localeCompare(b.id));
const sortedVerbs = [...VERB_ENTRIES].sort((a, b) => a.id.localeCompare(b.id));

function inlineObj(obj) {
  const parts = Object.entries(obj).map(([k, v]) => {
    const val =
      typeof v === "string"
        ? JSON.stringify(v)
        : typeof v === "boolean" || typeof v === "number"
          ? String(v)
          : JSON.stringify(v);
    return `${k}: ${val}`;
  });
  return `{ ${parts.join(", ")} }`;
}

function formatNounEntry(e) {
  const lines = [];
  lines.push(`    {`);
  lines.push(`      id: ${JSON.stringify(e.id)},`);
  lines.push(`      lemma: ${JSON.stringify(e.lemma)},`);
  lines.push(`      pos: "noun",`);
  lines.push(`      cefr: "a1",`);
  lines.push(`      difficulty: ${e.diff},`);

  const forms = { base: e.base };
  if (e.plural !== undefined) forms.plural = e.plural;
  lines.push(`      forms: ${inlineObj(forms)},`);

  const grammar = {};
  if (e.count) grammar.countability = e.count;
  if (e.art) grammar.article = e.art;
  if (e.ipl) grammar.irregular_plural = true;
  lines.push(`      grammar: ${inlineObj(grammar)},`);

  lines.push(`      topics: ${JSON.stringify(e.topics)},`);
  lines.push(`      tags: ${JSON.stringify(e.tags)},`);
  if (e.typed) lines.push(`      acceptable_typed_answers: ${JSON.stringify(e.typed)},`);
  if (e.media) lines.push(`      media_hint: ${JSON.stringify(e.media)},`);
  if (e.display) lines.push(`      display_label: ${JSON.stringify(e.display)},`);
  if (e.ex) lines.push(`      example_sentence: ${JSON.stringify(e.ex)},`);
  if (e.notes) lines.push(`      notes: ${JSON.stringify(e.notes)},`);
  lines.push(`    },`);
  return lines.join("\n");
}

function formatVerbEntry(e) {
  const lines = [];
  lines.push(`    {`);
  lines.push(`      id: ${JSON.stringify(e.id)},`);
  lines.push(`      lemma: ${JSON.stringify(e.lemma)},`);
  lines.push(`      pos: "verb",`);
  lines.push(`      cefr: "a1",`);
  lines.push(`      difficulty: ${e.diff},`);

  const forms = { base: e.base };
  if (e.third !== undefined) forms.third_person = e.third;
  if (e.past !== undefined) forms.past = e.past;
  if (e.pp !== undefined) forms.past_participle = e.pp;
  if (e.ing !== undefined) forms.present_participle = e.ing;
  if (e.am !== undefined) forms.am = e.am;
  if (e.is !== undefined) forms.is = e.is;
  if (e.are !== undefined) forms.are = e.are;
  if (e.was !== undefined) forms.was = e.was;
  if (e.were !== undefined) forms.were = e.were;
  lines.push(`      forms: ${inlineObj(forms)},`);

  const grammar = {};
  if (e.vc) grammar.verb_class = e.vc;
  if (e.trans) grammar.transitivity = e.trans;
  if (e.ipast) grammar.irregular_past = true;
  if (e.takes_inf) grammar.takes_infinitive = true;
  if (e.parts) grammar.particles = e.parts;
  if (e.objects) grammar.typical_objects = e.objects;
  lines.push(`      grammar: ${inlineObj(grammar)},`);

  lines.push(`      topics: ${JSON.stringify(e.topics)},`);
  lines.push(`      tags: ${JSON.stringify(e.tags)},`);
  if (e.typed) lines.push(`      acceptable_typed_answers: ${JSON.stringify(e.typed)},`);
  if (e.media) lines.push(`      media_hint: ${JSON.stringify(e.media)},`);
  if (e.display) lines.push(`      display_label: ${JSON.stringify(e.display)},`);
  if (e.ex) lines.push(`      example_sentence: ${JSON.stringify(e.ex)},`);
  if (e.notes) lines.push(`      notes: ${JSON.stringify(e.notes)},`);
  lines.push(`    },`);
  return lines.join("\n");
}

const HEADER = `/**
 * Master vocabulary for the curated A1 sentence-bank quiz pipeline.
 *
 * Each entry is a single lemma harvested from \`A1 Sentence Bank.csv\`
 * (target_word + variant_lexemes + sentence text). The compiler uses these
 * records to:
 *   - filter option pools by topic / CEFR / difficulty,
 *   - build correct surface forms (a vs an, plurals, irregular pasts/participles),
 *   - generate same-POS / same-CEFR distractors for MCQ,
 *   - resolve \`acceptable_typed_answers\` for fill-blanks grading.
 *
 * The single \`entries\` array holds every part of speech; the file is
 * grouped into banner-separated sections (NOUNS, VERBS, ...) for human
 * readability \u2014 each section is alphabetical by \`id\`.
 *
 * Generated by \`web/tmp/generate-master-vocabulary.mjs\`. To add or edit
 * entries, modify NOUN_ENTRIES / VERB_ENTRIES in that script and re-run it.
 */

export type Cefr = "pre_a1" | "a1" | "a2" | "b1" | "b2" | "c1";

export type Pos =
  | "noun"
  | "verb"
  | "adj"
  | "adv"
  | "pronoun"
  | "prep"
  | "det"
  | "conj"
  | "interjection"
  | "phrase";

export type Difficulty = 1 | 2 | 3;
export type Countability = "count" | "mass" | "both" | "n_a";
export type Article = "a" | "an" | "none";

/** What kind of verb \u2014 drives sentence pattern selection in the compiler. */
export type VerbClass =
  | "action"
  | "state"
  | "copula"
  | "modal"
  | "auxiliary";

/** How many objects the verb wants. */
export type Transitivity =
  | "transitive"
  | "intransitive"
  | "both"
  | "ditransitive";

export type VocabularyForms = {
  base: string;
  // Noun
  plural?: string;
  // Verb
  third_person?: string;
  past?: string;
  past_participle?: string;
  present_participle?: string;
  // Adjective / adverb
  comparative?: string;
  superlative?: string;
  // Copula 'be' irregulars (only set on the \`be\` entry)
  am?: string;
  is?: string;
  are?: string;
  was?: string;
  were?: string;
};

export type VocabularyGrammar = {
  // Noun
  countability?: Countability;
  article?: Article;
  proper_noun?: boolean;
  irregular_plural?: boolean;
  // Verb
  irregular_past?: boolean;
  verb_class?: VerbClass;
  transitivity?: Transitivity;
  /** Verb takes a bare or 'to'-infinitive complement (want, like, need, ...). */
  takes_infinitive?: boolean;
  /** Required prepositions / phrasal particles ('look at', 'pick up'). */
  particles?: string[];
  /** Common direct-object lemmas \u2014 hint for compiler slot filling and distractors. */
  typical_objects?: string[];
};

export type VocabularyEntry = {
  /** Stable slug, lowercase. Use as cross-ref key from sentences/options. */
  id: string;
  lemma: string;
  pos: Pos;
  cefr: Cefr;
  /** 1\u20133 within the CEFR band \u2014 used for difficulty filtering in the UI. */
  difficulty: Difficulty;
  forms: VocabularyForms;
  grammar: VocabularyGrammar;
  topics: string[];
  tags: string[];
  /** What counts as a correct typed answer when this lemma is the blank. */
  acceptable_typed_answers?: string[];
  /** Hint passed to the media-asset lookup (matches \`media_assets\` rows). */
  media_hint?: string;
  /** Override label if the rendered label differs from \`lemma\`. */
  display_label?: string;
  /** Canonical sentence pulled from the A1 Sentence Bank (where available). */
  example_sentence?: string;
  /** Author-only notes; never sent to the learner. */
  notes?: string;
};

export type VocabularyMaster = {
  schema_version: 1;
  generated_at: string;
  entries: VocabularyEntry[];
};

export const MASTER_VOCABULARY: VocabularyMaster = {
  schema_version: 1,
  generated_at: ${JSON.stringify(new Date().toISOString().slice(0, 10))},
  entries: [
`;

const FOOTER = `  ],
};
`;

const NOUN_BANNER = [
  "    // \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501",
  `    // NOUNS (alphabetical) \u2014 ${sortedNouns.length} entries`,
  "    // \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501",
].join("\n");

const VERB_BANNER = [
  "",
  "    // \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501",
  `    // VERBS (alphabetical) \u2014 ${sortedVerbs.length} entries`,
  "    // \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501",
].join("\n");

const nounBody = sortedNouns.map(formatNounEntry).join("\n");
const verbBody = sortedVerbs.map(formatVerbEntry).join("\n");

const body = [NOUN_BANNER, nounBody, VERB_BANNER, verbBody].join("\n");
const output = HEADER + body + "\n" + FOOTER;
fs.writeFileSync(target, output, "utf8");
console.log(
  `Wrote ${target} (${sortedNouns.length} nouns + ${sortedVerbs.length} verbs = ${sortedNouns.length + sortedVerbs.length} entries)`,
);
