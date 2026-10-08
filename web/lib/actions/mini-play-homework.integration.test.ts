import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ session: vi.fn(), admin: vi.fn(), client: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_noStore: vi.fn() }));
vi.mock("@/lib/auth/student-action-auth-server", () => ({ resolveStudentActionSession: mocks.session }));
vi.mock("@/lib/supabase/service-role-client", () => ({ createServiceRoleSupabase: mocks.admin }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.client }));

import { saveHomeworkCollectionAttempt } from "./homework-collection-attempt";
import { saveHomeworkCollectionReview } from "./homework-collection-review";
import { getMyHomeworkCollectionAttempt } from "@/lib/data/homework-collection-attempts";
import { seedBlankGradedCollection, seedGradedPartFromKind } from "@/lib/activity-tracks/seed-graded";
import { buildGradedTrackFreezeDocument } from "@/lib/class-homework/freeze-graded-track";

function fixture() {
  const track = seedBlankGradedCollection({ trackId: "play", title: "A mini play", level: "primary" });
  const part = seedGradedPartFromKind({ kind: "mini_play", level: "primary", order: 1 })!;
  track.parts = [part];
  const document = buildGradedTrackFreezeDocument(track);
  const homework = { id: "homework-1", class_id: "class-1", teacher_id: "teacher-1", status: "assigned", target_student_ids: null as string[] | null, payload: { type: "graded_track", title: document.title, sectionCount: 1, level: "primary", originTemplateId: document.originTemplateId, document, frozenAt: new Date().toISOString() } };
  const answers = {
    "play-title": "The lost bag",
    characters: JSON.stringify([{ id: "a", name: "An", description: "A worried student." }, { id: "b", name: "Ben", description: "A helpful friend." }]),
    setting: JSON.stringify({ place: "School", time: "Lunch", description: "A bag sits beside the door." }),
    script: JSON.stringify(Array.from({ length: 6 }, (_, index) => ({ id: `line-${index}`, kind: "dialogue", characterId: index % 2 ? "b" : "a", text: index % 2 ? "Let us look together." : "Where is my bag?" }))),
  };
  let stored: Record<string, unknown> | null = null;
  let review: Record<string, unknown> | null = null;
  let member = true;
  let user = { id: "student-1", app_metadata: { role: "student" } };
  const filters: Array<[string, string, unknown]> = [];
  const writes = vi.fn();
  const from = vi.fn((table: string) => {
    let pending: Record<string, unknown> | null = null;
    const chain = {
      select: () => chain,
      eq: (key: string, value: unknown) => { filters.push([table, key, value]); return chain; },
      maybeSingle: async () => ({ data: table === "class_homework" ? homework : table === "homework_collection_reviews" ? review : stored, error: null }),
      single: async () => {
        if (pending) stored = { id: "attempt-1", ...pending };
        return { data: stored, error: null };
      },
      upsert: (value: Record<string, unknown>) => {
        writes(table, value);
        pending = value;
        if (table === "homework_collection_reviews") review = value;
        return chain;
      },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve),
    };
    return chain;
  });
  const rpc = vi.fn(async (name: string, input?: Record<string, unknown>) => {
    if (name === "student_class_memberships") return { data: member ? [{ class_id: "class-1" }] : [], error: null };
    if (name !== "finalize_homework_collection_attempt") throw new Error(`Unexpected RPC: ${name}`);
    stored = { id: "attempt-1", homework_id: homework.id, student_id: user.id, status: "submitted", content: input?.p_content, auto_score: 0, auto_max_score: 0, manual_max_score: 10, submitted_at: "2026-10-08T00:00:00Z", updated_at: "2026-10-08T00:00:00Z" };
    return { data: { attempt: stored, receipt: { homeworkId: homework.id, format: "graded_track", status: "submitted", submittedAt: "2026-10-08T00:00:00Z", completedAt: "2026-10-08T00:00:00Z", duplicate: false, reconciled: false } }, error: null };
  });
  const supabase = { from, rpc, auth: { getUser: async () => ({ data: { user } }) } };
  mocks.session.mockImplementation(async () => ({ ok: true, user, supabase }));
  mocks.admin.mockReturnValue(supabase);
  mocks.client.mockResolvedValue(supabase);
  return { homework, partId: part.source.type === "homework_part" ? part.source.part.id : "", answers, writes, rpc, filters, setMember: (value: boolean) => { member = value; }, becomeTeacher: () => { user = { id: "teacher-1", app_metadata: { role: "teacher" } }; }, becomeStudent: () => { user = { id: "student-1", app_metadata: { role: "student" } }; } };
}

