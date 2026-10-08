import { describe, expect, it } from "vitest";
import { createHomeworkCollectionPart, homeworkCollectionPartValidationIssues, parseHomeworkCollectionPart } from "./document";
import { homeworkCollectionRequiredPartsComplete, scoreHomeworkCollectionAttempt, scoreHomeworkCollectionPart } from "./scoring";
import { MINI_PLAY_MAX_LINES, miniPlayResponseIssues, miniPlayScriptText, readMiniPlayResponse } from "./mini-play";
import type { HomeworkCollectionMiniPlayPart } from "./types";
import { normalizeHomeworkCollectionAttemptContent } from "./attempt";
import { seedBlankGradedCollection, seedGradedPartFromKind, gradedPartKindsForOrigin } from "@/lib/activity-tracks/seed-graded";
import { parseActivityTrackDocument } from "@/lib/activity-tracks/parse-document";
import { buildGradedTrackFreezeDocument, parseGradedTrackFreezeDocument } from "@/lib/class-homework/freeze-graded-track";
import { normalizeHomeworkPayload } from "@/lib/class-homework/normalize";
import { resolveGradedTrack } from "@/lib/graded-tracks";

export function examplePlayAnswers(): Record<string, string> {
  return {
    "play-title": "The missing lunch",
    characters: JSON.stringify([{ id: "mia", name: "Mia", description: "A worried student who lost her lunch." }, { id: "sam", name: "Sam", description: "A kind friend who wants to help." }]),
    setting: JSON.stringify({ place: "The school playground", time: "At lunch", description: "Two bags sit on a bench." }),
    script: JSON.stringify(Array.from({ length: 6 }, (_, index) => ({ id: `line-${index}`, kind: "dialogue", characterId: index % 2 ? "sam" : "mia", text: ["Where is my lunch?", "Let's look together.", "Is it in your bag?", "Here it is!", "Thank you for helping.", "Let's eat together."][index] }))),
  };
}

function miniPart(): HomeworkCollectionMiniPlayPart {
  const part = createHomeworkCollectionPart("mini_play");
  if (part.kind !== "mini_play") throw new Error("Expected mini play");
  return part;
}

describe("Mini play authoring and homework integration", () => {
  it.each(["primary", "secondary"] as const)("seeds, saves, freezes, and resolves a reusable %s assignment", (level) => {
    const track = seedBlankGradedCollection({ trackId: `play-${level}`, title: "My mini play", level });
    expect(gradedPartKindsForOrigin(track.gradedOrigin)).toContain("mini_play");
    const part = seedGradedPartFromKind({ kind: "mini_play", level, order: 1 });
    expect(part?.source.type).toBe("homework_part");
    if (!part || part.source.type !== "homework_part") throw new Error("Missing reusable part");
    expect(homeworkCollectionPartValidationIssues(part.source.part)).toEqual([]);
    track.parts = [part];
    const saved = parseActivityTrackDocument(JSON.parse(JSON.stringify(track)))!;
    expect(saved.parts[0]?.kind).toBe("mini_play");
    const frozen = buildGradedTrackFreezeDocument(saved);
    expect(frozen.collectionDocument?.parts[0]).toMatchObject({ kind: "mini_play", maxPoints: 10 });
    expect(frozen.gradingManifest?.parts[0]).toMatchObject({ format: "mini_play", gradingPolicy: "teacher_review", maxScore: 10 });
    expect(frozen.gradingManifest?.parts[0]?.items).toHaveLength(4);
    const payload = normalizeHomeworkPayload({ type: "graded_track", title: frozen.title, sectionCount: 1, originTemplateId: frozen.originTemplateId, level, document: frozen, frozenAt: new Date().toISOString() });
    expect(payload?.type).toBe("graded_track");
    const reloaded = parseGradedTrackFreezeDocument(JSON.parse(JSON.stringify(frozen)))!;
    expect(resolveGradedTrack(reloaded).segments[0]).toMatchObject({ type: "collection", part: { kind: "mini_play" } });
    // Assignment snapshots must not follow later teacher edits.
    if (part.source.part.kind === "mini_play") part.source.part.prompt = "Changed after assigning";
    expect(reloaded.collectionDocument?.parts[0]).toMatchObject({ prompt: "Write a short play about a small problem that two friends solve together." });
  });

  it("retains incomplete teacher draft edits, but prevents assigning them", () => {
    const track = seedBlankGradedCollection({ trackId: "draft", title: "Draft", level: "primary" });
    const part = seedGradedPartFromKind({ kind: "mini_play", level: "primary", order: 1 })!;
    if (part.source.type !== "homework_part" || part.source.part.kind !== "mini_play") throw new Error("Missing play");
    part.source.part.prompt = "";
    part.source.part.successCriteria = [""];
    track.parts = [part];
    const saved = parseActivityTrackDocument(JSON.parse(JSON.stringify(track)))!;
    expect(saved.parts[0]?.source).toMatchObject({ type: "homework_part", part: { prompt: "", successCriteria: [""] } });
    expect(() => buildGradedTrackFreezeDocument(saved)).toThrow(/before assigning/);
  });

  it("supports independent reusable instances and validates teacher limits", () => {
    expect(miniPart().id).not.toBe(miniPart().id);
    const part = miniPart();
    expect(parseHomeworkCollectionPart({ ...part, minCharacters: 5, maxCharacters: 2 })).toBeNull();
    expect(homeworkCollectionPartValidationIssues({ ...part, minDialogueLines: 25 })).not.toEqual([]);
    expect(homeworkCollectionPartValidationIssues({ ...part, successCriteria: [] })).not.toEqual([]);
  });
});

