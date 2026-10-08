// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClassLessonEditor } from "@/components/teacher/class-hub/ClassLessonEditor";
import { lessonReadiness } from "./planning";
import type { ClassLesson } from "./types";

const state = vi.hoisted(() => ({ saved: null as unknown, save: vi.fn(), review: vi.fn(), release: vi.fn(), homework: vi.fn(), assign: vi.fn() }));
vi.mock("@/lib/actions/class-lessons", () => ({ saveClassLesson: state.save, archiveClassLesson: vi.fn(), duplicateClassLesson: vi.fn(), publishClassLessonToClassroom: vi.fn(), unpublishClassLessonFromClassroom: vi.fn() }));
vi.mock("@/lib/actions/lesson-delivery", () => ({ reviewClassLessonDelivery: state.review, releaseClassLessonDelivery: state.release, getReleasedLessonHomework: state.homework, assignReleasedLessonHomework: state.assign }));
vi.mock("@/lib/actions/lesson-vocabulary", () => ({ generateLessonVocabularyActivity: vi.fn() }));
vi.mock("@/components/teacher/class-hub/LessonVocabularyPanel", () => ({ LessonVocabularyPanel: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/link", async () => {
  const { createElement } = await import("react");
  return { default: (props: Record<string, unknown>) => createElement("a", props) };
});

let root: Root;
let container: HTMLDivElement;
const lessonId="20000000-0000-4000-8000-000000000001";
const stepId="30000000-0000-4000-8000-000000000001";
const releaseId="40000000-0000-4000-8000-000000000001";
function initialLesson(): ClassLesson {
  return { id:lessonId,classId:lessonId,teacherId:lessonId,title:"Food preferences",status:"draft",notes:"Private",objective:"Ask and answer about favorite food",durationMinutes:20,targetLanguage:"I like…",successCheck:"Two relevant exchanges",publishedAt:null,templateKey:null,templateVersion:null,createdAt:"",updatedAt:"r0",
    steps:[{id:stepId,position:0,kind:"custom",title:"Pair interview",phase:"assessment",durationMinutes:10,teacherAction:"Monitor",studentAction:"Ask and answer two questions about favorite food.",config:{materialNote:"picture cards",planning:{delivery:"classroom",purpose:"Communicate preferences independently",successCriteria:"Two relevant exchanges",grouping:"pairs",scaffolding:"Model once, then remove the frame"}}}] };
}
function button(text: string) {
  const node=[...container.querySelectorAll("button")].find((node)=>node.textContent?.trim()===text);
  expect(node, text).toBeTruthy(); return node!;
}
async function click(text: string) { await act(async ()=>{button(text).click();}); }
function control<T extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(label: string): T {
  const found=[...container.querySelectorAll("label")].find((node)=>node.textContent?.trim().startsWith(label));
  expect(found,label).toBeTruthy(); return found!.querySelector("input,textarea,select") as T;
}
async function change(node: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,value: string) {
  await act(async ()=>{
    const proto=node instanceof HTMLSelectElement?HTMLSelectElement.prototype:node instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto,"value")!.set!.call(node,value);
    node.dispatchEvent(new Event("input",{bubbles:true})); node.dispatchEvent(new Event("change",{bubbles:true}));
  });
}
beforeEach(async ()=>{
  vi.clearAllMocks(); Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  state.saved=initialLesson();
  state.save.mockImplementation(async(input)=>{
    state.saved={...state.saved as ClassLesson,...input,updatedAt:"r1"};
    return {ok:true,lesson:structuredClone(state.saved)};
  });
  state.review.mockImplementation(async()=>({ok:true,review:{readiness:lessonReadiness(state.saved as ClassLesson),lessonUpdatedAt:"r1",materialRevisions:{}}}));
  state.release.mockImplementation(async()=>{
    state.saved={...state.saved as ClassLesson,status:"ready",releaseId,releasedAt:"2026-10-06T00:00:00Z"};
    return {ok:true,lesson:structuredClone(state.saved)};
  });
  state.homework.mockResolvedValue({ok:true,steps:[{id:stepId,title:"Food interview at home",minutes:5,instructions:"Ask two questions. Success criteria: Two relevant answers.",previewPath:null}]});
  state.assign.mockResolvedValue({ok:true,homeworkId:lessonId});
  container=document.createElement("div"); document.body.append(container); root=createRoot(container);
  await act(async()=>root.render(createElement(ClassLessonEditor,{lesson:state.saved as ClassLesson,archivedClass:false,studioActivities:[],liveGameSets:[],onClose:vi.fn(),onSaved:(lesson:ClassLesson)=>{state.saved=structuredClone(lesson);},onDuplicated:vi.fn(),onArchived:vi.fn()})));
});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();});

describe("teacher reviewed lesson workflow",()=>{
  it("requires explicit preview confirmation, releases the saved revision, and assigns only on teacher action",async()=>{
    await click("Save and check preparation");
    expect(state.review).toHaveBeenCalledWith({lessonId,expectedUpdatedAt:"r1"});
    expect(button("Release reviewed lesson").disabled).toBe(true);
    expect(state.release).not.toHaveBeenCalled(); expect(state.assign).not.toHaveBeenCalled();
    await act(async()=>container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
    await click("Release reviewed lesson");
    expect(state.release).toHaveBeenCalledWith({lessonId,expectedUpdatedAt:"r1",materialRevisions:{}});
    expect(container.textContent).toContain("reviewed release is available");
    expect(state.assign).not.toHaveBeenCalled();
    await click("Review released homework");
    expect(container.textContent).toContain("Two relevant answers");
    await click("Assign this homework");
    expect(state.assign).toHaveBeenCalledWith({releaseId,stepId,dueAt:null});
    expect(button("Assigned to class").disabled).toBe(true);
  });
  it("requires a fresh review when the teacher edits the goal or sequence",async()=>{
    await click("Save and check preparation");
    await change(control("Learning goal"),"Ask about food and explain a preference");
    expect(container.textContent).toContain("plan changed after review");
    expect([...container.querySelectorAll("button")].some(node=>node.textContent==="Release reviewed lesson")).toBe(false);
    expect(state.release).not.toHaveBeenCalled();
  });
  it("adds manual homework through the actual step editor and keeps its effort out of classroom time",async()=>{
    await click("+ Teaching step");
    await change(control("Step title"),"Interview at home");
    await change(control("Delivery"),"homework");
    await change(control("Homework effort"),"6");
    await change(control("How does this step support"),"Use the vocabulary in a new conversation");
    await change(control("Success criteria"),"Two questions and two relevant answers");
    await change(control("What will students do"),"Interview a family member about their favorite food");
    await click("Add teaching step");
    expect(container.textContent).toContain("10 / 20 min");
    expect(container.textContent).toContain("6 min");
    await click("Save and check preparation");
    const saved=state.saved as ClassLesson;
    expect(saved.steps[1].config.planning?.delivery).toBe("homework");
    expect(saved.steps[1].studentAction).toContain("family member");
    expect(button("Release reviewed lesson").disabled).toBe(true);
  });
});
