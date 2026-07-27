import Link from "next/link";

const linkClass =
  "text-sm font-bold text-kid-ink underline-offset-2 hover:underline";

export function MarketingHeader() {
  return (
    <header className="border-b border-kid-ink/10 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <Link href="/" className="text-xl font-extrabold tracking-tight text-kid-ink">
          We Know English
        </Link>
        <nav aria-label="Account access" className="flex flex-wrap items-center gap-3 sm:gap-4">
          <Link href="/login" className={linkClass}>
            Student sign in
          </Link>
          <Link href="/join-class" className={linkClass}>
            Join class
          </Link>
          <Link href="/login?portal=teacher" className={linkClass}>
            Teacher sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
