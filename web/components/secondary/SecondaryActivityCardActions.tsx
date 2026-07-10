import Link from "next/link";
import { buildSecondaryActivityHref } from "@/lib/secondary/secondary-activity-routes";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";
import type { SecondaryTodayActivityKey } from "@/lib/secondary/types";

type Props = {
  activityKey: SecondaryTodayActivityKey;
  hasAttempt: boolean;
};

const buttonClass = `${secondaryUi.btnPrimary} !min-h-10 w-full !px-3 !py-1.5 !text-sm text-center`;
const secondaryButtonClass = `${secondaryUi.btnSecondary} !min-h-10 w-full !px-3 !py-1.5 !text-sm text-center`;

export function SecondaryActivityCardActions({ activityKey, hasAttempt }: Props) {
  const startHref = buildSecondaryActivityHref(
    activityKey,
    hasAttempt ? { retry: true } : undefined,
  );
  const reviewHref = buildSecondaryActivityHref(activityKey, { mode: "review" });

  if (!hasAttempt) {
    return (
      <Link href={startHref} className={buttonClass}>
        Start
      </Link>
    );
  }

  return (
    <div className="grid w-full grid-cols-2 gap-2">
      <Link href={startHref} className={buttonClass}>
        Try Again
      </Link>
      <Link href={reviewHref} className={secondaryButtonClass}>
        Open
      </Link>
    </div>
  );
}
