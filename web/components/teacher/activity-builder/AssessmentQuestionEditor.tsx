"use client";

import {
  AuthoringItemPager,
  type AuthoringItemPagerProps,
} from "@/components/teacher/activity-builder/AuthoringItemPager";

type Props = Omit<AuthoringItemPagerProps, "stickyNav" | "tone">;

/** Sticky question navigation + one-item authoring body for assessment parts. */
export function AssessmentQuestionEditor(props: Props) {
  return <AuthoringItemPager {...props} stickyNav tone="stone" />;
}
