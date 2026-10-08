import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/virtual-classroom/[sessionId]/lesson/route";
const mocks=vi.hoisted(()=>({session:vi.fn(),host:vi.fn(),release:vi.fn(),legacy:vi.fn()}));
vi.mock("next/headers",()=>({cookies:async()=>({get:()=>({value:"token"})})}));
vi.mock("next/server",()=>({NextResponse:{json:(value:unknown,init?:ResponseInit)=>Response.json(value,init)}}));
vi.mock("@/lib/virtual-classroom/session-cookie",()=>({VC_HOST_COOKIE:"host",VC_MEMBER_COOKIE:"member",decodeVcMemberToken:()=>({sessionId:"session"}),vcHostMatchesJoinCode:()=>true}));
vi.mock("@/lib/virtual-classroom/server/session",()=>({getVirtualClassroomSessionById:mocks.session,setVirtualClassroomSessionLesson:vi.fn()}));
vi.mock("@/lib/virtual-classroom/server/access",()=>({requireVirtualClassroomSessionHost:mocks.host}));
vi.mock("@/lib/data/class-lessons",()=>({getClassLesson:mocks.legacy,getReadyClassLessonForClass:vi.fn()}));
vi.mock("@/lib/data/lesson-releases",()=>({getLessonRelease:mocks.release}));
beforeEach(()=>{
  vi.clearAllMocks(); mocks.session.mockResolvedValue({id:"session",classId:"class",classLessonId:"lesson",lessonReleaseId:"release",joinCode:"CODE"});
  mocks.host.mockResolvedValue({userId:"teacher"});
  mocks.release.mockResolvedValue({id:"release",snapshot:{lesson:{title:"Reviewed lesson",notes:"PRIVATE",steps:[]},materials:{}}});
});
async function load(){return GET(new Request("https://example.test/lesson"),{params:Promise.resolve({sessionId:"session"})});}
describe("private session release projection",()=>{
  it("requires owning teacher authentication even with a host cookie or member token",async()=>{
    mocks.host.mockRejectedValue(new Error("Teacher login required"));
    const result=await load(); expect(await result.json()).toMatchObject({lesson:null});
    expect(mocks.release).not.toHaveBeenCalled(); expect(mocks.legacy).not.toHaveBeenCalled();
  });
  it("returns the pinned release, never the mutable plan, to the owning teacher",async()=>{
    const result=await load(); expect(await result.json()).toMatchObject({lessonReleaseId:"release",lesson:{title:"Reviewed lesson"}});
    expect(mocks.release).toHaveBeenCalledWith("release"); expect(mocks.legacy).not.toHaveBeenCalled();
  });
  it("keeps legacy plans usable and never substitutes one for a missing release",async()=>{
    mocks.session.mockResolvedValueOnce({id:"session",classLessonId:"lesson",joinCode:"CODE"});
    mocks.legacy.mockResolvedValue({title:"Legacy plan"});
    expect(await (await load()).json()).toMatchObject({lesson:{title:"Legacy plan"}});
    mocks.legacy.mockClear(); mocks.release.mockResolvedValue(null);
    expect(await (await load()).json()).toMatchObject({lesson:null});
    expect(mocks.legacy).not.toHaveBeenCalled();
  });
});
