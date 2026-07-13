import type {
  LiveGameAttemptRow,
  LiveGameContributionSummary,
  LiveGameEncounterRow,
  LiveGameLearningBreakdown,
  LiveGamePersonalSummary,
  LiveGameQuestionDiagnostic,
  LiveGameQuestionOutcome,
  LiveGameReportParticipantRow,
  LiveGameStudentDiagnostic,
  LiveGameTeamSummary,
} from "@/lib/live-game/reports/types";

const emptyContributions = (): LiveGameContributionSummary => ({ harvested: {}, deposited: {}, crafted: {} });

function displayAnswer(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join(" ");
  if (typeof value === "string") return value;
  if (value == null) return "";
  return JSON.stringify(value);
}

function isSolved(encounter: LiveGameEncounterRow) {
  return encounter.resolution === "correct";
}

function isSupported(encounter: LiveGameEncounterRow) {
  return encounter.system_hints_used > 0 || encounter.teacher_support_level > 0;
}

function attemptsByEncounter(attempts: LiveGameAttemptRow[]) {
  const result = new Map<string, LiveGameAttemptRow[]>();
  for (const attempt of [...attempts].sort((a, b) => a.submission_index - b.submission_index)) {
    const group = result.get(attempt.encounter_id) ?? [];
    group.push(attempt);
    result.set(attempt.encounter_id, group);
  }
  return result;
}

function addCount(target: Record<string, number>, key: string, amount: number) {
  if (!key || amount <= 0) return;
  target[key] = (target[key] ?? 0) + amount;
}

function aggregateContributions(attempts: LiveGameAttemptRow[]) {
  const result = emptyContributions();
  for (const attempt of attempts) {
    const contribution = attempt.contribution;
    for (const category of ["harvested", "deposited", "crafted"] as const) {
      const values = contribution[category];
      if (!values || typeof values !== "object") continue;
      for (const [key, amount] of Object.entries(values)) {
        if (typeof amount === "number") addCount(result[category], key, amount);
      }
    }
  }
  return result;
}

function statusFor(encounter: LiveGameEncounterRow, attempts: LiveGameAttemptRow[]): LiveGameQuestionOutcome["status"] {
  if (encounter.resolution === "skipped") return "skipped";
  if (!isSolved(encounter)) return attempts.length > 0 ? "keep_practicing" : "not_completed";
  if (isSupported(encounter)) return "supported";
  return attempts[0]?.is_correct ? "first_try" : "after_practice";
}

function outcomeFor(encounter: LiveGameEncounterRow, attempts: LiveGameAttemptRow[]): LiveGameQuestionOutcome {
  return {
    challengeId: encounter.challenge_id,
    questionId: encounter.question_id,
    bank: encounter.question_bank,
    questionType: encounter.question_type,
    prompt: encounter.question_prompt,
    correctAnswer: displayAnswer(encounter.correct_answer),
    learningTargetLabel: encounter.learning_target_label,
    actionContext:
      encounter.game_action_type === "craft" && encounter.recipe_id ? `craft ${encounter.recipe_id.replaceAll("_", " ")}`
      : encounter.resource_type ? `${encounter.game_action_type} ${encounter.resource_type}`
      : encounter.game_action_type,
    status: statusFor(encounter, attempts),
    answers: attempts.map((attempt) => ({ selectedAnswer: displayAnswer(attempt.selected_answer), correct: attempt.is_correct })),
  };
}

function recommendation(encounters: number, independent: number, unresolved: number) {
  if (encounters < 2) return "insufficient_evidence" as const;
  if (unresolved / encounters >= 0.4 || independent / encounters < 0.5) return "reteach" as const;
  if (independent / encounters < 0.8) return "practice" as const;
  return "secure" as const;
}

