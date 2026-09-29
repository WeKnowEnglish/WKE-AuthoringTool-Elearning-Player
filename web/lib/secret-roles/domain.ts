export const SECRET_ROLE_PHASES = [
  "briefing",
  "discussion",
  "decision",
  "reveal",
  "debrief",
  "completed",
] as const;

export type SecretRolePhase = (typeof SECRET_ROLE_PHASES)[number];

export type SecretRoleStudent = {
  id: string;
  displayName: string;
};

/** Teacher-authored card. `copies` allows a role or clue to be shared by a team. */
export type SecretRoleCard = {
  id: string;
  title: string;
  privateInformation: string;
  mission: string;
  sentenceFrames: string[];
  copies: number;
};

export type SecretRoleAssignment = {
  studentId: string;
  displayName: string;
  cardId: string;
};

export type SecretRoleRound = {
  id: string;
  sessionId: string;
  title: string;
  scenario: string;
  learningObjective: string;
  successCriteria: string;
  discussionPrompt: string;
  phase: SecretRolePhase;
};

export type SecretRolePublicView = Omit<SecretRoleRound, "sessionId">;

export type SecretRoleStudentView = {
  round: SecretRolePublicView;
  assignment: {
    studentId: string;
    displayName: string;
    role: Omit<SecretRoleCard, "copies">;
  };
  /** Present only after the teacher enters Reveal. */
  revealedRoles?: Array<Omit<SecretRoleCard, "copies">>;
};

export type AssignSecretRolesInput = {
  students: SecretRoleStudent[];
  cards: SecretRoleCard[];
  /** A stable round id is a good seed. The same input then produces the same assignment. */
  seed: string;
};

export type SecretRoleLaunchDraft = Omit<SecretRoleRound, "id" | "sessionId" | "phase"> & {
  cards: SecretRoleCard[];
};

export function createMissingBagDraft(studentCount: number): SecretRoleLaunchDraft {
  const safeCount = Math.max(2, Math.floor(studentCount));
  return {
    title: "The missing bag",
    scenario: "A school bag was beside the library door before break. Now it is in the classroom.",
    learningObjective: "Ask follow-up questions and justify a conclusion with evidence.",
    successCriteria: "Ask two questions and support your final answer with one clue.",
    discussionPrompt: "Who moved the bag, and why?",
    cards: [
      {
        id: "witness",
        title: "Witness",
        privateInformation: "You saw the bag beside the library door just before it started raining.",
        mission: "Find out where the bag went. Share your clue in your own words.",
        sentenceFrames: ["I noticed…", "Where were you when…?", "What happened after…?"],
        copies: safeCount - 1,
      },
      {
        id: "helper",
        title: "Helpful student",
        privateInformation: "You moved the bag into the classroom because rain was coming.",
        mission: "Explain your reason after at least two classmates ask you a question.",
        sentenceFrames: ["I moved it because…", "First…, so then…"],
        copies: 1,
      },
    ],
  };
}

export function isSecretRolePhase(value: unknown): value is SecretRolePhase {
  return typeof value === "string" && SECRET_ROLE_PHASES.includes(value as SecretRolePhase);
}

export function canTransitionSecretRolePhase(
  current: SecretRolePhase,
  next: SecretRolePhase,
): boolean {
  if (current === "completed" || current === next) return false;
  const currentIndex = SECRET_ROLE_PHASES.indexOf(current);
  const nextIndex = SECRET_ROLE_PHASES.indexOf(next);
  if (currentIndex >= SECRET_ROLE_PHASES.indexOf("reveal")) {
    return nextIndex === currentIndex + 1;
  }
  return nextIndex < currentIndex || nextIndex === currentIndex + 1;
}

function nonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

function normalizeStudent(student: SecretRoleStudent): SecretRoleStudent {
  return {
    id: nonEmpty(student.id, "Student id"),
    displayName: nonEmpty(student.displayName, "Student name"),
  };
}

