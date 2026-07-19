import { clsx } from "clsx";
import { LandingIcon } from "@/components/landing/LandingIcon";
import type { LandingIconName } from "@/lib/landing/landing-icons";

const AUDIENCES: {
  icon: LandingIconName;
  title: string;
  body: string;
  badgeClass: string;
  iconClass: string;
}[] = [
  {
    icon: "graduation",
    title: "For students",
    body: "Interactive lessons, vocabulary, grammar, stories, and games that turn English practice into something students want to finish.",
    badgeClass: "bg-[#ffe135]",
    iconClass: "text-kid-ink",
  },
  {
    icon: "users",
    title: "For teachers",
    body: "Classroom tools to assign work, run live learning games, and see where each learner needs support.",
    badgeClass: "bg-[#b8e8fb]",
    iconClass: "text-kid-ink",
  },
  {
    icon: "trophy",
    title: "For parents",
    body: "Clear grade-band paths and visible progress—so home practice connects to what students learn at school.",
    badgeClass: "bg-[#f7bf4d]",
    iconClass: "text-kid-ink",
  },
];

const PRACTICE_AREAS: { label: string; tone: string }[] = [
  { label: "Phonics & stories", tone: "bg-amber-100 text-amber-900 border-amber-300" },
  { label: "Vocabulary & grammar", tone: "bg-sky-100 text-sky-900 border-sky-300" },
  { label: "Live classroom games", tone: "bg-violet-100 text-violet-900 border-violet-300" },
  { label: "Progress & badges", tone: "bg-emerald-100 text-emerald-900 border-emerald-300" },
];

export function LandingTrustSection() {
  return (
    <section
      aria-labelledby="landing-trust-heading"
      className="mx-auto mt-12 max-w-5xl"
    >
      <div
        className={clsx(
          "rounded-2xl border-4 border-kid-ink bg-[#fff8eb] p-5 shadow-[6px_6px_0_0_var(--kid-shadow)]",
          "sm:p-8",
        )}
      >
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center rounded-full border-2 border-kid-ink bg-[#ffe135] px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-kid-ink">
            Built for real classrooms
          </p>
          <h2
            id="landing-trust-heading"
            className="mt-4 text-2xl font-extrabold text-kid-ink sm:text-3xl"
          >
            English learning built for school and home
          </h2>
          <p className="mt-3 text-base font-semibold leading-relaxed text-kid-ink/80 sm:text-lg">
            We Know English is an ESL platform for grades 1–9. Students practice
            through lessons and games; teachers guide classes; parents can see
            real progress—not just completed worksheets.
          </p>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-5">
          {AUDIENCES.map((item) => (
            <li
              key={item.title}
              className="rounded-xl border-4 border-kid-ink bg-white p-4 shadow-[4px_4px_0_0_var(--kid-shadow)] sm:p-5"
            >
              <span
                className={clsx(
                  "inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-kid-ink",
                  item.badgeClass,
                )}
              >
                <LandingIcon name={item.icon} size={24} className={item.iconClass} />
              </span>
              <h3 className="mt-3 text-lg font-extrabold text-kid-ink">{item.title}</h3>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-kid-ink/75">
                {item.body}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-xl border-4 border-kid-ink bg-kid-surface/70 p-5 shadow-[4px_4px_0_0_var(--kid-shadow)] sm:mt-8 sm:p-6">
          <h3 className="text-center text-base font-extrabold text-kid-ink sm:text-lg">
            What students practice
          </h3>
          <ul className="mt-4 flex flex-wrap justify-center gap-2.5">
            {PRACTICE_AREAS.map((item) => (
              <li key={item.label}>
                <span
                  className={clsx(
                    "inline-flex items-center rounded-full border-2 px-3.5 py-1.5 text-sm font-extrabold",
                    item.tone,
                  )}
                >
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
