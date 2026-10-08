import { beforeEach, describe, expect, it, vi } from "vitest";
import { assignReleasedLessonHomework, getReleasedLessonHomework, releaseClassLessonDelivery, reviewClassLessonDelivery } from "./lesson-delivery";
import { compileLessonVocabularyMaterial } from "@/lib/class-lessons/compile-vocabulary";
import { createBakeryVocabularyListDocument } from "@/lib/activity-builder/vocabulary-list/document";
import type { ClassLesson } from "@/lib/class-lessons/types";
import type { LessonRelease } from "@/lib/class-lessons/release";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), lesson: vi.fn(), release: vi.fn(), activity: vi.fn(), rpc: vi.fn(), revalidate: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.auth }, rpc: mocks.rpc }) }));
vi.mock("@/lib/data/class-lessons", () => ({ getClassLesson: mocks.lesson }));
vi.mock("@/lib/data/lesson-releases", () => ({ getLessonRelease: mocks.release }));
vi.mock("@/lib/studio-activities/load", () => ({ getStudioActivityForTeacher: mocks.activity }));
const teacher = "10000000-0000-4000-8000-000000000001";
const lessonId = "20000000-0000-4000-8000-000000000001";
const stepId = "30000000-0000-4000-8000-000000000001";
const releaseId = "40000000-0000-4000-8000-000000000001";
const activityId = "50000000-0000-4000-8000-000000000001";
const revision = "2026-10-06T00:00:00Z";
let lesson: ClassLesson;
let release: LessonRelease;
beforeEach(() => {
  vi.clearAllMocks();
  lesson = { id:lessonId,classId:teacher,teacherId:teacher,title:"Food preferences",status:"draft",notes:"PRIVATE",objective:"Ask and answer about preferences",successCheck:"Two independent exchanges",targetLanguage:"food",durationMinutes:10,
    templateKey:null,templateVersion:null,publishedAt:null,createdAt:revision,updatedAt:revision,steps:[
      {id:stepId,position:0,kind:"studio_activity",title:"Recall words",phase:"teach",durationMinutes:5,studentAction:"Recall each word before turning the card.",teacherAction:"PRIVATE",
        config:{activityId,activityTitle:"Food",format:"flashcards",playPath:"/pilot",planning:{delivery:"classroom",purpose:"Retrieve the target vocabulary",successCriteria:"Recall independently",grouping:"whole_class",scaffolding:"Model once"}}},
      {id:releaseId,position:1,kind:"custom",title:"Interview at home",phase:"homework",durationMinutes:5,studentAction:"Interview someone about favorite food.",teacherAction:"PRIVATE",
        config:{materialNote:"",planning:{delivery:"homework",purpose:"Use words in conversation",successCriteria:"Two relevant exchanges",grouping:"individual",scaffolding:"Use the sentence frame"}}},
    ]};
  const pack=compileLessonVocabularyMaterial(createBakeryVocabularyListDocument(),["v1"],"flashcards").pack;
  release={id:releaseId,lessonId,classId:teacher,teacherId:teacher,createdAt:revision,sourceUpdatedAt:revision,snapshot:{lesson:structuredClone(lesson),materials:{[stepId]:{activityId,title:"Reviewed food",format:"flashcards",pack:pack as unknown as Record<string, unknown>}}}};
  mocks.auth.mockResolvedValue({data:{user:{id:teacher,app_metadata:{role:"teacher"}}}});
  mocks.lesson.mockResolvedValue(lesson); mocks.release.mockResolvedValue(release);
  mocks.activity.mockResolvedValue({id:activityId,format:"flashcards",pack,updated_at:revision});
  mocks.rpc.mockResolvedValue({data:releaseId,error:null});
});