function normalizeCard(card: SecretRoleCard): SecretRoleCard {
  const copies = Math.floor(card.copies);
  if (!Number.isFinite(copies) || copies < 1) {
    throw new Error("Every secret role card needs at least one copy.");
  }
  return {
    id: nonEmpty(card.id, "Role card id"),
    title: nonEmpty(card.title, "Role title"),
    privateInformation: nonEmpty(card.privateInformation, "Private information"),
    mission: nonEmpty(card.mission, "Role mission"),
    sentenceFrames: card.sentenceFrames.map((frame) => frame.trim()).filter(Boolean),
    copies,
  };
}

/** FNV-1a gives the seeded shuffle a stable 32-bit starting value. */
function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function seededRandom(seed: string): () => number {
  let state = hashSeed(seed);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(values: T[], seed: string): T[] {
  const random = seededRandom(seed);
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

/**
 * Assign one card to every present student without relying on array order or Math.random().
 * The operation is deterministic so launch retries cannot silently change students' secrets.
 */
export function assignSecretRoles(input: AssignSecretRolesInput): SecretRoleAssignment[] {
  const students = input.students.map(normalizeStudent);
  const cards = input.cards.map(normalizeCard);
  if (!students.length) throw new Error("At least one student is required.");
  if (new Set(students.map((student) => student.id)).size !== students.length) {
    throw new Error("Student ids must be unique.");
  }
  if (new Set(cards.map((card) => card.id)).size !== cards.length) {
    throw new Error("Role card ids must be unique.");
  }

  if (cards.length > students.length) {
    throw new Error(
      `Too many distinct roles: ${cards.length} roles cannot all appear with only ${students.length} students.`,
    );
  }
  const cardPool = cards.flatMap((card) =>
    Array.from({ length: card.copies }, () => card.id),
  );
  if (cardPool.length < students.length) {
    throw new Error(
      `Not enough role cards: ${students.length} students need ${students.length} cards, but only ${cardPool.length} copies are available.`,
    );
  }

  const seed = nonEmpty(input.seed, "Assignment seed");
  const stableStudents = [...students].sort((a, b) => a.id.localeCompare(b.id));
  // Reserve one copy of every authored role so a key mystery role cannot be shuffled out when
  // the teacher provides more copies than the live roster needs.
  const requiredCards = cards.map((card) => card.id);
  const optionalCopies = cards.flatMap((card) =>
    Array.from({ length: card.copies - 1 }, () => card.id),
  );
  const selectedCards = [
    ...requiredCards,
    ...shuffle(optionalCopies, `${seed}:copies`).slice(0, students.length - requiredCards.length),
  ];
  const shuffledCards = shuffle(selectedCards, `${seed}:assignments`);
  return stableStudents.map((student, index) => ({
    studentId: student.id,
    displayName: student.displayName,
    cardId: shuffledCards[index],
  }));
}

export function toSecretRolePublicView(round: SecretRoleRound): SecretRolePublicView {
  return {
    id: round.id,
    title: round.title,
    scenario: round.scenario,
    learningObjective: round.learningObjective,
    successCriteria: round.successCriteria,
    discussionPrompt: round.discussionPrompt,
    phase: round.phase,
  };
}

/**
 * The only projection a student route may return. It requires a single authenticated student id
 * and intentionally has no collection of roles or assignments in its result shape.
 */
export function toSecretRoleStudentView(input: {
  round: SecretRoleRound;
  cards: SecretRoleCard[];
  assignments: SecretRoleAssignment[];
  studentId: string;
}): SecretRoleStudentView | null {
  const assignment = input.assignments.find((item) => item.studentId === input.studentId);
  if (!assignment) return null;
  const card = input.cards.find((item) => item.id === assignment.cardId);
  if (!card) throw new Error("Assigned role card was not found.");
  return {
    round: toSecretRolePublicView(input.round),
    assignment: {
      studentId: assignment.studentId,
      displayName: assignment.displayName,
      role: {
        id: card.id,
        title: card.title,
        privateInformation: card.privateInformation,
        mission: card.mission,
        sentenceFrames: card.sentenceFrames,
      },
    },
  };
}
