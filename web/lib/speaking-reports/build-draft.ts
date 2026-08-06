import type {
  SpeakingReportSnapshot,
  SpeakingReportStudentNote,
} from "@/lib/speaking-reports/types";

export type RosterStudent = {
  studentId: string;
  displayName: string;
};

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function wordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function participationFromMentions(
  count: number,
): SpeakingReportStudentNote["participation"] {
  if (count <= 0) return "not_heard";
  if (count <= 2) return "brief";
  if (count <= 8) return "active";
  return "strong";
}

function pickKeyLines(lines: string[]): string[] {
  const scored = lines
    .map((line) => {
      const words = wordCount(line);
      const questionBonus = /\?/.test(line) ? 8 : 0;
      const lengthScore = Math.min(words, 40);
      return { line, score: lengthScore + questionBonus };
    })
    .filter((row) => row.score >= 6)
    .sort((a, b) => b.score - a.score);
  const picked: string[] = [];
  for (const row of scored) {
    if (picked.length >= 5) break;
    if (picked.some((existing) => existing === row.line)) continue;
    picked.push(row.line.slice(0, 220));
  }
  return picked;
}

function linesMentioningName(lines: string[], displayName: string): string[] {
  const needle = normalizeName(displayName);
  if (!needle) return [];
  const first = needle.split(" ")[0] ?? needle;
  return lines.filter((line) => {
    const hay = normalizeName(line);
    return hay.includes(needle) || (first.length >= 3 && hay.includes(first));
  });
}

/**
 * Rule-based draft from transcript plain text + class roster.
 * Always available (no API key). Teachers edit before approving.
 */
export function buildSpeakingReportDraft(input: {
  sessionTitle: string;
  classTitle: string | null;
  plainText: string;
  roster: RosterStudent[];
}): SpeakingReportSnapshot {
  const lines = input.plainText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const totalWords = wordCount(input.plainText);
  const keyLines = pickKeyLines(lines);

  const studentNotes: SpeakingReportStudentNote[] = input.roster.map((student) => {
    const hits = linesMentioningName(lines, student.displayName);
    const mentionCount = hits.length;
    const participation = participationFromMentions(mentionCount);
    const quotes = hits.slice(0, 2).map((line) => line.slice(0, 180));
    let note: string;
    if (mentionCount === 0) {
      note =
        "Not clearly identified by name in this transcript. They may still have spoken — check the recording if needed.";
    } else if (participation === "brief") {
      note =
        "Appears briefly in the transcript. Consider inviting a fuller answer next time.";
    } else if (participation === "active") {
      note =
        "Contributed several times. Look for accurate target language and willingness to try.";
    } else {
      note =
        "Highly visible in the transcript. Strong participation — note accuracy and stretch goals.";
    }
    return {
      studentId: student.studentId,
      displayName: student.displayName,
      matchedInTranscript: mentionCount > 0,
      mentionCount,
      participation,
      note,
      evidenceQuotes: quotes,
    };
  });

  const unmatchedStudents = studentNotes.filter((s) => !s.matchedInTranscript);
  const activeStudents = studentNotes.filter((s) => s.matchedInTranscript);

  const classSummary =
    lines.length === 0
      ? "No transcript text was available for this session."
      : [
          `Auto draft from the class transcript (~${totalWords} words, ${lines.length} lines).`,
          activeStudents.length > 0
            ? `${activeStudents.length} enrolled student name(s) appear in the text; ${unmatchedStudents.length} were not clearly matched.`
            : input.roster.length > 0
              ? "Enrolled student names were not clearly matched in the transcript — speaker labels may be missing."
              : "No class roster was linked; notes below are class-level only.",
          keyLines[0]
            ? `Opening sample: “${keyLines[0]}”`
            : "Review the full transcript for speaking evidence.",
        ].join(" ");

  const keyMoments =
    keyLines.length > 0
      ? keyLines.slice(0, 5).map((line, index) => ({
          title: index === 0 ? "Transcript highlight" : `Moment ${index + 1}`,
          detail: line,
        }))
      : [
          {
            title: "No clear highlights",
            detail:
              "The transcript was too short or sparse to pick key moments automatically. Skim the raw text and add notes yourself.",
          },
        ];

  const followUps: string[] = [];
  if (unmatchedStudents.length > 0 && input.roster.length > 0) {
    followUps.push(
      `Check speaking from students not matched in text: ${unmatchedStudents
        .slice(0, 6)
        .map((s) => s.displayName)
        .join(", ")}${unmatchedStudents.length > 6 ? "…" : ""}.`,
    );
  }
  const brief = studentNotes.filter((s) => s.participation === "brief");
  if (brief.length > 0) {
    followUps.push(
      `Invite fuller answers next class from: ${brief
        .slice(0, 5)
        .map((s) => s.displayName)
        .join(", ")}.`,
    );
  }
  if (followUps.length === 0) {
    followUps.push(
      "Confirm accuracy of any quotes before sharing notes outside this teacher view.",
    );
  }

  return {
    schemaVersion: 1,
    sessionTitle: input.sessionTitle.slice(0, 240) || "Virtual Classroom",
    classTitle: input.classTitle,
    generatedLabel: "Procedural draft from transcript",
    classSummary,
    keyMoments,
    studentNotes,
    followUps,
    teacherCaveat:
      "This draft is generated from the opt-in transcript. Speaker matching by display name is imperfect. Edit before approving. Approved reports stay teacher-only in this version.",
  };
}
