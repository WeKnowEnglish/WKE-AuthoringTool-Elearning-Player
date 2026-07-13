export type A1DepositOverride = {
  targetWord: string;
  spellHint: string;
};

/** Single spellable tokens for A1 deposit rows (phrases cannot use letter tiles). */
export const LIVE_GAME_A1_DEPOSIT_OVERRIDES: Record<string, A1DepositOverride> = {
  "routine-wake": { targetWord: "wake", spellHint: "wake up in the morning" },
  "routine-dressed": { targetWord: "dressed", spellHint: "get dressed before school" },
  "routine-breakfast": { targetWord: "breakfast", spellHint: "eat in the morning" },
  "routine-homework": { targetWord: "homework", spellHint: "work after school" },
  "routine-usually": { targetWord: "usually", spellHint: "on most days" },
  "routine-never": { targetWord: "never", spellHint: "not on any day" },

  "school-library": { targetWord: "library", spellHint: "borrow a book here" },
  "school-subject": { targetWord: "subjects", spellHint: "math, English and science" },
  "school-break": { targetWord: "break", spellHint: "rest between lessons" },
  "school-borrow": { targetWord: "back", spellHint: "give it back later" },
  "school-study": { targetWord: "study", spellHint: "learn at school" },
  "school-homework": { targetWord: "homework", spellHint: "work to complete at home" },

  "place-there-is": { targetWord: "bridge", spellHint: "one bridge" },
  "place-there-are": { targetWord: "trees", spellHint: "three trees" },
  "place-next": { targetWord: "next", spellHint: "beside the workbench" },
  "place-between": { targetWord: "between", spellHint: "in the middle of two trees" },
  "place-behind": { targetWord: "behind", spellHint: "at the back of the tree" },
  "place-front": { targetWord: "front", spellHint: "before the river" },
};
