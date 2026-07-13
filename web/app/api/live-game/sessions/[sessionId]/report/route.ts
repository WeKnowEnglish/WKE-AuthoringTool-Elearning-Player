import { NextResponse } from "next/server";
import { aggregateHostEvidence, aggregateStudentEvidence } from "@/lib/live-game/reports/aggregate";
import type { LiveGameHostReport, LiveGameReport, LiveGameStudentReport } from "@/lib/live-game/reports/types";
import { requireLiveGamePlayerSession, roomIdForSession } from "@/lib/live-game/server/player-session";
import {
  finalizeLiveGameReportRound,
  loadLatestLiveGameReportRound,
  loadLiveGameReportEvidence,
  readFinalResources,
} from "@/lib/live-game/server/report-repository";
import { readLiveGameStorageJson } from "@/lib/live-game/server/read-storage";
import { readSessionQuestionSetBinding } from "@/lib/live-game/server/question-set-session";
import { getQuestionSetSnapshot } from "@/lib/live-game/server/question-set-resolver";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { sessionId: rawSessionId } = await context.params;
    const sessionId = rawSessionId.trim().toUpperCase();
    const roomId = roomIdForSession(sessionId);
    const playerSession = await requireLiveGamePlayerSession(roomId);
    let round = await loadLatestLiveGameReportRound(roomId);
    if (!round || round.status === "active") {
      const storage = await readLiveGameStorageJson(roomId);
      if (storage?.session.phase === "completed") {
        const binding = readSessionQuestionSetBinding(storage.session);
        const questionSet = await getQuestionSetSnapshot(binding.ref, binding.version);
        await finalizeLiveGameReportRound({
          storage,
          questionSet,
          reason:
            storage.session.objectiveCompleted ? "objective_completed"
            : storage.session.lobbyNotice?.reason === "timeout" ? "timeout"
            : "host_ended_early",
          endedAt: storage.session.victoryAt ?? storage.session.lobbyNotice?.at ?? Date.now(),
        });
        round = await loadLatestLiveGameReportRound(roomId);
      }
    }
    if (!round || round.status !== "completed") {
      return NextResponse.json(
        { error: "Your round report is still being prepared." },
        { status: 409, headers: { "Retry-After": "1" } },
      );
    }

    const evidence = await loadLiveGameReportEvidence(round.id);
    const hostEvidence = aggregateHostEvidence(
      evidence.attempts,
      evidence.encounters,
      evidence.participants,
      readFinalResources(round),
    );
    const base = {
      version: 2 as const,
      sessionId,
      classId: round.class_id,
      classTitle: round.class_title,
      roundNumber: round.round_number,
      questionSetTitle: round.question_set_title,
      level: round.level,
      topic: round.topic,
      learningObjective: round.learning_objective,
      endReason: round.end_reason,
      endedAt: round.ended_at,
      team: hostEvidence.team,
    };

    let report: LiveGameReport;
    if (playerSession.role === "host") {
      report = {
        ...base,
        role: "host",
        students: hostEvidence.students,
        targets: hostEvidence.targets,
        questionTypes: hostEvidence.questionTypes,
        questionDiagnostics: hostEvidence.questionDiagnostics,
      } satisfies LiveGameHostReport;
    } else {
      const encounters = evidence.encounters.filter(
        (encounter) => encounter.player_id === playerSession.playerId,
      );
      const encounterIds = new Set(encounters.map((encounter) => encounter.id));
      const attempts = evidence.attempts.filter((attempt) => encounterIds.has(attempt.encounter_id));
      report = {
        ...base,
        role: "student",
        personal: aggregateStudentEvidence(attempts, encounters),
      } satisfies LiveGameStudentReport;
    }

    return NextResponse.json(report, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "LIVE_GAME_UNAUTHORIZED") {
      return NextResponse.json({ error: "Not authorized." }, { status: 401 });
    }
    console.error("Live-game report request failed", error);
    return NextResponse.json(
      { error: "The round report is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}
