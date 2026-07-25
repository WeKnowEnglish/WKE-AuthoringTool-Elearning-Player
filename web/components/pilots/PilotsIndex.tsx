import Link from "next/link";
import {
  entriesForSection,
  PILOT_CATALOG,
  PILOT_SECTIONS,
  type PilotEntry,
  type PilotSectionDef,
} from "@/lib/pilots/catalog";

function sectionToneClass(tone: PilotSectionDef["tone"]): string {
  switch (tone) {
    case "active":
      return "border-kid-ink/20";
    case "review":
      return "border-kid-ink/15";
    case "deferred":
      return "border-amber-700/25";
    case "salvageable":
      return "border-sky-700/25";
    case "product":
      return "border-emerald-800/20";
    case "dead":
      return "border-neutral-400/40";
    default:
      return "border-kid-ink/15";
  }
}

function cardToneClass(entry: PilotEntry, sectionTone: PilotSectionDef["tone"]): string {
  if (sectionTone === "salvageable" || entry.group === "salvageable") {
    return "border-dashed border-sky-700/35 bg-sky-50/60";
  }
  if (sectionTone === "deferred" || entry.notShippable) {
    return "border-dashed border-amber-700/40 bg-amber-50/50";
  }
  if (sectionTone === "dead") {
    return "border-dashed border-neutral-400 bg-neutral-50";
  }
  if (sectionTone === "product") {
    return "border-emerald-800/30 bg-emerald-50/40";
  }
  if (entry.status === "active") {
    return "border-kid-ink bg-kid-panel";
  }
  return "border-dashed border-kid-ink/35 bg-white/70";
}

function badgeFor(entry: PilotEntry, sectionTone: PilotSectionDef["tone"]): {
  label: string;
  className: string;
} {
  if (sectionTone === "salvageable") {
    return {
      label: "Salvageable",
      className: "border-sky-700/40 bg-sky-100 text-sky-950",
    };
  }
  if (sectionTone === "dead") {
    return {
      label: "Dead / redirect",
      className: "border-neutral-400 bg-neutral-100 text-neutral-700",
    };
  }
  if (entry.notShippable || sectionTone === "deferred") {
    return {
      label: "Not shippable",
      className: "border-amber-700/50 bg-amber-100 text-amber-950",
    };
  }
  if (entry.status === "active") {
    return {
      label: "Active",
      className: "border-kid-ink bg-kid-cta text-kid-ink",
    };
  }
  if (sectionTone === "product") {
    return {
      label: "Product surface",
      className: "border-emerald-800/40 bg-emerald-100 text-emerald-950",
    };
  }
  return {
    label: "Review",
    className: "border-kid-ink/30 bg-white text-kid-ink/70",
  };
}

function PilotCard({
  entry,
  sectionTone,
}: {
  entry: PilotEntry;
  sectionTone: PilotSectionDef["tone"];
}) {
  const badge = badgeFor(entry, sectionTone);
  return (
    <article className={["flex flex-col rounded-xl border-4 p-4", cardToneClass(entry, sectionTone)].join(" ")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-extrabold text-kid-ink">{entry.title}</h3>
        <span
          className={[
            "rounded-md border-2 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
            badge.className,
          ].join(" ")}
        >
          {badge.label}
        </span>
      </div>
      <p className="mt-2 flex-1 text-sm font-semibold text-kid-ink/75">{entry.description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {entry.href ? (
          <Link
            href={entry.href}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border-4 border-kid-ink bg-kid-cta px-4 text-sm font-bold text-kid-ink transition hover:bg-kid-cta-hover active:bg-kid-cta-active"
          >
            {entry.notShippable || sectionTone === "deferred"
              ? "Open closest surface"
              : sectionTone === "dead"
                ? "Follow redirect"
                : entry.status === "active"
                  ? "Open pilot"
                  : "Open"}
          </Link>
        ) : (
          <span className="inline-flex min-h-11 items-center rounded-lg border-2 border-kid-ink/25 bg-white px-3 text-xs font-bold text-kid-ink/55">
            No pilot route
          </span>
        )}
        {entry.subtype ? (
          <code className="inline-flex min-h-11 items-center rounded-lg border-2 border-kid-ink/20 bg-white px-3 font-mono text-xs font-semibold text-kid-ink/70">
            {entry.subtype}
          </code>
        ) : null}
        {entry.href ? (
          <code className="inline-flex min-h-11 items-center rounded-lg border-2 border-kid-ink/20 bg-white px-3 text-xs font-semibold text-kid-ink/70">
            {entry.href}
          </code>
        ) : null}
        {entry.studioHref ? (
          <span className="text-[11px] font-bold uppercase tracking-wide text-kid-ink/45">
            Studio wired
          </span>
        ) : null}
      </div>
    </article>
  );
}

function CatalogSection({ section }: { section: PilotSectionDef }) {
  const entries = entriesForSection(section);
  if (entries.length === 0) return null;
  return (
    <section className={["border-t-4 pt-8", sectionToneClass(section.tone)].join(" ")}>
      <h2 className="text-xl font-extrabold text-kid-ink">{section.title}</h2>
      <p className="mt-1 max-w-3xl text-sm font-semibold text-kid-ink/70">{section.purpose}</p>
      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-kid-ink/45">
        {entries.length} item{entries.length === 1 ? "" : "s"}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {entries.map((entry) => (
          <PilotCard
            key={`${section.id}:${entry.subtype ?? entry.title}`}
            entry={entry}
            sectionTone={section.tone}
          />
        ))}
      </div>
    </section>
  );
}

/** Directory of Lesson Player pilots and related surfaces for triage. */
export function PilotsIndex() {
  const activeCount = PILOT_CATALOG.filter((e) => e.status === "active").length;
  const sectionCounts = PILOT_SECTIONS.map((section) => ({
    id: section.id,
    n: entriesForSection(section).length,
  }));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 p-4 pb-16 sm:p-6">
      <header className="rounded-xl border-4 border-kid-ink bg-kid-panel px-5 py-6">
        <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/55">
          Lesson Player
        </p>
        <h1 className="mt-1 text-3xl font-extrabold text-kid-ink">Pilots & triage board</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold text-kid-ink/75">
          One place to see what we are building, what is floating, what is old-but-keepable, and
          what is dead. Use section purposes below to decide promote / keep / archive.
        </p>
        <p className="mt-3 text-xs font-bold text-kid-ink/55">
          {activeCount} active pilots · {PILOT_CATALOG.length} cards total ·{" "}
          {sectionCounts.filter((s) => s.n > 0).length} sections
        </p>
        <nav className="mt-4 flex flex-wrap gap-2" aria-label="Jump to section">
          {PILOT_SECTIONS.map((section) => {
            const count = entriesForSection(section).length;
            if (count === 0) return null;
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-md border-2 border-kid-ink/20 bg-white px-2.5 py-1 text-xs font-bold text-kid-ink/80 transition hover:border-kid-ink hover:bg-kid-cta/40"
              >
                {section.title} ({count})
              </a>
            );
          })}
        </nav>
      </header>

      <div className="space-y-2">
        {PILOT_SECTIONS.map((section) => (
          <div key={section.id} id={section.id}>
            <CatalogSection section={section} />
          </div>
        ))}
      </div>
    </div>
  );
}
