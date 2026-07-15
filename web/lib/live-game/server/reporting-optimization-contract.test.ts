import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(relativeUrl: string) {
  return readFileSync(new URL(relativeUrl, import.meta.url), "utf8");
}

describe("Live Game reporting optimization contract", () => {
  it("does not finalize reports from each report reader", () => {
    const reportRoute = source("../../../app/api/live-game/sessions/[sessionId]/report/route.ts");
    expect(reportRoute).not.toContain("finalizeLiveGameReportRound");
    expect(reportRoute).toContain('status: 409');
  });

  it("records speculative challenges only after they are opened", () => {
    for (const route of [
      "../../../app/api/live-game/challenge/route.ts",
      "../../../app/api/live-game/deposit/challenge/route.ts",
      "../../../app/api/live-game/craft/challenge/route.ts",
    ]) {
      const routeSource = source(route);
      expect(routeSource).toContain("prefetch");
      expect(routeSource).toContain("if (!parsed.prefetch)");
    }
  });

  it("uses atomic database operations for encounters, attempts, and finalization", () => {
    const repository = source("./report-repository.ts");
    const migration = source("../../../supabase/migrations/043_optimize_live_game_reporting.sql");
    expect(repository).toContain('rpc("open_live_game_question_encounter"');
    expect(repository).toContain('rpc("record_live_game_question_attempt"');
    expect(repository).toContain('rpc("finalize_live_game_report_round"');
    expect(migration).toContain("update public.live_game_question_encounters encounter");
    expect(migration).not.toContain("for row in");
  });

  it("records incorrect attempts and finalizes correct awards", () => {
    for (const route of [
      "../../../app/api/live-game/answer/route.ts",
      "../../../app/api/live-game/deposit/answer/route.ts",
      "../../../app/api/live-game/craft/answer/route.ts",
    ]) {
      const routeSource = source(route);
      expect(routeSource).toContain("recordCurrentLiveGameAttempt({");
      expect(routeSource).toContain("finalizeCurrentLiveGameCorrectAnswer({");
      expect(routeSource).toContain("releaseLiveGameChallengeAwardClaim");
      expect(routeSource.match(/recordCurrentLiveGameAttempt\(\{/g)).toHaveLength(1);
    }
  });

  it("uses the combined finalize correct-answer RPC", () => {
    const repository = source("./report-repository.ts");
    const migration = source("../../../supabase/migrations/046_live_game_answer_finalize_rpc.sql");
    expect(repository).toContain('rpc("finalize_live_game_correct_answer"');
    expect(migration).toContain("finalize_live_game_correct_answer");
    expect(migration).toContain("release_live_game_challenge_award_claim");
  });
});
