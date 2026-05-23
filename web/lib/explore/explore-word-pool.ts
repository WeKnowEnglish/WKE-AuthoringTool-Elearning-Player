import type { ExploreGate } from "@/lib/lesson-schemas";
import { lookupWordIdFromLemma } from "@/lib/word-collection";

/** Word ids granted at explore encounter (from gate lemmas until world sets ship). */
export function buildExploreWordPool(gates: ExploreGate[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const gate of gates) {
    const raw = gate.target_word?.trim();
    if (!raw) continue;
    const id = lookupWordIdFromLemma(raw) ?? raw.toLowerCase();
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}
