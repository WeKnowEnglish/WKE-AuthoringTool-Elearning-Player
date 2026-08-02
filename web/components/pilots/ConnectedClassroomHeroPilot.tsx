"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  ClipboardCheck,
  Presentation,
  Route,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";

const ASSET_ROOT = "/pilots/connected-classroom";

function between(progress: number, start: number, end: number): number {
  return Math.min(1, Math.max(0, (progress - start) / (end - start)));
}

function tabletExitStyle(progress: number, side: "left" | "right"): CSSProperties {
  const horizontalTravel = side === "left" ? 28 : -39;
  return {
    opacity: 1 - progress,
    transform: `translate3d(${horizontalTravel * progress}vw, ${progress * -12}vh, 0) scale(${1 - progress * 0.82})`,
  };
}

function tabletEntryStyle(progress: number, index: number): CSSProperties {
  const isTop = index % 2 === 0;
  const horizontalTravel = [29, 21, -40, -32][index];
  const remaining = 1 - progress;
  return {
    opacity: progress,
    transform: `translate3d(${horizontalTravel * remaining}vw, ${(isTop ? 10 : -32) * remaining}vh, 0) scale(${0.18 + progress * 0.82})`,
  };
}

const onlineStudents = [
  { src: `${ASSET_ROOT}/student-purple-online-transparent.webp`, position: "left-0 top-0" },
  { src: `${ASSET_ROOT}/student-blue-online-transparent.webp`, position: "left-[8%] bottom-[18%] sm:bottom-0" },
  { src: `${ASSET_ROOT}/student-green-online-transparent.webp`, position: "right-0 top-0" },
  { src: `${ASSET_ROOT}/student-yellow-online-transparent.webp`, position: "right-[8%] bottom-[18%] sm:bottom-0" },
] as const;

/** Scroll-story stages — progress targets land mid-scene for each beat. */
const STORY_STAGES = [
  { id: "classroom", label: "In the classroom", targetProgress: 0.04 },
  { id: "online", label: "Online", targetProgress: 0.45 },
  { id: "managing", label: "Managing learning", targetProgress: 0.78 },
] as const;

function activeStageIndex(progress: number): number {
  if (progress < 0.32) return 0;
  if (progress < 0.63) return 1;
  return 2;
}

const teacherBenefits: Array<{
  title: string;
  icon: LucideIcon;
  color: string;
  detail: string;
}> = [
  {
    title: "Planning",
    icon: Route,
    color: "#e65f3c",
    detail: "Create activities quickly, then publish them as homework or to your public classroom wall.",
  },
  {
    title: "Teaching",
    icon: Presentation,
    color: "#3478f6",
    detail: "Run live classes, launch live games, and bring learners together in a collaborative workspace.",
  },
  {
    title: "Assignments",
    icon: ClipboardCheck,
    color: "#7b52c7",
    detail: "Create, publish, check, and give feedback on student assignments from one clear workflow.",
  },
  {
    title: "Reporting",
    icon: BarChart3,
    color: "#16846b",
    detail: "Share parent reports and understand mastery with smart tracking and AI-assisted analytics.",
  },
];

type ConnectedClassroomHeroPilotProps = {
  embedded?: boolean;
};

