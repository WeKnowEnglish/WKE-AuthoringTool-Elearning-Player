import { describe, expect, it } from "vitest";
import { aggregateHostEvidence, aggregateStudentEvidence } from "@/lib/live-game/reports/aggregate";
import type { LiveGameAttemptRow, LiveGameEncounterRow } from "@/lib/live-game/reports/types";

function encounter(overrides: Partial<LiveGameEncounterRow> = {}): LiveGameEncounterRow {
  return {
    id: "encounter-1",
    round_id: "round-1",
    challenge_id: "challenge-1",
    player_id: "student-1",
    question_id: "question-1",
    question_bank: "harvest",
    question_type: "multiple_choice",
    question_prompt: "Which sentence is correct?",
    correct_answer: ["I am ready."],
    learning_target_key: "target-1",
    learning_target_label: "Use be in the present simple",
    cefr_level: "A1",
    game_action_type: "harvest",
    game_object_id: "tree-1",
    resource_type: "wood",
    recipe_id: null,
    opened_at: "2026-07-14T00:00:00.000Z",
    resolved_at: "2026-07-14T00:00:05.000Z",
    resolution: "correct",
    system_hints_used: 0,
    teacher_support_level: 0,
    help_requested_at: null,
    ...overrides,
  };
}

function attempt(overrides: Partial<LiveGameAttemptRow> = {}): LiveGameAttemptRow {
  return {
    encounter_id: "encounter-1",
    submission_id: "00000000-0000-4000-8000-000000000001",
    submission_index: 1,
    selected_answer: "I am ready.",
    is_correct: true,
    response_time_ms: 5_000,
    contribution: { harvested: { wood: 1 } },
    submitted_at: "2026-07-14T00:00:05.000Z",
    ...overrides,
  };
}

describe("Reporting V2 aggregation", () => {
  it("builds a private student report with question review and contributions", () => {
    const report = aggregateStudentEvidence([attempt()], [encounter()]);
    expect(report.firstTrySolved).toBe(1);
    expect(report.independentSolved).toBe(1);
    expect(report.accuracyPercent).toBe(100);
    expect(report.contributions.harvested).toEqual({ wood: 1 });
    expect(report.questions[0]).toMatchObject({
      prompt: "Which sentence is correct?",
      correctAnswer: "I am ready.",
      status: "first_try",
    });
  });

  it("distinguishes retry success from unresolved evidence", () => {
    const retryEncounter = encounter({ id: "encounter-2", challenge_id: "challenge-2", question_id: "question-2" });
    const unresolved = encounter({ id: "encounter-3", challenge_id: "challenge-3", question_id: "question-3", resolution: "unresolved" });
    const rows = [
      attempt({ encounter_id: "encounter-2", submission_index: 1, submission_id: "00000000-0000-4000-8000-000000000002", is_correct: false, contribution: {} }),
      attempt({ encounter_id: "encounter-2", submission_index: 2, submission_id: "00000000-0000-4000-8000-000000000003" }),
      attempt({ encounter_id: "encounter-3", submission_index: 1, submission_id: "00000000-0000-4000-8000-000000000004", is_correct: false, contribution: {} }),
    ];
    const report = aggregateStudentEvidence(rows, [retryEncounter, unresolved]);
    expect(report.questions.map((question) => question.status)).toEqual(["after_practice", "keep_practicing"]);
    expect(report.unresolvedEncounters).toBe(1);
  });

  it("keeps the host view alphabetical rather than ranking students", () => {
    const evidence = aggregateHostEvidence(
      [attempt()],
      [encounter()],
      [
        { player_id: "host", display_name: "Teacher", role: "host" },
        { player_id: "student-2", display_name: "Zoey", role: "player" },
        { player_id: "student-1", display_name: "Alex", role: "player" },
      ],
      { wood: 2 },
    );
    expect(evidence.students.map((student) => student.displayName)).toEqual(["Alex", "Zoey"]);
    expect(evidence.team.participantCount).toBe(2);
    expect(evidence.team.finalResources).toEqual({ wood: 2 });
  });
});
