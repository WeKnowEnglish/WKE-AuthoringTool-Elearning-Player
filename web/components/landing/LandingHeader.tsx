import Link from "next/link";
import { LandingIcon } from "@/components/landing/LandingIcon";

const linkClass =
  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-bold text-kid-ink transition-colors hover:bg-white/80 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-kid-ink";

const solidClass =
  "inline-flex items-center gap-2 rounded-lg border-2 border-kid-ink/30 bg-white px-3 py-2 text-sm font-bold text-kid-ink transition-[transform,background-color] [touch-action:manipulation] hover:bg-neutral-50 active:scale-[0.97] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-kid-ink";

/**
 * Persistent utility header — student access stays above the fold on mobile and desktop.
 */
export function LandingHeader() {
  return (
    <header className="border-b border-kid-ink/10 bg-[var(--landing-page-bg)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <p className="text-xl font-extrabold tracking-tight text-kid-ink sm:text-2xl">
          We Know English
        </p>
        <nav
          aria-label="Account access"
          className="flex flex-wrap items-center justify-end gap-1 sm:gap-2"
        >
          <Link href="/login" className={linkClass}>
            <LandingIcon name="user" size={16} />
            Student sign in
          </Link>
          <Link href="/join-class" className={linkClass}>
            Join class
          </Link>
          <Link href="/login?portal=teacher" className={solidClass}>
            <LandingIcon name="graduation" size={16} />
            Teacher sign in
          </Link>
        </nav>
      </div>
      <div className="border-t border-kid-ink/10 bg-[#fff8eb] px-4 py-2 sm:hidden">
        <p className="text-center text-sm font-bold text-kid-ink">
          Students:{" "}
          <Link href="/login" className="underline underline-offset-2">
            Sign in
          </Link>
          {" or "}
          <Link href="/join-class" className="underline underline-offset-2">
            enter your class code
          </Link>
        </p>
      </div>
    </header>
  );
}
