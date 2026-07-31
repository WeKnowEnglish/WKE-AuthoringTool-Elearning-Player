import Link from "next/link";

type Props = {
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
};

export function PillarCtaRow({
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: Props) {
  return (
    <div className="not-prose mt-10 flex flex-wrap gap-3">
      <Link
        href={primaryHref}
        className="inline-flex items-center justify-center rounded-xl border-2 border-kid-ink bg-kid-ink px-5 py-3 text-sm font-extrabold text-white shadow-[4px_4px_0_0_var(--kid-shadow)]"
      >
        {primaryLabel}
      </Link>
      <Link
        href={secondaryHref}
        className="inline-flex items-center justify-center rounded-xl border-2 border-kid-ink bg-white px-5 py-3 text-sm font-extrabold text-kid-ink shadow-[4px_4px_0_0_var(--kid-shadow)]"
      >
        {secondaryLabel}
      </Link>
    </div>
  );
}
