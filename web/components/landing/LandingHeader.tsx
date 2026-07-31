import Link from "next/link";
import { LandingIcon } from "@/components/landing/LandingIcon";

const solidClass =
  "inline-flex min-h-11 items-center gap-2 rounded-lg border-2 border-kid-ink/30 bg-white px-3 py-2 text-sm font-bold text-kid-ink transition-[transform,background-color] [touch-action:manipulation] hover:bg-neutral-50 active:scale-[0.97] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-kid-ink";

/**
 * Persistent utility header — student access stays above the fold on mobile and desktop.
 */
export function LandingHeader() {
  return (
    <header className="border-b border-kid-ink/10 bg-[var(--landing-page-bg)]">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:flex sm:items-center sm:justify-between sm:gap-3 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-extrabold tracking-tight text-kid-ink sm:text-2xl">
            We Know English
          </p>
          <Link href="/login?portal=teacher" className={`${solidClass} sm:hidden`}>
            <LandingIcon name="graduation" size={16} />
            Teacher
          </Link>
        </div>
        <nav
          aria-label="Account access"
          className="mt-3 grid grid-cols-2 gap-2 sm:mt-0 sm:flex sm:flex-wrap sm:items-center sm:justify-end"
        >
          <Link href="/login" className={`${solidClass} justify-center sm:border-0 sm:bg-transparent sm:px-2.5`}>
            <LandingIcon name="user" size={16} />
            Student sign in
          </Link>
          <Link href="/join-class" className={`${solidClass} justify-center sm:border-0 sm:bg-transparent sm:px-2.5`}>
            Join class
          </Link>
          <span className="hidden sm:inline-flex">
            <Link href="/login?portal=teacher" className={solidClass}>
              <LandingIcon name="graduation" size={16} />
              Teacher sign in
            </Link>
          </span>
        </nav>
      </div>
    </header>
  );
}
