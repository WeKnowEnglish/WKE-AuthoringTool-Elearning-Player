import { clsx } from "clsx";
import { LandingIcon } from "@/components/landing/LandingIcon";
import { LANDING_FEATURES } from "@/lib/landing/landing-path-config";

const FEATURE_BADGES = ["bg-[#ffe135]", "bg-[#f7bf4d]", "bg-[#b8e8fb]"] as const;

export function LandingFeatureBar() {
  return (
    <section
      aria-label="Platform features"
      className="mx-auto mt-10 max-w-5xl rounded-2xl border-4 border-kid-ink bg-[#fff8eb] px-5 py-7 shadow-[6px_6px_0_0_var(--kid-shadow)] sm:px-8"
    >
      <ul className="grid gap-6 sm:grid-cols-3 sm:gap-4">
        {LANDING_FEATURES.map((feature, index) => (
          <li key={feature.title} className="text-center">
            <span
              className={clsx(
                "mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl border-2 border-kid-ink",
                FEATURE_BADGES[index] ?? "bg-white",
              )}
            >
              <LandingIcon name={feature.icon} size={28} className="text-kid-ink" />
            </span>
            <h3 className="mt-3 text-base font-extrabold text-kid-ink">{feature.title}</h3>
            <p className="mt-1 text-sm font-semibold text-kid-ink/75">{feature.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
