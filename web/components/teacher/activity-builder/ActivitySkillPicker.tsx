import {
  ACTIVITY_SKILL_LABELS,
  groupActivityOptionsBySkill,
  type ActivitySkillType,
  type SkillGroupedActivityOption,
} from "@/lib/activity-skills";

type Props<Id extends string> = {
  options: readonly SkillGroupedActivityOption<Id>[];
  onChoose: (id: Id) => void;
};

const SKILL_STYLES: Record<
  ActivitySkillType,
  { panel: string; heading: string; button: string }
> = {
  vocabulary: {
    panel: "border-emerald-200 bg-emerald-50/60",
    heading: "text-emerald-900",
    button: "hover:border-emerald-400 hover:bg-emerald-50",
  },
  grammar: {
    panel: "border-violet-200 bg-violet-50/60",
    heading: "text-violet-900",
    button: "hover:border-violet-400 hover:bg-violet-50",
  },
  speaking: {
    panel: "border-rose-200 bg-rose-50/60",
    heading: "text-rose-900",
    button: "hover:border-rose-400 hover:bg-rose-50",
  },
  listening: {
    panel: "border-sky-200 bg-sky-50/60",
    heading: "text-sky-900",
    button: "hover:border-sky-400 hover:bg-sky-50",
  },
  reading: {
    panel: "border-amber-200 bg-amber-50/60",
    heading: "text-amber-900",
    button: "hover:border-amber-400 hover:bg-amber-50",
  },
  writing: {
    panel: "border-cyan-200 bg-cyan-50/60",
    heading: "text-cyan-900",
    button: "hover:border-cyan-400 hover:bg-cyan-50",
  },
};

/** Shared six-skill activity menu for every Track builder authoring mode. */
export function ActivitySkillPicker<Id extends string>({ options, onChoose }: Props<Id>) {
  const groups = groupActivityOptionsBySkill(options);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => {
        const style = SKILL_STYLES[group.skill];
        const headingId = `activity-skill-${group.skill}`;
        return (
          <section
            key={group.skill}
            aria-labelledby={headingId}
            className={`rounded-2xl border p-3 ${style.panel}`}
          >
            <div className="flex items-center justify-between gap-2">
              <h3
                id={headingId}
                className={`text-xs font-black uppercase tracking-wide ${style.heading}`}
              >
                {ACTIVITY_SKILL_LABELS[group.skill]}
              </h3>
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-stone-500">
                {group.options.length}
              </span>
            </div>
            {group.options.length > 0 ? (
              <div className="mt-2 space-y-2">
                {group.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onChoose(option.id)}
                    className={`w-full rounded-xl border border-stone-200 bg-white p-3 text-left shadow-sm transition-colors ${style.button}`}
                  >
                    <span className="block text-sm font-extrabold text-stone-950">
                      {option.label}
                    </span>
                    {option.description ? (
                      <span className="mt-1 block text-xs font-semibold leading-5 text-stone-600">
                        {option.description}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 rounded-xl border border-dashed border-stone-200 bg-white/70 px-3 py-4 text-center text-[11px] font-semibold text-stone-500">
                No {ACTIVITY_SKILL_LABELS[group.skill].toLowerCase()} activities in this mode yet.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
