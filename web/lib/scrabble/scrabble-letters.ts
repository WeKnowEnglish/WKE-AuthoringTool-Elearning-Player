/** Kid-friendly bag: heavy vowels and common consonants. */
export const LETTER_BAG: readonly string[] = [
  "E", "E", "E", "E", "E", "E", "E", "E", "E", "E", "E", "E",
  "A", "A", "A", "A", "A", "A", "A", "A", "A",
  "I", "I", "I", "I", "I", "I", "I", "I",
  "O", "O", "O", "O", "O", "O", "O", "O",
  "N", "N", "N", "N", "N", "N",
  "R", "R", "R", "R", "R", "R",
  "T", "T", "T", "T", "T", "T",
  "L", "L", "L", "L",
  "S", "S", "S", "S",
  "D", "D", "D", "D",
  "U", "U", "U", "U",
  "H", "H", "H",
  "P", "P", "P",
  "M", "M", "M",
  "C", "C", "C",
  "G", "G",
  "B", "B",
  "F", "F",
  "Y", "Y",
  "W", "W",
  "K",
  "V",
] as const;

export const RACK_SIZE = 7;

export function createShuffledBag(random: () => number = Math.random): string[] {
  const bag = [...LETTER_BAG];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [bag[i], bag[j]] = [bag[j]!, bag[i]!];
  }
  return bag;
}

export function drawFromBag(bag: string[], count: number): {
  drawn: string[];
  remaining: string[];
} {
  const drawn = bag.slice(0, count);
  return { drawn, remaining: bag.slice(count) };
}

export function refillRack(
  rack: string[],
  bag: string[],
  targetSize: number = RACK_SIZE,
): { rack: string[]; bag: string[] } {
  const need = Math.max(0, targetSize - rack.length);
  if (need === 0) return { rack: [...rack], bag: [...bag] };
  const { drawn, remaining } = drawFromBag(bag, need);
  return { rack: [...rack, ...drawn], bag: remaining };
}

/** Can rack supply all needed letters (with multiplicity)? */
export function rackCanSupply(rack: string[], needed: string[]): boolean {
  const pool = rack.map((l) => l.toUpperCase());
  for (const letter of needed.map((l) => l.toUpperCase())) {
    const idx = pool.indexOf(letter);
    if (idx === -1) return false;
    pool.splice(idx, 1);
  }
  return true;
}

export function consumeFromRack(rack: string[], needed: string[]): string[] {
  const pool = [...rack];
  for (const letter of needed.map((l) => l.toUpperCase())) {
    const idx = pool.findIndex((l) => l.toUpperCase() === letter);
    if (idx === -1) throw new Error(`Rack missing ${letter}`);
    pool.splice(idx, 1);
  }
  return pool;
}
