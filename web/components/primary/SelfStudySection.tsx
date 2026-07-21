"use client";

import { useClientHydrated } from "@/lib/react/use-client-hydrated";
import { getPlayerLevel } from "@/lib/progress/rewards";
import { isUnlockAvailable, minLevelForUnlock } from "@/lib/progress/unlock-registry";
import {
  listSelfStudyTopicCards,
  type SelfStudyTopicCard,
} from "@/lib/primary/self-study-topics";
import type { TestStartTopicId } from "@/lib/teststartpage/bank";

type Props = {
  onOpenTopic: (topicId: TestStartTopicId) => void;
};

/**
 * Product B — Self Study topic quiz grid on Primary Home.
 * @see docs/primary/PRIMARY_VOCAB_ACTIVITY_CONTRACT.md
 */
export function SelfStudySection({ onOpenTopic }: Props) {
  const hydrated = useClientHydrated();
  const cards = listSelfStudyTopicCards();
  const unlocked =
    !hydrated || isUnlockAvailable("topic_quiz", getPlayerLevel());
  const unlockLevel = minLevelForUnlock("topic_quiz");

  return (
    <section
      aria-labelledby="self-study-heading"
      className="rounded-[1.75rem] border border-[var(--pl-border)] bg-[var(--pl-card)] p-4 shadow-sm sm:p-6"
    >
      <h2
        id="self-study-heading"
        className="text-lg font-extrabold tracking-tight sm:text-xl"
      >
        Self Study
      </h2>
      <p className="mt-2 text-sm font-semibold text-[var(--pl-muted)]">
        Pick a topic quiz and practice on your own.
      </p>

      {!unlocked ? (
        <p className="mt-4 rounded-2xl border border-[var(--pl-border)] bg-[var(--pl-bg)] px-4 py-3 text-sm font-semibold text-[var(--pl-muted)]">
          Topic quizzes unlock at level {unlockLevel}. Keep learning to open them!
        </p>
      ) : null}

      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <li key={card.id}>
            <TopicCard
              card={card}
              locked={!unlocked}
              onOpen={() => onOpenTopic(card.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function TopicCard({
  card,
  locked,
  onOpen,
}: {
  card: SelfStudyTopicCard;
  locked: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      disabled={locked}
      onClick={onOpen}
      className={`flex w-full flex-col overflow-hidden rounded-2xl border text-left transition ${
        locked
          ? "cursor-not-allowed border-[var(--pl-border)] bg-[var(--pl-bg)] opacity-60"
          : "border-[var(--pl-border)] bg-white hover:border-[var(--pl-purple)] active:scale-[0.99]"
      }`}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--pl-purple-soft)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={card.imageSrc} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <span className="text-sm font-extrabold text-[var(--pl-ink)]">{card.label}</span>
        <span className="shrink-0 text-xs font-extrabold text-[var(--pl-purple)]">
          {locked ? "Locked" : "Quiz →"}
        </span>
      </div>
    </button>
  );
}
