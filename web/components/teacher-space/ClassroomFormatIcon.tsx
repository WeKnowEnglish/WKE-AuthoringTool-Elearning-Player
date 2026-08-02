import type { StudioActivityFormat } from "@/lib/studio-activities/types";

const FORMAT_LABEL: Record<StudioActivityFormat, string> = {
  multiple_choice: "Quiz",
  letter_mixup: "Letter scramble",
  flashcards: "Flashcards",
  listen_and_choose: "Listen and choose",
  line_match: "Line match",
  true_false: "True / false",
  sentence_scramble: "Sentence scramble",
  fill_blanks: "Fill in the blanks",
  learning_track: "Learning track",
  vocabulary_list: "Vocabulary list",
  explore_hotspots: "Explore hotspots",
  picture_cloze: "Picture cloze",
  verb_table: "Verb table",
  sentence_columns: "Sentence columns",
  word_annotation: "Word annotation",
  picture_writing: "Picture writing",
  question_writing: "Question writing",
  definition_match: "Definition match",
  cloze_choice: "Cloze with choices",
  cloze_open: "Open cloze",
  read_and_answer: "Read and answer",
  picture_story: "Picture story",
};

export function classroomFormatLabel(format: StudioActivityFormat): string {
  return FORMAT_LABEL[format];
}

type Props = {
  format: StudioActivityFormat;
  className?: string;
};

/** Simple illustrated format marks for classroom activity tiles. */
export function ClassroomFormatIcon({ format, className = "h-10 w-10" }: Props) {
  const common = {
    viewBox: "0 0 48 48",
    className,
    "aria-hidden": true as const,
    fill: "none",
  };

  if (format === "multiple_choice") {
    return (
      <svg {...common}>
        <rect x="6" y="8" width="36" height="32" rx="8" fill="currentColor" opacity="0.15" />
        <circle cx="16" cy="20" r="4" fill="currentColor" />
        <rect x="24" y="17" width="16" height="6" rx="3" fill="currentColor" opacity="0.85" />
        <circle cx="16" cy="32" r="4" stroke="currentColor" strokeWidth="2.5" />
        <rect x="24" y="29" width="16" height="6" rx="3" fill="currentColor" opacity="0.45" />
      </svg>
    );
  }

  if (format === "letter_mixup") {
    return (
      <svg {...common}>
        <rect x="6" y="10" width="12" height="14" rx="3" fill="currentColor" opacity="0.9" />
        <rect x="20" y="10" width="12" height="14" rx="3" fill="currentColor" opacity="0.55" />
        <rect x="34" y="10" width="8" height="14" rx="3" fill="currentColor" opacity="0.35" />
        <path
          d="M12 34h24"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M18 28l6 8 10-14"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (format === "flashcards") {
    return (
      <svg {...common}>
        <rect
          x="10"
          y="12"
          width="22"
          height="28"
          rx="4"
          fill="currentColor"
          opacity="0.25"
          transform="rotate(-8 21 26)"
        />
        <rect x="14" y="8" width="22" height="28" rx="4" fill="currentColor" opacity="0.9" />
        <rect x="19" y="16" width="12" height="4" rx="2" fill="var(--classroom-panel, #fff)" />
        <rect
          x="19"
          y="24"
          width="12"
          height="4"
          rx="2"
          fill="var(--classroom-panel, #fff)"
          opacity="0.7"
        />
      </svg>
    );
  }

  if (format === "explore_hotspots") {
    return (
      <svg {...common}>
        <rect x="6" y="8" width="36" height="32" rx="8" fill="currentColor" opacity="0.12" />
        <circle cx="18" cy="22" r="7" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="32" cy="28" r="5" stroke="currentColor" strokeWidth="2.5" opacity="0.7" />
        <path
          d="M14 34h20"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.35"
        />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path
        d="M8 34V14a4 4 0 0 1 4-4h24a4 4 0 0 1 4 4v20"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="16" cy="34" r="5" fill="currentColor" />
      <circle cx="32" cy="34" r="5" fill="currentColor" opacity="0.55" />
      <path
        d="M16 34h16"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.4"
      />
      <path
        d="M22 12v10l6-4"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
