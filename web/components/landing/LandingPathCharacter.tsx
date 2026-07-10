import { clsx } from "clsx";
import Image from "next/image";
import { LANDING_CHARACTER_DISPLAY } from "@/lib/landing/landing-assets";
import type { LandingPathVariant } from "@/lib/landing/landing-path-config";

type Props = {
  variant: LandingPathVariant;
  src: string | null;
};

export function LandingPathCharacter({ variant, src }: Props) {
  const display = LANDING_CHARACTER_DISPLAY[variant];

  if (src) {
    return (
      <div className="flex h-full w-full min-w-[5rem] items-end justify-center sm:min-w-[6rem]">
        <Image
          src={src}
          alt=""
          width={display.height}
          height={display.height}
          className={clsx(
            "w-auto max-w-none object-contain object-bottom",
            display.heightScale >= 1 ? "h-full" : "h-[80%]",
            display.flipHorizontal && "scale-x-[-1]",
          )}
          style={{ objectPosition: display.objectPosition }}
          priority={variant === "primary"}
        />
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "relative flex h-[80%] w-24 items-center justify-center self-end rounded-full sm:w-28",
        variant === "primary" ?
          "bg-gradient-to-br from-orange-200 to-amber-100"
        : "bg-gradient-to-br from-blue-200 to-sky-100",
      )}
      aria-hidden
    >
      <span className="sr-only">Character illustration coming soon</span>
      <div
        className={clsx(
          "h-16 w-16 rounded-full",
          variant === "primary" ? "bg-orange-400/60" : "bg-blue-400/60",
        )}
      />
    </div>
  );
}
