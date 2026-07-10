import { clsx } from "clsx";
import { LandingIcon } from "@/components/landing/LandingIcon";
import { LANDING_FEATURES } from "@/lib/landing/landing-path-config";

export function LandingFeatureBar() {
  return (
    <section
      aria-label="Platform features"
      className="mx-auto mt-10 max-w-5xl rounded-2xl border border-[var(--landing-feature-border)] bg-white px-6 py-8 shadow-sm"
    >
      <ul className="grid gap-8 sm:grid-cols-3">
        {LANDING_FEATURES.map((feature) => (
          <li key={feature.title} className="text-center">
            <LandingIcon
              name={feature.icon}
              size={32}
              className={clsx("mx-auto", feature.accent)}
            />
            <h3 className="mt-3 text-base font-extrabold text-kid-ink">{feature.title}</h3>
            <p className="mt-1 text-sm font-semibold text-[var(--landing-body-muted)]">{feature.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
