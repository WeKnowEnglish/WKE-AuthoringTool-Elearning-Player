import { wordItemSupportsSecondaryActivity } from "@/lib/secondary/secondary-practice-types";
import type { SecondaryVocabItem, SecondaryVocabPack } from "@/lib/secondary/types";

export type SecondaryClozeTier = "A" | "B" | "C" | "D";

/** Minimum share of pack items at tier A or B (Phase 6A gate). */
export const SECONDARY_CLOZE_TIER_AB_MIN_PERCENT = 80;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function wordAppearsInExampleSentence(item: SecondaryVocabItem): boolean {
  const example = item.exampleSentence?.trim();
  if (!example) return false;
  const pattern = new RegExp(`\\b${escapeRegExp(item.word)}\\b`, "i");
  return pattern.test(example);
}

export function classifySecondaryClozeTier(item: SecondaryVocabItem): SecondaryClozeTier {
  const frame = item.sentenceFrame?.trim();
  if (frame && /_{2,}/.test(frame)) return "A";

  const example = item.exampleSentence?.trim();
  if (!example) return "D";

  if (wordAppearsInExampleSentence(item)) return "B";

  return "C";
}

export function clozeClauseScoreForItem(item: SecondaryVocabItem): number {
  const tier = classifySecondaryClozeTier(item);
  if (tier === "A") return 3;
  if (tier === "B") return 2;
  return 0;
}

export function itemIsClozeTagged(item: SecondaryVocabItem): boolean {
  return wordItemSupportsSecondaryActivity(item, "cloze");
}

export type SecondaryClozeTierCounts = Record<SecondaryClozeTier, number>;

export function emptyClozeTierCounts(): SecondaryClozeTierCounts {
  return { A: 0, B: 0, C: 0, D: 0 };
}

export function countClozeTiers(items: SecondaryVocabItem[]): SecondaryClozeTierCounts {
  const counts = emptyClozeTierCounts();
  for (const item of items) {
    counts[classifySecondaryClozeTier(item)] += 1;
  }
  return counts;
}

export type SecondaryClozeCoverageRow = {
  wordItemId: string;
  word: string;
  topicId: string;
  setId: string;
  tier: SecondaryClozeTier;
  clozeTagged: boolean;
};

export type SecondaryClozeTopicSummary = {
  topicId: string;
  topicTitle: string;
  total: number;
  counts: SecondaryClozeTierCounts;
  tierABPercent: number;
};

export type SecondaryClozeSetSummary = {
  topicId: string;
  setId: string;
  setTitle: string;
  total: number;
  counts: SecondaryClozeTierCounts;
  tierABPercent: number;
};

export type SecondaryClozeCoverageReport = {
  totalItems: number;
  counts: SecondaryClozeTierCounts;
  tierABPercent: number;
  clozeTaggedTotal: number;
  clozeTaggedCounts: SecondaryClozeTierCounts;
  clozeTaggedTierABPercent: number;
  tierCItems: SecondaryClozeCoverageRow[];
  tierDItems: SecondaryClozeCoverageRow[];
  topics: SecondaryClozeTopicSummary[];
  sets: SecondaryClozeSetSummary[];
  rows: SecondaryClozeCoverageRow[];
};

function tierABPercent(counts: SecondaryClozeTierCounts, total: number): number {
  if (total === 0) return 0;
  return Math.round(((counts.A + counts.B) / total) * 100);
}

