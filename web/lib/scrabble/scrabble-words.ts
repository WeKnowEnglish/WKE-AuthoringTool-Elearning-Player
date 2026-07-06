/** Curated short words for young learners (2–6 letters). */
export const KID_SCRABBLE_WORDS = new Set(
  [
    "AM", "AN", "AS", "AT", "BE", "BY", "DO", "GO", "HE", "IF", "IN", "IS", "IT",
    "ME", "MY", "NO", "OF", "ON", "OR", "SO", "TO", "UP", "US", "WE",
    "ACT", "ADD", "AGE", "AGO", "AID", "AIM", "AIR", "ATE", "BAN", "BAR", "BAY",
    "BET", "BIB", "BID", "BIN", "BIT", "BOW", "BUG", "BUN", "BUY", "CAB", "COP",
    "COT", "CUB", "DAB", "DAM", "DEN", "DEW", "DIE", "DIM", "DIN", "DIP", "DOE",
    "DYE", "FAN", "FEE", "FEW", "FIB", "FIT", "FIX", "FOE", "FRY", "FUR", "GAL",
    "GEL", "GEM", "GIN", "GOD", "GUY", "GYM", "HAM", "HAY", "HEM", "HEW", "HEX",
    "HID", "HIP", "HOP", "HUB", "HUE", "HUM", "HUN", "ICY", "INN", "IRE", "IVY",
    "JAB", "JIG", "JOG", "JOT", "JUG", "KEG", "KEN", "KIN", "LAD", "LAG", "LAX",
    "LEA", "LIE", "LIT", "LUG", "LYE", "MAW", "MAX", "MID", "MOB", "MOP", "MOW",
    "NAB", "NAG", "NAV", "NAY", "NIB", "NIL", "NIP", "NIT", "NOD", "NOR", "NUN",
    "OAF", "OAT", "ODE", "OFT", "ORE", "PEA", "PEG", "PEP", "PER", "PEW", "PIP",
    "POD", "POP", "POW", "PRO", "PRY", "PUB", "PUG", "PUN", "PUP", "RAP", "RIB",
    "RID", "RIG", "RIM", "RIP", "ROB", "ROD", "ROT", "RUB", "RUG", "RUM", "RUT",
    "SAP", "SIP", "SIR", "SOB", "SOD", "SOP", "SOT", "SOW", "SOY", "SPA",
    "SPY", "SUB", "SUM", "SUN", "SUP", "TAB", "TAD", "TAG", "TAN", "TAP", "TAR",
    "TAX", "TIC", "TIE", "TIP", "TOE", "TON", "TOP", "TOT", "TOW", "TOY", "TUG",
    "TUX", "URN", "VAN", "VAT", "VET", "VIA", "VIE", "WAD", "WAG", "WAR", "WAX",
    "WEB", "WED", "WET", "WIG", "WIN", "WIT", "WOE", "WOK", "WON", "WOO", "YAK",
    "YAM", "YAP", "YAW", "YEP", "YIN", "YIP", "ZAP", "ZED", "ZEN", "ZIG", "ZIP",
    "AND", "ANT", "ARE", "ARM", "ART", "ASK", "BAD", "BAG", "BAT", "BED", "BEE",
    "BIG", "BOX", "BOY", "BUS", "BUT", "CAN", "CAP", "CAR", "CAT", "COW", "CUP",
    "CUT", "DAD", "DAY", "DID", "DIG", "DOG", "DOT", "DRY", "DUE", "EAR", "EAT",
    "EGG", "END", "EYE", "FAR", "FAT", "FED", "FIG", "FIN", "FLY", "FOG", "FOR",
    "FOX", "FUN", "GAP", "GAS", "GET", "GOT", "GUM", "GUN", "GUT", "HAD", "HAS",
    "HAT", "HEN", "HER", "HIM", "HIS", "HIT", "HOG", "HOT", "HOW", "HUG", "HUT",
    "ICE", "ILL", "INK", "ITS", "JAM", "JAR", "JET", "JOB", "JOY", "KEY", "KID",
    "KIT", "LAB", "LAP", "LAW", "LAY", "LED", "LEG", "LET", "LID", "LIP", "LOG",
    "LOT", "LOW", "MAD", "MAN", "MAP", "MAT", "MAY", "MEN", "MET", "MIX", "MOM",
    "MUD", "MUG", "NAP", "NET", "NEW", "NOT", "NOW", "NUT", "OAK", "OAR", "ODD",
    "OFF", "OIL", "OLD", "ONE", "OUR", "OUT", "OWL", "OWN", "PAD", "PAN", "PAT",
    "PAW", "PAY", "PEN", "PET", "PIE", "PIG", "PIN", "PIT", "POT", "PUT", "RAG",
    "RAM", "RAN", "RAT", "RAW", "RED", "RIB", "RID", "RIM", "RIP", "ROB", "ROD",
    "ROT", "ROW", "RUB", "RUG", "RUN", "RUT", "SAD", "SAT", "SAW", "SAY", "SEA",
    "SEE", "SET", "SHE", "SHY", "SIT", "SIX", "SKY", "SON", "SUN", "TAB", "TAG",
    "TAN", "TAP", "TAR", "TEA", "TEN", "THE", "TIE", "TIN", "TIP", "TOE", "TON",
    "TOP", "TOY", "TRY", "TUB", "TWO", "USE", "VAN", "VAT", "VET", "WAR", "WAS",
    "WAX", "WAY", "WEB", "WET", "WHO", "WHY", "WIN", "WON", "YES", "YET", "YOU",
    "ZOO",
    "BOOK", "COOK", "COOL", "DARK", "DUCK", "FISH", "FIVE", "FOUR", "FROG",
    "GAME", "GIRL", "GOOD", "HAND", "HARD", "HEAD", "HELP", "HIDE", "HILL", "HOLD",
    "HOME", "HOPE", "HORN", "HURT", "IDEA", "JUMP", "JUST", "KEEP", "KIND", "KITE",
    "KNOW", "LAMP", "LAND", "LAST", "LATE", "LAKE", "LEAF", "LEFT", "LIKE", "LINE",
    "LION", "LIST", "LIVE", "LONG", "LOOK", "LOST", "LOVE", "MADE", "MAIL", "MAIN",
    "MAKE", "MALE", "MALL", "MANY", "MEAL", "MEAN", "MEAT", "MELT", "MILD", "MILE",
    "MILK", "MIND", "MINE", "MISS", "MOON", "MORE", "MOST", "MOVE", "MUCH", "MUST",
    "NAME", "NEAR", "NECK", "NEED", "NEST", "NEWS", "NICE", "NINE", "NOSE", "NOTE",
    "ONCE", "ONLY", "OPEN", "OVER", "PACK", "PAGE", "PAIN", "PAIR", "PALE", "PALM",
    "PARK", "PART", "PASS", "PAST", "PATH", "PEAK", "PICK", "PILE", "PINK", "PIPE",
    "PLAN", "PLAY", "PLOT", "PLUG", "PLUS", "POEM", "POND", "POOL", "POOR", "PORT",
    "POST", "PULL", "PUMP", "PURE", "PUSH", "RACE", "RAIN", "RANK", "RARE", "RATE",
    "READ", "REAL", "REAR", "RELY", "RENT", "REST", "RICE", "RICH", "RIDE", "RING",
    "RISE", "RISK", "ROAD", "ROCK", "ROLE", "ROLL", "ROOF", "ROOM", "ROPE", "ROSE",
    "RULE", "RUSH", "SAFE", "SAIL", "SALE", "SALT", "SAME", "SAND", "SAVE", "SEAL",
    "SEAT", "SEED", "SEEK", "SEEM", "SELL", "SEND", "SHIP", "SHOP", "SHOT", "SHOW",
    "SICK", "SIDE", "SIGN", "SILK", "SING", "SINK", "SIZE", "SKIN", "SKIP", "SLIP",
    "SLOW", "SNOW", "SOFT", "SOIL", "SOLD", "SOME", "SONG", "SOON", "SORT", "SOUL",
    "SOUP", "SOUR", "SPOT", "STAR", "STAY", "STEM", "STEP", "STIR", "STOP", "SUCH",
    "SUIT", "SURE", "SWIM", "TAIL", "TAKE", "TALE", "TALK", "TALL", "TANK", "TAPE",
    "TASK", "TEAM", "TELL", "TENT", "TEST", "TEXT", "THAN", "THAT", "THEM", "THEN",
    "THEY", "THIN", "THIS", "TIDE", "TIED", "TILE", "TIME", "TINY", "TIRE", "TOLD",
    "TONE", "TOOK", "TOOL", "TOUR", "TOWN", "TREE", "TRIP", "TRUE", "TUBE", "TUNE",
    "TURN", "TWIN", "TYPE", "UNIT", "UPON", "USED", "USER", "VAST", "VERY", "VICE",
    "VIEW", "VINE", "VOTE", "WAGE", "WAIT", "WAKE", "WALK", "WALL", "WANT", "WARD",
    "WARM", "WARN", "WASH", "WAVE", "WEAK", "WEAR", "WEEK", "WELL", "WENT", "WERE",
    "WEST", "WHAT", "WHEN", "WIFE", "WILD", "WILL", "WIND", "WINE", "WING", "WIRE",
    "WISE", "WISH", "WITH", "WOOD", "WORD", "WORK", "WORM", "WRAP", "YARD", "YEAR",
    "YOUR", "ZERO", "ZONE",
  ].map((w) => w.toUpperCase()),
);

export type KidScrabbleWordOptions = {
  minLength?: number;
  maxLength?: number;
};

/** True when the word is in the kid Scrabble list and within optional length bounds. */
export function isKidScrabbleWord(
  word: string,
  options?: KidScrabbleWordOptions,
): boolean {
  const normalized = word.trim().toUpperCase();
  if (!/^[A-Z]+$/.test(normalized)) return false;
  const minLength = options?.minLength ?? 2;
  const maxLength = options?.maxLength ?? 24;
  if (normalized.length < minLength || normalized.length > maxLength) return false;
  return KID_SCRABBLE_WORDS.has(normalized);
}

export function isValidWord(word: string): boolean {
  return isKidScrabbleWord(word);
}

export function allWordsValid(words: string[]): boolean {
  return words.every((w) => isValidWord(w));
}
