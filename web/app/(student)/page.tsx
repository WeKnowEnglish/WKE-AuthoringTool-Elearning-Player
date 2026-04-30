import Link from "next/link";
import {
  kidLinkPrimaryClassName,
  kidLinkSecondaryClassName,
} from "@/components/kid-ui/KidButton";
import { KidPanel } from "@/components/kid-ui/KidPanel";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <KidPanel>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Welcome, learner!
        </h1>
        <p className="mt-3 text-lg leading-relaxed">
          Stories, pictures, and small games help you learn English step by
          step.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/learn" className={kidLinkPrimaryClassName}>
            Start lessons
          </Link>
          <Link href="/activities" className={kidLinkSecondaryClassName}>
            Activity library
          </Link>
          <Link href="/profile" className={kidLinkSecondaryClassName}>
            Achievements
          </Link>
        </div>
        <p className="mt-8 border-t-2 border-neutral-200 pt-6 text-center text-sm text-neutral-600">
          <Link
            href="/teacher/login"
            className="font-semibold text-neutral-800 underline underline-offset-2 transition-opacity active:opacity-70"
          >
            Teacher sign in
          </Link>
          <span className="text-neutral-500"> · create and edit lessons</span>
        </p>
      </KidPanel>
    </div>
  );
}
