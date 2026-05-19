import { clsx } from "clsx";
import { portalSignOut } from "@/lib/actions/portal-sign-out";

type Props = {
  label?: string;
  className?: string;
  /** Kid hub header styling vs neutral text link. */
  variant?: "kid" | "link";
};

export function SignOutForm({
  label = "Log out",
  className,
  variant = "link",
}: Props) {
  return (
    <form action={portalSignOut} className={className}>
      <button
        type="submit"
        className={clsx(
          "[touch-action:manipulation]",
          variant === "kid" ?
            "rounded-md border-2 border-kid-ink bg-kid-panel px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-kid-ink transition-transform hover:bg-white active:scale-[0.97]"
          : "rounded px-1 text-red-700 underline hover:bg-red-50 active:bg-red-100",
        )}
      >
        {label}
      </button>
    </form>
  );
}
