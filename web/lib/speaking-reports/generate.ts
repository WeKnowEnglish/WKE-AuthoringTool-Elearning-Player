import "server-only";

import { buildSpeakingReportDraft, type RosterStudent } from "@/lib/speaking-reports/build-draft";
import {
  speakingReportSnapshotSchema,
  type SpeakingReportSnapshot,
} from "@/lib/speaking-reports/types";

/**
 * Prefer OpenAI when OPENAI_API_KEY is set; otherwise heuristic draft.
 */
export async function generateSpeakingReportSnapshot(input: {
  sessionTitle: string;
  classTitle: string | null;
  plainText: string;
  roster: RosterStudent[];
}): Promise<{ snapshot: SpeakingReportSnapshot; method: "heuristic" | "llm" }> {
  const heuristic = buildSpeakingReportDraft(input);
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || input.plainText.trim().length < 40) {
    return { snapshot: heuristic, method: "heuristic" };
  }

  try {
    const llm = await generateWithOpenAi({
      apiKey,
      sessionTitle: input.sessionTitle,
      classTitle: input.classTitle,
      plainText: input.plainText.slice(0, 24_000),
      roster: input.roster,
      fallback: heuristic,
    });
    const parsed = speakingReportSnapshotSchema.safeParse(llm);
    if (!parsed.success) {
      return { snapshot: heuristic, method: "heuristic" };
    }
    return { snapshot: parsed.data, method: "llm" };
  } catch {
    return { snapshot: heuristic, method: "heuristic" };
  }
}

async function generateWithOpenAi(input: {
  apiKey: string;
  sessionTitle: string;
  classTitle: string | null;
  plainText: string;
  roster: RosterStudent[];
  fallback: SpeakingReportSnapshot;
}): Promise<unknown> {
  const rosterBlock =
    input.roster.length === 0
      ? "(no roster)"
      : input.roster
          .map((s) => `- ${s.displayName} (id:${s.studentId})`)
          .join("\n");

  const system = `You are an ESL teaching assistant. From a live class transcript, produce a JSON speaking report for the teacher to review and edit.
Rules:
- Focus on student speaking: participation, attempts, risk-taking, useful language — not generic meeting minutes.
- Be cautious: imperfect STT and name matching. Prefer "not clearly heard" over inventing quotes.
- Only use quotes that appear (approx) in the transcript.
- Keep language teacher-facing, clear, and kind.
- Return JSON only matching the provided schema.`;

  const user = `Session: ${input.sessionTitle}
Class: ${input.classTitle ?? "one-off"}
Roster:
${rosterBlock}

Transcript:
"""
${input.plainText}
"""

Return JSON with schemaVersion 1 fields:
sessionTitle, classTitle (string|null), generatedLabel, classSummary,
keyMoments[{title,detail}] (max 5),
studentNotes[{studentId|null,displayName,matchedInTranscript,mentionCount,participation(not_heard|brief|active|strong),note,evidenceQuotes[]}],
followUps[], teacherCaveat.

Include every roster student in studentNotes when roster is non-empty.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_SPEAKING_REPORT_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI ${response.status}`);
  }
  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI content");
  const parsed = JSON.parse(content) as Record<string, unknown>;
  return {
    ...input.fallback,
    ...parsed,
    schemaVersion: 1,
    sessionTitle:
      typeof parsed.sessionTitle === "string"
        ? parsed.sessionTitle
        : input.fallback.sessionTitle,
    classTitle:
      parsed.classTitle === null || typeof parsed.classTitle === "string"
        ? parsed.classTitle
        : input.fallback.classTitle,
  };
}
