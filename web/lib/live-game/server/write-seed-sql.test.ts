import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildSystemQuestionSetSeeds } from "@/lib/live-game/question-banks/seed-data";

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlJson(value: unknown): string {
  return sqlString(JSON.stringify(value));
}

describe("live-game question set seed sql export", () => {
  it("writes the 036 migration file from current seed builders", () => {
    const seeds = buildSystemQuestionSetSeeds();
    const lines: string[] = [
      "-- Seed system Live Game question sets (Phase Q1). Idempotent for system sets.",
      "",
    ];

    for (const set of seeds) {
      lines.push(`-- ${set.slug}`);
      lines.push("insert into public.live_game_question_sets (");
      lines.push(
        "  id, slug, title, level, topic, learning_objective, description, version, status, visibility, sort_order",
      );
      lines.push(") values (");
      lines.push(
        `  '${set.id}', ${sqlString(set.slug)}, ${sqlString(set.title)}, ${sqlString(set.level)},`,
      );
      lines.push(
        `  ${sqlString(set.topic)}, ${sqlString(set.learningObjective)}, ${sqlString(set.description)},`,
      );
      lines.push(`  ${set.version}, '${set.status}', '${set.visibility}', ${set.sortOrder}`);
      lines.push(")");
      lines.push("on conflict (slug) do update set");
      lines.push("  title = excluded.title,");
      lines.push("  level = excluded.level,");
      lines.push("  topic = excluded.topic,");
      lines.push("  learning_objective = excluded.learning_objective,");
      lines.push("  description = excluded.description,");
      lines.push("  version = excluded.version,");
      lines.push("  status = excluded.status,");
      lines.push("  visibility = excluded.visibility,");
      lines.push("  sort_order = excluded.sort_order,");
      lines.push("  updated_at = now();");
      lines.push("");
      lines.push(`delete from public.live_game_questions where set_id = '${set.id}';`);
      lines.push("");

      for (const question of set.questions) {
        lines.push("insert into public.live_game_questions (");
        lines.push(
          "  id, set_id, bank, sort_order, prompt, payload, enabled, legacy_source_id",
        );
        lines.push(") values (");
        lines.push(
          `  '${question.id}', '${question.setId}', '${question.bank}', ${question.sortOrder},`,
        );
        lines.push(
          `  ${sqlString(question.prompt)}, ${sqlJson(question.payload)}::jsonb, true, ${sqlString(question.legacySourceId)}`,
        );
        lines.push(");");
      }
      lines.push("");
    }

    const outputPath = resolve(
      process.cwd(),
      "supabase/migrations/036_seed_live_game_question_sets.sql",
    );
    writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
    expect(seeds.reduce((count, set) => count + set.questions.length, 0)).toBe(160);
  });
});
