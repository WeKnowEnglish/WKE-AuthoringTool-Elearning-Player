const GRAMMAR_SEGMENT = "[a-z][a-z0-9_]*";

/** grammar.<l1>[.<l2>[.<l3>[.<l4>]]] — 1 to 4 segments after `grammar.` */
export const GRAMMAR_ID_PATTERN = new RegExp(
  `^grammar\\.${GRAMMAR_SEGMENT}(?:\\.${GRAMMAR_SEGMENT}){0,3}$`,
);

/** error.<family>.<specific> */
export const ERROR_CODE_PATTERN = /^error\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;

export const DOMAIN_ENTRY_SENTINEL = "domain_entry" as const;

export type DomainEntrySentinel = typeof DOMAIN_ENTRY_SENTINEL;

const grammarL1Pattern = new RegExp(`^grammar\\.${GRAMMAR_SEGMENT}$`);
const grammarL2Pattern = new RegExp(`^grammar\\.${GRAMMAR_SEGMENT}\\.${GRAMMAR_SEGMENT}$`);
const grammarL3Pattern = new RegExp(
  `^grammar\\.${GRAMMAR_SEGMENT}\\.${GRAMMAR_SEGMENT}\\.${GRAMMAR_SEGMENT}$`,
);
const grammarL4Pattern = new RegExp(
  `^grammar\\.${GRAMMAR_SEGMENT}\\.${GRAMMAR_SEGMENT}\\.${GRAMMAR_SEGMENT}\\.${GRAMMAR_SEGMENT}$`,
);

export function countGrammarSegments(id: string): number {
  if (!id.startsWith("grammar.")) return 0;
  return id.slice("grammar.".length).split(".").length;
}

export function isGrammarId(id: string): boolean {
  return GRAMMAR_ID_PATTERN.test(id);
}

export function isGrammarL1Id(id: string): boolean {
  return grammarL1Pattern.test(id);
}

export function isGrammarL2Id(id: string): boolean {
  return grammarL2Pattern.test(id);
}

export function isGrammarL3Id(id: string): boolean {
  return grammarL3Pattern.test(id);
}

export function isGrammarL4Id(id: string): boolean {
  return grammarL4Pattern.test(id);
}

export function isGrammarConceptId(id: string): boolean {
  return isGrammarL3Id(id);
}

export function isGrammarMicroSkillId(id: string): boolean {
  return isGrammarL4Id(id);
}

export function isErrorCode(id: string): boolean {
  return ERROR_CODE_PATTERN.test(id);
}

export function isDomainEntrySentinel(id: string): id is DomainEntrySentinel {
  return id === DOMAIN_ENTRY_SENTINEL;
}

export function isConceptPrecursorId(id: string): boolean {
  return isDomainEntrySentinel(id) || isGrammarL3Id(id);
}

export function isConceptEdgeId(id: string): boolean {
  return isGrammarL3Id(id) || isGrammarL4Id(id);
}

export function isValidL4ChildId(l4Id: string, l3Id: string): boolean {
  if (!l4Id.startsWith(`${l3Id}.`)) return false;
  const suffix = l4Id.slice(l3Id.length + 1);
  return suffix.length > 0 && !suffix.includes(".");
}

export function parseErrorCode(id: string): { family: string; specific: string } | null {
  if (!isErrorCode(id)) return null;
  const parts = id.split(".");
  if (parts.length !== 3) return null;
  return { family: parts[1]!, specific: parts[2]! };
}
