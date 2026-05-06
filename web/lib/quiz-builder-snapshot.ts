import { STRUCTURES } from "../data/quiz-builder-structures";
import type { CefrLevel, Structure, VocabularyItem } from "../types/quiz-builder-brain";
import { matchesIntent, matchesTarget, vocabPoolsForGeneration } from "./quiz-builder-brain";

export type RejectionReason =
  | "target_mismatch"
  | "intent_mismatch"
  | "strict_topic_blocked"
  | "fallback_widened";

export type SnapshotVocabResult = {
  word: string;
  accepted: boolean;
  reasons: RejectionReason[];
};

export type StructureSnapshot = {
  id: string;
  template: string;
  target: string;
  intent?: string;
  level?: string;
  compatibleCount: number;
  rejectedCount: number;
  vocab: SnapshotVocabResult[];
  health: "BROKEN" | "RISKY" | "HEALTHY";
  familyKey: string;
  familyVariantCount: number;
  density: number;
};

export type TopicSnapshot = {
  topic: string;
  structures: StructureSnapshot[];
  eligibleStructures: number;
  totalDensity: number;
  dominance: {
    template: string;
    ratio: number;
  }[];
};

function normalizeTemplate(template: string): string {
  return template.replace("{subject}", "").replace("___", "").trim().toLowerCase();
}

function buildFamilyKey(s: Structure): string {
  return `${s.target}::${s.intent ?? "none"}::${normalizeTemplate(s.template)}`;
}

function traceCompatibility(args: {
  structure: Structure;
  vocab: VocabularyItem[];
  strictTopic: boolean;
  topic: string;
}): SnapshotVocabResult[] {
  const { structure, strictTopic, topic } = args;
  return args.vocab.map((v) => {
    const reasons: RejectionReason[] = [];

    if (!matchesTarget(structure, v)) reasons.push("target_mismatch");
    if (structure.intent && !matchesIntent(structure, v)) reasons.push("intent_mismatch");

    if (strictTopic && v.topic && topic !== "all" && v.topic !== topic) {
      reasons.push("strict_topic_blocked");
    }
    if (!strictTopic && topic !== "all" && v.topic !== topic && reasons.length === 0) {
      reasons.push("fallback_widened");
    }

    return {
      word: v.word,
      accepted: reasons.length === 0 || (reasons.length === 1 && reasons[0] === "fallback_widened"),
      reasons,
    };
  });
}

function buildStructureSnapshot(args: {
  structure: Structure;
  vocab: VocabularyItem[];
  strictTopic: boolean;
  topic: string;
  allStructures: Structure[];
}): StructureSnapshot {
  const traced = traceCompatibility(args);
  const accepted = traced.filter((v) => v.accepted);
  const rejected = traced.filter((v) => !v.accepted);
  const compatibleCount = accepted.length;

  let health: StructureSnapshot["health"] = "HEALTHY";
  if (compatibleCount <= 2) health = "BROKEN";
  else if (compatibleCount <= 4) health = "RISKY";

  const familyKey = buildFamilyKey(args.structure);
  const familyVariantCount = args.allStructures.filter((s) => buildFamilyKey(s) === familyKey).length;
  const density = compatibleCount * familyVariantCount;

  return {
    id: args.structure.id,
    template: args.structure.template,
    target: args.structure.target,
    intent: args.structure.intent,
    level: args.structure.level,
    compatibleCount,
    rejectedCount: rejected.length,
    vocab: traced.sort((a, b) => a.word.localeCompare(b.word)),
    health,
    familyKey,
    familyVariantCount,
    density,
  };
}

export function generateTopicSnapshot(args: {
  topic: string;
  level: CefrLevel;
  strictTopic?: boolean;
}): TopicSnapshot {
  const strictTopic = args.strictTopic ?? true;
  const pools = vocabPoolsForGeneration({
    topic: args.topic,
    level: args.level,
    strictTopic: false,
  });
  const vocab = [...pools.verbs, ...pools.nouns];

  const structures = STRUCTURES.filter((s) => s.level === args.level).sort((a, b) => a.id.localeCompare(b.id));
  const rows = structures.map((s) =>
    buildStructureSnapshot({
      structure: s,
      vocab,
      strictTopic,
      topic: args.topic,
      allStructures: structures,
    }),
  );

  const eligibleStructures = rows.filter((r) => r.compatibleCount > 0).length;
  const totalDensity = rows.reduce((sum, r) => sum + r.density, 0);

  const templateCounts: Record<string, number> = {};
  for (const r of rows) {
    templateCounts[r.template] = (templateCounts[r.template] ?? 0) + r.compatibleCount;
  }
  const total = Object.values(templateCounts).reduce((a, b) => a + b, 0);
  const dominance = Object.entries(templateCounts)
    .map(([template, count]) => ({
      template,
      ratio: total ? count / total : 0,
    }))
    .sort((a, b) => b.ratio - a.ratio);

  return {
    topic: args.topic,
    structures: rows,
    eligibleStructures,
    totalDensity,
    dominance,
  };
}
