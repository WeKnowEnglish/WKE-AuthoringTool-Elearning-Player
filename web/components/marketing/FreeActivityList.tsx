import Link from "next/link";
import { FREE_ACTIVITY_CARDS } from "@/lib/landing/free-activities";

export function FreeActivityList() {
  return (
    <ul className="not-prose mt-6 space-y-4">
      {FREE_ACTIVITY_CARDS.map((card) => (
        <li
          key={card.href}
          className="rounded-xl border-2 border-kid-ink/15 bg-white p-4"
        >
          <p className="text-xs font-extrabold uppercase tracking-wide text-kid-ink/50">
            {card.skill} · {card.cefr}
          </p>
          <h3 className="mt-1 text-lg font-extrabold text-kid-ink">
            <Link href={card.href} className="underline-offset-2 hover:underline">
              {card.title}
            </Link>
          </h3>
          <p className="mt-2 text-sm font-semibold text-kid-ink/75">{card.description}</p>
        </li>
      ))}
    </ul>
  );
}
