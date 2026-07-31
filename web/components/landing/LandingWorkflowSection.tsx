import Image from "next/image";
import { LandingIcon } from "@/components/landing/LandingIcon";
import { LANDING_CHARACTERS } from "@/lib/landing/landing-assets";
import type { LandingIconName } from "@/lib/landing/landing-icons";

const STEPS: {
  title: string;
  body: string;
  icon: LandingIconName;
}[] = [
  {
    title: "Create",
    body: "Build quizzes, lessons, and learning tracks once — then reuse them across class and home.",
    icon: "pencil",
  },
  {
    title: "Teach",
    body: "Run live lessons with the same activities, whiteboards, and classroom participation tools.",
    icon: "users",
  },
  {
    title: "Assign",
    body: "Send homework and learning paths to rostered students without leaving the platform.",
    icon: "book",
  },
  {
    title: "Play",
    body: "Students practise through games, quests, and interactive activities that keep them coming back.",
    icon: "game",
  },
  {
    title: "Review",
    body: "See progress and mastery evidence so you know what to teach next.",
    icon: "trophy",
  },
];

/** Static connected workflow — no activity engine in the initial load. */
export function LandingWorkflowSection() {
  return (
    <section aria-labelledby="how-it-works-heading" className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-3xl text-center">
        <h2
          id="how-it-works-heading"
          className="text-2xl font-extrabold text-kid-ink sm:text-4xl"
        >
          How it works
        </h2>
        <p className="mt-4 text-base font-semibold leading-relaxed text-[var(--landing-body-muted)] sm:text-lg">
          One ESL ecosystem for teachers and learners: create content, teach live, assign
          practice, play through games, and review progress — without jumping between tools.
        </p>
      </div>

      <div className="mt-7 grid items-end gap-6 sm:mt-10 lg:grid-cols-[minmax(9rem,14rem)_minmax(0,1fr)] lg:gap-8">
        <div className="mx-auto hidden w-full max-w-[11rem] items-end justify-center sm:flex lg:mx-0 lg:max-w-none">
          <Image
            src={LANDING_CHARACTERS.secondary}
            alt=""
            width={500}
            height={500}
            className="h-auto w-full max-h-[16rem] object-contain object-bottom drop-shadow-[0_12px_24px_rgba(15,23,42,0.12)] sm:max-h-[18rem] lg:max-h-[22rem]"
            aria-hidden
          />
        </div>

        <ol className="grid gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-5">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 rounded-xl border-2 border-kid-ink/20 bg-white p-3 sm:block sm:p-4"
            >
              <div className="row-span-2 flex flex-col items-center gap-1.5 sm:flex-row sm:gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border-2 border-kid-ink/15 bg-[#eff6ff] text-[var(--landing-secondary-title)]">
                  <LandingIcon name={step.icon} size={18} />
                </span>
                <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--landing-primary-title)]">
                  Step {index + 1}
                </p>
              </div>
              <h3 className="text-lg font-extrabold text-kid-ink sm:mt-3">{step.title}</h3>
              <p className="mt-1 text-sm font-semibold leading-snug text-kid-ink/70 sm:mt-2 sm:leading-relaxed">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