function breakdowns(
  encounters: LiveGameEncounterRow[],
  attempts: LiveGameAttemptRow[],
  keyFor: (encounter: LiveGameEncounterRow) => string,
  labelFor: (encounter: LiveGameEncounterRow) => string,
): LiveGameLearningBreakdown[] {
  const grouped = new Map<string, LiveGameEncounterRow[]>();
  const attemptMap = attemptsByEncounter(attempts);
  for (const encounter of encounters) {
    const key = keyFor(encounter);
    const group = grouped.get(key) ?? [];
    group.push(encounter);
    grouped.set(key, group);
  }
  return [...grouped.values()].map((group) => {
    const first = group[0]!;
    const firstTry = group.filter((encounter) => {
      const rows = attemptMap.get(encounter.id) ?? [];
      return isSolved(encounter) && !isSupported(encounter) && rows[0]?.is_correct === true;
    }).length;
    const independent = group.filter((encounter) => isSolved(encounter) && !isSupported(encounter)).length;
    const supported = group.filter((encounter) => isSolved(encounter) && isSupported(encounter)).length;
    const unresolved = group.length - independent - supported;
    return {
      key: keyFor(first),
      label: labelFor(first),
      encounters: group.length,
      firstTry,
      independent,
      supported,
      unresolved,
      firstTryPercent: Math.round(firstTry / group.length * 100),
      action: recommendation(group.length, independent, unresolved),
    };
  }).sort((a, b) => a.label.localeCompare(b.label));
}

export function aggregateStudentEvidence(
  attempts: LiveGameAttemptRow[],
  encounters: LiveGameEncounterRow[],
): LiveGamePersonalSummary {
  const attemptMap = attemptsByEncounter(attempts);
  const questions = [...encounters]
    .sort((a, b) => Date.parse(a.opened_at) - Date.parse(b.opened_at))
    .map((encounter) => outcomeFor(encounter, attemptMap.get(encounter.id) ?? []));
  const targets = breakdowns(encounters, attempts, (encounter) => encounter.learning_target_key, (encounter) => encounter.learning_target_label);
  const questionTypes = breakdowns(encounters, attempts, (encounter) => encounter.question_bank, (encounter) => encounter.question_bank);
  const correctSubmissions = attempts.filter((attempt) => attempt.is_correct).length;
  const responseTimes = attempts.map((attempt) => attempt.response_time_ms).filter((value): value is number => value !== null);
  const independentSolved = questions.filter((question) => question.status === "first_try" || question.status === "after_practice").length;
  const supportedSolved = questions.filter((question) => question.status === "supported").length;
  return {
    totalSubmissions: attempts.length,
    correctSubmissions,
    accuracyPercent: attempts.length ? Math.round(correctSubmissions / attempts.length * 100) : null,
    questionsSolved: independentSolved + supportedSolved,
    firstTrySolved: questions.filter((question) => question.status === "first_try").length,
    independentSolved,
    supportedSolved,
    unresolvedEncounters: questions.filter((question) => ["keep_practicing", "skipped", "not_completed"].includes(question.status)).length,
    averageResponseTimeMs: responseTimes.length ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length) : null,
    contributions: aggregateContributions(attempts),
    strengths: targets.filter((target) => target.action === "secure").map((target) => target.label),
    practiceTargets: targets.filter((target) => target.action === "practice" || target.action === "reteach").map((target) => target.label),
    targets,
    questionTypes,
    questions,
  };
}