describe("Mini play homework server workflow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists incomplete drafts, reloads them, submits complete work, and returns teacher feedback", async () => {
    const f = fixture();
    const draftAnswers = { "play-title": "My draft" };
    expect(await saveHomeworkCollectionAttempt({ homeworkId: f.homework.id, responses: { [f.partId]: { answers: draftAnswers } } })).toMatchObject({ ok: true, attempt: { status: "in_progress" } });
    const draft = await getMyHomeworkCollectionAttempt(f.homework.id);
    expect(draft?.content.parts[f.partId]?.answers).toEqual(draftAnswers);
    expect(await saveHomeworkCollectionAttempt({ homeworkId: f.homework.id, responses: { [f.partId]: { answers: draftAnswers } }, submit: true })).toMatchObject({ ok: false });
    expect(f.rpc.mock.calls.filter(([name]) => name === "finalize_homework_collection_attempt")).toHaveLength(0);
    const submitted = await saveHomeworkCollectionAttempt({ homeworkId: f.homework.id, responses: { [f.partId]: { answers: f.answers } }, submit: true });
    expect(submitted).toMatchObject({ ok: true, attempt: { status: "submitted", manualMaxScore: 10 } });
    // A later draft save cannot overwrite a submitted play.
    const protectedSave = await saveHomeworkCollectionAttempt({ homeworkId: f.homework.id, responses: {} });
    expect(protectedSave).toMatchObject({ ok: true, attempt: { status: "submitted" } });
    f.becomeTeacher();
    expect(await saveHomeworkCollectionReview({ classId: "class-1", homeworkId: f.homework.id, attemptId: "attempt-1", parts: { [f.partId]: { score: 8, maxScore: 10, feedback: "Clear replies. Add a stronger ending." } }, feedback: "Try reading it aloud." })).toEqual({ ok: true });
    f.becomeStudent();
    const reviewed = await getMyHomeworkCollectionAttempt(f.homework.id);
    expect(reviewed?.review).toMatchObject({ feedback: "Try reading it aloud.", parts: { [f.partId]: { score: 8, feedback: "Clear replies. Add a stronger ending." } } });
    expect(f.filters).toContainEqual(["homework_collection_reviews", "student_id", "student-1"]);
    expect(f.filters).toContainEqual(["homework_collection_reviews", "attempt_id", "attempt-1"]);
  });

  it.each(["outside-class", "untargeted"])("rejects an %s student before writing", async (reason) => {
    const f = fixture();
    if (reason === "outside-class") f.setMember(false);
    else f.homework.target_student_ids = ["student-2"];
    expect(await saveHomeworkCollectionAttempt({ homeworkId: f.homework.id, responses: { [f.partId]: { answers: f.answers } }, submit: true })).toMatchObject({ ok: false, errorCode: "student_homework_forbidden" });
    expect(f.writes).not.toHaveBeenCalled();
    expect(f.rpc.mock.calls.filter(([name]) => name === "finalize_homework_collection_attempt")).toHaveLength(0);
  });

  it("returns expired sign-in without accessing data", async () => {
    const f = fixture();
    mocks.session.mockResolvedValue({ ok: false, errorCode: "student_session_required" });
    expect(await saveHomeworkCollectionAttempt({ homeworkId: f.homework.id, responses: {} })).toMatchObject({ ok: false, errorCode: "student_session_required" });
    expect(f.rpc).not.toHaveBeenCalled();
    expect(f.writes).not.toHaveBeenCalled();
  });
});