describe("reviewed lesson server boundaries", () => {
  it("checks saved content and owned materials without releasing or assigning",async () => {
    const result=await reviewClassLessonDelivery({lessonId,expectedUpdatedAt:revision});
    expect(result).toMatchObject({ok:true,review:{readiness:{ready:true,classroomMinutes:5,homeworkMinutes:5},materialRevisions:{[activityId]:revision}}});
    expect(mocks.activity).toHaveBeenCalledWith(expect.anything(),teacher,activityId);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("reports deleted or unplayable attached materials on the affected step",async () => {
    mocks.activity.mockResolvedValue(null);
    const result=await reviewClassLessonDelivery({lessonId,expectedUpdatedAt:revision});
    expect(result).toMatchObject({ok:true,review:{readiness:{ready:false,steps:[{stepId,ready:false},{}]}}});
    mocks.activity.mockResolvedValue({id:activityId,format:"flashcards",pack:{},updated_at:revision});
    expect(await releaseClassLessonDelivery({lessonId,expectedUpdatedAt:revision,materialRevisions:{[activityId]:revision}})).toMatchObject({ok:false,error:expect.stringContaining("preparation")});
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("releases only the reviewed revision through a server-built transaction",async () => {
    expect(await releaseClassLessonDelivery({lessonId,expectedUpdatedAt:revision,materialRevisions:{[activityId]:revision}})).toMatchObject({ok:true});
    expect(mocks.rpc).toHaveBeenCalledWith("release_class_lesson_plan",{p_lesson_id:lessonId,p_expected_updated_at:revision,p_material_revisions:{[activityId]:revision}});
    expect(mocks.rpc.mock.calls[0][1]).not.toHaveProperty("snapshot");
  });
  it("returns stale review and database conflict errors",async () => {
    expect(await reviewClassLessonDelivery({lessonId,expectedUpdatedAt:"old"})).toMatchObject({ok:false,error:expect.stringContaining("changed")});
    mocks.rpc.mockResolvedValue({error:{message:"Material changed. Preview and review it again."}});
    expect(await releaseClassLessonDelivery({lessonId,expectedUpdatedAt:revision,materialRevisions:{[activityId]:revision}})).toMatchObject({ok:false,error:expect.stringContaining("Material changed")});
  });
  it("projects only released homework instructions and freezes using the release",async () => {
    const result=await getReleasedLessonHomework(releaseId);
    expect(result).toMatchObject({ok:true,steps:[{id:releaseId,minutes:5,previewPath:null,instructions:expect.stringContaining("Two relevant exchanges")}]});
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
    expect(mocks.activity).not.toHaveBeenCalled();
    expect(await assignReleasedLessonHomework({releaseId,stepId:releaseId,dueAt:"2026-10-07T09:00:00Z"})).toEqual({ok:true,homeworkId:releaseId});
    expect(mocks.rpc).toHaveBeenCalledWith("assign_released_lesson_homework",{p_release_id:releaseId,p_step_id:releaseId,p_due_at:"2026-10-07T09:00:00.000Z"});
  });
  it("rejects classroom steps and invalid due dates before assigning",async () => {
    expect(await assignReleasedLessonHomework({releaseId,stepId})).toMatchObject({ok:false,error:expect.stringContaining("homework step")});
    expect(await assignReleasedLessonHomework({releaseId,stepId:releaseId,dueAt:"bad"})).toMatchObject({ok:false,error:expect.stringContaining("due date")});
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects foreign lessons and students before writes",async () => {
    mocks.lesson.mockResolvedValue({...lesson,teacherId:activityId});
    expect(await reviewClassLessonDelivery({lessonId,expectedUpdatedAt:revision})).toMatchObject({ok:false});
    mocks.auth.mockResolvedValue({data:{user:{id:teacher,app_metadata:{role:"student"}}}});
    expect(await releaseClassLessonDelivery({lessonId,expectedUpdatedAt:revision,materialRevisions:{}})).toMatchObject({ok:false});
    expect(await assignReleasedLessonHomework({releaseId,stepId:releaseId})).toMatchObject({ok:false});
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.release).not.toHaveBeenCalled();
  });
});
