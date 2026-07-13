import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { KidPanel } from "@/components/kid-ui/KidPanel";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  wide?: boolean;
};

export function LiveGameLandingShell({
  eyebrow,
  title,
  description,
  children,
  backHref = "/live-game",
  backLabel = "Live game home",
  wide = false,
}: Props) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[linear-gradient(160deg,#e8f6fd_0%,#ffffff_50%,#fff8d9_100%)]">
      <div className="pointer-events-none absolute -left-20 top-24 h-56 w-56 rounded-full bg-kid-surface/60 blur-2xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-kid-cta/35 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="text-xl font-extrabold tracking-tight text-kid-ink sm:text-2xl">
          We Know English
        </Link>
        <Link
          href={backHref}
          className="rounded-full border-2 border-kid-ink/25 bg-white/90 px-4 py-2 text-sm font-extrabold text-kid-ink shadow-sm transition-colors hover:bg-kid-surface-muted"
        >
          {backLabel}
        </Link>
      </header>

      <main
        className={`relative z-10 mx-auto grid items-center gap-6 px-4 pb-10 pt-3 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-10 lg:pt-8 ${wide ? "max-w-6xl" : "max-w-5xl"}`}
      >
        <section className="flex items-center justify-between gap-4 lg:block">
          <div className="max-w-xl">
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-kid-accent">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-black leading-tight text-kid-ink sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            <p className="mt-3 text-base font-semibold leading-relaxed text-kid-ink/75 sm:text-lg">
              {description}
            </p>
          </div>
          <Image
            src="/landing/primary-mascot.png"
            alt="We Know English learning companion waving"
            width={401}
            height={633}
            priority
            className="h-auto w-24 shrink-0 drop-shadow-xl sm:w-32 lg:mx-auto lg:mt-6 lg:w-52"
            sizes="(min-width: 1024px) 208px, (min-width: 640px) 128px, 96px"
          />
        </section>

        <KidPanel className="space-y-4 bg-white/95 p-5 sm:p-6">{children}</KidPanel>
      </main>
    </div>
  );
}
