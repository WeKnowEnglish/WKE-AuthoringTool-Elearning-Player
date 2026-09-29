import { describe, expect, it } from "vitest";
import {
  assignSecretRoles,
  canTransitionSecretRolePhase,
  createMissingBagDraft,
  toSecretRoleStudentView,
  type SecretRoleCard,
  type SecretRoleRound,
} from "@/lib/secret-roles/domain";

const cards: SecretRoleCard[] = [
  {
    id: "witness",
    title: "Witness",
    privateInformation: "You saw a red bag beside the library door.",
    mission: "Find out who moved the bag without reading your clue aloud.",
    sentenceFrames: ["I noticed…", "Where were you when…?"],
    copies: 2,
  },
  {
    id: "helper",
    title: "Helpful student",
    privateInformation: "You moved the bag to keep it dry.",
    mission: "Explain your reason after two classmates ask you a question.",
    sentenceFrames: ["I moved it because…"],
    copies: 1,
  },
];

const round: SecretRoleRound = {
  id: "sr_01",
  sessionId: "vcs_01",
  title: "The missing bag",
  scenario: "A bag has moved during break time.",
  learningObjective: "Ask follow-up questions and justify a conclusion.",
  successCriteria: "Ask two questions and support your conclusion with one clue.",
  discussionPrompt: "Who moved the bag, and why?",
  phase: "briefing",
};

describe("secret role assignment", () => {
  it("assigns exactly one card to every student deterministically", () => {
    const input = {
      students: [
        { id: "student-b", displayName: "Bao" },
        { id: "student-a", displayName: "An" },
        { id: "student-c", displayName: "Chi" },
      ],
      cards,
      seed: "sr_01",
    };
    const first = assignSecretRoles(input);
    const retry = assignSecretRoles({ ...input, students: [...input.students].reverse() });

    expect(first).toEqual(retry);
    expect(first).toHaveLength(3);
    expect(new Set(first.map((item) => item.studentId)).size).toBe(3);
    expect(first.map((item) => item.cardId)).toContain("helper");
  });

  it("fails before launch when the teacher has not provided enough copies", () => {
    expect(() =>
      assignSecretRoles({
        students: [
          { id: "one", displayName: "One" },
          { id: "two", displayName: "Two" },
        ],
        cards: [{ ...cards[1], copies: 1 }],
        seed: "round",
      }),
    ).toThrow(/Not enough role cards/);
  });

  it("keeps every authored role in play when extra copies are available", () => {
    const assignments = assignSecretRoles({
      students: [
        { id: "one", displayName: "One" },
        { id: "two", displayName: "Two" },
      ],
      cards: [
        { ...cards[0], copies: 8 },
        { ...cards[1], copies: 1 },
      ],
      seed: "over-provisioned",
    });

    expect(assignments.map((item) => item.cardId).sort()).toEqual(["helper", "witness"]);
  });
});

describe("student privacy projection", () => {
  it("returns only the requesting student's private card", () => {
    const assignments = [
      { studentId: "student-a", displayName: "An", cardId: "witness" },
      { studentId: "student-b", displayName: "Bao", cardId: "helper" },
    ];
    const view = toSecretRoleStudentView({
      round,
      cards,
      assignments,
      studentId: "student-a",
    });

    expect(view?.assignment.role.title).toBe("Witness");
    expect(JSON.stringify(view)).not.toContain("You moved the bag");
    expect(JSON.stringify(view)).not.toContain("student-b");
    expect(view?.round).not.toHaveProperty("sessionId");
  });

  it("returns no view for a student without an assignment", () => {
    expect(
      toSecretRoleStudentView({
        round,
        cards,
        assignments: [],
        studentId: "late-student",
      }),
    ).toBeNull();
  });
});

describe("secret role teaching flow", () => {
  it("creates a roster-covering starter mystery", () => {
    const draft = createMissingBagDraft(8);
    expect(draft.cards.reduce((sum, card) => sum + card.copies, 0)).toBe(8);
    expect(draft.learningObjective).toMatch(/follow-up questions/i);
  });

  it("allows one-step progress and teacher-controlled backward moves", () => {
    expect(canTransitionSecretRolePhase("briefing", "discussion")).toBe(true);
    expect(canTransitionSecretRolePhase("decision", "briefing")).toBe(true);
    expect(canTransitionSecretRolePhase("briefing", "reveal")).toBe(false);
    expect(canTransitionSecretRolePhase("reveal", "decision")).toBe(false);
    expect(canTransitionSecretRolePhase("completed", "debrief")).toBe(false);
  });
});