export function ConnectedClassroomHeroPilot({ embedded = false }: ConnectedClassroomHeroPilotProps) {
  const scrollSceneRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [flippedCard, setFlippedCard] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const scene = scrollSceneRef.current;
      if (!scene) return;
      const rect = scene.getBoundingClientRect();
      const distance = Math.max(1, scene.offsetHeight - window.innerHeight);
      setProgress(Math.min(1, Math.max(0, -rect.top / distance)));
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const classroomOut = between(progress, 0.1, 0.32);
  const onlineIn = between(progress, 0.27, 0.48);
  const connectionIn = between(progress, 0.4, 0.56);
  const teacherLift = between(progress, 0.3, 0.5);
  const teacherBenefitsIn = between(progress, 0.63, 0.76);
  const onlineStudentsOut = between(progress, 0.62, 0.74);
  const stageIndex = activeStageIndex(progress);

  const goToStage = (targetProgress: number) => {
    const scene = scrollSceneRef.current;
    if (!scene) return;
    const distance = Math.max(1, scene.offsetHeight - window.innerHeight);
    const sceneTop = window.scrollY + scene.getBoundingClientRect().top;
    window.scrollTo({
      top: sceneTop + targetProgress * distance,
      behavior: "smooth",
    });
  };

  const Root = embedded ? "div" : "main";

  return (
    <Root className={`${embedded ? "" : "min-h-dvh"} bg-[#fbfaf7] text-[#14245e]`}>
      {!embedded ? <header className="fixed inset-x-0 top-0 z-50 border-b border-[#14245e]/10 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
          <Link href="/pilots" className="text-sm font-extrabold text-[#14245e] underline-offset-4 hover:underline">
            ← All pilots
          </Link>
          <span className="rounded-full bg-[#fff1d6] px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[#b84e2d]">
            Homepage hero experiment
          </span>
        </div>
      </header> : null}

      {!embedded ? <section className="mx-auto max-w-4xl px-4 pb-10 pt-24 text-center sm:px-8 sm:pt-28">
        <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#d55f3d]">Scroll story pilot</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
          Teaching that keeps everyone connected
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-relaxed text-[#52617d] sm:text-xl">
          Scroll to move the same teacher and learners from shared classroom devices into a connected online lesson.
        </p>
        <div className="mt-7 inline-flex items-center gap-2 rounded-full border-2 border-[#14245e]/15 bg-white px-4 py-2 text-sm font-extrabold shadow-sm">
          <span aria-hidden="true">↓</span> Scroll to transform the class
        </div>
      </section> : null}

      <section ref={scrollSceneRef} aria-label={embedded ? "Connected classroom learning story" : undefined} className="relative h-[300svh] min-h-[100rem] sm:h-[400svh] sm:min-h-[124rem]">
        <div className={`sticky top-0 flex h-dvh min-h-[34rem] flex-col overflow-hidden bg-white sm:min-h-[38rem] ${embedded ? "pt-0" : "pt-16"}`}>
          <div className="relative z-30 mx-auto w-full max-w-7xl translate-y-6 px-4 pt-4 text-center sm:translate-y-0 sm:px-8 sm:pt-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#d55f3d]">
              One learning relationship
            </p>
            <div className="relative mx-auto mt-1 h-16 max-w-3xl sm:h-20">
              <h2
                className="absolute inset-0 text-2xl font-black leading-tight transition-opacity sm:text-4xl"
                style={{ opacity: 1 - between(progress, 0.16, 0.3) }}
              >
                From shared screens in one room
              </h2>
              <h2
                className="absolute inset-0 text-2xl font-black leading-tight transition-opacity sm:text-4xl"
                style={{ opacity: between(progress, 0.29, 0.4) * (1 - between(progress, 0.62, 0.72)) }}
              >
                To connected learning anywhere
              </h2>
              <h2
                className="absolute inset-0 text-2xl font-black leading-tight transition-opacity sm:text-4xl"
                style={{ opacity: teacherBenefitsIn }}
              >
                More time to teach. Less to manage.
              </h2>
            </div>
          </div>

          <div className="relative mx-auto min-h-0 w-full max-w-7xl flex-1 px-2 pb-4 sm:px-6 sm:pb-6">
            <div className="relative mx-auto h-full min-h-[26rem] max-w-6xl">
              <div
                className="absolute bottom-[12%] left-[2%] h-[66%] w-[36%] transition-[opacity,transform] duration-75 ease-linear sm:bottom-0 sm:left-0 sm:h-[88%] sm:w-[34%]"
                style={tabletExitStyle(classroomOut, "left")}
              >
                <Image src={`${ASSET_ROOT}/students-left-transparent.webp`} alt="Two students sharing a tablet in class" fill sizes="34vw" className="object-contain object-bottom" priority />
              </div>
              <div
                className="absolute bottom-[12%] right-[2%] h-[66%] w-[36%] transition-[opacity,transform] duration-75 ease-linear sm:bottom-0 sm:right-0 sm:h-[88%] sm:w-[34%]"
                style={tabletExitStyle(classroomOut, "right")}
              >
                <Image src={`${ASSET_ROOT}/students-right-transparent.webp`} alt="Two students sharing a tablet in class" fill sizes="34vw" className="object-contain object-bottom" priority />
              </div>

              <div
                className="absolute bottom-[18%] left-1/2 z-20 h-full w-[46%] -translate-x-1/2 scale-125 sm:bottom-auto sm:top-1/2 sm:h-full sm:w-[44%] sm:-translate-y-1/2 sm:scale-100"
                style={{
                  left: `${50 + teacherBenefitsIn * 28}%`,
                  marginTop: `${teacherLift * -10}px`,
                  width: `${44 - teacherBenefitsIn * 7}%`,
                }}
              >
                <Image src={`${ASSET_ROOT}/teacher-transparent.webp`} alt="English teacher guiding the class with a tablet" fill sizes="(max-width: 640px) 38vw, 44vw" className="scale-[0.84] object-contain object-bottom sm:scale-100 sm:object-center" priority />
              </div>

              <svg
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-10 h-full w-full -translate-y-[9%] sm:translate-y-0"
                viewBox="0 0 1000 650"
                fill="none"
                style={{ opacity: connectionIn * (1 - onlineStudentsOut) }}
              >
                <path d="M470 280 C390 220 330 155 245 145" stroke="#83bffc" strokeWidth="4" strokeDasharray="10 12" pathLength="1" strokeDashoffset={1 - connectionIn} />
                <path d="M455 370 C360 400 315 485 235 505" stroke="#83bffc" strokeWidth="4" strokeDasharray="10 12" pathLength="1" strokeDashoffset={1 - connectionIn} />
                <path d="M530 280 C610 220 670 155 755 145" stroke="#83bffc" strokeWidth="4" strokeDasharray="10 12" pathLength="1" strokeDashoffset={1 - connectionIn} />
                <path d="M545 370 C640 400 685 485 765 505" stroke="#83bffc" strokeWidth="4" strokeDasharray="10 12" pathLength="1" strokeDashoffset={1 - connectionIn} />
                {["245,145", "235,505", "755,145", "765,505"].map((point) => {
                  const [cx, cy] = point.split(",");
                  return <circle key={point} cx={cx} cy={cy} r="8" fill="white" stroke="#83bffc" strokeWidth="4" />;
                })}
              </svg>

              {onlineStudents.map((student, index) => {
                const itemIn = between(onlineIn, index * 0.08, 0.58 + index * 0.08);
                return (
                  <div
                    key={student.src}
                    className={`absolute z-0 h-[34%] w-[31%] transition-[opacity,transform] duration-75 ease-linear sm:h-[43%] sm:w-[31%] ${student.position}`}
                    style={{
                      ...tabletEntryStyle(itemIn, index),
                      opacity: itemIn * (1 - onlineStudentsOut),
                      scale: `${1 - onlineStudentsOut * 0.45}`,
                    }}
                  >
                    <Image src={student.src} alt="Student joining the lesson online" fill sizes="(max-width: 640px) 39vw, 31vw" className="object-contain" />
                  </div>
                );
              })}

              <div
                className="absolute bottom-[19%] left-[5%] z-30 grid h-[46%] w-[48%] grid-cols-2 gap-1.5 transition-[opacity,transform] duration-100 sm:bottom-[5%] sm:left-[4%] sm:h-[82%] sm:w-[55%] sm:gap-4"
                style={{
                  opacity: teacherBenefitsIn,
                  transform: `translate3d(${(1 - teacherBenefitsIn) * -12}vw, 0, 0) scale(${0.9 + teacherBenefitsIn * 0.1})`,
                  pointerEvents: teacherBenefitsIn > 0.82 ? "auto" : "none",
                }}
                aria-hidden={teacherBenefitsIn < 0.82}
              >
                {teacherBenefits.map((benefit) => {
                  const Icon = benefit.icon;
                  return (
                    <button
                      key={benefit.title}
                      type="button"
                      className="teacher-benefit-card group relative min-h-0 rounded-xl text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#83bffc] focus-visible:ring-offset-2 sm:rounded-2xl"
                      aria-label={`${benefit.title}: ${benefit.detail}`}
                      aria-pressed={flippedCard === benefit.title}
                      onClick={() => setFlippedCard((current) => current === benefit.title ? null : benefit.title)}
                    >
                      <span className={`teacher-benefit-card-inner absolute inset-0 block rounded-xl sm:rounded-2xl ${flippedCard === benefit.title ? "is-flipped" : ""}`}>
                        <span className="teacher-benefit-card-face absolute inset-0 flex overflow-hidden rounded-xl border-2 border-[#14245e]/10 bg-gradient-to-br from-white to-[#f6f8fc] p-1.5 text-center shadow-[0_8px_24px_rgba(20,36,94,0.12)] sm:rounded-2xl sm:p-4">
                          <span className="m-auto flex flex-col items-center">
                          <span
                            className="flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-sm sm:h-14 sm:w-14 sm:rounded-2xl"
                            style={{ backgroundColor: benefit.color }}
                          >
                            <Icon className="h-4 w-4 sm:h-7 sm:w-7" aria-hidden="true" />
                          </span>
                          <strong className="mt-1.5 text-xs font-black text-[#14245e] sm:mt-3 sm:text-xl">
                            {benefit.title}
                          </strong>
                          </span>
                        </span>
                        <span
                          className="teacher-benefit-card-face teacher-benefit-card-back absolute inset-0 flex overflow-hidden rounded-xl border-2 border-white/30 p-2 text-center text-white shadow-[0_8px_24px_rgba(20,36,94,0.18)] sm:rounded-2xl sm:p-5"
                          style={{ backgroundColor: benefit.color }}
                        >
                          <span>
                            <strong className="block text-sm font-black sm:text-lg">{benefit.title}</strong>
                            <span className="mt-1.5 block text-[10px] font-bold leading-4 sm:mt-2 sm:text-sm sm:leading-5">
                              {benefit.detail}
                            </span>
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <nav
            aria-label="Story scenes"
            className="relative z-30 mx-auto mb-3 w-[min(94%,28rem)] px-2 pb-1 sm:mb-5 sm:w-[min(92%,32rem)]"
          >
            <div className="relative">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[16.67%] right-[16.67%] top-[0.7rem] h-0.5 bg-[#dfe8f5] sm:top-[0.85rem]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[16.67%] top-[0.7rem] h-0.5 bg-[#3478f6] transition-[width] duration-150 ease-out sm:top-[0.85rem]"
                style={{
                  width: `${(stageIndex / (STORY_STAGES.length - 1)) * 66.66}%`,
                }}
              />
              <ol className="relative z-10 grid grid-cols-3 gap-1">
                {STORY_STAGES.map((stage, index) => {
                  const active = index === stageIndex;
                  const reached = index <= stageIndex;
                  return (
                    <li key={stage.id} className="flex flex-col items-center">
                      <button
                        type="button"
                        onClick={() => goToStage(stage.targetProgress)}
                        aria-label={`Go to ${stage.label}`}
                        aria-current={active ? "step" : undefined}
                        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-[background-color,border-color,transform,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#83bffc] focus-visible:ring-offset-2 sm:h-7 sm:w-7 ${
                          active
                            ? "scale-110 border-[#3478f6] bg-[#3478f6] shadow-[0_0_0_4px_rgba(52,120,246,0.18)]"
                            : reached
                              ? "border-[#3478f6] bg-[#3478f6]"
                              : "border-[#9eb3d4] bg-white hover:border-[#3478f6]"
                        }`}
                      >
                        <span
                          className={`block h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5 ${
                            reached ? "bg-white" : "bg-[#9eb3d4]"
                          }`}
                        />
                      </button>
                      <span
                        className={`mt-1.5 max-w-[6.5rem] text-center text-[10px] font-extrabold leading-tight sm:mt-2 sm:max-w-[7.5rem] sm:text-xs ${
                          active ? "text-[#14245e]" : "text-[#52617d]"
                        }`}
                      >
                        {stage.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </nav>
        </div>
      </section>

      {!embedded ? <section className="border-t border-[#14245e]/10 bg-[#fff8eb] px-4 py-16 text-center sm:px-8 sm:py-24">
        <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-[#d55f3d]">The same learning relationship</p>
        <h2 className="mx-auto mt-3 max-w-3xl text-3xl font-black sm:text-5xl">One connected ecosystem for class and home</h2>
        <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-relaxed text-[#52617d] sm:text-lg">
          This closing state is where the production homepage can hand off into Learning Paths and the teacher workflow.
        </p>
        <Link href="/pilots" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#14245e] px-6 font-extrabold text-white shadow-[4px_4px_0_0_#8ea6d8]">
          Back to pilots
        </Link>
      </section> : null}

      <style jsx global>{`
        .teacher-benefit-card {
          perspective: 1000px;
          transform: translateZ(0);
        }
        .teacher-benefit-card-inner {
          transform: rotateY(0deg);
          transform-origin: center center;
          transform-style: preserve-3d;
          transition: transform 380ms cubic-bezier(0.22, 0.75, 0.22, 1);
          will-change: transform;
        }
        .teacher-benefit-card:hover .teacher-benefit-card-inner,
        .teacher-benefit-card:focus-visible .teacher-benefit-card-inner,
        .teacher-benefit-card-inner.is-flipped {
          transform: rotateY(180deg);
        }
        .teacher-benefit-card-face {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform: rotateY(0deg) translateZ(1px);
        }
        .teacher-benefit-card-back {
          transform: rotateY(180deg) translateZ(1px);
        }
        @media (prefers-reduced-motion: reduce) {
          .teacher-benefit-card-inner {
            transition-duration: 0.01ms;
          }
        }
      `}</style>
    </Root>
  );
}
