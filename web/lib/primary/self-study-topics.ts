import {
  TOPICS,
  topicMenuImageSrc,
  type TestStartTopicId,
} from "@/lib/teststartpage/bank";

/**
 * Product B — Self Study topic quiz catalog.
 * @see docs/primary/PRIMARY_VOCAB_ACTIVITY_CONTRACT.md
 */
export type SelfStudyTopicCard = {
  id: TestStartTopicId;
  label: string;
  imageSrc: string;
};

export const SELF_STUDY_DEFAULT_QUESTION_COUNT = 6 as const;
export const SELF_STUDY_DEFAULT_DIFFICULTY = 2 as const;

export function listSelfStudyTopicCards(): SelfStudyTopicCard[] {
  return TOPICS.map((topic) => ({
    id: topic.id,
    label: topic.label,
    imageSrc: topicMenuImageSrc(topic.id),
  }));
}
