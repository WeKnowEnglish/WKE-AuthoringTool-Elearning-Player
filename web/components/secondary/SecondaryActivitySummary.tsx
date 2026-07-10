"use client";

import type { SecondaryActivityScoreSummary } from "@/lib/secondary/secondary-scaffold";
import { secondaryUi } from "@/lib/secondary/secondary-ui-typography";

type Props = {
  activityLabel: string;
  summary: SecondaryActivityScoreSummary;
};

export function SecondaryActivitySummary({ activityLabel, summary }: Props) {
  return (
    <div className="rounded-lg border-2 border-green-400 bg-green-50 p-4">
      <h3 className={`${secondaryUi.cardTitle} text-green-950`}>{activityLabel} complete</h3>
      <p className={`mt-1 ${secondaryUi.body} text-green-900`}>
        Understood today: {summary.percentUnderstood}% ({summary.firstTry + summary.secondTry + summary.thirdTry}/
        {summary.total})
      </p>
      <ul className={`mt-3 space-y-1 ${secondaryUi.caption} text-green-950`}>
        <li>First try: {summary.firstTry}</li>
        <li>Second try: {summary.secondTry}</li>
        <li>Third try: {summary.thirdTry}</li>
        <li className={summary.neededHelp > 0 ? "text-red-900" : undefined}>
          Needed help: {summary.neededHelp}
        </li>
      </ul>
      {summary.neededHelp > 0 ? (
        <p className={`mt-2 ${secondaryUi.caption} text-red-900/90`}>
          Words marked in red will stay on your focus list — we&apos;ll practise them again soon.
        </p>
      ) : null}
    </div>
  );
}
