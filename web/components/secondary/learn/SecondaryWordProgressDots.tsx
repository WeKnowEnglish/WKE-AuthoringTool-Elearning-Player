import clsx from "clsx";

type Props = {
  filledDots: number;
  totalDots: number;
  className?: string;
  dotClassName?: string;
  label?: string;
};

export function SecondaryWordProgressDots({
  filledDots,
  totalDots,
  className,
  dotClassName = "h-2 w-2",
  label,
}: Props) {
  return (
    <span className={clsx("inline-flex items-center gap-0.5", className)}>
      <span className="inline-flex items-center gap-0.5" aria-hidden>
        {Array.from({ length: totalDots }, (_, index) => (
          <span
            key={index}
            className={clsx(
              "rounded-full border border-kid-ink/30",
              dotClassName,
              index < filledDots ? "bg-kid-ink" : "bg-white",
            )}
          />
        ))}
      </span>
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
