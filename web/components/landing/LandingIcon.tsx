import { clsx } from "clsx";
import type { LandingIconName } from "@/lib/landing/landing-icons";

type Props = {
  name: LandingIconName;
  className?: string;
  size?: number;
};

function IconPath({ name }: { name: LandingIconName }) {
  switch (name) {
    case "graduation":
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m-6-3l6 3 6-3"
        />
      );
    case "level":
      return (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19h16" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 15V9" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15V5" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 15v-4" />
        </>
      );
    case "music":
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z"
        />
      );
    case "book":
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      );
    case "story":
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 8h10M7 12h6m-6 4h10M5 5a2 2 0 012-2h10a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V5z"
        />
      );
    case "game":
      return (
        <>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 12h4m-2-2v4M14 11h.01M18 13h.01"
          />
          <rect x={3} y={8} width={18} height={8} rx={3} strokeWidth={2} />
        </>
      );
    case "pencil":
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      );
    case "target":
      return (
        <>
          <circle cx={12} cy={12} r={9} strokeWidth={2} />
          <circle cx={12} cy={12} r={5} strokeWidth={2} />
          <circle cx={12} cy={12} r={1.5} strokeWidth={2} fill="currentColor" />
        </>
      );
    case "compass":
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 3a9 9 0 100 18 9 9 0 000-18zm3.5 6.5L12 12l-3.5-2.5L12 7l3.5 2.5z"
        />
      );
    case "brain":
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.5 6.5a3 3 0 014 0 2.5 2.5 0 013.5 3 2 2 0 010 4 3 3 0 01-3 3 3.5 3.5 0 01-6-2.5 2 2 0 010-4 2.5 2.5 0 013.5-3z"
        />
      );
    case "trophy":
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM5 5H3v2a3 3 0 003 3M19 5h2v2a3 3 0 01-3 3"
        />
      );
    case "users":
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H2v-2a4 4 0 014-4h1m8-4a4 4 0 11-8 0 4 4 0 018 0zm6 4a4 4 0 00-4-4H9a4 4 0 00-4 4"
        />
      );
    case "arrow-right":
      return (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14m-6-6l6 6-6 6" />
      );
    case "user":
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      );
  }
}

export function LandingIcon({ name, className, size = 20 }: Props) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      className={clsx("shrink-0", className)}
    >
      <IconPath name={name} />
    </svg>
  );
}