function questionDiagnostics(attempts: LiveGameAttemptRow[], encounters: LiveGameEncounterRow[]): LiveGameQuestionDiagnostic[] {
  const byQuestion = new Map<string, LiveGameEncounterRow[]>();
  const encounterAttempts = attemptsByEncounter(attempts);
  for (const encounter of encounters) {
    const key = `${encounter.question_bank}:${encounter.question_id}`;
    const group = byQuestion.get(key) ?? [];
    group.push(encounter);
    byQuestion.set(key, group);
  }
  return [...byQuestion.values()].map((group) => {
    const rows = group.flatMap((encounter) => encounterAttempts.get(encounter.id) ?? []);
    const incorrectPercent = rows.length ? Math.round(rows.filter((row) => !row.is_correct).length / rows.length * 100) : 0;
    const unresolvedPercent = Math.round(group.filter((encounter) => !isSolved(encounter)).length / group.length * 100);
    const averageAttempts = Math.round(rows.length / group.length * 100) / 100;
    const times = rows.map((row) => row.response_time_ms).filter((value): value is number => value !== null);
    const averageResponseTimeMs = times.length ? Math.round(times.reduce((sum, value) => sum + value, 0) / times.length) : null;
    const supportRequests = group.filter((encounter) => encounter.help_requested_at).length;
    const reasons: string[] = [];
    if (group.length >= 2) {
      if (incorrectPercent >= 50) reasons.push("Many incorrect submissions");
      if (averageAttempts >= 1.75) reasons.push("Repeated attempts needed");
      if (averageResponseTimeMs !== null && averageResponseTimeMs >= 30_000) reasons.push("Long response time");
      if (unresolvedPercent >= 30) reasons.push("Often left unresolved");
      if (supportRequests >= 2) reasons.push("Frequent help requests");
    }
    const signal: LiveGameQuestionDiagnostic["signal"] = reasons.length >= 2 || reasons.includes("Many incorrect submissions") || reasons.includes("Often left unresolved") ? "review" : reasons.length ? "watch" : "clear";
    return {
      questionId: group[0]!.question_id,
      prompt: group[0]!.question_prompt,
      bank: group[0]!.question_bank,
      encounters: group.length,
      incorrectSubmissionPercent: incorrectPercent,
      averageAttempts,
      averageResponseTimeMs,
      unresolvedPercent,
      supportRequests,
      signal,
      reasons,
    };
  }).sort((a, b) => ({ review: 0, watch: 1, clear: 2 })[a.signal] - ({ review: 0, watch: 1, clear: 2 })[b.signal]);
}

export function aggregateHostEvidence(
  attempts: LiveGameAttemptRow[],
  encounters: LiveGameEncounterRow[],
  participants: LiveGameReportParticipantRow[],
  finalResources: Record<string, number>,
) {
  const independent = encounters.filter((encounter) => isSolved(encounter) && !isSupported(encounter)).length;
  const supported = encounters.filter((encounter) => isSolved(encounter) && isSupported(encounter)).length;
  const studentParticipants = participants.filter((participant) => participant.role === "player");
  const team: LiveGameTeamSummary = {
    participantCount: studentParticipants.length,
    totalEncounters: encounters.length,
    totalSubmissions: attempts.length,
    independentCompletions: independent,
    supportedCompletions: supported,
    unresolvedEncounters: encounters.length - independent - supported,
    contributions: aggregateContributions(attempts),
    finalResources,
  };
  const students: LiveGameStudentDiagnostic[] = studentParticipants.map((participant) => {
    const ownEncounters = encounters.filter((encounter) => encounter.player_id === participant.player_id);
    const encounterIds = new Set(ownEncounters.map((encounter) => encounter.id));
    const ownAttempts = attempts.filter((attempt) => encounterIds.has(attempt.encounter_id));
    const personal = aggregateStudentEvidence(ownAttempts, ownEncounters);
    return {
      playerId: participant.player_id,
      displayName: participant.display_name,
      totalEncounters: ownEncounters.length,
      firstTry: personal.firstTrySolved,
      independent: personal.independentSolved,
      supported: personal.supportedSolved,
      unresolved: personal.unresolvedEncounters,
      accuracyPercent: personal.accuracyPercent,
      targetsNeedingSupport: personal.practiceTargets,
      contributions: personal.contributions,
    };
  }).sort((a, b) => a.displayName.localeCompare(b.displayName));
  return {
    team,
    students,
    targets: breakdowns(encounters, attempts, (encounter) => encounter.learning_target_key, (encounter) => encounter.learning_target_label),
    questionTypes: breakdowns(encounters, attempts, (encounter) => encounter.question_bank, (encounter) => encounter.question_bank),
    questionDiagnostics: questionDiagnostics(attempts, encounters),
  };
}
