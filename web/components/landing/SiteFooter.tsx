import Link from "next/link";
import { SITE_NAME } from "@/lib/seo/site";

const FOOTER_LINKS = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/child-safety", label: "Child safety" },
  { href: "/grammar", label: "Grammar" },
] as const;

const GUIDE_LINKS = [
  { href: "/esl-activities-for-kids", label: "ESL activities for kids" },
  { href: "/teach-english-online", label: "Teach English online" },
  { href: "/english-learning-for-kids-at-home", label: "English learning at home" },
  { href: "/resources", label: "Resources" },
] as const;

const ACCESS_LINKS = [
  { href: "/login", label: "Student sign in" },
  { href: "/join-class", label: "Join a class" },
  { href: "/login?portal=teacher", label: "Teacher sign in" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t-4 border-kid-ink bg-[#0f172a] text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4 sm:px-8">
        <div>
          <p className="text-lg font-extrabold">{SITE_NAME}</p>
          <p className="mt-2 max-w-sm text-sm font-semibold leading-relaxed text-white/70">
            Interactive ESL activities and teaching tools for creating lessons, teaching
            live, assigning practice, and reviewing progress.
          </p>
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-white/50">
            Guides
          </p>
          <ul className="mt-3 space-y-2">
            {GUIDE_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm font-bold text-white/85 underline-offset-2 hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-white/50">
            Trust &amp; info
          </p>
          <ul className="mt-3 space-y-2">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm font-bold text-white/85 underline-offset-2 hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-white/50">
            Access
          </p>
          <ul className="mt-3 space-y-2">
            {ACCESS_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm font-bold text-white/85 underline-offset-2 hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs font-semibold text-white/50 sm:px-8">
        © {new Date().getFullYear()} {SITE_NAME}. Built for online classes.
      </div>
    </footer>
  );
}