describe("Mini play student response integrity", () => {
  it("preserves a full script with JSON-escaped text through save and reload", () => {
    const part = miniPart();
    const answers = examplePlayAnswers();
    answers.script = JSON.stringify(Array.from({ length: 24 }, (_, index) => ({ id: `line-${index}`, kind: "dialogue", characterId: index % 2 ? "sam" : "mia", text: '"'.repeat(220) })));
    expect(answers.script.length).toBeGreaterThan(10_000);
    const content = scoreHomeworkCollectionAttempt({ version: 1, parts: [part] }, { [part.id]: { answers } });
    expect(miniPlayResponseIssues(part, content.parts[part.id]!.answers)).toEqual([]);
    expect(normalizeHomeworkCollectionAttemptContent(content).parts[part.id]?.answers.script).toBe(answers.script);
  });
  it("round-trips structured work and awards no automatic writing grade", () => {
    const part = miniPart();
    const answers = examplePlayAnswers();
    const scored = scoreHomeworkCollectionPart(part, { answers: { ...answers, injected: "ignore" } });
    expect(scored.answers).toEqual(answers);
    expect(scored).toMatchObject({ correct: null, gradingMode: "teacher_review", maxScore: 10, answered: 4, itemCount: 4 });
    expect(miniPlayResponseIssues(part, scored.answers)).toEqual([]);
    const document = { version: 1 as const, parts: [part] };
    expect(homeworkCollectionRequiredPartsComplete(document, scoreHomeworkCollectionAttempt(document, { [part.id]: { answers } }))).toBe(true);
  });

  it("saves incomplete drafts without treating them as completed homework", () => {
    const part = miniPart();
    const answers = { "play-title": "Work in progress", characters: JSON.stringify([{ id: "mia", name: "Mia", description: "" }]) };
    const content = scoreHomeworkCollectionAttempt({ version: 1, parts: [part] }, { [part.id]: { answers } });
    expect(content.parts[part.id]?.answers).toEqual(answers);
    expect(homeworkCollectionRequiredPartsComplete({ version: 1, parts: [part] }, content)).toBe(false);
  });

  it("renames every spoken reference without altering stage directions", () => {
    const play = readMiniPlayResponse(examplePlayAnswers());
    play.characters[0]!.name = "Linh";
    play.lines.push({ id: "direction", kind: "direction", characterId: "", text: "They sit together." });
    expect(miniPlayScriptText(play)).toContain("Linh: Where is my lunch?");
    expect(miniPlayScriptText(play)).not.toContain("Mia:");
    expect(miniPlayScriptText(play)).toContain("[They sit together.]");
  });

  it.each(["missing-speaker", "duplicate-names", "one-speaker", "empty-lines", "malformed"])("blocks %s at submission", (caseName) => {
    const answers = examplePlayAnswers();
    const play = readMiniPlayResponse(answers);
    if (caseName === "missing-speaker") play.lines[0]!.characterId = "deleted";
    if (caseName === "duplicate-names") play.characters[1]!.name = " mia ";
    if (caseName === "one-speaker") play.lines.forEach((line) => { line.characterId = "mia"; });
    if (caseName === "empty-lines") play.lines.push({ id: "empty", kind: "direction", characterId: "", text: "" });
    answers.characters = JSON.stringify(play.characters);
    answers.script = caseName === "malformed" ? "{broken json" : JSON.stringify(play.lines);
    expect(miniPlayResponseIssues(miniPart(), answers).length).toBeGreaterThan(0);
  });

  it("rejects too many lines rather than silently submitting a truncated script", () => {
    const answers = examplePlayAnswers();
    answers.script = JSON.stringify(Array.from({ length: MINI_PLAY_MAX_LINES + 1 }, (_, index) => ({ id: `line-${index}`, kind: "dialogue", characterId: index % 2 ? "sam" : "mia", text: "Hello" })));
    expect(miniPlayResponseIssues(miniPart(), answers)).toContain("Check your saved characters, setting, and script.");
  });
});