export function buildSecondaryClozeCoverageReport(pack: SecondaryVocabPack): SecondaryClozeCoverageReport {
  const rows: SecondaryClozeCoverageRow[] = [];

  for (const topic of pack.topics) {
    for (const set of topic.sets) {
      for (const item of set.items) {
        rows.push({
          wordItemId: item.wordItemId,
          word: item.word,
          topicId: topic.topicId,
          setId: set.setId,
          tier: classifySecondaryClozeTier(item),
          clozeTagged: itemIsClozeTagged(item),
        });
      }
    }
  }

  const allItems = pack.topics.flatMap((topic) => topic.sets.flatMap((set) => set.items));
  const itemCounts = countClozeTiers(allItems);

  const clozeTaggedItems = allItems.filter(itemIsClozeTagged);
  const clozeTaggedCounts = countClozeTiers(clozeTaggedItems);

  const topics: SecondaryClozeTopicSummary[] = pack.topics.map((topic) => {
    const topicItems = topic.sets.flatMap((set) => set.items);
    const topicCounts = countClozeTiers(topicItems);
    return {
      topicId: topic.topicId,
      topicTitle: topic.title,
      total: topicItems.length,
      counts: topicCounts,
      tierABPercent: tierABPercent(topicCounts, topicItems.length),
    };
  });

  const sets: SecondaryClozeSetSummary[] = pack.topics.flatMap((topic) =>
    topic.sets.map((set) => {
      const setCounts = countClozeTiers(set.items);
      return {
        topicId: topic.topicId,
        setId: set.setId,
        setTitle: set.title,
        total: set.items.length,
        counts: setCounts,
        tierABPercent: tierABPercent(setCounts, set.items.length),
      };
    }),
  );

  return {
    totalItems: allItems.length,
    counts: itemCounts,
    tierABPercent: tierABPercent(itemCounts, allItems.length),
    clozeTaggedTotal: clozeTaggedItems.length,
    clozeTaggedCounts,
    clozeTaggedTierABPercent: tierABPercent(clozeTaggedCounts, clozeTaggedItems.length),
    tierCItems: rows.filter((row) => row.tier === "C"),
    tierDItems: rows.filter((row) => row.tier === "D"),
    topics,
    sets,
    rows,
  };
}

export type SecondaryClozeCoverageIssue = {
  code: "cloze_tier_c" | "cloze_tier_d";
  message: string;
  wordItemId: string;
  tier: SecondaryClozeTier;
};

/** Validation issues for cloze-tagged items below tier B. */
export function collectSecondaryClozeCoverageIssues(
  pack: SecondaryVocabPack,
): SecondaryClozeCoverageIssue[] {
  const issues: SecondaryClozeCoverageIssue[] = [];

  for (const topic of pack.topics) {
    for (const set of topic.sets) {
      for (const item of set.items) {
        if (!itemIsClozeTagged(item)) continue;
        const tier = classifySecondaryClozeTier(item);
        if (tier === "D") {
          issues.push({
            code: "cloze_tier_d",
            message: `Cloze-tagged item lacks usable example or sentence frame: ${item.wordItemId}`,
            wordItemId: item.wordItemId,
            tier,
          });
        } else if (tier === "C") {
          issues.push({
            code: "cloze_tier_c",
            message: `Cloze-tagged item word not substitutable in example: ${item.wordItemId} (${item.word})`,
            wordItemId: item.wordItemId,
            tier,
          });
        }
      }
    }
  }

  return issues;
}

export function formatSecondaryClozeCoverageReport(report: SecondaryClozeCoverageReport): string {
  const lines: string[] = [
    `Secondary cloze coverage — ${report.totalItems} items`,
    `Tier A (sentenceFrame): ${report.counts.A}`,
    `Tier B (word in example): ${report.counts.B}`,
    `Tier C (weak example): ${report.counts.C}`,
    `Tier D (none): ${report.counts.D}`,
    `Tier A+B: ${report.tierABPercent}% (floor ${SECONDARY_CLOZE_TIER_AB_MIN_PERCENT}%)`,
    `Cloze-tagged (${report.clozeTaggedTotal}): A+B ${report.clozeTaggedTierABPercent}%`,
    "",
    "By topic:",
  ];

  for (const topic of report.topics) {
    lines.push(
      `  ${topic.topicTitle} (${topic.topicId}): ${topic.total} words — A:${topic.counts.A} B:${topic.counts.B} C:${topic.counts.C} D:${topic.counts.D} — A+B ${topic.tierABPercent}%`,
    );
  }

  if (report.tierCItems.length > 0) {
    lines.push("", "Tier C (needs sentenceFrame or example fix):");
    for (const row of report.tierCItems.slice(0, 25)) {
      lines.push(`  ${row.wordItemId} — ${row.word} [${row.topicId}/${row.setId}]`);
    }
    if (report.tierCItems.length > 25) {
      lines.push(`  … and ${report.tierCItems.length - 25} more`);
    }
  }

  if (report.tierDItems.length > 0) {
    lines.push("", "Tier D (blocking for cloze-tagged):");
    for (const row of report.tierDItems) {
      lines.push(`  ${row.wordItemId} — ${row.word}`);
    }
  }

  return lines.join("\n");
}
