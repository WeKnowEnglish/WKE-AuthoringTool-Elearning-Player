import type { GrammarPosterVariant } from "./poster-variant";

type Props = {
  label: string;
  badge?: string;
  desc?: string;
  extra?: string;
  pillColor: string;
  variant?: GrammarPosterVariant;
};

export function PosterSubHeader({
  label,
  badge,
  desc,
  extra,
  pillColor,
  variant = "poster",
}: Props) {
  const isShowcase = variant === "showcase";

  return (
    <div className="mb-3 space-y-2">
      <div
        className={
          isShowcase ?
            "flex items-center justify-center gap-2 rounded-full border-2 border-kid-ink px-3 py-1.5 text-center text-sm font-extrabold uppercase tracking-wide text-kid-ink shadow-[2px_2px_0_0_var(--kid-shadow)]"
          : "flex items-center justify-center gap-2 rounded-full border-2 border-kid-ink px-4 py-2 text-center text-base font-bold uppercase tracking-wide text-kid-ink shadow-[2px_2px_0_0_var(--kid-shadow)]"
        }
        style={{ backgroundColor: pillColor }}
      >
        {badge ? (
          <span className={isShowcase ? "text-lg" : "text-2xl"} aria-hidden>
            {badge}
          </span>
        ) : null}
        <span>{label}</span>
      </div>
      {desc ? (
        <p className="text-base font-semibold leading-snug text-kid-ink md:text-lg">{desc}</p>
      ) : null}
      {extra ? (
        <p className="text-sm font-semibold text-kid-ink/70 md:text-base">{extra}</p>
      ) : null}
    </div>
  );
}
