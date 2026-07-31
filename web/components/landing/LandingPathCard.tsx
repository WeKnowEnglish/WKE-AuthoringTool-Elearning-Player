import { clsx } from "clsx";
import { LandingIcon } from "@/components/landing/LandingIcon";
import { LandingPathCharacter } from "@/components/landing/LandingPathCharacter";
import { LANDING_CHARACTER_DISPLAY } from "@/lib/landing/landing-assets";
import type { LandingPathConfig } from "@/lib/landing/landing-path-config";

type Props = {
  config: LandingPathConfig;
  characterSrc: string | null;
  onEnter: () => void;
};

function LandingPathCardContent({
  config,
  onEnter,
  contentInsetClass,
}: {
  config: LandingPathConfig;
  onEnter: () => void;
  contentInsetClass: string;
}) {
  const { variant, title, description, meta, pills, ctaLabel } = config;
  const isPrimary = variant === "primary";

  return (
    <div className={clsx("relative z-20 flex min-w-0 flex-col justify-center gap-3 py-2", contentInsetClass)}>
      <h2
        className={clsx(
          "text-center text-2xl font-extrabold",
          isPrimary ? "text-[var(--landing-primary-title)]" : "text-[var(--landing-secondary-title)]",
        )}
      >
        {title}
      </h2>

      <p className="text-center text-base font-semibold text-kid-ink/80">{description}</p>

      <ul className="flex flex-wrap justify-center gap-4">
        {meta.map((item) => (
          <li key={item.label} className="inline-flex items-center gap-1.5 text-sm font-semibold text-kid-ink/80">
            <LandingIcon name={item.icon} size={18} className="text-kid-ink/70" />
            {item.label}
          </li>
        ))}
      </ul>

      <ul className="flex flex-wrap justify-center gap-2">
        {pills.map((pill) => (
          <li key={pill.label}>
            <span
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
                pill.tone,
              )}
            >
              <LandingIcon name={pill.icon} size={14} />
              {pill.label}
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onEnter}
        className={clsx(
          "mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5",
          "text-base font-extrabold text-white shadow-md",
          "[touch-action:manipulation] active:scale-[0.98] motion-reduce:active:scale-100",
          "focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-kid-ink",
          isPrimary ? "landing-cta-primary" : "landing-cta-secondary",
        )}
      >
        {ctaLabel}
        <LandingIcon name="arrow-right" size={18} className="text-white" />
      </button>
    </div>
  );
}

export function LandingPathCard({ config, characterSrc, onEnter }: Props) {
  const { variant } = config;
  const isPrimary = variant === "primary";
  const characterDisplay = LANDING_CHARACTER_DISPLAY[variant];
  const showCharacter = Boolean(characterSrc);
  const content = (
    <LandingPathCardContent
      config={config}
      onEnter={onEnter}
      contentInsetClass={showCharacter ? characterDisplay.contentInsetClass : ""}
    />
  );

  if (!showCharacter) {
    return (
      <article
        className={clsx(
          "relative overflow-visible rounded-2xl border-2 px-4 py-4 shadow-sm transition-transform sm:px-6 sm:py-6",
          "hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
          isPrimary ?
            "border-[var(--landing-primary-border)] bg-[var(--landing-primary-bg)]"
          : "border-[var(--landing-secondary-border)] bg-[var(--landing-secondary-bg)]",
        )}
      >
        {content}
      </article>
    );
  }

  const character = <LandingPathCharacter variant={variant} src={characterSrc} />;

  const characterColumn = (
    <div
      className={clsx(
        "relative z-10 flex min-h-0 shrink-0 items-stretch self-stretch",
        characterDisplay.insetTowardCenterClass,
      )}
    >
      {character}
    </div>
  );

  return (
    <article
      className={clsx(
        "relative grid items-stretch overflow-visible rounded-2xl border-2 shadow-sm transition-transform",
        "gap-4 sm:gap-5",
        "hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
        isPrimary ?
          "grid-cols-[minmax(0,1fr)_minmax(6.5rem,34%)] border-[var(--landing-primary-border)] bg-[var(--landing-primary-bg)] py-5 pl-5 pr-2 sm:py-6 sm:pl-6 sm:pr-3"
        : "grid-cols-[minmax(6.5rem,34%)_minmax(0,1fr)] border-[var(--landing-secondary-border)] bg-[var(--landing-secondary-bg)] py-5 pl-2 pr-5 sm:py-6 sm:pl-3 sm:pr-6",
      )}
    >
      {characterDisplay.side === "left" ?
        <>
          {characterColumn}
          {content}
        </>
      : <>
          {content}
          {characterColumn}
        </>
      }
    </article>
  );
}
