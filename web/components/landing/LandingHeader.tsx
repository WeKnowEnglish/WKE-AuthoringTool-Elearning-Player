import Link from "next/link";
import { LandingIcon } from "@/components/landing/LandingIcon";

export function LandingHeader() {
  return (
    <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-8">
      <p className="text-xl font-extrabold tracking-tight text-kid-ink sm:text-2xl">We Know English</p>
      <nav>
        <Link
          href="/login?portal=teacher"
          className="inline-flex items-center gap-2 rounded-lg border-2 border-kid-ink/30 bg-white px-4 py-2 text-sm font-bold text-kid-ink transition-[transform,background-color] [touch-action:manipulation] hover:bg-neutral-50 active:scale-[0.97] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-kid-ink"
        >
          <LandingIcon name="user" size={18} />
          Teacher sign in
        </Link>
      </nav>
    </header>
  );
}
