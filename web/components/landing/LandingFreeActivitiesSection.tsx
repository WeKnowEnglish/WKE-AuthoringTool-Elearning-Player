import { FREE_ACTIVITY_CARDS } from "@/lib/landing/free-activities";
import { TrackedMarketingLink } from "@/components/landing/HomepageAnalytics";

export function LandingFreeActivitiesSection() {
  return (
    <section
      id="free-activities"
      aria-labelledby="free-activities-heading"
      className="mx-auto max-w-6xl px-4 py-12 sm:px-8"
    >
      <h2 id="free-activities-heading" className="text-2xl font-extrabold text-kid-ink sm:text-3xl">
        Free ESL activities you can use today
      </h2>
      <p className="mt-3 max-w-3xl text-base font-semibold leading-relaxed text-[var(--landing-body-muted)] sm:text-lg">
        Real named activities with clear language goals — not empty category pages.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {FREE_ACTIVITY_CARDS.map((card) => (
          <li
            key={card.href}
            className="flex flex-col rounded-xl border-2 border-kid-ink/20 bg-white p-5 shadow-[4px_4px_0_0_rgba(15,23,42,0.06)]"
          >
            <div className="flex flex-wrap gap-2 text-xs font-extrabold uppercase tracking-wide text-kid-ink/60">
              <span>{card.skill}</span>
              <span aria-hidden="true">·</span>
              <span>{card.cefr}</span>
              <span aria-hidden="true">·</span>
              <span>{card.gradeBand.replace("-", " ")}</span>
            </div>
            <h3 className="mt-3 text-lg font-extrabold text-kid-ink">{card.title}</h3>
            <p className="mt-2 flex-1 text-sm font-semibold leading-relaxed text-kid-ink/75">
              {card.description}
            </p>
            <TrackedMarketingLink
              href={card.href}
              event="free_activity_start"
              eventProps={{
                activityType: card.activityType,
                topic: card.topic,
                cefr: card.cefr,
                gradeBand: card.gradeBand,
                cta: "play_free_activity",
              }}
              className="mt-4 inline-flex w-fit items-center justify-center rounded-lg border-2 border-kid-ink bg-[#ffe135] px-4 py-2 text-sm font-extrabold text-kid-ink focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-kid-ink"
            >
              {card.indexable ? "Open activity" : "Try activity"}
            </TrackedMarketingLink>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm font-semibold text-[var(--landing-body-muted)]">
        Browse more grammar posters in the{" "}
        <a href="/grammar" className="font-extrabold text-kid-ink underline underline-offset-2">
          grammar library
        </a>
        .
      </p>
    </section>
  );
}
