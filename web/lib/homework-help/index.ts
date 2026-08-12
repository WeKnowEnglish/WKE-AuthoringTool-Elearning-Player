export type {
  HelpAction,
  HelpLevel,
  HelpStep,
  HelpStruggle,
} from "@/lib/homework-help/types";
export {
  HELP_LEVELS,
  HELP_WRONG_CHECK_THRESHOLDS,
  helpLevelFromWrongChecks,
  helpLevelIndex,
  maxHelpLevel,
  nextHelpLevel,
  resolveUnlockedHelpLevel,
} from "@/lib/homework-help/types";
export {
  advancePictureClozeHelp,
  emptyHelpStruggle,
  getPictureClozeHelpStep,
  pictureClozeScaffoldBankFilter,
  pictureClozeScaffoldFirstLetter,
  recordPictureClozeWrongCheck,
  type PictureClozeHelpInput,
} from "@/lib/homework-help/picture-cloze";
export {
  advanceDragSentenceHelp,
  applyDragSentenceReveal,
  applyDragSentenceScaffold,
  buildDragSentenceBankTiles,
  evaluateDragSentenceCheck,
  getDragSentenceHelpStep,
  recordDragSentenceWrongCheck,
  type DragSentenceCheckResult,
  type DragSentenceHelpInput,
  type DragSentenceSlotCell,
  type DragSentenceTile,
} from "@/lib/homework-help/drag-sentence";
export {
  advanceMatchPairsHelp,
  applyMatchPairsKick,
  applyMatchPairsReveal,
  applyMatchPairsScaffold,
  evaluateMatchPairsCheck,
  getMatchPairsHelpStep,
  recordMatchPairsWrongCheck,
  type MatchPairCheckResult,
  type MatchPairLinks,
  type MatchPairsHelpInput,
  type MatchPairToken,
  type MatchPairZone,
} from "@/lib/homework-help/match-pairs";
